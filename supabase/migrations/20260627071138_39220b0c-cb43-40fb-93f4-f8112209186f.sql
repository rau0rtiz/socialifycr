
-- 1. Add columns
ALTER TABLE public.instant_form_leads
  ADD COLUMN IF NOT EXISTS assigned_seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_instant_form_leads_seller
  ON public.instant_form_leads(client_id, assigned_seller_id);

-- 2. Manager helper
CREATE OR REPLACE FUNCTION public.is_client_manager(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin_or_higher(_user_id)
      OR public.has_system_role(_user_id, 'manager')
      OR public.is_account_manager(_user_id, _client_id);
$$;

-- 3. Auto-assign trigger (round-robin / least-loaded fairness)
CREATE OR REPLACE FUNCTION public.auto_assign_instant_form_lead()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_seller uuid;
BEGIN
  IF NEW.assigned_seller_id IS NOT NULL THEN
    NEW.assigned_at := COALESCE(NEW.assigned_at, now());
    RETURN NEW;
  END IF;

  SELECT ctm.user_id INTO v_seller
  FROM public.client_team_members ctm
  JOIN public.user_roles ur ON ur.user_id = ctm.user_id
  LEFT JOIN public.instant_form_leads ifl
    ON ifl.client_id = NEW.client_id AND ifl.assigned_seller_id = ctm.user_id
  WHERE ctm.client_id = NEW.client_id
    AND ur.role IN ('setter','closer')
  GROUP BY ctm.user_id
  ORDER BY COUNT(ifl.id) ASC, MAX(ifl.assigned_at) ASC NULLS FIRST, ctm.user_id
  LIMIT 1;

  IF v_seller IS NOT NULL THEN
    NEW.assigned_seller_id := v_seller;
    NEW.assigned_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_assign_instant_form_lead ON public.instant_form_leads;
CREATE TRIGGER trg_auto_assign_instant_form_lead
BEFORE INSERT ON public.instant_form_leads
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_instant_form_lead();

-- 4. Enforce manager-only reassignment
CREATE OR REPLACE FUNCTION public.enforce_seller_assignment_permission()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_seller_id IS DISTINCT FROM OLD.assigned_seller_id THEN
    IF auth.uid() IS NULL OR NOT public.is_client_manager(auth.uid(), NEW.client_id) THEN
      RAISE EXCEPTION 'Solo los managers de la cuenta pueden reasignar el vendedor de un lead';
    END IF;
    NEW.assigned_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_seller_assignment ON public.instant_form_leads;
CREATE TRIGGER trg_enforce_seller_assignment
BEFORE UPDATE ON public.instant_form_leads
FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_assignment_permission();

-- 5. Allow team members to update leads (status, sale link, etc.)
DROP POLICY IF EXISTS "Team can update leads" ON public.instant_form_leads;
CREATE POLICY "Team can update leads"
ON public.instant_form_leads
FOR UPDATE
TO authenticated
USING (public.has_client_access(auth.uid(), client_id))
WITH CHECK (public.has_client_access(auth.uid(), client_id));

-- 6. Backfill assigned_seller_id for existing leads using same fair logic
DO $$
DECLARE r RECORD; v_seller uuid;
BEGIN
  FOR r IN
    SELECT id, client_id
    FROM public.instant_form_leads
    WHERE assigned_seller_id IS NULL
    ORDER BY created_time NULLS LAST, created_at
  LOOP
    SELECT ctm.user_id INTO v_seller
    FROM public.client_team_members ctm
    JOIN public.user_roles ur ON ur.user_id = ctm.user_id
    LEFT JOIN public.instant_form_leads ifl
      ON ifl.client_id = r.client_id AND ifl.assigned_seller_id = ctm.user_id
    WHERE ctm.client_id = r.client_id
      AND ur.role IN ('setter','closer')
    GROUP BY ctm.user_id
    ORDER BY COUNT(ifl.id) ASC, MAX(ifl.assigned_at) ASC NULLS FIRST, ctm.user_id
    LIMIT 1;

    IF v_seller IS NOT NULL THEN
      UPDATE public.instant_form_leads
        SET assigned_seller_id = v_seller, assigned_at = now()
        WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

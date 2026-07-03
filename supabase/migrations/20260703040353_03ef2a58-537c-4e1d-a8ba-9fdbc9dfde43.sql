
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS default_instant_form_seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.clients
  SET default_instant_form_seller_id = 'e852037e-1614-403a-bc4b-b882c19b1585'
  WHERE id = 'd90a18b8-dad0-4f52-9447-c13f8f19f0d7';

-- Bypass enforce_seller_assignment_permission trigger for this admin backfill
ALTER TABLE public.instant_form_leads DISABLE TRIGGER USER;
UPDATE public.instant_form_leads
  SET assigned_seller_id = 'e852037e-1614-403a-bc4b-b882c19b1585',
      assigned_at = now()
  WHERE client_id = 'd90a18b8-dad0-4f52-9447-c13f8f19f0d7'
    AND assigned_seller_id = 'e7d1aebd-819b-4754-8e9c-ec7184e63922';
ALTER TABLE public.instant_form_leads ENABLE TRIGGER USER;

DELETE FROM public.client_team_members
  WHERE client_id = 'd90a18b8-dad0-4f52-9447-c13f8f19f0d7'
    AND user_id = 'e7d1aebd-819b-4754-8e9c-ec7184e63922';

CREATE OR REPLACE FUNCTION public.auto_assign_instant_form_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_default uuid;
  v_sellers uuid[];
  v_count integer;
  v_idx integer;
  v_seller uuid;
BEGIN
  IF NEW.assigned_seller_id IS NOT NULL THEN
    NEW.assigned_at := COALESCE(NEW.assigned_at, now());
    RETURN NEW;
  END IF;

  SELECT default_instant_form_seller_id INTO v_default
  FROM public.clients WHERE id = NEW.client_id;

  IF v_default IS NOT NULL THEN
    NEW.assigned_seller_id := v_default;
    NEW.assigned_at := now();
    RETURN NEW;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT ctm.user_id ORDER BY ctm.user_id), ARRAY[]::uuid[])
  INTO v_sellers
  FROM public.client_team_members ctm
  LEFT JOIN public.user_roles ur ON ur.user_id = ctm.user_id
  WHERE ctm.client_id = NEW.client_id
    AND (
      ctm.role IN ('setter','closer')
      OR ur.role IN ('setter','closer')
    );

  IF array_length(v_sellers, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.instant_form_leads
  WHERE client_id = NEW.client_id
    AND assigned_seller_id = ANY(v_sellers);

  v_idx := (v_count % array_length(v_sellers, 1)) + 1;
  v_seller := v_sellers[v_idx];

  NEW.assigned_seller_id := v_seller;
  NEW.assigned_at := now();

  RETURN NEW;
END;
$function$;

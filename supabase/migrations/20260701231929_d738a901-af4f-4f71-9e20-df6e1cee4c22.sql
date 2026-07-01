
CREATE TABLE public.instant_form_lead_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.instant_form_leads(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  from_status text,
  to_status text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  changed_by uuid
);

CREATE INDEX idx_iflsh_lead_changed ON public.instant_form_lead_status_history(lead_id, changed_at);
CREATE INDEX idx_iflsh_client_changed ON public.instant_form_lead_status_history(client_id, changed_at DESC);

GRANT SELECT, INSERT ON public.instant_form_lead_status_history TO authenticated;
GRANT ALL ON public.instant_form_lead_status_history TO service_role;

ALTER TABLE public.instant_form_lead_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view lead status history"
  ON public.instant_form_lead_status_history FOR SELECT
  TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team can insert lead status history"
  ON public.instant_form_lead_status_history FOR INSERT
  TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins manage lead status history"
  ON public.instant_form_lead_status_history FOR ALL
  TO authenticated
  USING (public.is_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_admin_or_higher(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_instant_form_lead_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.instant_form_lead_status_history
      (lead_id, client_id, from_status, to_status, changed_at, changed_by)
    VALUES
      (NEW.id, NEW.client_id, NULL, NEW.lead_status,
       COALESCE(NEW.created_time, NEW.created_at, now()), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.lead_status IS DISTINCT FROM OLD.lead_status THEN
      INSERT INTO public.instant_form_lead_status_history
        (lead_id, client_id, from_status, to_status, changed_at, changed_by)
      VALUES
        (NEW.id, NEW.client_id, OLD.lead_status, NEW.lead_status, now(), auth.uid());
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_instant_form_lead_status_history ON public.instant_form_leads;
CREATE TRIGGER trg_instant_form_lead_status_history
  AFTER INSERT OR UPDATE OF lead_status ON public.instant_form_leads
  FOR EACH ROW EXECUTE FUNCTION public.log_instant_form_lead_status_change();

-- Backfill: seed one row per existing lead with its current status
INSERT INTO public.instant_form_lead_status_history (lead_id, client_id, from_status, to_status, changed_at, changed_by)
SELECT l.id, l.client_id, NULL, l.lead_status,
       COALESCE(l.created_time, l.created_at, now()), NULL
FROM public.instant_form_leads l
WHERE NOT EXISTS (
  SELECT 1 FROM public.instant_form_lead_status_history h WHERE h.lead_id = l.id
);

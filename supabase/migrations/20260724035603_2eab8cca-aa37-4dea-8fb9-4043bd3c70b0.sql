ALTER TABLE public.agency_crm_leads
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agency_crm_leads_assigned_to ON public.agency_crm_leads(assigned_to);
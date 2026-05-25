CREATE TYPE public.agency_crm_status AS ENUM ('nuevo', 'contactado', 'en_conversacion', 'agendado', 'cliente', 'perdido');

CREATE TABLE public.agency_crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status public.agency_crm_status NOT NULL DEFAULT 'nuevo',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_crm_leads_status ON public.agency_crm_leads(status);
CREATE INDEX idx_agency_crm_leads_created_at ON public.agency_crm_leads(created_at DESC);

ALTER TABLE public.agency_crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view CRM leads"
  ON public.agency_crm_leads FOR SELECT
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Agency members can insert CRM leads"
  ON public.agency_crm_leads FOR INSERT
  WITH CHECK (public.is_agency_member(auth.uid()) AND auth.uid() = created_by);

CREATE POLICY "Agency members can update CRM leads"
  ON public.agency_crm_leads FOR UPDATE
  USING (public.is_agency_member(auth.uid()));

CREATE POLICY "Agency members can delete CRM leads"
  ON public.agency_crm_leads FOR DELETE
  USING (public.is_agency_member(auth.uid()));

CREATE TRIGGER agency_crm_leads_updated_at
  BEFORE UPDATE ON public.agency_crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
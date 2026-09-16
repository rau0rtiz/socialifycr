ALTER TABLE public.agency_crm_leads
  ADD COLUMN IF NOT EXISTS msg_contact_id uuid REFERENCES public.msg_contacts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agency_crm_leads_msg_contact_uidx
  ON public.agency_crm_leads (msg_contact_id)
  WHERE msg_contact_id IS NOT NULL;
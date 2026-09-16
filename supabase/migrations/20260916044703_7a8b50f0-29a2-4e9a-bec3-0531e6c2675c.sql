ALTER TABLE public.msg_contacts ADD COLUMN IF NOT EXISTS intake jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.agency_crm_leads ADD COLUMN IF NOT EXISTS intake jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.msg_appointments ADD COLUMN IF NOT EXISTS routing_answers jsonb NOT NULL DEFAULT '{}'::jsonb;
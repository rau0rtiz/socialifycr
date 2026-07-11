ALTER TABLE public.instant_form_leads
  ADD COLUMN IF NOT EXISTS store_visit_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS store_visit_notes TEXT NULL;
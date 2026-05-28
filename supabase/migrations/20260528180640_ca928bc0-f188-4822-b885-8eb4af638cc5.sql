ALTER TABLE public.agency_crm_leads
  ADD COLUMN IF NOT EXISTS sale_payment_date DATE,
  ADD COLUMN IF NOT EXISTS sale_payment_method TEXT,
  ADD COLUMN IF NOT EXISTS sale_payment_receipts JSONB NOT NULL DEFAULT '[]'::jsonb;
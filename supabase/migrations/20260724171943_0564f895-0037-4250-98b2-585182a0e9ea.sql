
ALTER TABLE public.agency_payment_clients
  ADD COLUMN IF NOT EXISTS iva_rate NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.agency_payment_records
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

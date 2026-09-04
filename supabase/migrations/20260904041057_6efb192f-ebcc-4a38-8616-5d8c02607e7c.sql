ALTER TABLE public.agency_payment_clients
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS anchor_month date,
  ADD COLUMN IF NOT EXISTS invoice_day integer,
  ADD COLUMN IF NOT EXISTS billing_name text,
  ADD COLUMN IF NOT EXISTS billing_tax_id text,
  ADD COLUMN IF NOT EXISTS billing_email text,
  ADD COLUMN IF NOT EXISTS billing_phone text,
  ADD COLUMN IF NOT EXISTS billing_address text;

ALTER TABLE public.agency_payment_clients
  DROP CONSTRAINT IF EXISTS agency_payment_clients_billing_frequency_check;
ALTER TABLE public.agency_payment_clients
  ADD CONSTRAINT agency_payment_clients_billing_frequency_check
  CHECK (billing_frequency IN ('monthly','quarterly'));
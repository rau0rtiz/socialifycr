
CREATE TABLE IF NOT EXISTS public.agency_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_external_id text UNIQUE,
  invoice_number text,
  invoice_date date NOT NULL,
  customer_name text NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  currency text NOT NULL DEFAULT 'USD',
  total numeric NOT NULL DEFAULT 0,
  status text,
  source text NOT NULL DEFAULT 'zoho',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_invoices_customer ON public.agency_invoices(customer_name);
CREATE INDEX IF NOT EXISTS idx_agency_invoices_date ON public.agency_invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_agency_invoices_client ON public.agency_invoices(client_id);

ALTER TABLE public.agency_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage invoices"
ON public.agency_invoices
FOR ALL
TO authenticated
USING (public.is_agency_member(auth.uid()))
WITH CHECK (public.is_agency_member(auth.uid()));

CREATE TRIGGER update_agency_invoices_updated_at
BEFORE UPDATE ON public.agency_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.agency_contracts
  ADD COLUMN IF NOT EXISTS discontinued_at timestamptz,
  ADD COLUMN IF NOT EXISTS discontinued_reason text,
  ADD COLUMN IF NOT EXISTS customer_name text;

ALTER TABLE public.agency_contracts DROP CONSTRAINT IF EXISTS agency_contracts_status_check;
ALTER TABLE public.agency_contracts ADD CONSTRAINT agency_contracts_status_check
  CHECK (status IN ('active','paused','churned','discontinued'));

ALTER TABLE public.agency_contracts ALTER COLUMN client_id DROP NOT NULL;

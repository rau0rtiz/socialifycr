
ALTER TABLE public.agency_collections
  ADD COLUMN IF NOT EXISTS commission_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS commission_paid_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS commission_paid_notes text;

CREATE INDEX IF NOT EXISTS idx_agency_collections_commission_paid_at
  ON public.agency_collections (commission_paid_at);

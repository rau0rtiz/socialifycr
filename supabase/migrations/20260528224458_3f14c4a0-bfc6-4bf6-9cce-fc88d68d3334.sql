ALTER TABLE public.agency_contracts
ADD COLUMN IF NOT EXISTS lead_source text,
ADD COLUMN IF NOT EXISTS lead_source_detail text;

CREATE INDEX IF NOT EXISTS idx_agency_contracts_lead_source ON public.agency_contracts(lead_source);
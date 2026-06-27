
-- Lead sources config (which Google Sheet per client)
CREATE TABLE public.instant_form_lead_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  spreadsheet_id text NOT NULL,
  sheet_name text NOT NULL DEFAULT 'Sheet1',
  header_row integer NOT NULL DEFAULT 1,
  last_synced_at timestamptz,
  last_row_count integer,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instant_form_lead_sources TO authenticated;
GRANT ALL ON public.instant_form_lead_sources TO service_role;

ALTER TABLE public.instant_form_lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view lead sources"
  ON public.instant_form_lead_sources FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins/managers can manage lead sources"
  ON public.instant_form_lead_sources FOR ALL TO authenticated
  USING (public.is_admin_or_higher(auth.uid()) OR public.is_account_manager(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_higher(auth.uid()) OR public.is_account_manager(auth.uid(), client_id));

CREATE TRIGGER trg_instant_form_lead_sources_updated
  BEFORE UPDATE ON public.instant_form_lead_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Leads table
CREATE TABLE public.instant_form_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  created_time timestamptz,
  ad_id text,
  ad_name text,
  adset_id text,
  adset_name text,
  campaign_id text,
  campaign_name text,
  form_id text,
  form_name text,
  platform text,
  is_organic boolean,
  full_name text,
  phone text,
  lead_status text,
  custom_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  customer_contact_id uuid REFERENCES public.customer_contacts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, external_id)
);

CREATE INDEX idx_instant_form_leads_client_created ON public.instant_form_leads(client_id, created_time DESC);
CREATE INDEX idx_instant_form_leads_campaign ON public.instant_form_leads(client_id, campaign_name);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instant_form_leads TO authenticated;
GRANT ALL ON public.instant_form_leads TO service_role;

ALTER TABLE public.instant_form_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view leads"
  ON public.instant_form_leads FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins/managers can manage leads"
  ON public.instant_form_leads FOR ALL TO authenticated
  USING (public.is_admin_or_higher(auth.uid()) OR public.is_account_manager(auth.uid(), client_id))
  WITH CHECK (public.is_admin_or_higher(auth.uid()) OR public.is_account_manager(auth.uid(), client_id));

CREATE TRIGGER trg_instant_form_leads_updated
  BEFORE UPDATE ON public.instant_form_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Feature flag column
ALTER TABLE public.client_feature_flags
  ADD COLUMN IF NOT EXISTS instant_form_leads boolean NOT NULL DEFAULT true;

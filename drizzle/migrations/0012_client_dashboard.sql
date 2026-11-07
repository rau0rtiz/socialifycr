CREATE TABLE public.client_dashboard_settings (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  ad_account_ids text[] NOT NULL DEFAULT '{}',
  visible_campaign_ids text[],
  result_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency text NOT NULL DEFAULT 'USD',
  show_campaigns boolean NOT NULL DEFAULT true,
  show_accounts boolean NOT NULL DEFAULT true,
  show_leads boolean NOT NULL DEFAULT true,
  show_lead_names boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_dashboard_settings TO authenticated;
GRANT ALL ON public.client_dashboard_settings TO service_role;
ALTER TABLE public.client_dashboard_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency manages dashboard settings" ON public.client_dashboard_settings FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));

CREATE TABLE public.client_campaign_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month date NOT NULL,
  result_type text NOT NULL,
  target numeric,
  max_cost numeric,
  min_roas numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, month, result_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_campaign_goals TO authenticated;
GRANT ALL ON public.client_campaign_goals TO service_role;
ALTER TABLE public.client_campaign_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency manages campaign goals" ON public.client_campaign_goals FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));

CREATE TABLE public.client_dashboard_snapshots (
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  cache_key text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, cache_key)
);
GRANT SELECT ON public.client_dashboard_snapshots TO authenticated;
GRANT ALL ON public.client_dashboard_snapshots TO service_role;
ALTER TABLE public.client_dashboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency reads dashboard snapshots" ON public.client_dashboard_snapshots FOR SELECT TO authenticated
  USING (public.is_agency_member(auth.uid()));
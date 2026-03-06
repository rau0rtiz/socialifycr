
-- Feature flags table
CREATE TABLE public.client_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL UNIQUE,
  dashboard boolean NOT NULL DEFAULT true,
  social_followers boolean NOT NULL DEFAULT false,
  instagram_posts boolean NOT NULL DEFAULT false,
  youtube_videos boolean NOT NULL DEFAULT false,
  content_grid boolean NOT NULL DEFAULT false,
  ai_insights boolean NOT NULL DEFAULT false,
  video_ideas boolean NOT NULL DEFAULT false,
  competitors boolean NOT NULL DEFAULT false,
  funnel boolean NOT NULL DEFAULT false,
  campaigns boolean NOT NULL DEFAULT false,
  sales_tracking boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage feature flags" ON public.client_feature_flags FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));
CREATE POLICY "Team members can view feature flags" ON public.client_feature_flags FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));

-- Message sales table
CREATE TABLE public.message_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  created_by uuid NOT NULL,
  sale_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'CRC' CHECK (currency IN ('CRC', 'USD')),
  source text NOT NULL CHECK (source IN ('story', 'ad', 'referral', 'organic', 'other')),
  ad_campaign_id text,
  ad_campaign_name text,
  ad_id text,
  ad_name text,
  customer_name text,
  notes text,
  product text,
  message_platform text,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.message_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view sales" ON public.message_sales FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can insert sales" ON public.message_sales FOR INSERT TO authenticated WITH CHECK (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can update sales" ON public.message_sales FOR UPDATE TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Team members can delete sales" ON public.message_sales FOR DELETE TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "Admins can manage sales" ON public.message_sales FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));

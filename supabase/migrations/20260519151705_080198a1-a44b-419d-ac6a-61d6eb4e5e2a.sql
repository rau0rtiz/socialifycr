-- Feature flag
ALTER TABLE public.client_feature_flags
  ADD COLUMN IF NOT EXISTS launch_report boolean NOT NULL DEFAULT true;

-- Launch daily reports table
CREATE TABLE IF NOT EXISTS public.launch_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  campaign_id text,
  campaign_name text,
  spend_snapshot numeric(12,2) DEFAULT 0,
  conversations_snapshot integer DEFAULT 0,
  currency text DEFAULT 'USD',
  group_signups integer DEFAULT 0,
  manychat_ctr numeric(6,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_launch_daily_reports_client_date
  ON public.launch_daily_reports (client_id, report_date DESC);

ALTER TABLE public.launch_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view launch reports"
  ON public.launch_daily_reports FOR SELECT
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team can insert launch reports"
  ON public.launch_daily_reports FOR INSERT
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team can update launch reports"
  ON public.launch_daily_reports FOR UPDATE
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team can delete launch reports"
  ON public.launch_daily_reports FOR DELETE
  USING (public.has_client_access(auth.uid(), client_id));

CREATE TRIGGER trg_launch_daily_reports_updated_at
  BEFORE UPDATE ON public.launch_daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.launches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  campaign_id text,
  campaign_name text,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT launches_status_check CHECK (status IN ('active','archived'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.launches TO authenticated;
GRANT ALL ON public.launches TO service_role;

ALTER TABLE public.launches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view launches" ON public.launches FOR SELECT
  USING (public.has_client_access(auth.uid(), client_id));
CREATE POLICY "Team can insert launches" ON public.launches FOR INSERT
  WITH CHECK (public.has_client_access(auth.uid(), client_id));
CREATE POLICY "Team can update launches" ON public.launches FOR UPDATE
  USING (public.has_client_access(auth.uid(), client_id));
CREATE POLICY "Team can delete launches" ON public.launches FOR DELETE
  USING (public.has_client_access(auth.uid(), client_id));

CREATE TRIGGER trg_launches_updated_at
BEFORE UPDATE ON public.launches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_launches_client_status ON public.launches(client_id, status);

-- Add launch_id to existing reports
ALTER TABLE public.launch_daily_reports
  ADD COLUMN launch_id uuid REFERENCES public.launches(id) ON DELETE CASCADE;

-- Backfill: one launch per client capturing the most recent campaign info, marked archived
INSERT INTO public.launches (client_id, name, campaign_id, campaign_name, status, started_at, archived_at)
SELECT
  r.client_id,
  'Lanzamiento 1',
  (SELECT campaign_id FROM public.launch_daily_reports r2
     WHERE r2.client_id = r.client_id AND r2.campaign_id IS NOT NULL
     ORDER BY report_date DESC LIMIT 1),
  (SELECT campaign_name FROM public.launch_daily_reports r3
     WHERE r3.client_id = r.client_id AND r3.campaign_name IS NOT NULL
     ORDER BY report_date DESC LIMIT 1),
  'archived',
  (SELECT MIN(report_date)::timestamptz FROM public.launch_daily_reports r4 WHERE r4.client_id = r.client_id),
  now()
FROM (SELECT DISTINCT client_id FROM public.launch_daily_reports) r;

UPDATE public.launch_daily_reports r
SET launch_id = l.id
FROM public.launches l
WHERE l.client_id = r.client_id AND r.launch_id IS NULL;

ALTER TABLE public.launch_daily_reports ALTER COLUMN launch_id SET NOT NULL;
ALTER TABLE public.launch_daily_reports DROP CONSTRAINT launch_daily_reports_client_id_report_date_key;
ALTER TABLE public.launch_daily_reports ADD CONSTRAINT launch_daily_reports_launch_date_key UNIQUE (launch_id, report_date);
CREATE INDEX idx_launch_daily_reports_launch_date ON public.launch_daily_reports(launch_id, report_date DESC);

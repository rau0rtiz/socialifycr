CREATE TABLE public.report_builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  title text NOT NULL,
  period_start date,
  period_end date,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed jsonb NOT NULL DEFAULT '{}'::jsonb,
  draft jsonb,
  content jsonb,
  proposal_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_builds TO authenticated;
GRANT ALL ON public.report_builds TO service_role;
ALTER TABLE public.report_builds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency members manage report builds" ON public.report_builds
  FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));
CREATE TRIGGER update_report_builds_updated_at BEFORE UPDATE ON public.report_builds
  FOR EACH ROW EXECUTE FUNCTION public.msg_touch_updated_at();
INSERT INTO public.ai_switches (feature, enabled, label, description) VALUES ('reports_builder', true, 'Reportes IA', 'Generador de reportes de pauta (borrador y reporte final)')
  ON CONFLICT (feature) DO NOTHING;
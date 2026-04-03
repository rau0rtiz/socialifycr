
CREATE TABLE public.setter_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  ig_conversations integer NOT NULL DEFAULT 0,
  wa_conversations integer NOT NULL DEFAULT 0,
  followups integer NOT NULL DEFAULT 0,
  appointments_made integer NOT NULL DEFAULT 0,
  day_notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, report_date)
);

ALTER TABLE public.setter_daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage daily reports" ON public.setter_daily_reports FOR ALL TO authenticated USING (is_admin_or_higher(auth.uid())) WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view daily reports" ON public.setter_daily_reports FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert daily reports" ON public.setter_daily_reports FOR INSERT TO authenticated WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update daily reports" ON public.setter_daily_reports FOR UPDATE TO authenticated USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete daily reports" ON public.setter_daily_reports FOR DELETE TO authenticated USING (has_client_access(auth.uid(), client_id));

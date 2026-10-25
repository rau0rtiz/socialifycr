CREATE TABLE public.content_calendar_goals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
 month date NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
 target integer NOT NULL CHECK (target > 0 AND target <= 10000),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (client_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_calendar_goals TO authenticated;
GRANT ALL ON public.content_calendar_goals TO service_role;
ALTER TABLE public.content_calendar_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency manages calendar goals" ON public.content_calendar_goals FOR ALL TO authenticated USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
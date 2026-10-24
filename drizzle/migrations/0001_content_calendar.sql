CREATE TABLE public.content_calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  shot_id uuid UNIQUE REFERENCES public.production_sheet_shots(id) ON DELETE SET NULL,
  sheet_id uuid REFERENCES public.production_sheets(id) ON DELETE SET NULL,
  clickup_task_id text,
  clickup_url text,
  title text NOT NULL DEFAULT 'Pieza sin título',
  copy text,
  explanation text,
  platform text,
  content_type text,
  thumbnail_url text,
  video_url text,
  publish_date date,
  status text NOT NULL DEFAULT 'pendiente',
  clickup_sync_error text,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.content_calendar_items(client_id, publish_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_calendar_items TO authenticated;
GRANT ALL ON public.content_calendar_items TO service_role;
ALTER TABLE public.content_calendar_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency all calendar items" ON public.content_calendar_items FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));
CREATE TRIGGER trg_cci_updated BEFORE UPDATE ON public.content_calendar_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.content_calendar_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.content_calendar_items(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_type text NOT NULL DEFAULT 'agencia',
  kind text NOT NULL DEFAULT 'nota',
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.content_calendar_comments(item_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_calendar_comments TO authenticated;
GRANT ALL ON public.content_calendar_comments TO service_role;
ALTER TABLE public.content_calendar_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency all calendar comments" ON public.content_calendar_comments FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));

CREATE TABLE public.content_calendar_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_calendar_shares TO authenticated;
GRANT ALL ON public.content_calendar_shares TO service_role;
ALTER TABLE public.content_calendar_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency all calendar shares" ON public.content_calendar_shares FOR ALL TO authenticated
  USING (public.is_agency_member(auth.uid())) WITH CHECK (public.is_agency_member(auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.content_calendar_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_calendar_comments;
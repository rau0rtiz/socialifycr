
CREATE TABLE public.daily_story_tracker (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  track_date date NOT NULL,
  stories_count integer NOT NULL DEFAULT 0,
  daily_revenue numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CRC',
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, track_date)
);

ALTER TABLE public.daily_story_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage story tracker" ON public.daily_story_tracker
  FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view story tracker" ON public.daily_story_tracker
  FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert story tracker" ON public.daily_story_tracker
  FOR INSERT TO authenticated
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update story tracker" ON public.daily_story_tracker
  FOR UPDATE TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete story tracker" ON public.daily_story_tracker
  FOR DELETE TO authenticated
  USING (has_client_access(auth.uid(), client_id));

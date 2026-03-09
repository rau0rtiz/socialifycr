-- Table to store archived Instagram stories
CREATE TABLE public.archived_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  story_id text NOT NULL,
  media_type text,
  media_url text,
  thumbnail_url text,
  permalink text,
  timestamp timestamptz NOT NULL,
  impressions integer DEFAULT 0,
  reach integer DEFAULT 0,
  replies integer DEFAULT 0,
  exits integer DEFAULT 0,
  taps_forward integer DEFAULT 0,
  taps_back integer DEFAULT 0,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, story_id)
);

ALTER TABLE public.archived_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage archived stories"
  ON public.archived_stories FOR ALL
  USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view archived stories"
  ON public.archived_stories FOR SELECT
  USING (has_client_access(auth.uid(), client_id));

CREATE INDEX idx_archived_stories_client_timestamp 
  ON public.archived_stories(client_id, timestamp DESC);

CREATE INDEX idx_archived_stories_story_id 
  ON public.archived_stories(story_id);
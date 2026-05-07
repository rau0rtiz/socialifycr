-- Add persistent thumbnail URL column
ALTER TABLE public.archived_stories
  ADD COLUMN IF NOT EXISTS persistent_thumbnail_url TEXT;

-- Create story-thumbnails bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-thumbnails', 'story-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
DROP POLICY IF EXISTS "Story thumbnails public read" ON storage.objects;
CREATE POLICY "Story thumbnails public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'story-thumbnails');

-- Only admins can manage via UI; service role bypasses RLS automatically
DROP POLICY IF EXISTS "Story thumbnails admin manage" ON storage.objects;
CREATE POLICY "Story thumbnails admin manage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'story-thumbnails' AND public.is_admin_or_higher(auth.uid()))
  WITH CHECK (bucket_id = 'story-thumbnails' AND public.is_admin_or_higher(auth.uid()));
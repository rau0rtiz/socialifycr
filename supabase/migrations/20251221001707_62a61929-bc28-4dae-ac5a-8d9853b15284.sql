-- Create video_ideas table
CREATE TABLE public.video_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'other')),
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  tag_id UUID REFERENCES public.content_tags(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.content_models(id) ON DELETE SET NULL,
  todos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.video_ideas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage video ideas"
ON public.video_ideas
FOR ALL
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view their client video ideas"
ON public.video_ideas
FOR SELECT
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert video ideas for their clients"
ON public.video_ideas
FOR INSERT
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update video ideas for their clients"
ON public.video_ideas
FOR UPDATE
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete video ideas for their clients"
ON public.video_ideas
FOR DELETE
USING (has_client_access(auth.uid(), client_id));

-- Create updated_at trigger
CREATE TRIGGER update_video_ideas_updated_at
BEFORE UPDATE ON public.video_ideas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
-- Content Tags table (client-specific tags)
CREATE TABLE public.content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'hsl(220, 70%, 50%)',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, name)
);

-- Enable RLS
ALTER TABLE public.content_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_tags
CREATE POLICY "Admins can manage tags"
ON public.content_tags FOR ALL
USING (public.is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view their client tags"
ON public.content_tags FOR SELECT
USING (public.has_client_access(auth.uid(), client_id));

-- Content Models table (models per client)
CREATE TABLE public.content_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_models ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_models
CREATE POLICY "Admins can manage models"
ON public.content_models FOR ALL
USING (public.is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view their client models"
ON public.content_models FOR SELECT
USING (public.has_client_access(auth.uid(), client_id));

-- Trigger for updated_at
CREATE TRIGGER update_content_models_updated_at
BEFORE UPDATE ON public.content_models
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Content Metadata table (stores custom data per post)
CREATE TABLE public.content_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  
  -- Custom tagging
  tag_id UUID REFERENCES public.content_tags(id) ON DELETE SET NULL,
  model_id UUID REFERENCES public.content_models(id) ON DELETE SET NULL,
  
  -- First 48h metrics (permanently saved)
  first_48h_views INTEGER,
  first_48h_likes INTEGER,
  first_48h_shares INTEGER,
  first_48h_comments INTEGER,
  first_48h_saves INTEGER,
  first_48h_captured_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(client_id, post_id)
);

-- Enable RLS
ALTER TABLE public.content_metadata ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_metadata
CREATE POLICY "Admins can manage metadata"
ON public.content_metadata FOR ALL
USING (public.is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view their client metadata"
ON public.content_metadata FOR SELECT
USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert metadata for their clients"
ON public.content_metadata FOR INSERT
WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update metadata for their clients"
ON public.content_metadata FOR UPDATE
USING (public.has_client_access(auth.uid(), client_id));

-- Trigger for updated_at
CREATE TRIGGER update_content_metadata_updated_at
BEFORE UPDATE ON public.content_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default tags for each client (Educational, Ad, Mindset)
INSERT INTO public.content_tags (client_id, name, color)
SELECT c.id, tag.name, tag.color
FROM public.clients c
CROSS JOIN (
  VALUES 
    ('Educativo', 'hsl(142, 76%, 36%)'),
    ('Anuncio', 'hsl(221, 83%, 53%)'),
    ('Mindset', 'hsl(262, 83%, 58%)')
) AS tag(name, color);
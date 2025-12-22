-- Create junction table for multiple tags per post
CREATE TABLE public.content_metadata_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metadata_id UUID NOT NULL REFERENCES public.content_metadata(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.content_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metadata_id, tag_id)
);

-- Create junction table for multiple models per post
CREATE TABLE public.content_metadata_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metadata_id UUID NOT NULL REFERENCES public.content_metadata(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.content_models(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metadata_id, model_id)
);

-- Enable RLS
ALTER TABLE public.content_metadata_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_metadata_models ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_metadata_tags
CREATE POLICY "Admins can manage metadata tags"
ON public.content_metadata_tags
FOR ALL
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view metadata tags"
ON public.content_metadata_tags
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.content_metadata cm
  WHERE cm.id = content_metadata_tags.metadata_id
  AND has_client_access(auth.uid(), cm.client_id)
));

CREATE POLICY "Team members can insert metadata tags"
ON public.content_metadata_tags
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.content_metadata cm
  WHERE cm.id = content_metadata_tags.metadata_id
  AND has_client_access(auth.uid(), cm.client_id)
));

CREATE POLICY "Team members can delete metadata tags"
ON public.content_metadata_tags
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.content_metadata cm
  WHERE cm.id = content_metadata_tags.metadata_id
  AND has_client_access(auth.uid(), cm.client_id)
));

-- RLS policies for content_metadata_models
CREATE POLICY "Admins can manage metadata models"
ON public.content_metadata_models
FOR ALL
USING (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view metadata models"
ON public.content_metadata_models
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.content_metadata cm
  WHERE cm.id = content_metadata_models.metadata_id
  AND has_client_access(auth.uid(), cm.client_id)
));

CREATE POLICY "Team members can insert metadata models"
ON public.content_metadata_models
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.content_metadata cm
  WHERE cm.id = content_metadata_models.metadata_id
  AND has_client_access(auth.uid(), cm.client_id)
));

CREATE POLICY "Team members can delete metadata models"
ON public.content_metadata_models
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.content_metadata cm
  WHERE cm.id = content_metadata_models.metadata_id
  AND has_client_access(auth.uid(), cm.client_id)
));
-- Add content development fields to video_ideas table
ALTER TABLE public.video_ideas
ADD COLUMN content_type TEXT DEFAULT 'reel' CHECK (content_type IN ('reel', 'post', 'carousel')),
ADD COLUMN script TEXT,
ADD COLUMN reference_video_url TEXT,
ADD COLUMN post_image_url TEXT,
ADD COLUMN post_description TEXT,
ADD COLUMN carousel_slides JSONB DEFAULT '[]'::jsonb,
ADD COLUMN generated_copy TEXT,
ADD COLUMN copy_generated_at TIMESTAMPTZ;
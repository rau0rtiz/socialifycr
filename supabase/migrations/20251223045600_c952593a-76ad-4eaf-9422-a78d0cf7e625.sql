-- Create table for manual crosspost links
CREATE TABLE public.crosspost_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  primary_post_id TEXT NOT NULL,
  linked_post_id TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, primary_post_id, linked_post_id)
);

-- Enable RLS
ALTER TABLE public.crosspost_links ENABLE ROW LEVEL SECURITY;

-- Policies for team members
CREATE POLICY "Team members can view crosspost links"
  ON public.crosspost_links
  FOR SELECT
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can create crosspost links"
  ON public.crosspost_links
  FOR INSERT
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete crosspost links"
  ON public.crosspost_links
  FOR DELETE
  USING (public.has_client_access(auth.uid(), client_id));
-- Create table for client competitors
CREATE TABLE public.client_competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('youtube', 'instagram', 'facebook', 'tiktok', 'twitter', 'linkedin')),
  username text NOT NULL,
  display_name text,
  profile_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(client_id, platform, username)
);

-- Enable RLS
ALTER TABLE public.client_competitors ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage competitors"
ON public.client_competitors
FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- Team members can view their client's competitors
CREATE POLICY "Team members can view competitors"
ON public.client_competitors
FOR SELECT
USING (has_client_access(auth.uid(), client_id));

-- Editors and account managers can insert competitors
CREATE POLICY "Editors and managers can insert competitors"
ON public.client_competitors
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_team_members
    WHERE user_id = auth.uid()
      AND client_id = client_competitors.client_id
      AND role IN ('editor', 'account_manager')
  )
);

-- Editors and account managers can update competitors
CREATE POLICY "Editors and managers can update competitors"
ON public.client_competitors
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_team_members
    WHERE user_id = auth.uid()
      AND client_id = client_competitors.client_id
      AND role IN ('editor', 'account_manager')
  )
);

-- Editors and account managers can delete competitors
CREATE POLICY "Editors and managers can delete competitors"
ON public.client_competitors
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.client_team_members
    WHERE user_id = auth.uid()
      AND client_id = client_competitors.client_id
      AND role IN ('editor', 'account_manager')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_client_competitors_updated_at
  BEFORE UPDATE ON public.client_competitors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
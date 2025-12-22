-- Create client_invitations table for copy-paste invitation links
CREATE TABLE public.client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role client_role NOT NULL DEFAULT 'viewer',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(token)
);

-- Enable RLS
ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage invitations"
ON public.client_invitations
FOR ALL
USING (is_admin_or_higher(auth.uid()));

-- Agency users can create invitations for clients they have access to
CREATE POLICY "Team members can create invitations for their clients"
ON public.client_invitations
FOR INSERT
WITH CHECK (has_client_access(auth.uid(), client_id));

-- Agency users can view invitations for their clients
CREATE POLICY "Team members can view their client invitations"
ON public.client_invitations
FOR SELECT
USING (has_client_access(auth.uid(), client_id));

-- Allow public read access for token validation (needed for accept-invite page)
CREATE POLICY "Anyone can validate invitation tokens"
ON public.client_invitations
FOR SELECT
USING (token IS NOT NULL AND accepted_at IS NULL AND expires_at > now());

-- Create index for faster token lookup
CREATE INDEX idx_client_invitations_token ON public.client_invitations(token);
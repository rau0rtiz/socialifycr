-- Create a public function to get invitation details (works without auth)
CREATE OR REPLACE FUNCTION public.get_client_invitation_public(_token uuid)
RETURNS TABLE(
  email text,
  role client_role,
  client_id uuid,
  client_name text,
  invitee_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.email,
    i.role,
    i.client_id,
    c.name as client_name,
    NULL::text as invitee_name -- Placeholder for future name field
  FROM public.client_invitations i
  JOIN public.clients c ON c.id = i.client_id
  WHERE i.token = _token
    AND i.accepted_at IS NULL
    AND i.expires_at > now()
$$;

-- Update accept_client_invitation to verify email matches the authenticated user
CREATE OR REPLACE FUNCTION public.accept_client_invitation(_token uuid)
RETURNS TABLE(client_id uuid, role client_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the authenticated user's email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();

  SELECT i.id, i.client_id, i.role, i.email
  INTO inv
  FROM public.client_invitations i
  WHERE i.token = _token
    AND i.accepted_at IS NULL
    AND i.expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation is invalid or expired';
  END IF;

  -- Verify the email matches
  IF lower(inv.email) != lower(user_email) THEN
    RAISE EXCEPTION 'Email mismatch: this invitation was sent to a different email address';
  END IF;

  -- Add or update membership for the current user
  IF EXISTS (
    SELECT 1
    FROM public.client_team_members m
    WHERE m.client_id = inv.client_id
      AND m.user_id = auth.uid()
  ) THEN
    UPDATE public.client_team_members
    SET role = inv.role
    WHERE client_id = inv.client_id
      AND user_id = auth.uid();
  ELSE
    INSERT INTO public.client_team_members (client_id, user_id, role)
    VALUES (inv.client_id, auth.uid(), inv.role);
  END IF;

  -- Mark invitation as accepted
  UPDATE public.client_invitations
  SET accepted_at = now()
  WHERE id = inv.id;

  client_id := inv.client_id;
  role := inv.role;
  RETURN NEXT;
END;
$$;

-- Add invitee_name column to client_invitations for storing the name
ALTER TABLE public.client_invitations 
ADD COLUMN IF NOT EXISTS invitee_name text;

-- Update the public function to include invitee_name
CREATE OR REPLACE FUNCTION public.get_client_invitation_public(_token uuid)
RETURNS TABLE(
  email text,
  role client_role,
  client_id uuid,
  client_name text,
  invitee_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.email,
    i.role,
    i.client_id,
    c.name as client_name,
    i.invitee_name
  FROM public.client_invitations i
  JOIN public.clients c ON c.id = i.client_id
  WHERE i.token = _token
    AND i.accepted_at IS NULL
    AND i.expires_at > now()
$$;
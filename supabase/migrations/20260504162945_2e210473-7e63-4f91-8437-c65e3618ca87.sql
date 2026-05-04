GRANT SELECT (token) ON public.client_invitations TO anon, authenticated;

DROP POLICY IF EXISTS "Team members can view their client invitations" ON public.client_invitations;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  client_id uuid,
  client_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.email, i.role::text, i.client_id, c.name AS client_name
  FROM public.client_invitations i
  LEFT JOIN public.clients c ON c.id = i.client_id
  WHERE i.token = _token
    AND i.accepted_at IS NULL
    AND i.expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_by_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(uuid) TO anon, authenticated;
-- Secure server-side acceptance of client invitations
-- Allows any authenticated user with a valid token to join the client team,
-- without opening up direct INSERT/UPDATE permissions on sensitive tables.

CREATE OR REPLACE FUNCTION public.accept_client_invitation(_token uuid)
RETURNS TABLE (
  client_id uuid,
  role public.client_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT i.id, i.client_id, i.role
  INTO inv
  FROM public.client_invitations i
  WHERE i.token = _token
    AND i.accepted_at IS NULL
    AND i.expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation is invalid or expired';
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

-- Lock down function execution
REVOKE ALL ON FUNCTION public.accept_client_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_client_invitation(uuid) TO authenticated;
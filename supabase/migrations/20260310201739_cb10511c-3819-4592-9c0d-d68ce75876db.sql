
CREATE OR REPLACE FUNCTION public.get_users_last_sign_in(user_ids uuid[])
RETURNS TABLE(user_id uuid, last_sign_in_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id as user_id, u.last_sign_in_at
  FROM auth.users u
  WHERE u.id = ANY(user_ids)
    AND public.is_admin_or_higher(auth.uid())
$$;

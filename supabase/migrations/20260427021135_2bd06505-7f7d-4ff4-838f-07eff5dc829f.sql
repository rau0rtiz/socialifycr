
-- The previous CREATE OR REPLACE already had SET search_path = public, but the
-- linter warning was pre-existing for other functions. This is a no-op safety
-- redefinition to ensure the search_path is locked.

CREATE OR REPLACE FUNCTION public.is_agency_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'admin', 'manager', 'media_buyer', 'closer', 'setter')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_ad_frameworks(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('owner', 'admin', 'manager')
  )
$$;

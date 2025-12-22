-- 1. Create SECURITY DEFINER function to check team membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_team_members
    WHERE user_id = _user_id AND client_id = _client_id
  )
$$;

-- 2. Create helper function to check if user is account_manager for a client
CREATE OR REPLACE FUNCTION public.is_account_manager(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_team_members
    WHERE user_id = _user_id 
      AND client_id = _client_id 
      AND role = 'account_manager'
  )
$$;

-- 3. Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Team members can view their client team members" ON public.client_team_members;
DROP POLICY IF EXISTS "Account managers can update their client team members" ON public.client_team_members;
DROP POLICY IF EXISTS "Account managers can delete their client team members" ON public.client_team_members;

-- 4. Create new policies using the SECURITY DEFINER functions
CREATE POLICY "Team members can view their client team members"
ON public.client_team_members
FOR SELECT
USING (is_team_member(auth.uid(), client_id));

CREATE POLICY "Account managers can update their client team members"
ON public.client_team_members
FOR UPDATE
USING (is_account_manager(auth.uid(), client_id));

CREATE POLICY "Account managers can delete their client team members"
ON public.client_team_members
FOR DELETE
USING (is_account_manager(auth.uid(), client_id));

-- 5. Update has_client_access to use the new function for consistency
CREATE OR REPLACE FUNCTION public.has_client_access(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_team_member(_user_id, _client_id) 
      OR public.is_admin_or_higher(_user_id)
$$;
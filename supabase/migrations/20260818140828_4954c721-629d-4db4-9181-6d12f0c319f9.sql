-- 1. client_invitations: only account managers or admins can create invitations,
-- and non-admin inviters cannot grant account_manager role.
DROP POLICY IF EXISTS "Team members can create invitations for their clients" ON public.client_invitations;

CREATE POLICY "Account managers can create invitations for their clients"
ON public.client_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_or_higher(auth.uid())
  OR (
    public.is_account_manager(auth.uid(), client_id)
    AND role <> 'account_manager'::public.client_role
  )
);

-- 2. client_team_members: account managers cannot escalate roles or edit their own row.
DROP POLICY IF EXISTS "Account managers can update their client team members" ON public.client_team_members;

CREATE POLICY "Account managers can update their client team members"
ON public.client_team_members
FOR UPDATE
TO authenticated
USING (
  public.is_account_manager(auth.uid(), client_id)
  AND user_id <> auth.uid()
)
WITH CHECK (
  public.is_account_manager(auth.uid(), client_id)
  AND user_id <> auth.uid()
  AND role <> 'account_manager'::public.client_role
);

DROP POLICY IF EXISTS "Account managers can delete their client team members" ON public.client_team_members;

CREATE POLICY "Account managers can delete their client team members"
ON public.client_team_members
FOR DELETE
TO authenticated
USING (public.is_account_manager(auth.uid(), client_id));

DROP POLICY IF EXISTS "Team members can view their client team members" ON public.client_team_members;

CREATE POLICY "Team members can view their client team members"
ON public.client_team_members
FOR SELECT
TO authenticated
USING (public.is_team_member(auth.uid(), client_id));
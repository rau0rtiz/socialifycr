-- Allow account managers to update team members of their clients
CREATE POLICY "Account managers can update their client team members"
ON public.client_team_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM client_team_members my_membership
    WHERE my_membership.user_id = auth.uid()
    AND my_membership.client_id = client_team_members.client_id
    AND my_membership.role = 'account_manager'
  )
);

-- Allow account managers to delete team members of their clients
CREATE POLICY "Account managers can delete their client team members"
ON public.client_team_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM client_team_members my_membership
    WHERE my_membership.user_id = auth.uid()
    AND my_membership.client_id = client_team_members.client_id
    AND my_membership.role = 'account_manager'
  )
);
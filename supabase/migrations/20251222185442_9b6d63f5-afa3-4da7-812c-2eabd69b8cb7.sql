-- Allow team members to view profiles of other team members in their clients
CREATE POLICY "Team members can view profiles of their team"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_team_members my_teams
    JOIN client_team_members their_teams ON my_teams.client_id = their_teams.client_id
    WHERE my_teams.user_id = auth.uid()
    AND their_teams.user_id = profiles.id
  )
);

-- Allow team members to view other team members of the same client
CREATE POLICY "Team members can view their client team members"
ON public.client_team_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_team_members my_membership
    WHERE my_membership.user_id = auth.uid()
    AND my_membership.client_id = client_team_members.client_id
  )
);
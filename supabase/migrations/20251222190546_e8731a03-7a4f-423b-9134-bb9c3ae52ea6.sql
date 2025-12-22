-- Drop the existing foreign key that points to auth.users
ALTER TABLE public.client_team_members
DROP CONSTRAINT client_team_members_user_id_fkey;

-- Add new foreign key that points to profiles
ALTER TABLE public.client_team_members
ADD CONSTRAINT client_team_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
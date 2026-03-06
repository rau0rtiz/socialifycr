
-- Fix 1: Remove overly permissive public SELECT on client_invitations
-- The SECURITY DEFINER functions (get_client_invitation_public, accept_client_invitation) bypass RLS,
-- so this public policy is unnecessary and exposes emails/tokens.
DROP POLICY IF EXISTS "Anyone can validate invitation tokens" ON public.client_invitations;

-- Fix 2: Remove overly broad profile visibility across clients
DROP POLICY IF EXISTS "Team members can view profiles of their team" ON public.profiles;

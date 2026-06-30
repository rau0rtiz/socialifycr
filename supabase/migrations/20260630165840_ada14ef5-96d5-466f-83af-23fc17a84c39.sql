
-- client_invitations: hide token column from Data API
REVOKE SELECT ON public.client_invitations FROM authenticated, anon;
GRANT SELECT (id, client_id, email, role, invited_by, expires_at, accepted_at, created_at, invitee_name)
  ON public.client_invitations TO authenticated;
GRANT ALL ON public.client_invitations TO service_role;

-- platform_connections: hide access_token & refresh_token from Data API
REVOKE SELECT ON public.platform_connections FROM authenticated, anon;
GRANT SELECT (id, client_id, platform, status, token_expires_at, platform_user_id,
              platform_page_id, platform_page_name, connected_by, created_at, updated_at,
              instagram_account_id, ad_account_id, permissions)
  ON public.platform_connections TO authenticated;
GRANT ALL ON public.platform_connections TO service_role;

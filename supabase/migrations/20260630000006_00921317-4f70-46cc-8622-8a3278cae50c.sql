REVOKE SELECT (access_token, refresh_token) ON public.platform_connections FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.platform_connections FROM anon;

GRANT SELECT (
  id, client_id, platform, status, ad_account_id, instagram_account_id,
  platform_page_id, platform_page_name, platform_user_id, permissions,
  token_expires_at, connected_by, created_at, updated_at
) ON public.platform_connections TO authenticated;

REVOKE ALL ON public.agency_meta_connection FROM anon, authenticated;
GRANT ALL ON public.agency_meta_connection TO service_role;

DROP POLICY IF EXISTS "Agency members manage meta accounts" ON public.agency_meta_connection;
DROP POLICY IF EXISTS "Service role only" ON public.agency_meta_connection;

CREATE POLICY "Service role only"
ON public.agency_meta_connection
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can create audit logs for accessible clients" ON public.audit_logs;

CREATE POLICY "Users can create audit logs for accessible clients"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND ((client_id IS NULL) OR public.has_client_access(auth.uid(), client_id))
  AND action IN (
    'client.delete','client.create','client.update',
    'platform.connect','platform.disconnect',
    'team_member.add','team_member.remove'
  )
  AND entity_type IN ('client','platform_connection','team_member')
);
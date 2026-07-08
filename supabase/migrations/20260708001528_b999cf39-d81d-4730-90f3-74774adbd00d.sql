
-- Restrict email_templates SELECT to admins
DROP POLICY IF EXISTS "Authenticated can view templates" ON public.email_templates;
CREATE POLICY "Admins can view templates"
  ON public.email_templates
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_higher(auth.uid()));

-- Prevent team members from reading raw OAuth tokens on platform_connections.
-- RLS is row-level; use column-level privileges to hide token columns from client-role reads.
-- Service role bypasses privilege checks, so edge functions retain full access.
REVOKE SELECT (access_token, refresh_token) ON public.platform_connections FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.platform_connections FROM anon;

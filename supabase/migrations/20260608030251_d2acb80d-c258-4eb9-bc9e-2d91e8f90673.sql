
-- 1) Restrict agency_meta_connection to admin/owner only (tokens are sensitive)
DROP POLICY IF EXISTS "Agency members manage meta connection" ON public.agency_meta_connection;
CREATE POLICY "Admins manage meta connection"
  ON public.agency_meta_connection
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_admin_or_higher(auth.uid()));

-- 2) Remove broad authenticated upload policy on storage objects for content-images.
--    More specific policies (client_content_insert, avatar_insert, admin_imgdb_insert) remain.
DROP POLICY IF EXISTS "Authenticated users can upload to content-images" ON storage.objects;

-- 3) Restrict raw OAuth tokens on platform_connections to service_role only.
--    Authenticated users (incl. admins) keep access to all non-token metadata via the existing RLS policies.
--    Edge functions use service_role and bypass these column grants.
REVOKE SELECT (access_token, refresh_token) ON public.platform_connections FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.platform_connections FROM anon;
-- service_role keeps full access (granted via GRANT ALL elsewhere)

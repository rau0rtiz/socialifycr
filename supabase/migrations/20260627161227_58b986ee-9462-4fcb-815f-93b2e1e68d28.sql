
-- 1) agency_meta_connection: revoke from authenticated, keep service_role only
DROP POLICY IF EXISTS "Admins manage meta connection" ON public.agency_meta_connection;
REVOKE ALL ON public.agency_meta_connection FROM authenticated, anon;
GRANT ALL ON public.agency_meta_connection TO service_role;

-- 2) platform_connections: revoke token columns from authenticated
REVOKE SELECT (access_token, refresh_token) ON public.platform_connections FROM authenticated, anon;
GRANT ALL ON public.platform_connections TO service_role;

-- 3) audit_logs: enforce client access on INSERT
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;
CREATE POLICY "Users can create audit logs for accessible clients"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    client_id IS NULL
    OR public.has_client_access(auth.uid(), client_id)
  )
);

-- 4) Storage: drop legacy avatar policies (the newer avatar_* policies remain)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

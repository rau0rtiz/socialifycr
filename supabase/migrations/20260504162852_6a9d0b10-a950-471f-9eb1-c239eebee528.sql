-- 1) platform_connections: revoke column access to tokens for authenticated role
REVOKE SELECT (access_token, refresh_token) ON public.platform_connections FROM authenticated;
REVOKE SELECT (access_token, refresh_token) ON public.platform_connections FROM anon;

-- 2) agency_meta_connection: revoke column access to access_token for authenticated role
REVOKE SELECT (access_token) ON public.agency_meta_connection FROM authenticated;
REVOKE SELECT (access_token) ON public.agency_meta_connection FROM anon;

-- 3) client_invitations: revoke column access to token for authenticated role
REVOKE SELECT (token) ON public.client_invitations FROM authenticated;
REVOKE SELECT (token) ON public.client_invitations FROM anon;

-- 4) launch_phase_tasks: restrict to authenticated + has_client_access
DROP POLICY IF EXISTS "View tasks for accessible campaigns" ON public.launch_phase_tasks;
DROP POLICY IF EXISTS "Insert tasks for accessible campaigns" ON public.launch_phase_tasks;
DROP POLICY IF EXISTS "Update tasks for accessible campaigns" ON public.launch_phase_tasks;
DROP POLICY IF EXISTS "Delete tasks for accessible campaigns" ON public.launch_phase_tasks;

CREATE POLICY "View tasks for accessible campaigns"
ON public.launch_phase_tasks FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ad_campaigns c
  WHERE c.id = launch_phase_tasks.campaign_id
    AND (c.client_id IS NULL OR public.has_client_access(auth.uid(), c.client_id))
));

CREATE POLICY "Insert tasks for accessible campaigns"
ON public.launch_phase_tasks FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.ad_campaigns c
  WHERE c.id = launch_phase_tasks.campaign_id
    AND (c.client_id IS NULL OR public.has_client_access(auth.uid(), c.client_id))
));

CREATE POLICY "Update tasks for accessible campaigns"
ON public.launch_phase_tasks FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ad_campaigns c
  WHERE c.id = launch_phase_tasks.campaign_id
    AND (c.client_id IS NULL OR public.has_client_access(auth.uid(), c.client_id))
));

CREATE POLICY "Delete tasks for accessible campaigns"
ON public.launch_phase_tasks FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ad_campaigns c
  WHERE c.id = launch_phase_tasks.campaign_id
    AND (c.client_id IS NULL OR public.has_client_access(auth.uid(), c.client_id))
));

-- 5) audit_logs: restrict INSERT to authenticated only
DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can create audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 6) Storage: drop overly broad delete/update policies on content-images
DROP POLICY IF EXISTS "Authenticated users can delete from content-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update content-images" ON storage.objects;
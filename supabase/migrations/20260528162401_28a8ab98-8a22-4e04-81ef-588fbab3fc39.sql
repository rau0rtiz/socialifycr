
DROP POLICY IF EXISTS "View tasks for accessible campaigns" ON public.launch_phase_tasks;
DROP POLICY IF EXISTS "Insert tasks for accessible campaigns" ON public.launch_phase_tasks;
DROP POLICY IF EXISTS "Update tasks for accessible campaigns" ON public.launch_phase_tasks;
DROP POLICY IF EXISTS "Delete tasks for accessible campaigns" ON public.launch_phase_tasks;

CREATE POLICY "View tasks for accessible campaigns" ON public.launch_phase_tasks
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.ad_campaigns c
  WHERE c.id = launch_phase_tasks.campaign_id
    AND c.client_id IS NOT NULL
    AND public.has_client_access(auth.uid(), c.client_id)
));

CREATE POLICY "Insert tasks for accessible campaigns" ON public.launch_phase_tasks
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.ad_campaigns c
  WHERE c.id = launch_phase_tasks.campaign_id
    AND c.client_id IS NOT NULL
    AND public.has_client_access(auth.uid(), c.client_id)
));

CREATE POLICY "Update tasks for accessible campaigns" ON public.launch_phase_tasks
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.ad_campaigns c
  WHERE c.id = launch_phase_tasks.campaign_id
    AND c.client_id IS NOT NULL
    AND public.has_client_access(auth.uid(), c.client_id)
));

CREATE POLICY "Delete tasks for accessible campaigns" ON public.launch_phase_tasks
FOR DELETE USING (EXISTS (
  SELECT 1 FROM public.ad_campaigns c
  WHERE c.id = launch_phase_tasks.campaign_id
    AND c.client_id IS NOT NULL
    AND public.has_client_access(auth.uid(), c.client_id)
));

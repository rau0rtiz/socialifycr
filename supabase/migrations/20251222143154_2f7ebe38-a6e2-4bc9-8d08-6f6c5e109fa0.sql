-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage reports" ON public.saved_reports;
DROP POLICY IF EXISTS "Team members can view their client reports" ON public.saved_reports;
DROP POLICY IF EXISTS "Team members can create reports for their clients" ON public.saved_reports;
DROP POLICY IF EXISTS "Team members can delete their own reports" ON public.saved_reports;

-- Recreate as PERMISSIVE policies (default, using OR logic)
CREATE POLICY "Admins can manage reports"
ON public.saved_reports
FOR ALL
TO authenticated
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view their client reports"
ON public.saved_reports
FOR SELECT
TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can create reports for their clients"
ON public.saved_reports
FOR INSERT
TO authenticated
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update their client reports"
ON public.saved_reports
FOR UPDATE
TO authenticated
USING (has_client_access(auth.uid(), client_id))
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete their own reports"
ON public.saved_reports
FOR DELETE
TO authenticated
USING (has_client_access(auth.uid(), client_id) AND created_by = auth.uid());
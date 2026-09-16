
CREATE POLICY "agency_private_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'agency-private' AND public.is_agency_member(auth.uid()));

CREATE POLICY "agency_private_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'agency-private' AND public.is_admin_or_higher(auth.uid()));

CREATE POLICY "agency_private_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'agency-private' AND public.is_admin_or_higher(auth.uid()))
WITH CHECK (bucket_id = 'agency-private' AND public.is_admin_or_higher(auth.uid()));

CREATE POLICY "agency_private_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'agency-private' AND public.is_admin_or_higher(auth.uid()));

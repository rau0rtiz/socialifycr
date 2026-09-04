CREATE POLICY "agency_assets_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-images' AND (storage.foldername(name))[1] = 'agency-payments' AND is_admin_or_higher(auth.uid()));

CREATE POLICY "agency_assets_select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'content-images' AND (storage.foldername(name))[1] = 'agency-payments' AND is_admin_or_higher(auth.uid()));

CREATE POLICY "agency_assets_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'content-images' AND (storage.foldername(name))[1] = 'agency-payments' AND is_admin_or_higher(auth.uid()))
WITH CHECK (bucket_id = 'content-images' AND (storage.foldername(name))[1] = 'agency-payments' AND is_admin_or_higher(auth.uid()));

CREATE POLICY "agency_assets_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'content-images' AND (storage.foldername(name))[1] = 'agency-payments' AND is_admin_or_higher(auth.uid()));
-- Add storage policy for imgdb folder (admin only)
CREATE POLICY "admin_imgdb_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'content-images' 
  AND (storage.foldername(name))[1] = 'imgdb'
  AND is_admin_or_higher(auth.uid())
);

CREATE POLICY "admin_imgdb_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'content-images' 
  AND (storage.foldername(name))[1] = 'imgdb'
  AND is_admin_or_higher(auth.uid())
);

CREATE POLICY "admin_imgdb_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'content-images' 
  AND (storage.foldername(name))[1] = 'imgdb'
  AND is_admin_or_higher(auth.uid())
);

CREATE POLICY "admin_imgdb_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'content-images' 
  AND (storage.foldername(name))[1] = 'imgdb'
  AND is_admin_or_higher(auth.uid())
);
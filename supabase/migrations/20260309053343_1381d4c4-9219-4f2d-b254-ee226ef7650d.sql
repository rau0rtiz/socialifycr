-- Fix storage RLS policies: prevent UUID cast errors for non-client folders like 'imgdb'
-- Existing client_content_* policies cast the top-level folder to uuid; when uploading to imgdb/... this causes 22P02.

DROP POLICY IF EXISTS client_content_insert ON storage.objects;
DROP POLICY IF EXISTS client_content_select ON storage.objects;
DROP POLICY IF EXISTS client_content_delete ON storage.objects;

-- Client-scoped content (top-level folder is the client_id UUID)
CREATE POLICY client_content_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] <> 'avatars'
  AND (storage.foldername(name))[1] <> 'imgdb'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY client_content_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] <> 'avatars'
  AND (storage.foldername(name))[1] <> 'imgdb'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY client_content_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] <> 'avatars'
  AND (storage.foldername(name))[1] <> 'imgdb'
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

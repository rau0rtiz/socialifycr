
-- Drop the problematic policies that try to cast 'avatars' to UUID
DROP POLICY IF EXISTS "Users can view content images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload content images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete content images" ON storage.objects;

-- Recreate them with a guard that skips the UUID cast for the 'avatars' folder
CREATE POLICY "Users can view content images" ON storage.objects
FOR SELECT USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] != 'avatars'
  AND has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Users can upload content images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] != 'avatars'
  AND has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Users can delete content images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] != 'avatars'
  AND has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

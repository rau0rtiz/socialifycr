-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to update (upsert) their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid() IS NOT NULL
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND auth.uid() IS NOT NULL
);
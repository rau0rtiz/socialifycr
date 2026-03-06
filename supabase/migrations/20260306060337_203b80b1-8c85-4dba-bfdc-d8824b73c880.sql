
-- Drop ALL existing storage policies to start clean
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view content images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload content images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete content images" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update policy" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete policy" ON storage.objects;

-- 1. Public read for all content-images (bucket is public)
CREATE POLICY "public_read_content_images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'content-images');

-- 2. Avatar upload: any authenticated user can upload to avatars/{their_user_id}.*
CREATE POLICY "avatar_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- 3. Avatar update
CREATE POLICY "avatar_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- 4. Avatar delete
CREATE POLICY "avatar_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- 5. Client content upload (non-avatar folders, folder name is a client UUID)
CREATE POLICY "client_content_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] != 'avatars'
  AND public.has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- 6. Client content read
CREATE POLICY "client_content_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] != 'avatars'
  AND public.has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- 7. Client content delete
CREATE POLICY "client_content_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] != 'avatars'
  AND public.has_client_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

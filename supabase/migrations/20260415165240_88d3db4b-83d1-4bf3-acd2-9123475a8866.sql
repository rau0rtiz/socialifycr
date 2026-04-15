-- Allow authenticated users to upload files to the content-images bucket
CREATE POLICY "Authenticated users can upload to content-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content-images');

-- Allow authenticated users to delete files from content-images bucket
CREATE POLICY "Authenticated users can delete from content-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'content-images');

-- Allow authenticated users to update files in content-images bucket
CREATE POLICY "Authenticated users can update content-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'content-images');

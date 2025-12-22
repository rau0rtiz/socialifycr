-- Create storage bucket for content images
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-images', 'content-images', true);

-- Allow authenticated users to upload images to their client folders
CREATE POLICY "Users can upload content images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND public.has_client_access(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Allow authenticated users to view images for their clients
CREATE POLICY "Users can view content images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'content-images'
  AND public.has_client_access(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Allow public access to content images (since bucket is public)
CREATE POLICY "Public can view content images"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'content-images');

-- Allow authenticated users to delete their images
CREATE POLICY "Users can delete content images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND public.has_client_access(auth.uid(), (storage.foldername(name))[1]::uuid)
);
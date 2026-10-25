-- Allow agency members to manage calendar thumbnail images in content-images/calendar/
CREATE POLICY "Agency can upload calendar thumbnails"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'calendar'
  AND public.is_agency_member(auth.uid())
);

CREATE POLICY "Agency can update calendar thumbnails"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'calendar'
  AND public.is_agency_member(auth.uid())
)
WITH CHECK (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'calendar'
  AND public.is_agency_member(auth.uid())
);

CREATE POLICY "Agency can delete calendar thumbnails"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'calendar'
  AND public.is_agency_member(auth.uid())
);
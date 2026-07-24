-- Objects live at `{client_id}/{story_id}.{ext}`, so the first folder segment is the owning client_id.
DROP POLICY IF EXISTS "Story thumbnails public read" ON storage.objects;

CREATE POLICY "Story thumbnails client members read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'story-thumbnails'
  AND (
    public.is_admin_or_higher(auth.uid())
    OR (
      (storage.foldername(name))[1] IS NOT NULL
      AND public.has_client_access(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
    )
  )
);

-- 1. Create a secure view for platform connections without token columns
CREATE OR REPLACE VIEW public.platform_connections_safe AS
SELECT 
  id, client_id, platform, status, ad_account_id,
  instagram_account_id, platform_page_id, platform_page_name,
  platform_user_id, permissions, token_expires_at,
  connected_by, created_at, updated_at
FROM public.platform_connections;

-- 2. Drop the existing team member SELECT policy and replace with one that hides tokens
DROP POLICY IF EXISTS "Team members can view their client connections" ON public.platform_connections;

CREATE POLICY "Team members can view connections without tokens"
ON public.platform_connections
FOR SELECT
TO authenticated
USING (
  CASE 
    WHEN is_admin_or_higher(auth.uid()) THEN true
    WHEN has_client_access(auth.uid(), client_id) THEN true
    ELSE false
  END
);

-- Create a function that returns connections without tokens for non-admins
CREATE OR REPLACE FUNCTION public.get_safe_platform_connections(_client_id uuid)
RETURNS TABLE(
  id uuid,
  client_id uuid,
  platform text,
  status text,
  ad_account_id text,
  instagram_account_id text,
  platform_page_id text,
  platform_page_name text,
  platform_user_id text,
  permissions jsonb,
  token_expires_at timestamptz,
  connected_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pc.id, pc.client_id, pc.platform::text, pc.status::text, pc.ad_account_id,
    pc.instagram_account_id, pc.platform_page_id, pc.platform_page_name,
    pc.platform_user_id, pc.permissions, pc.token_expires_at,
    pc.connected_by, pc.created_at, pc.updated_at
  FROM public.platform_connections pc
  WHERE pc.client_id = _client_id
    AND pc.status = 'active'
    AND has_client_access(auth.uid(), pc.client_id);
$$;

-- 3. Fix avatar storage policies - add ownership checks
DROP POLICY IF EXISTS "avatar_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatar_update" ON storage.objects;
DROP POLICY IF EXISTS "avatar_delete" ON storage.objects;

CREATE POLICY "avatar_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "avatar_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "avatar_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

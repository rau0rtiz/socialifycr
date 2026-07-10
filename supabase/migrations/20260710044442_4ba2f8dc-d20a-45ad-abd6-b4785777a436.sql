REVOKE SELECT ON public.platform_connections FROM authenticated;
REVOKE SELECT ON public.platform_connections FROM anon;
GRANT SELECT (
  id, client_id, platform, status, ad_account_id, instagram_account_id,
  platform_page_id, platform_page_name, platform_user_id, permissions,
  token_expires_at, connected_by, created_at, updated_at
) ON public.platform_connections TO authenticated;
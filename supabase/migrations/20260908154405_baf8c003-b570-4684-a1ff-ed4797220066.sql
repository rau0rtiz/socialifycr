CREATE OR REPLACE FUNCTION public.get_safe_platform_connections(_client_id uuid)
RETURNS TABLE(id uuid, client_id uuid, platform text, status text, ad_account_id text, instagram_account_id text, platform_page_id text, platform_page_name text, platform_user_id text, permissions jsonb, token_expires_at timestamp with time zone, connected_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    pc.id, pc.client_id, pc.platform::text, pc.status::text, pc.ad_account_id,
    pc.instagram_account_id, pc.platform_page_id, pc.platform_page_name,
    pc.platform_user_id, pc.permissions, pc.token_expires_at,
    pc.connected_by, pc.created_at, pc.updated_at
  FROM public.platform_connections pc
  WHERE pc.client_id = _client_id
    AND pc.status = 'active'
    AND (is_agency_member(auth.uid()) OR has_client_access(auth.uid(), pc.client_id))
  ORDER BY pc.created_at;
$function$;
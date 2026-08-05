ALTER TABLE public.agency_meta_connection
  ADD COLUMN IF NOT EXISTS ad_account_id text,
  ADD COLUMN IF NOT EXISTS ad_account_name text;

ALTER TABLE public.funnels
  ADD COLUMN IF NOT EXISTS meta_ad_account_id text,
  ADD COLUMN IF NOT EXISTS meta_campaign_id text,
  ADD COLUMN IF NOT EXISTS meta_campaign_name text;

CREATE POLICY "Agency members can update funnel tracking"
ON public.funnels FOR UPDATE
TO authenticated
USING (public.is_agency_member(auth.uid()))
WITH CHECK (public.is_agency_member(auth.uid()));

GRANT SELECT, UPDATE ON public.funnels TO authenticated;
GRANT ALL ON public.funnels TO service_role;

CREATE OR REPLACE FUNCTION public.get_agency_meta_status()
RETURNS TABLE(
  id uuid,
  user_name text,
  business_id text,
  ad_account_id text,
  ad_account_name text,
  token_expires_at timestamptz,
  connected_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.user_name, c.business_id, c.ad_account_id, c.ad_account_name,
         c.token_expires_at, c.created_at
  FROM public.agency_meta_connection c
  WHERE public.is_agency_member(auth.uid())
  ORDER BY c.updated_at DESC
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_agency_meta_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_agency_meta_status() TO authenticated;
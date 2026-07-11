
DROP POLICY IF EXISTS "Public can view published proposals" ON public.agency_proposals;

REVOKE SELECT ON public.agency_proposals FROM anon;

CREATE OR REPLACE FUNCTION public.get_published_proposal_by_slug(_slug text)
RETURNS TABLE(title text, html_content text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT title, html_content
  FROM public.agency_proposals
  WHERE slug = _slug AND is_published = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_proposal_by_slug(text) TO anon, authenticated;

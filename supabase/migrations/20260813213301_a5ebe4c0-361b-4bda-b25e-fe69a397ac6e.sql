ALTER TABLE public.agency_proposals
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz;

CREATE OR REPLACE FUNCTION public.register_proposal_view(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.agency_proposals
  SET view_count = COALESCE(view_count, 0) + 1,
      last_viewed_at = now()
  WHERE slug = _slug AND is_published = true;
$$;

GRANT EXECUTE ON FUNCTION public.register_proposal_view(text) TO anon, authenticated;
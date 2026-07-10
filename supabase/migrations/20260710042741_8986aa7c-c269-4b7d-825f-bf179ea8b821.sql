
CREATE TABLE public.agency_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  client_name TEXT,
  html_content TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL UNIQUE,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX agency_proposals_slug_idx ON public.agency_proposals(slug);
CREATE INDEX agency_proposals_created_at_idx ON public.agency_proposals(created_at DESC);

GRANT SELECT ON public.agency_proposals TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_proposals TO authenticated;
GRANT ALL ON public.agency_proposals TO service_role;

ALTER TABLE public.agency_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published proposals"
ON public.agency_proposals FOR SELECT
USING (is_published = true);

CREATE POLICY "Agency can manage proposals"
ON public.agency_proposals FOR ALL
TO authenticated
USING (public.is_agency_member(auth.uid()))
WITH CHECK (public.is_agency_member(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_agency_proposals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER agency_proposals_updated_at
BEFORE UPDATE ON public.agency_proposals
FOR EACH ROW EXECUTE FUNCTION public.set_agency_proposals_updated_at();

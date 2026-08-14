CREATE TABLE public.document_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.agency_proposals(id) ON DELETE CASCADE,
  slug text NOT NULL,
  session_token text NOT NULL,
  ip_hash text,
  country text,
  city text,
  device text,
  browser text,
  user_agent text,
  referrer text,
  duration_seconds integer NOT NULL DEFAULT 0,
  last_ping_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_views_proposal ON public.document_views (proposal_id, created_at DESC);

GRANT SELECT ON public.document_views TO authenticated;
GRANT ALL ON public.document_views TO service_role;

ALTER TABLE public.document_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can read document views"
ON public.document_views
FOR SELECT
TO authenticated
USING (public.is_agency_member(auth.uid()) OR public.is_admin_or_higher(auth.uid()));

CREATE TABLE public.ad_framework_references (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  framework_id uuid NOT NULL,
  url text NOT NULL,
  platform text,
  embed_url text,
  title text,
  notes text,
  thumbnail_url text,
  position integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_ad_framework_references_framework_id ON public.ad_framework_references(framework_id);

ALTER TABLE public.ad_framework_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view references"
  ON public.ad_framework_references FOR SELECT TO authenticated
  USING (is_agency_member(auth.uid()));

CREATE POLICY "Agency members can insert references"
  ON public.ad_framework_references FOR INSERT TO authenticated
  WITH CHECK (is_agency_member(auth.uid()));

CREATE POLICY "Agency members can update references"
  ON public.ad_framework_references FOR UPDATE TO authenticated
  USING (is_agency_member(auth.uid()));

CREATE POLICY "Agency members can delete references"
  ON public.ad_framework_references FOR DELETE TO authenticated
  USING (is_agency_member(auth.uid()));

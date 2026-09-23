CREATE TABLE public.production_shot_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_id uuid NOT NULL REFERENCES public.production_sheets(id) ON DELETE CASCADE,
  shot_id uuid NOT NULL REFERENCES public.production_sheet_shots(id) ON DELETE CASCADE,
  url text NOT NULL,
  platform text,
  embed_url text,
  title text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shot_refs_shot ON public.production_shot_references(shot_id);
CREATE INDEX idx_shot_refs_sheet ON public.production_shot_references(sheet_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_shot_references TO authenticated;
GRANT ALL ON public.production_shot_references TO service_role;

ALTER TABLE public.production_shot_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_all_shot_refs" ON public.production_shot_references
  FOR ALL TO authenticated
  USING (is_agency_member(auth.uid()))
  WITH CHECK (is_agency_member(auth.uid()));

CREATE TRIGGER trg_shot_refs_updated_at
  BEFORE UPDATE ON public.production_shot_references
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
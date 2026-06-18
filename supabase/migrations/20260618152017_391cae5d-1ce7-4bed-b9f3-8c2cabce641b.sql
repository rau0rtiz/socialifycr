
CREATE TABLE public.production_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.production_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_folders TO authenticated;
GRANT ALL ON public.production_folders TO service_role;

ALTER TABLE public.production_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members manage production_folders"
  ON public.production_folders
  FOR ALL
  TO authenticated
  USING (public.is_agency_member(auth.uid()))
  WITH CHECK (public.is_agency_member(auth.uid()));

CREATE TRIGGER production_folders_updated_at
  BEFORE UPDATE ON public.production_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX production_folders_client_parent_idx
  ON public.production_folders(client_id, parent_id);

ALTER TABLE public.production_sheets
  ADD COLUMN folder_id uuid REFERENCES public.production_folders(id) ON DELETE SET NULL;

CREATE INDEX production_sheets_folder_idx
  ON public.production_sheets(folder_id);

ALTER TABLE public.instant_form_lead_sources DROP CONSTRAINT IF EXISTS instant_form_lead_sources_client_id_key;
ALTER TABLE public.instant_form_lead_sources ADD COLUMN IF NOT EXISTS label text;
UPDATE public.instant_form_lead_sources SET label = 'Formulario principal' WHERE label IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS instant_form_lead_sources_client_sheet_key
  ON public.instant_form_lead_sources (client_id, spreadsheet_id, sheet_name);
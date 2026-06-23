
ALTER TABLE public.production_sheets ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.production_folders ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS production_sheets_sort_idx ON public.production_sheets(client_id, folder_id, sort_order);
CREATE INDEX IF NOT EXISTS production_folders_sort_idx ON public.production_folders(client_id, parent_id, sort_order);

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY client_id, COALESCE(folder_id::text, 'root') ORDER BY updated_at DESC) AS rn
  FROM public.production_sheets
)
UPDATE public.production_sheets s SET sort_order = r.rn * 10
FROM ranked r WHERE r.id = s.id AND s.sort_order = 0;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY client_id, COALESCE(parent_id::text, 'root') ORDER BY name) AS rn
  FROM public.production_folders
)
UPDATE public.production_folders f SET sort_order = r.rn * 10
FROM ranked r WHERE r.id = f.id AND f.sort_order = 0;

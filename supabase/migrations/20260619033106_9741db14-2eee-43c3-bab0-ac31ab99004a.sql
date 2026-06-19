ALTER TABLE public.production_sheets
  ADD COLUMN IF NOT EXISTS clickup_list_id TEXT,
  ADD COLUMN IF NOT EXISTS clickup_list_name TEXT,
  ADD COLUMN IF NOT EXISTS clickup_space_id TEXT,
  ADD COLUMN IF NOT EXISTS clickup_space_name TEXT;
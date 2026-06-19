
ALTER TABLE public.production_sheet_shots
  ADD COLUMN IF NOT EXISTS content_type text,
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS concept text,
  ADD COLUMN IF NOT EXISTS script text,
  ADD COLUMN IF NOT EXISTS hook text,
  ADD COLUMN IF NOT EXISTS cta text,
  ADD COLUMN IF NOT EXISTS tech_notes text,
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS clickup_task_id text,
  ADD COLUMN IF NOT EXISTS clickup_url text,
  ADD COLUMN IF NOT EXISTS sent_to_clickup_at timestamptz;

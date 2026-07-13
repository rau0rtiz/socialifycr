ALTER TABLE public.production_sheets
  ADD COLUMN IF NOT EXISTS recording_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS recording_ended_at timestamptz;
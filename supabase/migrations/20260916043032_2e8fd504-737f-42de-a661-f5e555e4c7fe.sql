ALTER TABLE public.msg_appointments
  ADD COLUMN IF NOT EXISTS match_confidence text,
  ADD COLUMN IF NOT EXISTS match_reason text,
  ADD COLUMN IF NOT EXISTS match_confirmed_by uuid,
  ADD COLUMN IF NOT EXISTS match_confirmed_at timestamptz;
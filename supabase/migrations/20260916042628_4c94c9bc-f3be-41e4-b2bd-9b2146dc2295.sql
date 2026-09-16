ALTER TABLE public.msg_appointments
  ADD COLUMN IF NOT EXISTS host_name text,
  ADD COLUMN IF NOT EXISTS host_email text,
  ADD COLUMN IF NOT EXISTS routing_form_uri text,
  ADD COLUMN IF NOT EXISTS tracking jsonb,
  ADD COLUMN IF NOT EXISTS invitee_name text;
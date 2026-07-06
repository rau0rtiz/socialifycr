ALTER TABLE public.instant_form_leads
  ADD COLUMN IF NOT EXISTS ai_message text,
  ADD COLUMN IF NOT EXISTS ai_message_generated_at timestamptz;
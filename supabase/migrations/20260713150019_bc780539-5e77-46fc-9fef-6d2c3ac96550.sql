ALTER TABLE public.instant_form_leads
  ADD COLUMN IF NOT EXISTS ai_message_regen_count integer NOT NULL DEFAULT 0;
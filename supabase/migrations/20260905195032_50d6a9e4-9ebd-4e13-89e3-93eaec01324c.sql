ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS preview_text text;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS preview_text text;
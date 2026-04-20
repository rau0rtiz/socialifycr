ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS recipients_snapshot JSONB NULL;
-- Add scheduled_for column for scheduling campaigns
ALTER TABLE public.email_campaigns
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ NULL;

-- Index for the dispatcher cron job
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled
ON public.email_campaigns (status, scheduled_for)
WHERE status = 'scheduled';

-- Ensure pg_cron and pg_net are available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
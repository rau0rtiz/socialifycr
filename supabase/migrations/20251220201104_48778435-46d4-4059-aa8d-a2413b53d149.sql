-- Add additional columns for Meta API integration
ALTER TABLE public.platform_connections
ADD COLUMN IF NOT EXISTS instagram_account_id text,
ADD COLUMN IF NOT EXISTS ad_account_id text,
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]'::jsonb;
-- Add default campaign goal to clients table
ALTER TABLE public.clients 
ADD COLUMN default_campaign_goal text;
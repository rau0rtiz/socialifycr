-- Add AI context field to clients table for personalized insights
ALTER TABLE public.clients 
ADD COLUMN ai_context TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN public.clients.ai_context IS 'Custom context and instructions for AI insights generation specific to this client';
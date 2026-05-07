ALTER TABLE public.message_sales 
ADD COLUMN IF NOT EXISTS payment_schedule_pending boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_message_sales_schedule_pending 
ON public.message_sales (client_id) 
WHERE payment_schedule_pending = true;
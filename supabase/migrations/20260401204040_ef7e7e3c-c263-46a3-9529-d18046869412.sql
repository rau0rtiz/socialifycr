
-- Add sales_call_date to setter_appointments
ALTER TABLE public.setter_appointments ADD COLUMN sales_call_date timestamp with time zone DEFAULT NULL;

-- Add closer_name to message_sales
ALTER TABLE public.message_sales ADD COLUMN closer_name text DEFAULT NULL;

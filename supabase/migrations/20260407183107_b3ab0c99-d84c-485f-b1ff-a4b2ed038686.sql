
-- Drop the existing unique constraint on client_id (one-to-one)
ALTER TABLE public.sales_goals DROP CONSTRAINT IF EXISTS sales_goals_client_id_key;

-- Add a composite unique constraint: one goal per client per month
ALTER TABLE public.sales_goals ADD CONSTRAINT sales_goals_client_month_unique UNIQUE (client_id, start_date);

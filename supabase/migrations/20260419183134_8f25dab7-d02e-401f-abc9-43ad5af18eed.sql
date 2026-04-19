ALTER TABLE public.client_products
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS estimated_duration_min integer;

ALTER TABLE public.client_products
  DROP CONSTRAINT IF EXISTS client_products_product_type_check;

ALTER TABLE public.client_products
  ADD CONSTRAINT client_products_product_type_check
  CHECK (product_type IN ('product','service'));
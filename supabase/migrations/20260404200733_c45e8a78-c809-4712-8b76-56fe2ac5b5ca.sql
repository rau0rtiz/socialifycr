
-- Payment scheme variants per product
CREATE TABLE public.product_payment_schemes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.client_products(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_price NUMERIC NOT NULL DEFAULT 0,
  num_installments INTEGER NOT NULL DEFAULT 1,
  installment_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CRC',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_payment_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view payment schemes"
  ON public.product_payment_schemes FOR SELECT
  TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert payment schemes"
  ON public.product_payment_schemes FOR INSERT
  TO authenticated
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update payment schemes"
  ON public.product_payment_schemes FOR UPDATE
  TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete payment schemes"
  ON public.product_payment_schemes FOR DELETE
  TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins can manage payment schemes"
  ON public.product_payment_schemes FOR ALL
  TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

-- Add payment tracking columns to message_sales
ALTER TABLE public.message_sales
  ADD COLUMN payment_scheme_id UUID REFERENCES public.product_payment_schemes(id) ON DELETE SET NULL,
  ADD COLUMN total_sale_amount NUMERIC,
  ADD COLUMN num_installments INTEGER DEFAULT 1,
  ADD COLUMN installments_paid INTEGER DEFAULT 1,
  ADD COLUMN installment_amount NUMERIC;

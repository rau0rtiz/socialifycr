CREATE TABLE public.sale_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.message_sales(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  product_id UUID REFERENCES public.client_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CRC',
  subtotal NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_order_items_sale_id ON public.sale_order_items(sale_id);
CREATE INDEX idx_sale_order_items_client_id ON public.sale_order_items(client_id);

ALTER TABLE public.sale_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view sale items" ON public.sale_order_items FOR SELECT USING (public.has_client_access(auth.uid(), client_id));
CREATE POLICY "Team can insert sale items" ON public.sale_order_items FOR INSERT WITH CHECK (public.has_client_access(auth.uid(), client_id));
CREATE POLICY "Team can update sale items" ON public.sale_order_items FOR UPDATE USING (public.has_client_access(auth.uid(), client_id));
CREATE POLICY "Team can delete sale items" ON public.sale_order_items FOR DELETE USING (public.has_client_access(auth.uid(), client_id));

CREATE TRIGGER set_sale_order_items_updated_at
  BEFORE UPDATE ON public.sale_order_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
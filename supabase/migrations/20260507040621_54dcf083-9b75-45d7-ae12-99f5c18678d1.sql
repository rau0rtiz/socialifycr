
-- =====================
-- ORDERS
-- =====================
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  customer_contact_id UUID REFERENCES public.customer_contacts(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_phone TEXT,
  shipping_address JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  currency TEXT NOT NULL DEFAULT 'CRC',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_customer ON public.orders(customer_contact_id);
CREATE INDEX idx_orders_date ON public.orders(client_id, order_date DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id) AND created_by = auth.uid());

CREATE POLICY "Team members can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete orders"
  ON public.orders FOR DELETE TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================
-- ORDER ITEMS
-- =====================
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  product_id UUID REFERENCES public.client_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  story_id TEXT,
  product_name TEXT,
  garment_size TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_client ON public.order_items(client_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update order items"
  ON public.order_items FOR UPDATE TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete order items"
  ON public.order_items FOR DELETE TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

-- =====================
-- LINK message_sales → orders
-- =====================
ALTER TABLE public.message_sales
  ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  ADD COLUMN order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE;

CREATE INDEX idx_message_sales_order ON public.message_sales(order_id);

-- =====================
-- TRIGGER: order_item → message_sales
-- =====================
CREATE OR REPLACE FUNCTION public.create_sale_from_order_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  INSERT INTO public.message_sales (
    client_id, created_by, sale_date, amount, currency, source,
    customer_name, customer_phone, product, garment_size, story_id,
    variant_id, status, order_id, order_item_id, notes
  ) VALUES (
    v_order.client_id, v_order.created_by, v_order.order_date,
    NEW.subtotal, v_order.currency,
    CASE WHEN NEW.story_id IS NOT NULL THEN 'story' ELSE 'other' END,
    v_order.customer_name, v_order.customer_phone, NEW.product_name,
    NEW.garment_size, NEW.story_id, NEW.variant_id,
    CASE WHEN v_order.status = 'cancelled' THEN 'cancelled' ELSE 'completed' END,
    NEW.order_id, NEW.id, NEW.notes
  );

  -- Update order total
  UPDATE public.orders
  SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM public.order_items WHERE order_id = NEW.order_id),
      updated_at = now()
  WHERE id = NEW.order_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_item_to_sale
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.create_sale_from_order_item();

-- Recalculate total when item updated/deleted
CREATE OR REPLACE FUNCTION public.recalc_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  UPDATE public.orders
  SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM public.order_items WHERE order_id = v_order_id),
      updated_at = now()
  WHERE id = v_order_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_recalc_order_total
  AFTER UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.recalc_order_total();

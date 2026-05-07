
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS garment_type TEXT;

CREATE OR REPLACE FUNCTION public.create_sale_from_order_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD;
  v_product_label TEXT;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Use garment_type as the "product" classification when present (drives "Ventas por Tipo de Prenda"),
  -- otherwise fall back to product_name.
  v_product_label := COALESCE(NULLIF(NEW.garment_type, ''), NEW.product_name);

  INSERT INTO public.message_sales (
    client_id, created_by, sale_date, amount, currency, source,
    customer_name, customer_phone, product, garment_size, story_id,
    variant_id, status, order_id, order_item_id, notes, brand
  ) VALUES (
    v_order.client_id, v_order.created_by, v_order.order_date,
    NEW.subtotal, v_order.currency,
    CASE WHEN NEW.story_id IS NOT NULL THEN 'story' ELSE 'other' END,
    v_order.customer_name, v_order.customer_phone, v_product_label,
    NEW.garment_size, NEW.story_id, NEW.variant_id,
    CASE WHEN v_order.status = 'cancelled' THEN 'cancelled' ELSE 'completed' END,
    NEW.order_id, NEW.id, NEW.notes, NEW.brand
  );

  UPDATE public.orders
  SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM public.order_items WHERE order_id = NEW.order_id),
      updated_at = now()
  WHERE id = NEW.order_id;

  RETURN NEW;
END;
$function$;

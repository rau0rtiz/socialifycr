
-- ============ CATÁLOGOS POR CLIENTE ============
CREATE TABLE public.product_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);
ALTER TABLE public.product_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team views brands" ON public.product_brands FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "team manages brands" ON public.product_brands FOR ALL TO authenticated USING (has_client_access(auth.uid(), client_id)) WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE TABLE public.product_categories_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);
ALTER TABLE public.product_categories_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team views cat" ON public.product_categories_catalog FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "team manages cat" ON public.product_categories_catalog FOR ALL TO authenticated USING (has_client_access(auth.uid(), client_id)) WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE TABLE public.product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team views sizes" ON public.product_sizes FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "team manages sizes" ON public.product_sizes FOR ALL TO authenticated USING (has_client_access(auth.uid(), client_id)) WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE TABLE public.product_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  hex_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, name)
);
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team views colors" ON public.product_colors FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "team manages colors" ON public.product_colors FOR ALL TO authenticated USING (has_client_access(auth.uid(), client_id)) WITH CHECK (has_client_access(auth.uid(), client_id));

-- ============ VARIANTES ============
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.client_products(id) ON DELETE CASCADE,
  size text,
  color text,
  sku text,
  price numeric,
  photo_url text,
  stock_quantity numeric NOT NULL DEFAULT 0,
  low_stock_threshold numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, size, color)
);
CREATE INDEX idx_pv_client ON public.product_variants(client_id);
CREATE INDEX idx_pv_product ON public.product_variants(product_id);
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team views variants" ON public.product_variants FOR SELECT TO authenticated USING (has_client_access(auth.uid(), client_id));
CREATE POLICY "team manages variants" ON public.product_variants FOR ALL TO authenticated USING (has_client_access(auth.uid(), client_id)) WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE TRIGGER trg_pv_updated BEFORE UPDATE ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ Vincular variantes a stock movements y ventas ============
ALTER TABLE public.product_stock_movements ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_psm_variant ON public.product_stock_movements(variant_id);

ALTER TABLE public.message_sales ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
ALTER TABLE public.message_sales ADD COLUMN IF NOT EXISTS reservation_expires_at date;
ALTER TABLE public.message_sales ADD COLUMN IF NOT EXISTS deposit_amount numeric;

-- ============ TRIGGER: descuenta stock al insertar venta con variant_id ============
CREATE OR REPLACE FUNCTION public.handle_sale_variant_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_qty numeric := 1;
  v_new_stock numeric;
BEGIN
  IF NEW.variant_id IS NULL THEN RETURN NEW; END IF;
  -- skip apartado: no descuenta stock hasta concretar
  IF COALESCE(NEW.status,'') = 'apartado' THEN RETURN NEW; END IF;

  UPDATE public.product_variants
    SET stock_quantity = stock_quantity - v_qty, updated_at = now()
  WHERE id = NEW.variant_id
  RETURNING stock_quantity INTO v_new_stock;

  INSERT INTO public.product_stock_movements
    (client_id, product_id, variant_id, movement_type, quantity, resulting_stock, reason, sale_id, created_by)
  SELECT NEW.client_id, pv.product_id, NEW.variant_id, 'sale', v_qty, v_new_stock,
         'Venta automática', NEW.id, NEW.created_by
  FROM public.product_variants pv WHERE pv.id = NEW.variant_id;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_sale_variant_stock
  AFTER INSERT ON public.message_sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_sale_variant_stock();

-- Cuando un apartado pasa a completed, descuenta stock
CREATE OR REPLACE FUNCTION public.handle_apartado_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new_stock numeric;
BEGIN
  IF NEW.variant_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.status = 'apartado' AND NEW.status = 'completed' THEN
    UPDATE public.product_variants
      SET stock_quantity = stock_quantity - 1, updated_at = now()
    WHERE id = NEW.variant_id
    RETURNING stock_quantity INTO v_new_stock;

    INSERT INTO public.product_stock_movements
      (client_id, product_id, variant_id, movement_type, quantity, resulting_stock, reason, sale_id, created_by)
    SELECT NEW.client_id, pv.product_id, NEW.variant_id, 'sale', 1, v_new_stock,
           'Apartado completado', NEW.id, NEW.created_by
    FROM public.product_variants pv WHERE pv.id = NEW.variant_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_apartado_complete
  AFTER UPDATE OF status ON public.message_sales
  FOR EACH ROW EXECUTE FUNCTION public.handle_apartado_completion();

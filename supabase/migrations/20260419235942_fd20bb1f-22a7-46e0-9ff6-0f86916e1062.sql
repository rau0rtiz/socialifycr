-- ============================================================
-- 1. CATEGORÍAS CUSTOM POR CLIENTE
-- ============================================================
CREATE TABLE public.client_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'hsl(220, 70%, 50%)',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

CREATE INDEX idx_client_product_categories_client ON public.client_product_categories(client_id);

ALTER TABLE public.client_product_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view product categories"
  ON public.client_product_categories FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert product categories"
  ON public.client_product_categories FOR INSERT TO authenticated
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update product categories"
  ON public.client_product_categories FOR UPDATE TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete product categories"
  ON public.client_product_categories FOR DELETE TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins can manage product categories"
  ON public.client_product_categories FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE TRIGGER trg_client_product_categories_updated
  BEFORE UPDATE ON public.client_product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 2. HISTORIAL DE CAMBIOS DE PRECIO
-- ============================================================
CREATE TABLE public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.client_products(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  old_price numeric,
  new_price numeric,
  old_cost numeric,
  new_cost numeric,
  currency text NOT NULL DEFAULT 'CRC',
  changed_by uuid,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_price_history_product ON public.product_price_history(product_id, changed_at DESC);
CREATE INDEX idx_product_price_history_client ON public.product_price_history(client_id);

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view price history"
  ON public.product_price_history FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins can manage price history"
  ON public.product_price_history FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

-- Trigger function: log price/cost changes
CREATE OR REPLACE FUNCTION public.track_product_price_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (COALESCE(OLD.price, -1) IS DISTINCT FROM COALESCE(NEW.price, -1))
     OR (COALESCE(OLD.cost, -1) IS DISTINCT FROM COALESCE(NEW.cost, -1)) THEN
    INSERT INTO public.product_price_history (
      product_id, client_id, old_price, new_price, old_cost, new_cost, currency, changed_by
    ) VALUES (
      NEW.id, NEW.client_id, OLD.price, NEW.price, OLD.cost, NEW.cost, NEW.currency, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_product_price_changes
  AFTER UPDATE ON public.client_products
  FOR EACH ROW EXECUTE FUNCTION public.track_product_price_changes();

-- ============================================================
-- 3. ETIQUETAS POR PRODUCTO
-- ============================================================
CREATE TABLE public.client_product_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'hsl(262, 83%, 58%)',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, name)
);

CREATE INDEX idx_client_product_tags_client ON public.client_product_tags(client_id);

ALTER TABLE public.client_product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view product tags"
  ON public.client_product_tags FOR SELECT TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert product tags"
  ON public.client_product_tags FOR INSERT TO authenticated
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update product tags"
  ON public.client_product_tags FOR UPDATE TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete product tags"
  ON public.client_product_tags FOR DELETE TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Admins can manage product tags"
  ON public.client_product_tags FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

-- Junction
CREATE TABLE public.product_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.client_products(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.client_product_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, tag_id)
);

CREATE INDEX idx_product_tag_assignments_product ON public.product_tag_assignments(product_id);
CREATE INDEX idx_product_tag_assignments_tag ON public.product_tag_assignments(tag_id);

ALTER TABLE public.product_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view tag assignments"
  ON public.product_tag_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_products p
    WHERE p.id = product_tag_assignments.product_id
      AND has_client_access(auth.uid(), p.client_id)
  ));

CREATE POLICY "Team members can insert tag assignments"
  ON public.product_tag_assignments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.client_products p
    WHERE p.id = product_tag_assignments.product_id
      AND has_client_access(auth.uid(), p.client_id)
  ));

CREATE POLICY "Team members can delete tag assignments"
  ON public.product_tag_assignments FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_products p
    WHERE p.id = product_tag_assignments.product_id
      AND has_client_access(auth.uid(), p.client_id)
  ));

CREATE POLICY "Admins can manage tag assignments"
  ON public.product_tag_assignments FOR ALL TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));
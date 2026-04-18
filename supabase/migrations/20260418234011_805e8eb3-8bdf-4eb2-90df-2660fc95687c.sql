
-- Add stock tracking fields to client_products
ALTER TABLE public.client_products
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_unit text;

-- Movement log so admins can audit stock changes (entradas/salidas/ajustes)
CREATE TABLE IF NOT EXISTS public.product_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.client_products(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in','out','adjust','sale')),
  quantity numeric NOT NULL,
  resulting_stock numeric NOT NULL,
  reason text,
  sale_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psm_product ON public.product_stock_movements(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_psm_client ON public.product_stock_movements(client_id, created_at DESC);

ALTER TABLE public.product_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock movements"
ON public.product_stock_movements
FOR ALL TO authenticated
USING (public.is_admin_or_higher(auth.uid()))
WITH CHECK (public.is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view stock movements"
ON public.product_stock_movements
FOR SELECT TO authenticated
USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert stock movements"
ON public.product_stock_movements
FOR INSERT TO authenticated
WITH CHECK (public.has_client_access(auth.uid(), client_id));

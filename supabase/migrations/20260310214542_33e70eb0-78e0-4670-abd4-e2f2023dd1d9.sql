
CREATE TABLE public.client_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric DEFAULT NULL,
  currency text NOT NULL DEFAULT 'CRC',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.client_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage products"
  ON public.client_products FOR ALL
  TO authenticated
  USING (public.is_admin_or_higher(auth.uid()))
  WITH CHECK (public.is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view products"
  ON public.client_products FOR SELECT
  TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert products"
  ON public.client_products FOR INSERT
  TO authenticated
  WITH CHECK (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update products"
  ON public.client_products FOR UPDATE
  TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete products"
  ON public.client_products FOR DELETE
  TO authenticated
  USING (public.has_client_access(auth.uid(), client_id));

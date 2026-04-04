
CREATE TABLE public.payment_collections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid NOT NULL REFERENCES public.message_sales(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  installment_number integer NOT NULL DEFAULT 1,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CRC',
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  notes text,
  payment_frequency text NOT NULL DEFAULT 'monthly',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage collections"
  ON public.payment_collections FOR ALL
  TO authenticated
  USING (is_admin_or_higher(auth.uid()))
  WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view collections"
  ON public.payment_collections FOR SELECT
  TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert collections"
  ON public.payment_collections FOR INSERT
  TO authenticated
  WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update collections"
  ON public.payment_collections FOR UPDATE
  TO authenticated
  USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete collections"
  ON public.payment_collections FOR DELETE
  TO authenticated
  USING (has_client_access(auth.uid(), client_id));

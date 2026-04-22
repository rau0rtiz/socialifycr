-- 1. Add garment_size to message_sales
ALTER TABLE public.message_sales
ADD COLUMN IF NOT EXISTS garment_size text;

-- 2. Create customer_contacts table
CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  notes text,
  garment_sizes text[] DEFAULT '{}'::text[],
  preferred_brands text[] DEFAULT '{}'::text[],
  total_purchases integer DEFAULT 0,
  last_purchase_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_client ON public.customer_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_phone ON public.customer_contacts(client_id, phone);

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage customer contacts"
ON public.customer_contacts FOR ALL TO authenticated
USING (is_admin_or_higher(auth.uid()))
WITH CHECK (is_admin_or_higher(auth.uid()));

CREATE POLICY "Team members can view customer contacts"
ON public.customer_contacts FOR SELECT TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can insert customer contacts"
ON public.customer_contacts FOR INSERT TO authenticated
WITH CHECK (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can update customer contacts"
ON public.customer_contacts FOR UPDATE TO authenticated
USING (has_client_access(auth.uid(), client_id));

CREATE POLICY "Team members can delete customer contacts"
ON public.customer_contacts FOR DELETE TO authenticated
USING (has_client_access(auth.uid(), client_id));

-- Inline updated_at trigger function (scoped name to avoid collisions)
CREATE OR REPLACE FUNCTION public.set_customer_contacts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_contacts_updated_at ON public.customer_contacts;
CREATE TRIGGER trg_customer_contacts_updated_at
BEFORE UPDATE ON public.customer_contacts
FOR EACH ROW EXECUTE FUNCTION public.set_customer_contacts_updated_at();
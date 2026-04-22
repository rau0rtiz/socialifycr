-- Add addresses (multiple delivery addresses) and id_number to customer_contacts
ALTER TABLE public.customer_contacts
  ADD COLUMN IF NOT EXISTS addresses jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS id_number text,
  ADD COLUMN IF NOT EXISTS last_name text;

CREATE INDEX IF NOT EXISTS idx_customer_contacts_client_phone ON public.customer_contacts(client_id, phone);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_client_name ON public.customer_contacts(client_id, full_name);
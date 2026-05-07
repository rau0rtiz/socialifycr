
-- Billing info for retail and Speak Up contacts
ALTER TABLE public.customer_contacts
  ADD COLUMN IF NOT EXISTS billing_info jsonb;

ALTER TABLE public.student_contacts
  ADD COLUMN IF NOT EXISTS billing_info jsonb;

COMMENT ON COLUMN public.customer_contacts.billing_info IS 'Optional billing data: { id_type, id_number, full_name, phone, email, address, economic_activity_code }';
COMMENT ON COLUMN public.student_contacts.billing_info IS 'Optional billing data: { id_type, id_number, full_name, phone, email, address, economic_activity_code }';

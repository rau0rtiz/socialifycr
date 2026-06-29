ALTER TABLE public.instant_form_leads DISABLE TRIGGER USER;
UPDATE public.instant_form_leads
SET assigned_seller_id = 'e852037e-1614-403a-bc4b-b882c19b1585',
    assigned_at = now()
WHERE client_id = 'd90a18b8-dad0-4f52-9447-c13f8f19f0d7'
  AND message_sale_id IS NULL;
ALTER TABLE public.instant_form_leads ENABLE TRIGGER USER;
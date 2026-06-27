ALTER TABLE public.instant_form_leads DISABLE TRIGGER USER;
UPDATE public.instant_form_leads SET assigned_seller_id = NULL, assigned_at = NULL WHERE assigned_seller_id IS NOT NULL;
ALTER TABLE public.instant_form_leads ENABLE TRIGGER USER;
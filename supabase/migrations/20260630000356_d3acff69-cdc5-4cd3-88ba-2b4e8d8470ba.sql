UPDATE public.instant_form_leads SET lead_status = 'new' WHERE lead_status IS NULL;

ALTER TABLE public.instant_form_leads ALTER COLUMN lead_status SET DEFAULT 'new';

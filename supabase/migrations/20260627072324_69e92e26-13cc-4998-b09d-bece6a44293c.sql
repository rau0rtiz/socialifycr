ALTER PUBLICATION supabase_realtime ADD TABLE public.instant_form_leads;
ALTER TABLE public.instant_form_leads REPLICA IDENTITY FULL;
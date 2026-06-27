DELETE FROM public.instant_form_leads
WHERE client_id = 'd90a18b8-dad0-4f52-9447-c13f8f19f0d7'
  AND (full_name IS NULL OR phone LIKE 'p:%' OR full_name LIKE '<test lead%');
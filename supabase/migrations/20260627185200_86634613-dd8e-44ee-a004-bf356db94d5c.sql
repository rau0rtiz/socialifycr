-- Delete sheet-sourced duplicates when a non-sheet (Meta API) lead with same phone already exists for the same client
DELETE FROM public.instant_form_leads s
USING public.instant_form_leads m
WHERE s.client_id = m.client_id
  AND s.phone = m.phone
  AND s.phone IS NOT NULL
  AND s.external_id LIKE 'sheet-%'
  AND m.external_id NOT LIKE 'sheet-%'
  AND s.id <> m.id;

-- Also collapse pure sheet-vs-sheet duplicates by phone (keep oldest by created_at)
DELETE FROM public.instant_form_leads a
USING public.instant_form_leads b
WHERE a.client_id = b.client_id
  AND a.phone = b.phone
  AND a.phone IS NOT NULL
  AND a.external_id LIKE 'sheet-%'
  AND b.external_id LIKE 'sheet-%'
  AND a.created_at > b.created_at;

UPDATE public.agency_payment_clients
SET logo_url = 'agency-private:payments/logos/' || regexp_replace(logo_url, '^.*/agency-payments/logos/', '')
WHERE logo_url LIKE '%/content-images/agency-payments/logos/%';

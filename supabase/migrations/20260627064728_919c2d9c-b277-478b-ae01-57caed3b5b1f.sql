
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule with the same name
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sync-instant-form-leads-every-15m';

SELECT cron.schedule(
  'sync-instant-form-leads-every-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://chqhyqylnbtwyzhjkxlu.supabase.co/functions/v1/sync-instant-form-leads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object('cron', true)
  ) AS request_id;
  $$
);

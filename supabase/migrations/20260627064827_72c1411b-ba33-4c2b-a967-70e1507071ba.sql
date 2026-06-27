
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sync-instant-form-leads-every-15m';

SELECT cron.schedule(
  'sync-instant-form-leads-every-15m',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://chqhyqylnbtwyzhjkxlu.supabase.co/functions/v1/sync-instant-form-leads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNocWh5cXlsbmJ0d3l6aGpreGx1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTExMTAsImV4cCI6MjA4MTgyNzExMH0.Ms0FvPMBX_qWoSsriDsmAul95lYCD_xZleh-5CZnGVc'
    ),
    body := jsonb_build_object('cron', true)
  ) AS request_id;
  $$
);

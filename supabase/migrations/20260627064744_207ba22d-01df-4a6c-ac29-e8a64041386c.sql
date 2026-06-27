
SELECT vault.create_secret(
  current_setting('app.settings.service_role_key', true),
  'service_role_key',
  'Used by pg_cron to invoke edge functions'
)
WHERE NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_key')
  AND current_setting('app.settings.service_role_key', true) IS NOT NULL;

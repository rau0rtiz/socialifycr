insert into public.ai_switches (feature, enabled, label, description) values
  ('production_ai', true, 'IA de producciones', 'Genera tomas, hooks y guiones a partir de un plan (modelo caro: Claude Opus).')
on conflict (feature) do nothing;

update public.ai_switches
set label = 'Reportes con IA', description = 'Redacción asistida de reportes mensuales (ya sin uso activo).'
where feature = 'reports';
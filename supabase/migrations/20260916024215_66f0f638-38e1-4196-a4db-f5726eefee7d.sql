create table if not exists public.ai_switches (
  feature text primary key,
  enabled boolean not null default true,
  label text not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

grant select, update on public.ai_switches to authenticated;
grant all on public.ai_switches to service_role;

alter table public.ai_switches enable row level security;

create policy "agency_read_ai_switches" on public.ai_switches
for select to authenticated using (public.is_agency_member(auth.uid()));

create policy "admin_update_ai_switches" on public.ai_switches
for update to authenticated using (public.is_admin_or_higher(auth.uid()))
with check (public.is_admin_or_higher(auth.uid()));

insert into public.ai_switches (feature, enabled, label, description) values
  ('ocr', false, 'Lectura de imágenes (OCR)', 'La IA lee comprobantes e historias para extraer montos y datos.'),
  ('insights', false, 'Análisis automáticos', 'La IA analiza los leads entrantes (urgencia) y el contenido.'),
  ('reports', false, 'Reportes con IA', 'Redacción asistida de reportes mensuales.')
on conflict (feature) do update set enabled = excluded.enabled;
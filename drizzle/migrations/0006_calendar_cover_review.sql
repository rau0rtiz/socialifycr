alter table public.content_calendar_items
  add column if not exists cover_status text not null default 'pendiente'
    check (cover_status in ('pendiente', 'aprobada', 'cambios'));

alter table public.content_calendar_comments
  add column if not exists scope text not null default 'video'
    check (scope in ('video', 'portada'));
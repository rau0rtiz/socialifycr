create or replace function public.assign_landing_funnel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _fid uuid;
begin
  if new.funnel_id is null
     and (new.answers ? 'landing_slug' or coalesce(new.answers->>'source','') like 'landing:%') then
    select id into _fid from public.funnels where slug = 'lp-landing-pages' limit 1;
    if _fid is not null then
      new.funnel_id := _fid;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_landing_funnel_trg on public.funnel_leads;
create trigger assign_landing_funnel_trg
before insert on public.funnel_leads
for each row execute function public.assign_landing_funnel();
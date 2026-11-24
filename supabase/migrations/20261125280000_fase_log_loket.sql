-- B-088 (2026-11-24, baan LOKETTEN, Zarvis): hoeveel dagen een dossier al in zijn fase zit. Compass bewaarde geen
-- fasegeschiedenis; vanaf nu schrijft een trigger elke wijziging van bouwflow_phase weg. Additief: een nieuwe tabel en
-- een nieuwe trigger; niets aan leads of de bestaande triggers verandert. Alleen de service-rol leest de tabel (het
-- loket); geen regel voor ingelogde gebruikers.
-- De beginstand per dossier krijgt zeker = false: het echte moment van de fasewissel is niet gekend, alleen de laatste
-- wijziging van het dossier. Vanaf de eerste echte wissel is het getal zeker.
create table if not exists public.dossier_fase_log (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  fase text,
  vorige_fase text,
  op timestamptz not null default now(),
  zeker boolean not null default true
);
create index if not exists dossier_fase_log_lead_op on public.dossier_fase_log (lead_id, op desc);
alter table public.dossier_fase_log enable row level security;

create or replace function public.dossier_fase_loggen()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.bouwflow_phase is distinct from old.bouwflow_phase then
    insert into dossier_fase_log (lead_id, fase, vorige_fase) values (new.id, new.bouwflow_phase, case when tg_op = 'UPDATE' then old.bouwflow_phase end);
  end if;
  return new;
end $$;

drop trigger if exists trg_dossier_fase_log on public.leads;
create trigger trg_dossier_fase_log after insert or update of bouwflow_phase on public.leads
  for each row execute function public.dossier_fase_loggen();

insert into public.dossier_fase_log (lead_id, fase, op, zeker)
select l.id, l.bouwflow_phase, coalesce(l.updated_at, l.created_at, now()), false
from public.leads l where not exists (select 1 from public.dossier_fase_log f where f.lead_id = l.id);

revoke all on table public.dossier_fase_log from anon, authenticated;
revoke execute on function public.dossier_fase_loggen() from public, anon, authenticated;

-- Sprint 2 (SPRINTPLAN-COMMUNICATIE): onbeperkt gesprekken per dossier + post-it-notities.
--
-- Bewust NAAST de bestaande velden gebouwd: leads.gesprek_datum, leads.gesprek_notities en
-- pre_intake blijven volledig onaangeroerd — daar hangen de kanban-categorisering
-- (resolveCategory leest gesprek_datum als "er is gebeld") en de 1-per-dossier-aanname
-- (maybeSingle) aan. De nieuwe gespreksflow schrijft daar nooit naar.
--
-- Toegepast op de live database op 2026-08-26 (zelfde sessie); dit bestand is de vastlegging.

create table if not exists public.gesprekken (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null check (type in ('telefoon','videocall')),
  gestart_op timestamptz not null default now(),
  beeindigd_op timestamptz,
  door_user uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists gesprekken_lead_idx on public.gesprekken (lead_id, gestart_op desc);
alter table public.gesprekken enable row level security;
drop policy if exists "auth alles gesprekken" on public.gesprekken;
create policy "auth alles gesprekken" on public.gesprekken
  for all to authenticated using (true) with check (true);

create table if not exists public.gesprek_notities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  gesprek_id uuid references public.gesprekken(id) on delete set null,
  soort text not null default 'notitie' check (soort in ('notitie','beslissing','onthouden')),
  tekst text not null check (length(tekst) between 1 and 4000),
  door_user uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists gesprek_notities_lead_idx on public.gesprek_notities (lead_id, created_at desc);
create index if not exists gesprek_notities_gesprek_idx on public.gesprek_notities (gesprek_id);
alter table public.gesprek_notities enable row level security;
drop policy if exists "auth alles gesprek_notities" on public.gesprek_notities;
create policy "auth alles gesprek_notities" on public.gesprek_notities
  for all to authenticated using (true) with check (true);

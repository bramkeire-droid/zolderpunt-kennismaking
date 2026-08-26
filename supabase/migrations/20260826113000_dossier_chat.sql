-- Sprint 3 (SPRINTPLAN-COMMUNICATIE): interne chat per dossier, realtime.
--
-- Korte werkberichten tussen medewerkers over één dossier. Bewust alleen per dossier
-- (besluit Bram 2026-08-26: geen algemeen kanaal), alleen lezen + eigen bericht plaatsen
-- (geen update/delete in v1: wat gezegd is, blijft staan), en volledig onzichtbaar voor
-- het klantportaal — get-portal-data leest deze tabel nergens.
--
-- Toegepast op de live database op 2026-08-26 (zelfde sessie); dit bestand is de vastlegging.

create table if not exists public.dossier_chat (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  bericht text not null check (length(bericht) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists dossier_chat_lead_idx on public.dossier_chat (lead_id, created_at);
alter table public.dossier_chat enable row level security;
drop policy if exists "auth lezen dossier_chat" on public.dossier_chat;
create policy "auth lezen dossier_chat" on public.dossier_chat
  for select to authenticated using (true);
drop policy if exists "eigen bericht plaatsen" on public.dossier_chat;
create policy "eigen bericht plaatsen" on public.dossier_chat
  for insert to authenticated with check (user_id = auth.uid());

-- Realtime: INSERT-events naar alle open panelen van dit dossier.
do $$
begin
  alter publication supabase_realtime add table public.dossier_chat;
exception when duplicate_object then
  null;
end $$;

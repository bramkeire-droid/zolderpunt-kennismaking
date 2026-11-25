-- Fase van een dossier wijzigen via Zarvis (2026-11-25, baan LOKETTEN). Bouwflow laat de fase van een bestaand project
-- niet schrijven langs zijn API; alleen de Chrome-extensie kan het, in een ingelogde browser. Daarom schrijft Zarvis
-- (zarvis-loket, na Brams Ja) hier een OPDRACHT; een open Compass-pagina met de extensie voert ze uit, op dezelfde
-- weg als het slepen in de kanban (SET_PHASE, daarna push-bouwflow-phase controleert in Bouwflow en zet Compass gelijk).
-- Additief: een nieuwe tabel; niets aan leads of bestaande regels verandert.

create table if not exists public.zarvis_fase_opdrachten (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  project_nummer text not null,
  van_fase text,                         -- de fase op het moment van de opdracht (voor terugzetten)
  naar_fase integer not null,
  naar_titel text not null,
  reden text,                            -- getoond; bij Geweigerd verplicht
  vorige_reden text,                     -- afwijs_reden van het dossier vóór de opdracht (voor terugzetten)
  afwijs_reden_zetten boolean not null default false,
  afwijs_reden_na text,                  -- wat in leads.afwijs_reden komt als afwijs_reden_zetten
  terug_van uuid references public.zarvis_fase_opdrachten(id),
  door text not null,                    -- mailadres van wie Ja zei in Zarvis
  status text not null default 'wacht' check (status in ('wacht', 'bezig', 'gedaan', 'mislukt')),
  melding text,
  gemaakt_op timestamptz not null default now(),
  poging_op timestamptz,
  uitgevoerd_op timestamptz
);
create index if not exists zarvis_fase_opdrachten_open on public.zarvis_fase_opdrachten (status, gemaakt_op);
create index if not exists zarvis_fase_opdrachten_lead on public.zarvis_fase_opdrachten (lead_id, gemaakt_op desc);

alter table public.zarvis_fase_opdrachten enable row level security;
-- De uitvoerder in de app (een ingelogde gebruiker met rol) leest de opdrachten en zet alleen de stand.
-- Aanmaken kan alleen de serversleutel (zarvis-loket, na Ja); niemand wist.
drop policy if exists "rol leest fase-opdrachten" on public.zarvis_fase_opdrachten;
create policy "rol leest fase-opdrachten" on public.zarvis_fase_opdrachten
  for select to authenticated using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'user'));
drop policy if exists "rol zet stand van fase-opdrachten" on public.zarvis_fase_opdrachten;
create policy "rol zet stand van fase-opdrachten" on public.zarvis_fase_opdrachten
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'user'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'user'));
revoke all on table public.zarvis_fase_opdrachten from anon, authenticated;
grant select on table public.zarvis_fase_opdrachten to authenticated;
grant update (status, melding, poging_op, uitgevoerd_op) on table public.zarvis_fase_opdrachten to authenticated;

-- Terugdraaien: drop table public.zarvis_fase_opdrachten;

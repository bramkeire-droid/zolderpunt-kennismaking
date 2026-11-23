-- Zarvis leeft in een eigen venster, los van Compass. Om te weten waar de
-- gebruiker in Compass mee bezig is, schrijft Compass hier per gebruiker één rij:
-- welke pagina en welk dossier open staan. De functie `zarvis` leest die rij als
-- de vraag zelf geen dossier meegeeft.
--
-- Eén rij per gebruiker, alleen de eigen rij leesbaar en schrijfbaar. Additief:
-- geen bestaande tabel, policy of functie wordt aangeraakt.

create table if not exists public.zarvis_context (
  user_id uuid primary key default auth.uid(),
  lead_id uuid references public.leads(id) on delete set null,
  dossier_naam text,
  view text,
  updated_at timestamptz not null default now()
);

alter table public.zarvis_context enable row level security;

drop policy if exists "eigen context lezen" on public.zarvis_context;
create policy "eigen context lezen" on public.zarvis_context
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "eigen context toevoegen" on public.zarvis_context;
create policy "eigen context toevoegen" on public.zarvis_context
  for insert to authenticated with check (
    user_id = auth.uid()
    and (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'user'::app_role))
  );

drop policy if exists "eigen context bijwerken" on public.zarvis_context;
create policy "eigen context bijwerken" on public.zarvis_context
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'user'::app_role))
  );

revoke all on public.zarvis_context from anon;

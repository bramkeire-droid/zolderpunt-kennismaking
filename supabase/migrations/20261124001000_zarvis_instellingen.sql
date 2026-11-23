-- Wat Zarvis mag gebruiken, per gebruiker: welke connectoren aan staan. De
-- beheersectie van Zarvis schrijft hier; de functie `zarvis` leest het en biedt
-- het model alleen gereedschap aan van connectoren die aan staan.
--
-- Eén rij per gebruiker, alleen de eigen rij leesbaar; schrijven mag alleen een
-- beheerder (het is een beheersectie). Wie geen rij heeft, heeft alles aan. Additief:
-- geen bestaande tabel, policy of functie wordt aangeraakt.

create table if not exists public.zarvis_instellingen (
  user_id uuid primary key default auth.uid(),
  -- Per connector true of false; wat ontbreekt, geldt als aan.
  connectoren jsonb not null default '{}'::jsonb,
  -- Wanneer de inrichting bij de eerste start doorlopen is.
  ingericht_op timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.zarvis_instellingen enable row level security;

drop policy if exists "eigen instellingen lezen" on public.zarvis_instellingen;
create policy "eigen instellingen lezen" on public.zarvis_instellingen
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "eigen instellingen toevoegen" on public.zarvis_instellingen;
create policy "eigen instellingen toevoegen" on public.zarvis_instellingen
  for insert to authenticated with check (
    user_id = auth.uid()
    and has_role(auth.uid(), 'admin'::app_role)
  );

drop policy if exists "eigen instellingen bijwerken" on public.zarvis_instellingen;
create policy "eigen instellingen bijwerken" on public.zarvis_instellingen
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and has_role(auth.uid(), 'admin'::app_role)
  );

revoke all on public.zarvis_instellingen from anon;

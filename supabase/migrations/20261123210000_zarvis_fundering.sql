-- Zarvis fase 1, sprint Z0 (SPRINTPLAN-ZARVIS): fundering.
--
-- Drie nieuwe tabellen, volledig additief — geen bestaande tabel, policy of functie
-- wordt aangeraakt.
--   zarvis_gesprekken  één gesprek met Zarvis
--   zarvis_berichten   elke beurt, met verbruikte tokens (bron van het kostenoverzicht)
--   zarvis_acties      logboek van wat Zarvis deed, met waarde vóór en ná
--
-- Toegang: iemand met een rol leest en schrijft alleen zijn eigen rijen; admin leest
-- alles. Geen delete-policies: wat Zarvis deed blijft staan, terugdraaien is een
-- statuswijziging, geen verwijdering.
--
-- De statussen 'wacht_op_goedkeuring' en 'geweigerd' worden pas in fase 3 gebruikt
-- (externe acties na Brams ja) maar zitten er nu al in, zodat het logboek dan niet
-- omgebouwd moet worden.

create table if not exists public.zarvis_gesprekken (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  -- Dossier waarin het gesprek startte; leeg als het vanuit de dossierlijst begon.
  lead_id uuid references public.leads(id) on delete set null,
  titel text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists zarvis_gesprekken_user_idx
  on public.zarvis_gesprekken (user_id, updated_at desc);

create table if not exists public.zarvis_berichten (
  id uuid primary key default gen_random_uuid(),
  gesprek_id uuid not null references public.zarvis_gesprekken(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  rol text not null check (rol in ('gebruiker', 'zarvis')),
  inhoud text not null,
  -- Welke gereedschappen deze beurt gebruikt werden (naam + invoer), ter controle.
  gereedschap jsonb,
  model text,
  tokens_in integer,
  tokens_uit integer,
  created_at timestamptz not null default now()
);
create index if not exists zarvis_berichten_gesprek_idx
  on public.zarvis_berichten (gesprek_id, created_at);

create table if not exists public.zarvis_acties (
  id uuid primary key default gen_random_uuid(),
  gesprek_id uuid references public.zarvis_gesprekken(id) on delete set null,
  user_id uuid not null default auth.uid(),
  lead_id uuid references public.leads(id) on delete set null,
  gereedschap text not null,
  invoer jsonb not null default '{}'::jsonb,
  -- Toestand vóór en ná, zodat een actie teruggedraaid kan worden.
  voor jsonb,
  na jsonb,
  status text not null default 'uitgevoerd'
    check (status in ('uitgevoerd', 'teruggedraaid', 'mislukt', 'wacht_op_goedkeuring', 'geweigerd')),
  fout text,
  created_at timestamptz not null default now(),
  teruggedraaid_op timestamptz
);
create index if not exists zarvis_acties_user_idx on public.zarvis_acties (user_id, created_at desc);
create index if not exists zarvis_acties_lead_idx on public.zarvis_acties (lead_id, created_at desc);

alter table public.zarvis_gesprekken enable row level security;
alter table public.zarvis_berichten enable row level security;
alter table public.zarvis_acties enable row level security;

do $$
declare
  t text;
  heeft_rol constant text :=
    '(has_role(auth.uid(), ''admin''::app_role) or has_role(auth.uid(), ''user''::app_role))';
begin
  foreach t in array array['zarvis_gesprekken', 'zarvis_berichten', 'zarvis_acties'] loop
    execute format('drop policy if exists "eigen of admin leest %1$s" on public.%1$I', t);
    execute format(
      'create policy "eigen of admin leest %1$s" on public.%1$I for select to authenticated
         using (user_id = auth.uid() or has_role(auth.uid(), ''admin''::app_role))', t);

    execute format('drop policy if exists "eigen rij toevoegen %1$s" on public.%1$I', t);
    execute format(
      'create policy "eigen rij toevoegen %1$s" on public.%1$I for insert to authenticated
         with check (user_id = auth.uid() and %2$s)', t, heeft_rol);
  end loop;

  -- Bijwerken alleen waar het nodig is: gesprek (titel, updated_at) en actie (status).
  foreach t in array array['zarvis_gesprekken', 'zarvis_acties'] loop
    execute format('drop policy if exists "eigen rij bijwerken %1$s" on public.%1$I', t);
    execute format(
      'create policy "eigen rij bijwerken %1$s" on public.%1$I for update to authenticated
         using (user_id = auth.uid() and %2$s) with check (user_id = auth.uid() and %2$s)', t, heeft_rol);
  end loop;
end $$;

-- Niet-ingelogde bezoekers hebben hier niets te zoeken, ook niet via een grant.
revoke all on public.zarvis_gesprekken, public.zarvis_berichten, public.zarvis_acties from anon;

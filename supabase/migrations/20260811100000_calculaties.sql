-- Historiek van prijsberekeningen per dossier.
--
-- Op leads staat alleen de LAATSTE berekening (budget_* + calculator_state).
-- Daardoor is niet terug te zien wat er tijdens het telefoongesprek gerekend
-- werd versus tijdens de intake. Eén rij per calculatiesessie lost dat op:
-- de sessie maakt bij de eerste wijziging een rij aan en werkt die daarna bij,
-- zodat typen geen tientallen rijen oplevert.
create table if not exists public.calculaties (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  bron text not null default 'los',
  calculator_state jsonb,
  inbegrepen_posten jsonb not null default '[]'::jsonb,
  budget_excl numeric,
  budget_min_excl numeric,
  budget_max_excl numeric,
  btw_percentage integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

comment on table public.calculaties is
  'Historiek van prijsberekeningen per dossier. Eén rij per calculatiesessie; bron zegt waar ze gemaakt is (los, intake, telefoon).';

create index if not exists calculaties_lead_idx on public.calculaties (lead_id, created_at desc);

alter table public.calculaties enable row level security;

drop policy if exists "ingelogd leest calculaties" on public.calculaties;
create policy "ingelogd leest calculaties" on public.calculaties
  for select to authenticated using (true);

drop policy if exists "ingelogd schrijft calculaties" on public.calculaties;
create policy "ingelogd schrijft calculaties" on public.calculaties
  for all to authenticated using (true) with check (true);

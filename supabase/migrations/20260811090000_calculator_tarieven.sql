-- Instelbare calculatorprijzen: één rij, bewerkt via de beheerdersconsole.
-- Ontbreekt de rij, dan valt de app terug op STANDAARD_TARIEVEN in
-- src/lib/prijscalculator.ts, zodat de calculator ook zonder deze tabel werkt.
create table if not exists public.calculator_tarieven (
  id boolean primary key default true,
  tarieven jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint calculator_tarieven_singleton check (id)
);

comment on table public.calculator_tarieven is
  'Eén rij met alle instelbare calculatorprijzen. Ontbreekt de rij, dan valt de app terug op STANDAARD_TARIEVEN in src/lib/prijscalculator.ts.';

alter table public.calculator_tarieven enable row level security;

-- Lezen mag iedereen die ingelogd is: de calculator draait bij elke gebruiker.
drop policy if exists "iedereen leest tarieven" on public.calculator_tarieven;
create policy "iedereen leest tarieven" on public.calculator_tarieven
  for select to authenticated using (true);

-- Schrijven alleen door een admin: dit raakt elke nieuwe prijsberekening.
drop policy if exists "alleen admin schrijft tarieven" on public.calculator_tarieven;
create policy "alleen admin schrijft tarieven" on public.calculator_tarieven
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- IDEE-36, stap 4: meer dan een mailadres en telefoonnummer per klant.
--
-- customers.email en customers.telefoon blijven het hoofdadres en hoofdnummer (de klantsleutel en Bouwflow
-- hangen eraan). Deze tabel houdt de EXTRA adressen en nummers bij, toegevoegd in het dossierscherm.
-- Additief: geen bestaande tabel of functie verandert van gedrag, behalve dat mailcrm_dossiers() een veld
-- `extra_emails` meestuurt (sync-projects versie 5 in Mail-CRM hangt die aan dezelfde klantfiche; een oudere
-- versie negeert het veld).
--
-- Rechten naar het voorbeeld van customers: elke ingelogde mag lezen, admin of user mag toevoegen. Verwijderen
-- mag hier ook een user (bij customers alleen admin): een extra adres wissen is gelijk aan het mailadres van een
-- klant aanpassen, en dat mag een user ook.

create table if not exists public.klant_contactgegevens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  soort text not null check (soort in ('email', 'telefoon')),
  waarde text not null check (length(btrim(waarde)) between 3 and 200),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  check (soort <> 'email' or btrim(waarde) ~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);
create unique index if not exists klant_contactgegevens_uniek on public.klant_contactgegevens (customer_id, soort, lower(btrim(waarde)));
create index if not exists klant_contactgegevens_klant on public.klant_contactgegevens (customer_id);

alter table public.klant_contactgegevens enable row level security;
drop policy if exists "Ingelogden lezen klant_contactgegevens" on public.klant_contactgegevens;
create policy "Ingelogden lezen klant_contactgegevens" on public.klant_contactgegevens
  for select to authenticated using (true);
drop policy if exists "Admin of user voegt klant_contactgegevens toe" on public.klant_contactgegevens;
create policy "Admin of user voegt klant_contactgegevens toe" on public.klant_contactgegevens
  for insert to authenticated with check (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'user'::app_role));
drop policy if exists "Admin of user wist klant_contactgegevens" on public.klant_contactgegevens;
create policy "Admin of user wist klant_contactgegevens" on public.klant_contactgegevens
  for delete to authenticated using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'user'::app_role));

-- Het pakket voor Mail-CRM: zoals in 20261124210000, plus de extra mailadressen van de klant.
create or replace function public.mailcrm_dossiers()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'extern_dossier_id', l.bouwflow_project_number,
    'naam', btrim(coalesce(l.voornaam, '') || ' ' || coalesce(l.achternaam, '')),
    'status', m.phase_title,
    'klant_id', l.customer_id,
    'klant_naam', btrim(coalesce(c.voornaam, l.voornaam, '') || ' ' || coalesce(c.achternaam, l.achternaam, '')),
    'email', nullif(btrim(coalesce(c.email, l.email, '')), ''),
    'telefoon', nullif(btrim(coalesce(c.telefoon, l.telefoon, '')), ''),
    'extra_emails', coalesce((select jsonb_agg(lower(btrim(k.waarde)) order by k.created_at)
                              from public.klant_contactgegevens k
                              where k.customer_id = l.customer_id and k.soort = 'email'), '[]'::jsonb)
  ) order by l.bouwflow_project_number), '[]'::jsonb)
  from public.leads l
  left join public.customers c on c.id = l.customer_id
  left join public.bouwflow_phase_category_map m on m.phase_id::text = l.bouwflow_phase
  where l.bouwflow_project_number is not null;
$$;
revoke execute on function public.mailcrm_dossiers() from public, anon, authenticated;
grant execute on function public.mailcrm_dossiers() to service_role;

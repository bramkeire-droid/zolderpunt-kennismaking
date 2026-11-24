-- L4 (2026-11-24, baan LOKETTEN): twee klantrijen samenvoegen, achter Brams ja, met een weg terug.
-- Gemaakt voor de drie dubbele klanten (telkens een rij zonder dossier naast een met dossier).
--
-- zarvis_klant_samenvoegen(van, naar, bevestigd = false):
--   zonder bevestigd een droge proef: welke dossiers verhuizen, welke mailadressen en nummers van "van"
--   als extra gegevens bij "naar" komen, en wat overgeslagen wordt (al aanwezig, of een adres van het
--   bedrijf zelf). Er verandert niets.
--   met bevestigd: alles in één transactie, met een rij in klant_samenvoeg_log; "van" verdwijnt.
-- zarvis_klant_samenvoegen_terug(log_id, bevestigd = false): zet het precies terug.
-- Alleen de serversleutel mag ze uitvoeren (het loket van Zarvis), niet een ingelogde gebruiker.
--
-- Te weten: de trigger leads_koppel_klant zoekt een klant op het hoofdadres (klant_sleutel), niet op de
-- extra adressen. Komt er later een NIEUW dossier binnen met het oude adres van "van", dan maakt die
-- trigger opnieuw een eigen klant aan. Dat verandert deze migratie niet.

create table if not exists public.klant_samenvoeg_log (
  id uuid primary key default gen_random_uuid(),
  van_id uuid not null,
  naar_id uuid not null,
  van_rij jsonb not null,
  van_contactgegevens jsonb not null default '[]'::jsonb,
  dossiers uuid[] not null default '{}',
  toegevoegd uuid[] not null default '{}',
  door text,
  op timestamptz not null default now(),
  teruggedraaid_op timestamptz
);
alter table public.klant_samenvoeg_log enable row level security;
-- Geen policies: alleen de serversleutel leest en schrijft.

create or replace function public.zarvis_klant_samenvoegen(p_van uuid, p_naar uuid, p_bevestigd boolean default false, p_door text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v public.customers; n public.customers;
  v_dossiers uuid[]; v_contact jsonb;
  over jsonb := '[]'::jsonb; overgeslagen jsonb := '[]'::jsonb;
  k record; norm text; nieuw uuid; v_toegevoegd uuid[] := '{}'; log_id uuid;
begin
  if p_van is null or p_naar is null or p_van = p_naar then
    return jsonb_build_object('fout', 'Geef twee verschillende klanten.');
  end if;
  select * into v from public.customers where id = p_van;
  if not found then return jsonb_build_object('fout', 'De klant om op te ruimen bestaat niet.'); end if;
  select * into n from public.customers where id = p_naar;
  if not found then return jsonb_build_object('fout', 'De klant om te behouden bestaat niet.'); end if;

  v_dossiers := array(select id from public.leads where customer_id = p_van order by created_at);
  select coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) into v_contact from public.klant_contactgegevens g where g.customer_id = p_van;

  -- Wat van "van" bij "naar" komt: hoofdadres, hoofdnummer en de extra gegevens.
  for k in
    select 'email'::text soort, v.email waarde where coalesce(trim(v.email), '') <> ''
    union all select 'telefoon', v.telefoon where coalesce(trim(v.telefoon), '') <> ''
    union all select g.soort, g.waarde from public.klant_contactgegevens g where g.customer_id = p_van
  loop
    norm := case when k.soort = 'email' then lower(trim(k.waarde))
                 else right(regexp_replace(k.waarde, '[^0-9]', '', 'g'), 9) end;
    if k.soort = 'email' and norm ~ '@(.+\.)?(zolderpunt|belhouse[a-z-]*)\.be$' then
      overgeslagen := overgeslagen || jsonb_build_object('soort', k.soort, 'reden', 'adres van het bedrijf zelf');
    elsif (k.soort = 'email' and norm = lower(trim(coalesce(n.email, ''))))
       or (k.soort = 'telefoon' and norm <> '' and norm = right(regexp_replace(coalesce(n.telefoon, ''), '[^0-9]', '', 'g'), 9))
       or exists (select 1 from public.klant_contactgegevens g where g.customer_id = p_naar and g.soort = k.soort
                  and (case when k.soort = 'email' then lower(trim(g.waarde)) else right(regexp_replace(g.waarde, '[^0-9]', '', 'g'), 9) end) = norm)
       or exists (select 1 from jsonb_array_elements(over) o where o->>'soort' = k.soort and o->>'norm' = norm) then
      overgeslagen := overgeslagen || jsonb_build_object('soort', k.soort, 'reden', 'staat al bij de klant');
    else
      over := over || jsonb_build_object('soort', k.soort, 'waarde', trim(k.waarde), 'norm', norm);
    end if;
  end loop;

  if not coalesce(p_bevestigd, false) then
    return jsonb_build_object(
      'droog', true, 'van', p_van, 'naar', p_naar,
      'dossiers_te_verhuizen', coalesce(array_length(v_dossiers, 1), 0),
      'over_te_nemen', (select coalesce(jsonb_agg(o - 'norm'), '[]'::jsonb) from jsonb_array_elements(over) o),
      'overgeslagen', overgeslagen,
      'wat_er_gebeurt', 'De dossiers en gegevens gaan naar de klant die blijft; de andere klantrij verdwijnt. Terug te zetten.');
  end if;

  insert into public.klant_samenvoeg_log (van_id, naar_id, van_rij, van_contactgegevens, dossiers, door)
  values (p_van, p_naar, to_jsonb(v), v_contact, v_dossiers, p_door) returning id into log_id;
  update public.leads set customer_id = p_naar where id = any(v_dossiers);
  for k in select o->>'soort' soort, o->>'waarde' waarde from jsonb_array_elements(over) o loop
    insert into public.klant_contactgegevens (customer_id, soort, waarde) values (p_naar, k.soort, k.waarde) returning id into nieuw;
    v_toegevoegd := v_toegevoegd || nieuw;
  end loop;
  delete from public.customers where id = p_van;
  update public.klant_samenvoeg_log set toegevoegd = v_toegevoegd where id = log_id;
  return jsonb_build_object('gedaan', true, 'log_id', log_id, 'dossiers_verhuisd', coalesce(array_length(v_dossiers, 1), 0),
                            'toegevoegd', coalesce(array_length(v_toegevoegd, 1), 0), 'overgeslagen', overgeslagen);
end $$;

create or replace function public.zarvis_klant_samenvoegen_terug(p_log uuid, p_bevestigd boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l public.klant_samenvoeg_log;
begin
  select * into l from public.klant_samenvoeg_log where id = p_log;
  if not found then return jsonb_build_object('fout', 'Geen samenvoeging met dat id.'); end if;
  if l.teruggedraaid_op is not null then return jsonb_build_object('fout', 'Al teruggezet.'); end if;
  if not coalesce(p_bevestigd, false) then
    return jsonb_build_object('droog', true, 'van', l.van_id, 'naar', l.naar_id,
      'dossiers_terug', coalesce(array_length(l.dossiers, 1), 0), 'te_wissen', coalesce(array_length(l.toegevoegd, 1), 0));
  end if;
  insert into public.customers select * from jsonb_populate_record(null::public.customers, l.van_rij);
  insert into public.klant_contactgegevens select * from jsonb_populate_recordset(null::public.klant_contactgegevens, l.van_contactgegevens);
  update public.leads set customer_id = l.van_id where id = any(l.dossiers);
  delete from public.klant_contactgegevens where id = any(l.toegevoegd);
  update public.klant_samenvoeg_log set teruggedraaid_op = now() where id = p_log;
  return jsonb_build_object('teruggezet', true, 'log_id', p_log);
end $$;

revoke all on function public.zarvis_klant_samenvoegen(uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.zarvis_klant_samenvoegen_terug(uuid, boolean) from public, anon, authenticated;
grant execute on function public.zarvis_klant_samenvoegen(uuid, uuid, boolean, text) to service_role;
grant execute on function public.zarvis_klant_samenvoegen_terug(uuid, boolean) to service_role;

-- Golf 6 (2026-11-24, baan LOKETTEN): Zarvis doet iets in een dossier, na Brams ja, gelogd en terug te zetten.
-- Additief: een kolom bron op dossier_chat, een logtabel en twee functies. Alleen de serversleutel voert ze uit.
--
-- zarvis_dossier_aanvullen(lead, velden, bevestigd = false, door): B-085.
--   volgende_stap, oppervlakte_m2 en project_type mogen ingevuld of overschreven worden.
--   telefoon en adres alleen AANVULLEN: alleen als het dossier en zijn klant dat veld leeg hebben, het dossier een
--   mailadres heeft en de klant precies op dat adres gesleuteld is. Anders zouden de triggers leads_koppel_klant en
--   leads_sync_naar_klant het dossier aan een andere klant kunnen hangen.
--   Zonder bevestigd een droge proef per veld (oud, nieuw, toegelaten, reden).
-- zarvis_dossier_aanvullen_terug(log_id, bevestigd = false): zet de oude waarden terug, ook bij de klant.

alter table public.dossier_chat add column if not exists bron text;
comment on column public.dossier_chat.bron is 'null = in Compass getypt, ''zarvis'' = door Zarvis na Brams ja.';

create table if not exists public.dossier_wijziging_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  oud jsonb not null,
  nieuw jsonb not null,
  klant_oud jsonb not null default '{}'::jsonb,
  door text,
  op timestamptz not null default now(),
  teruggedraaid_op timestamptz
);
alter table public.dossier_wijziging_log enable row level security;

create or replace function public.zarvis_dossier_aanvullen(p_lead uuid, p_velden jsonb, p_bevestigd boolean default false, p_door text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  l public.leads; c public.customers;
  r record; k text; v jsonb; oud jsonb := '{}'; nieuw jsonb := '{}'; klant_oud jsonb := '{}';
  per jsonb := '[]'; reden text; tekst text; log_id uuid;
begin
  select * into l from public.leads where id = p_lead;
  if not found then return jsonb_build_object('fout', 'Dossier niet gevonden.'); end if;
  select * into c from public.customers where id = l.customer_id;
  if p_velden is null or jsonb_typeof(p_velden) <> 'object' then return jsonb_build_object('fout', 'Geef velden.'); end if;

  for r in select key, value from jsonb_each(p_velden) loop
    k := r.key; v := r.value;
    reden := null;
    tekst := nullif(btrim(v #>> '{}'), '');
    if k not in ('volgende_stap', 'oppervlakte_m2', 'project_type', 'telefoon', 'adres') then
      reden := 'dit veld kan Zarvis niet invullen';
    elsif tekst is null then
      reden := 'lege waarde';
    elsif k = 'volgende_stap' and length(tekst) > 500 then reden := 'te lang (hoogstens 500 tekens)';
    elsif k = 'project_type' and length(tekst) > 100 then reden := 'te lang (hoogstens 100 tekens)';
    elsif k = 'oppervlakte_m2' and (tekst !~ '^\d{1,5}([.,]\d{1,2})?$' or replace(tekst, ',', '.')::numeric <= 0) then reden := 'geen geldige oppervlakte';
    elsif k in ('telefoon', 'adres') then
      if coalesce(btrim(case k when 'telefoon' then l.telefoon else l.adres end), '') <> '' then reden := 'staat al ingevuld; alleen aanvullen, nooit overschrijven';
      elsif c.id is not null and coalesce(btrim(case k when 'telefoon' then c.telefoon else c.adres end), '') <> '' then reden := 'de klant heeft dit al; alleen aanvullen, nooit overschrijven';
      elsif coalesce(btrim(l.email), '') = '' then reden := 'het dossier heeft geen mailadres; dan kan dit het dossier aan een andere klant hangen';
      elsif c.id is null or c.klant_sleutel <> lower(btrim(l.email)) then reden := 'de klant is niet op het mailadres van het dossier gesleuteld; dan kan dit het dossier aan een andere klant hangen';
      elsif k = 'telefoon' and length(regexp_replace(tekst, '[^0-9]', '', 'g')) < 9 then reden := 'geen geldig nummer';
      end if;
    end if;
    per := per || jsonb_build_object('veld', k, 'oud', to_jsonb(l) -> k, 'nieuw', tekst, 'toegelaten', reden is null, 'reden', reden);
    if reden is null then
      oud := oud || jsonb_build_object(k, to_jsonb(l) -> k);
      nieuw := nieuw || jsonb_build_object(k, tekst);
      if k in ('telefoon', 'adres') then klant_oud := klant_oud || jsonb_build_object(k, to_jsonb(c) -> k); end if;
    end if;
  end loop;

  if nieuw = '{}'::jsonb then return jsonb_build_object('fout', 'Er valt niets in te vullen.', 'velden', per); end if;
  if not coalesce(p_bevestigd, false) then
    return jsonb_build_object('droog', true, 'dossier_id', p_lead, 'velden', per, 'wat_er_gebeurt', 'De toegelaten velden worden ingevuld in Compass; terug te zetten.');
  end if;

  insert into public.dossier_wijziging_log (lead_id, oud, nieuw, klant_oud, door) values (p_lead, oud, nieuw, klant_oud, p_door) returning id into log_id;
  update public.leads set
    volgende_stap  = case when nieuw ? 'volgende_stap'  then nieuw->>'volgende_stap'  else volgende_stap end,
    oppervlakte_m2 = case when nieuw ? 'oppervlakte_m2' then replace(nieuw->>'oppervlakte_m2', ',', '.')::numeric else oppervlakte_m2 end,
    project_type   = case when nieuw ? 'project_type'   then nieuw->>'project_type'   else project_type end,
    telefoon       = case when nieuw ? 'telefoon'       then nieuw->>'telefoon'       else telefoon end,
    adres          = case when nieuw ? 'adres'          then nieuw->>'adres'          else adres end
  where id = p_lead;
  return jsonb_build_object('gedaan', true, 'log_id', log_id, 'velden', per);
end $$;

create or replace function public.zarvis_dossier_aanvullen_terug(p_log uuid, p_bevestigd boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.dossier_wijziging_log; cid uuid;
begin
  select * into g from public.dossier_wijziging_log where id = p_log;
  if not found then return jsonb_build_object('fout', 'Geen wijziging met dat id.'); end if;
  if g.teruggedraaid_op is not null then return jsonb_build_object('fout', 'Al teruggezet.'); end if;
  if not coalesce(p_bevestigd, false) then return jsonb_build_object('droog', true, 'dossier_id', g.lead_id, 'terug_naar', g.oud); end if;
  -- Eerst de klant, dan het dossier: anders schrijft de klant-trigger (customers_sync_naar_dossiers) de oude
  -- waarde van de klant meteen terug in het dossier. Een lege waarde schrijft geen trigger door: zelf doen.
  select customer_id into cid from public.leads where id = g.lead_id;
  if g.klant_oud <> '{}'::jsonb and cid is not null then
    update public.customers set
      telefoon = case when g.klant_oud ? 'telefoon' then g.klant_oud->>'telefoon' else telefoon end,
      adres    = case when g.klant_oud ? 'adres'    then g.klant_oud->>'adres'    else adres end
    where id = cid;
  end if;
  update public.leads set
    volgende_stap  = case when g.oud ? 'volgende_stap'  then g.oud->>'volgende_stap'  else volgende_stap end,
    oppervlakte_m2 = case when g.oud ? 'oppervlakte_m2' then (g.oud->>'oppervlakte_m2')::numeric else oppervlakte_m2 end,
    project_type   = case when g.oud ? 'project_type'   then g.oud->>'project_type'   else project_type end,
    telefoon       = case when g.oud ? 'telefoon'       then g.oud->>'telefoon'       else telefoon end,
    adres          = case when g.oud ? 'adres'          then g.oud->>'adres'          else adres end
  where id = g.lead_id;
  update public.dossier_wijziging_log set teruggedraaid_op = now() where id = p_log;
  return jsonb_build_object('teruggezet', true, 'log_id', p_log);
end $$;

revoke all on function public.zarvis_dossier_aanvullen(uuid, jsonb, boolean, text) from public, anon, authenticated;
revoke all on function public.zarvis_dossier_aanvullen_terug(uuid, boolean) from public, anon, authenticated;
grant execute on function public.zarvis_dossier_aanvullen(uuid, jsonb, boolean, text) to service_role;
grant execute on function public.zarvis_dossier_aanvullen_terug(uuid, boolean) to service_role;

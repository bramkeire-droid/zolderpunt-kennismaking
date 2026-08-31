-- Eén schrijver naar BouwFlow.
--
-- AANLEIDING. Voor Kristof Vanden Bussche ontstonden twee BouwFlow-projecten
-- (ZL-0138 en ZL-0139) uit één websiteformulier, waarna de terugsync er een
-- tweede Compass-dossier bij maakte. Een volledig telefoongesprek bleek daarna
-- "verdwenen": het stond gewoon op de andere helft van het tweelingdossier.
--
-- OORZAAK. Twee routes maakten onafhankelijk van elkaar een BouwFlow-project
-- aan (de website rechtstreeks, en Compass via de kwartiertaak), en de
-- koppeling tussen beide systemen werd pas achteraf geraden op telefoon en
-- e-mail. Identiteit die achteraf geraden wordt, levert vroeg of laat dubbels.
--
-- Deze migratie levert het slot waarmee precies één aanroep een dossier mag
-- doorduwen. De rest van de oplossing zit in de edge functions: create-website-
-- lead pusht voortaan zelf en bewaart het projectnummer meteen, en de website
-- maakt zelf geen BouwFlow-projecten meer aan.

alter table public.leads
  add column if not exists bouwflow_push_claimed_at timestamptz;

comment on column public.leads.bouwflow_push_claimed_at is
  'Zet wie het push-naar-BouwFlow-recht op dit dossier claimt. Atomair gezet via claim_bouwflow_push(); weer op null bij een mislukte push zodat de herstel-cron opnieuw mag proberen. Voorkomt dat twee gelijktijdige aanroepen allebei een project aanmaken.';

-- Bewust een functie en geen filter in de client: de vervaltijd moet anders als
-- tekst door de query-taal, en dat is precies het soort stille parseerfout waar
-- deze koppeling niet tegen kan.
create or replace function public.claim_bouwflow_push(_lead_id uuid, _lease_minutes int default 10)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare v_gelukt boolean;
begin
  -- Eén atomair statement: Postgres vergrendelt de rij, dus van twee
  -- gelijktijdige aanroepen wint er altijd precies één. De claim vervalt na
  -- _lease_minutes zodat een halverwege gecrashte push het dossier niet
  -- voorgoed blokkeert voor de herstel-cron.
  update public.leads
     set bouwflow_push_claimed_at = now()
   where id = _lead_id
     and (bouwflow_push_claimed_at is null
          or bouwflow_push_claimed_at < now() - make_interval(mins => _lease_minutes))
  returning true into v_gelukt;

  return coalesce(v_gelukt, false);
end;
$$;

-- Enkel de edge functions (service_role) mogen claimen; nooit de browser.
revoke execute on function public.claim_bouwflow_push(uuid, int) from public, anon, authenticated;
grant execute on function public.claim_bouwflow_push(uuid, int) to service_role;

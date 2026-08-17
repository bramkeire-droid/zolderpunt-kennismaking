-- Automatische Bouwflow-sync.
--
-- WAAROM DIT BESTAAT
-- pull-bouwflow-projects werd tot nu toe alleen gedraaid door (a) een klik op
-- "Synchroniseren met Bouwflow" en (b) een binnenkomende website-lead. Een
-- lead die rechtstreeks in Bouwflow werd aangemaakt, of een fasewijziging daar,
-- bereikte Compass dus nooit uit zichzelf. Dat is geen randgeval maar de
-- normale gang van zaken, en het bleef onopgemerkt omdat een mislukte sync
-- nergens zichtbaar was.
--
-- Elk kwartier is ruim genoeg: Bouwflow is de bron, Compass volgt.
-- pull-bouwflow-projects is idempotent (matcht op projectnummer/klant en
-- werkt bij i.p.v. dupliceert), dus vaker draaien is onschadelijk.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- pull-bouwflow-projects controleert geen aanroeper en is publiek bereikbaar
-- (verify_jwt staat uit), dus de cron heeft geen sleutel nodig. Alleen de
-- project-URL staat in internal_config, zodat die niet hardgecodeerd in de
-- migratie staat.
create table if not exists public.internal_config (
  key text primary key,
  value text not null
);
alter table public.internal_config enable row level security;
-- Bewust geen policies: alleen de service-role (die RLS omzeilt) leest dit.

do $$
begin
  perform cron.unschedule('bouwflow-pull');
exception when others then
  null; -- bestond nog niet
end $$;

select cron.schedule(
  'bouwflow-pull',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select value from public.internal_config where key = 'supabase_url')
           || '/functions/v1/pull-bouwflow-projects',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"dry_run": false}'::jsonb
  );
  $$
);

-- Eenmalig invullen met de echte project-URL:
--   insert into public.internal_config (key, value)
--   values ('supabase_url', 'https://<project>.supabase.co')
--   on conflict (key) do update set value = excluded.value;

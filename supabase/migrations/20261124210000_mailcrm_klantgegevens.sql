-- IDEE-36, stap 3 (kant van Compass): naar Mail-CRM gaan voortaan ook de klantsleutel, het mailadres en de
-- telefoon van elk dossier. NIET TOEGEPAST: dit bestand staat enkel in de repo.
--
-- WAAROM EEN MIGRATIE. De geplande taak `mailcrm-projects-push` (elk kwartier, minuut 7, 22, 37, 52) staat niet
-- in de code van Compass: het is een taak in de databank zelf (pg_cron). Wat ze nu precies verstuurt, staat dus
-- alleen in de live databank (cron.job.command). Daarom bouwt deze migratie het pakket in een SQL-functie
-- `mailcrm_dossiers()` en zet ze de taak erop om.
--
-- LEES EERST (alleen lezen, in de Compass-databank), en pas dit bestand aan als het antwoord afwijkt:
--   select jobname, schedule, command from cron.job where jobname = 'mailcrm-projects-push';
--   select key from public.internal_config;
-- Deze migratie gaat uit van: de taak roept {mailcrm_url}/functions/v1/sync-projects aan, zonder Authorization-
-- header, met het geheim in de body; en internal_config heeft de sleutels `mailcrm_url` (zonder pad) en
-- `mailcrm_sync_secret`. Klopt dat niet, dan stopt de controle hieronder met een foutmelding en verandert er niets.
--
-- Eerst de migratie en de nieuwe sync-projects in Mail-CRM, pas daarna deze migratie. (De oude sync-projects zou
-- de nieuwe velden stilletjes negeren, dus de volgorde breekt niets, maar dan gebeurt er ook niets.)
-- Een droge proef vooraf: zie het slot van dit bestand.

do $$
declare v_cmd text; v_url text;
begin
  select command into v_cmd from cron.job where jobname = 'mailcrm-projects-push';
  if v_cmd is null then
    raise exception 'De taak mailcrm-projects-push bestaat niet; niets veranderd.';
  end if;
  if v_cmd not ilike '%sync-projects%' then
    raise exception 'De taak roept sync-projects niet aan; pas deze migratie aan. Taak: %', left(v_cmd, 300);
  end if;
  if v_cmd ilike '%authorization%' then
    raise exception 'De taak stuurt een Authorization-header mee; pas deze migratie aan zodat die blijft. Taak: %', left(v_cmd, 300);
  end if;
  select value into v_url from public.internal_config where key = 'mailcrm_url';
  if v_url is null or v_url like '%/functions/%' then
    raise exception 'internal_config heeft geen sleutel mailcrm_url met enkel de basis-URL; pas deze migratie aan.';
  end if;
  if not exists (select 1 from public.internal_config where key = 'mailcrm_sync_secret') then
    raise exception 'internal_config heeft geen sleutel mailcrm_sync_secret; pas deze migratie aan.';
  end if;
  -- De oude opdracht bewaren, zodat terugdraaien exact kan.
  insert into public.internal_config (key, value) values ('mailcrm_push_oude_opdracht', v_cmd)
  on conflict (key) do nothing;
end $$;

-- Het pakket: per dossier met ZL-nummer wat al meeging (nummer, naam, fase), plus de klantsleutel
-- (leads.customer_id), de naam van de klant, het mailadres en de telefoon. Het adres en nummer komen van de klant
-- (customers), met het dossier als terugval. Alleen lezen.
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
    'telefoon', nullif(btrim(coalesce(c.telefoon, l.telefoon, '')), '')
  ) order by l.bouwflow_project_number), '[]'::jsonb)
  from public.leads l
  left join public.customers c on c.id = l.customer_id
  left join public.bouwflow_phase_category_map m on m.phase_id::text = l.bouwflow_phase
  where l.bouwflow_project_number is not null;
$$;
revoke execute on function public.mailcrm_dossiers() from public, anon, authenticated;
grant execute on function public.mailcrm_dossiers() to service_role;

-- De taak zelf: zelfde schema (7, 22, 37, 52), zelfde plaats, nieuw pakket. alleen_status blijft aan: een naam die
-- in Mail-CRM al staat wordt niet overschreven, enkel de fase.
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'mailcrm-projects-push'),
  command := $job$
  select net.http_post(
    url := (select value from public.internal_config where key = 'mailcrm_url') || '/functions/v1/sync-projects',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object(
      'secret', (select value from public.internal_config where key = 'mailcrm_sync_secret'),
      'alleen_status', true,
      'dossiers', public.mailcrm_dossiers()
    ),
    timeout_milliseconds := 20000
  );
  $job$
);

-- Droge proef vooraf (schrijft niets in Mail-CRM): geef dit pakket met "dry_run": true aan sync-projects, of kijk
-- eerst alleen naar het pakket:
--   select jsonb_array_length(public.mailcrm_dossiers());                                  -- 142 verwacht
--   select count(*) from jsonb_to_recordset(public.mailcrm_dossiers()) as x(klant_id text, email text)
--   where klant_id is null;                                                                -- 0 verwacht
--
-- Terugdraaien:
--   select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'mailcrm-projects-push'),
--     command := (select value from public.internal_config where key = 'mailcrm_push_oude_opdracht'));
--   drop function public.mailcrm_dossiers();

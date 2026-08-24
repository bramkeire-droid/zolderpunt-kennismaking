-- Vervolg op 20260824062445_fix_security_findings.sql: sluit de 3 resterende
-- "Deep agentic scan"-findings (pull-bouwflow-projects, push-nieuwe-dossiers,
-- push-to-bouwflow konden door iedereen zonder login aangeroepen worden, en
-- lekten of muteerden zo klant-PII).
--
-- Gedeeld secret voor de twee cron-getriggerde functies, zelfde patroon als
-- flush-inbound-groups (secret in internal_config, want pg_cron kan geen
-- Deno-env lezen — enkel SQL). De waarde wordt hier random gegenereerd, niet
-- hardcoded, zodat ze nooit in de git-historiek terechtkomt.
insert into public.internal_config (key, value)
values ('bouwflow_cron_secret', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- De twee cron-taken sturen dat secret voortaan mee als header. Zonder deze
-- header (of een geldige ingelogde-gebruiker-sessie) weigeren de functies nu.
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'bouwflow-pull'),
  command := $$
  select net.http_post(
    url := (select value from public.internal_config where key = 'supabase_url')
           || '/functions/v1/pull-bouwflow-projects',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bouwflow-cron-secret', (select value from public.internal_config where key = 'bouwflow_cron_secret')
    ),
    body := '{"dry_run": false}'::jsonb
  );
  $$
);

select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'bouwflow-push-nieuwe'),
  command := $$
  select net.http_post(
    url := (select value from public.internal_config where key = 'supabase_url')
           || '/functions/v1/push-nieuwe-dossiers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-bouwflow-cron-secret', (select value from public.internal_config where key = 'bouwflow_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

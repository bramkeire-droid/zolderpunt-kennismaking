-- LOKETTEN, 25 november: "nemen" (Brams regel, ARCHITECTUUR 3.29, contacten-fiche-v3): een nieuw dossier in Compass
-- maakt een fiche in de contactbibliotheek van Zarvis, of hangt aan een bestaande. Compass meldt het aan contacten-loket
-- met zijn eigen toolsleutel (alleen de vraag nieuw_dossier; nooit beslis of wijzig).
--
-- NIET TOEPASSEN voor Brams ja op de toolsleutel. Daarna, in deze volgorde:
--   1. de sleutel in de Vault van Compass:   select vault.create_secret('<sleutel>', 'contacten_sleutel');   (Bram plakt)
--   2. het adres:  insert into public.internal_config (key, value) values ('contacten_loket_url',
--                  'https://jerekxoryumsnddalket.supabase.co/functions/v1/contacten-loket');
--   3. deze migratie.
-- Zonder sleutel of adres doet alles hieronder niets (geen oproep). Een fout in de oproep houdt het opslaan van een
-- dossier nooit tegen: pg_net vertrekt na de transactie. Wat dan mislukt, neemt de taak van 's nachts in (idempotent).
-- Alleen toevoegen: geen bestaande tabel, regel of functie verandert.

create or replace function public.contacten_nemen_stuur(p_lead uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text := (select value from public.internal_config where key = 'contacten_loket_url');
  v_sleutel text := (select decrypted_secret from vault.decrypted_secrets where name = 'contacten_sleutel' limit 1);
  v_body jsonb;
begin
  if coalesce(v_url, '') = '' or coalesce(length(v_sleutel), 0) < 32 then return; end if;
  select jsonb_build_object(
    'vraag', 'nieuw_dossier',
    'dossier_id', l.id::text,
    'dossiernummer', l.bouwflow_project_number,
    'klant', jsonb_build_object(
      'naam', nullif(btrim(coalesce(c.voornaam, l.voornaam, '') || ' ' || coalesce(c.achternaam, l.achternaam, '')), ''),
      'email', nullif(btrim(coalesce(c.email, l.email, '')), ''),
      'telefoon', nullif(btrim(coalesce(c.telefoon, l.telefoon, '')), ''),
      'adres', nullif(btrim(coalesce(l.adres, '')), '')))
  into v_body
  from public.leads l left join public.customers c on c.id = l.customer_id
  where l.id = p_lead and l.bouwflow_project_number is not null;
  if v_body is null or v_body #>> '{klant,naam}' is null then return; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-contacten-sleutel', v_sleutel),
    body := v_body,
    timeout_milliseconds := 10000);
end $$;
revoke execute on function public.contacten_nemen_stuur(uuid) from public, anon, authenticated;
grant execute on function public.contacten_nemen_stuur(uuid) to service_role;

-- Een nieuw dossier, of een gewijzigde naam, mail of telefoon van de klant.
create or replace function public.contacten_nemen_trigger() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.bouwflow_project_number is not null and (tg_op = 'INSERT'
     or new.bouwflow_project_number is distinct from old.bouwflow_project_number
     or new.email is distinct from old.email or new.telefoon is distinct from old.telefoon
     or new.voornaam is distinct from old.voornaam or new.achternaam is distinct from old.achternaam) then
    perform public.contacten_nemen_stuur(new.id);
  end if;
  return new;
exception when others then
  return new; -- nooit het opslaan van een dossier tegenhouden
end $$;
revoke execute on function public.contacten_nemen_trigger() from public, anon, authenticated;

create trigger leads_contacten_nemen after insert or update on public.leads
  for each row execute function public.contacten_nemen_trigger();

-- De taak van 's nachts: elk dossier dat de laatste 2 dagen veranderde, nog eens (nieuw_dossier is idempotent).
select cron.schedule('contacten-nemen-inhalen', '15 3 * * *', $job$
  select public.contacten_nemen_stuur(id) from public.leads
  where bouwflow_project_number is not null and updated_at > now() - interval '2 days';
$job$);

-- Terugdraaien:
--   select cron.unschedule('contacten-nemen-inhalen');
--   drop trigger leads_contacten_nemen on public.leads;
--   drop function public.contacten_nemen_trigger(); drop function public.contacten_nemen_stuur(uuid);

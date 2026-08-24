-- Sluit de twee bevestigde kritieke lekken uit de Lovable security-scan
-- (de andere 3 gemelde findings bleken bij controle al eerder gefixt te
-- zijn — het scanrapport was verouderd).
--
-- lead-fotos: lezen blijft publiek (het klantenportaal toont foto's zonder
-- Supabase-login, via een sessietoken), maar uploaden/wijzigen/verwijderen
-- stond open voor eender wie op het internet, zonder enige auth-check —
-- nu enkel voor ingelogde collega's, zelfde model als de rest van de app
-- (leads, pre_intake, ...).
drop policy if exists "Anyone can upload lead fotos" on storage.objects;
drop policy if exists "Anyone can update lead fotos" on storage.objects;
drop policy if exists "Anyone can delete lead fotos" on storage.objects;

create policy "ingelogd uploadt lead-fotos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lead-fotos');

create policy "ingelogd wijzigt lead-fotos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'lead-fotos');

create policy "ingelogd verwijdert lead-fotos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'lead-fotos');

-- portal_sessions: enkel de edge functions get-portal-data/verify-portal-email/
-- log-portal-event raken deze tabel aan, en die gebruiken stuk voor stuk de
-- service-role key (omzeilt RLS). Geen enkele clientcode leest of schrijft
-- deze tabel rechtstreeks, dus het publieke beleid diende nergens toe behalve
-- sessietokens lekken aan wie ze raadde.
drop policy if exists "Anyone can manage portal sessions" on public.portal_sessions;

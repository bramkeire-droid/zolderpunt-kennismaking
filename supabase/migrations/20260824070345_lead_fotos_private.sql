-- Laatste van de 4 kritieke security-findings: de lead-fotos bucket stond
-- publiek met een SELECT-policy die enkel bucket_id checkte, dus eender wie
-- kon alle klantfoto's opsommen (list()) en downloaden, niet enkel raden.
--
-- Bucket gaat privé. Ingelogde collega's blijven alles kunnen zien (zelfde
-- model als de rest van de app), maar krijgen nu een vers ondertekende URL
-- per foto (zie resignLeadFotos/useSignedLeadFotos in de frontend) in plaats
-- van een vaste publieke link. Het klantenportaal heeft geen Supabase-login,
-- dus daarvoor tekent get-portal-data server-side met de service-role key.
update storage.buckets set public = false where id = 'lead-fotos';

drop policy if exists "Public read lead fotos" on storage.objects;

create policy "ingelogd leest lead-fotos"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lead-fotos');

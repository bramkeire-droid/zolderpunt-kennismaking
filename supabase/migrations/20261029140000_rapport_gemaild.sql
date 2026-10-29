-- Spoor van de verstuurde rapportmail op het rapport zelf.
--
-- WAAROM OP rapporten EN NIET IN EEN APARTE TABEL. Het gaat om precies één
-- feit per rapport: is dit bestand al naar de klant gegaan, en waarheen. Een
-- tweede mail naar hetzelfde dossier gebeurt in de praktijk met een nieuw
-- rapport, en dat is een nieuwe rij.
--
-- Het wegschrijven gebeurt in de edge function send-rapport-mail met de
-- service role. Daarom is er bewust nog altijd geen UPDATE-policy voor
-- ingelogde gebruikers: de app leest deze kolommen, maar wijzigt ze niet.

alter table public.rapporten
  add column if not exists gemaild_op    timestamptz,
  add column if not exists gemaild_naar  text,
  add column if not exists mail_variant  text;

comment on column public.rapporten.mail_variant is
  'overleg = klant overlegt intern (met Calendly-link), plaatsbezoek = bezoek stond al ingepland';

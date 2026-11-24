-- Zarvis kan bellen (IDEE-28): een taak mag de gebruiker ook met een
-- telefoonoproep verwittigen. Alleen de toegelaten waarden van de eigen kolom
-- `verwittig` op `zarvis_taken` worden uitgebreid; bestaande rijen blijven geldig.
alter table public.zarvis_taken drop constraint if exists zarvis_taken_verwittig_check;
alter table public.zarvis_taken add constraint zarvis_taken_verwittig_check
  check (verwittig in ('melding', 'whatsapp', 'beide', 'bel'));

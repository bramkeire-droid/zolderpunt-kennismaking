-- Test: bewerken van "Klant & werf" mag geen andere dossiers stil overschrijven.
--
-- Draaien: plak dit volledig in query_database (Compass-databank). Het blok maakt
-- twee testdossiers van één klant, bewerkt er één, en eindigt ALTIJD met een
-- RAISE EXCEPTION. Daardoor wordt alles teruggedraaid: er blijft niets achter,
-- ook niet bij een geslaagde test. Lees de uitkomst in de foutmelding:
--   "KLANT-WERF-TEST GESLAAGD ..."  of  "KLANT-WERF-TEST GEFAALD ...".
--
-- Wat het bewaakt (gemeten op 19/11/2026, vóór de fix gefaald):
--   1. Het werfadres hoort bij het dossier. Een nieuw dossier van een bestaande
--      klant, of een adreswijziging op één dossier, mag het adres van een ander
--      dossier van die klant niet overschrijven (klant d58dd882 heeft twee
--      dossiers op twee verschillende werven).
--   2. Een nieuw adres zonder coördinaten blijft zonder coördinaten, zodat de
--      kaart in het intakegesprek opnieuw zoekt i.p.v. de oude plek te tonen.
--   3. Een gewijzigd e-mailadres blijft bij dezelfde klant en geldt voor al zijn
--      dossiers, in plaats van het dossier stil los te koppelen.
DO $$
DECLARE
  sfx text := substr(md5(random()::text), 1, 8);
  mail_oud text := 'kw-test-' || sfx || '@voorbeeld.invalid';
  mail_nieuw text := 'kw-nieuw-' || sfx || '@voorbeeld.invalid';
  a_id uuid; b_id uuid; klant_a uuid; klant_a_na uuid;
  b_adres_na_insert text; b_adres_na_edit text; a_adres text; a_lat double precision;
  b_mail text; fouten text[] := '{}';
BEGIN
  INSERT INTO leads (voornaam, achternaam, email, adres, adres_lat, adres_lng, gesprek_datum)
  VALUES ('KW-TEST', 'Klantwerf', mail_oud, 'Teststraat 1, 9000 Gent', 51.05, 3.72, NULL)
  RETURNING id, customer_id INTO a_id, klant_a;

  INSERT INTO leads (voornaam, achternaam, email, adres, gesprek_datum)
  VALUES ('KW-TEST', 'Klantwerf', mail_oud, '9400', NULL)
  RETURNING id INTO b_id;
  SELECT adres INTO b_adres_na_insert FROM leads WHERE id = b_id;
  IF b_adres_na_insert IS DISTINCT FROM '9400' THEN
    fouten := array_append(fouten, format('nieuw dossier kreeg adres van zusterdossier (%s)', b_adres_na_insert));
  END IF;

  UPDATE leads SET adres = 'Nieuwe straat 3, 9000 Gent', adres_lat = NULL, adres_lng = NULL WHERE id = a_id;
  SELECT adres INTO b_adres_na_edit FROM leads WHERE id = b_id;
  SELECT adres, adres_lat INTO a_adres, a_lat FROM leads WHERE id = a_id;
  IF b_adres_na_edit IS DISTINCT FROM b_adres_na_insert THEN
    fouten := array_append(fouten, format('adreswijziging overschreef zusterdossier (%s)', b_adres_na_edit));
  END IF;
  IF a_adres IS DISTINCT FROM 'Nieuwe straat 3, 9000 Gent' THEN
    fouten := array_append(fouten, format('nieuw adres bleef niet staan (%s)', a_adres));
  END IF;
  IF a_lat IS NOT NULL THEN
    fouten := array_append(fouten, format('oude coordinaten kwamen terug (%s)', a_lat));
  END IF;

  UPDATE leads SET email = mail_nieuw WHERE id = a_id;
  SELECT customer_id INTO klant_a_na FROM leads WHERE id = a_id;
  SELECT email INTO b_mail FROM leads WHERE id = b_id;
  IF klant_a_na IS DISTINCT FROM klant_a THEN
    fouten := array_append(fouten, 'e-mailwijziging koppelde het dossier los van zijn klant');
  END IF;
  IF b_mail IS DISTINCT FROM mail_nieuw THEN
    fouten := array_append(fouten, format('zusterdossier kreeg het nieuwe e-mailadres niet (%s)', b_mail));
  END IF;

  IF cardinality(fouten) = 0 THEN
    RAISE EXCEPTION 'KLANT-WERF-TEST GESLAAGD (alles teruggedraaid)';
  ELSE
    RAISE EXCEPTION 'KLANT-WERF-TEST GEFAALD (alles teruggedraaid): %', array_to_string(fouten, ' | ');
  END IF;
END $$;

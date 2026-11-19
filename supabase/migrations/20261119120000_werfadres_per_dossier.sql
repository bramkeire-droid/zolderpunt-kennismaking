-- Werfadres per dossier, klantgegevens per klant (19/11/2026).
--
-- Aanleiding: "Klant & werf" wordt bewerkbaar op de dossierpagina. Dat legde
-- twee stille overschrijvingen in de klant-triggers bloot, live gemeten met
-- supabase/tests/klant_werf_triggers.sql (faalde op alle vijf punten):
--
-- 1. customers_sync_naar_dossiers schreef het ADRES van de klant naar al zijn
--    dossiers. Maar leads.adres is het werfadres van één project: klant
--    d58dd882 heeft twee dossiers op twee verschillende werven. Elke bewaring
--    van één dossier (of een nieuw dossier van dezelfde klant) zette het adres
--    en de coördinaten van alle andere dossiers op dat ene adres. Ook kwamen
--    oude coördinaten terug nadat een adres gewijzigd was.
--    Nu: naam, partner, e-mail en telefoon blijven klantbreed; het adres niet.
--    customers.adres blijft gewoon "laatst gekende adres van de klant".
--
-- 2. leads_koppel_klant maakte bij een gewijzigd e-mailadres (of telefoon,
--    als er geen e-mail is) een NIEUWE klant aan en hing het dossier daaraan.
--    Een correctie van een tikfout koppelde het dossier zo stil los van zijn
--    andere dossiers, die het oude adres hielden.
--    Nu: hoort de nieuwe sleutel nog bij geen enkele klant, dan krijgt de
--    BESTAANDE klant die sleutel en blijft het dossier eraan hangen. Hoort de
--    sleutel al bij een andere klant, dan verandert er niets aan het oude
--    gedrag (koppelen aan die klant) — de app weigert die bewerking vooraf.
--    INSERT verandert niet.

CREATE OR REPLACE FUNCTION public.customers_sync_naar_dossiers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Rem op diepte 2: een correctie op een dossier gaat via de leads-trigger
  -- naar de klant (diepte 1) en van daar naar de zusterdossiers (diepte 2).
  IF pg_trigger_depth() > 2 THEN
    RETURN NEW;
  END IF;

  -- Geen adres en geen coördinaten: dat is het werfadres van elk dossier apart.
  UPDATE leads SET
    voornaam     = coalesce(NEW.voornaam, voornaam),
    achternaam   = coalesce(NEW.achternaam, achternaam),
    partner_naam = NEW.partner_naam,
    email        = coalesce(NEW.email, email),
    telefoon     = coalesce(NEW.telefoon, telefoon)
  WHERE customer_id = NEW.id
    AND (voornaam IS DISTINCT FROM NEW.voornaam OR achternaam IS DISTINCT FROM NEW.achternaam
      OR email IS DISTINCT FROM NEW.email OR telefoon IS DISTINCT FROM NEW.telefoon);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.leads_koppel_klant()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_sleutel text; v_cid uuid;
BEGIN
  v_sleutel := coalesce(lower(nullif(trim(NEW.email),'')),
                        nullif(right(regexp_replace(coalesce(NEW.telefoon,''),'[^0-9]','','g'),9),''),
                        'lead:'||NEW.id::text);
  SELECT id INTO v_cid FROM customers WHERE klant_sleutel = v_sleutel;

  -- Correctie van e-mail of telefoon op een bestaand dossier: dezelfde klant
  -- houden en hersleutelen, in plaats van een nieuwe klant af te splitsen.
  IF v_cid IS NULL AND TG_OP = 'UPDATE' THEN
    IF OLD.customer_id IS NOT NULL THEN
      UPDATE customers SET klant_sleutel = v_sleutel WHERE id = OLD.customer_id;
      v_cid := OLD.customer_id;
    END IF;
  END IF;

  IF v_cid IS NULL THEN
    INSERT INTO customers (klant_sleutel, voornaam, achternaam, partner_naam, email, telefoon, adres, adres_lat, adres_lng)
    VALUES (v_sleutel, coalesce(NEW.voornaam,''), coalesce(NEW.achternaam,''), NEW.partner_naam,
            nullif(trim(NEW.email),''), nullif(trim(NEW.telefoon),''), nullif(trim(NEW.adres),''), NEW.adres_lat, NEW.adres_lng)
    RETURNING id INTO v_cid;
  END IF;
  NEW.customer_id := v_cid;
  RETURN NEW;
END; $function$;

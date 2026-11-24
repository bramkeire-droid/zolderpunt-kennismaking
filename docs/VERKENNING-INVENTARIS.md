# Verkenning Invensync (IDEE-14)

Gemeten op 2026-11-24, alleen gelezen, niets gewijzigd.

## Hoofdbevinding

**Invensync is geen voorraadbeheer.** Het is een artikel- en prijscatalogus met een verwerker van facturen. Er bestaat geen tabel of kolom voor voorraadstand, locatie (magazijn, bestelwagen, werf), beweging, bestelling, minimumvoorraad of bestelpunt. De kolom "Aantal" bestaat alleen in de export naar Bouwflow en staat daar altijd op 0.

Een gereedschap `voorraad(artikel of locatie)` kan vandaag dus niets teruggeven. De echte voorraad zit vermoedelijk in Bouwflow (tabblad Voorraad); dat kon niet geopend worden.

## Wat er wel is

- Lovable Cloud, project-ref `yspbdukhoywahnnkdcgs`, Lovable-project `d10e8317-dc1b-4158-95d2-0767be9915b8`. Lokale repo `C:\Users\bramk\.claude\projects\Invensync`. Bron van waarheid: `Handoffprompt CLAUDE.md` en `IDEEENBAK.md`.
- Negen tabellen: `materials` 871 (870 actief, 47 zonder SKU), `documents` 34, `price_history` 24, `price_flags` 25 (3 open), `new_material_suggestions` 63, `sku_loze_artikelen` 73, `artikel_documenten` 39, `material_files` 23, `approved_senders` 2. Achttien leveranciers (vrije tekst, geen tabel), 39 categorieën.
- Schermen: inventaris (catalogus), review (prijsverschillen, nieuwe artikelen), documenten (factuur binnen via mail of upload, AI leest ze), export naar Bouwflow, unifier, een Chrome-extensie.
- Een prijs wordt nooit stil overschreven: elk verschil wordt een `price_flag` voor nazicht.

## Koppelingen

- Met Compass, een dossier of een ZL-nummer: geen.
- Met de Werf-app: geen. Werf heeft wel `material_line` (verbruik per werkbon), zonder verwijzing naar Invensync.
- Met Bouwflow: uit via CSV en een robot (voorraad altijd 0); in alleen de leverancierslijst.
- Met een boekhouding of leverancier: geen.

## Hoe Zarvis erbij kan

Vandaag niet: Zarvis werkt met het token van Compass, en Invensync kent alleen zijn eigen gebruikers. Zelfde oplossing als bij de mails: één nieuwe alleen-lezen functie in Invensync (`zarvis-loket`) die het token eerst bij Invensync en dan bij Compass nakijkt, met vaste acties: `zoek_artikel`, `artikel` (met prijsgeschiedenis), `open_prijsverschillen`, `review_stand`. Daarna `inventaris.ts` in Zarvis naast `mail.ts`. Dat vraagt een uitrol in Invensync.

## Zwakke plekken

- RLS is "ingelogd = alles": elke ingelogde gebruiker mag alles lezen, schrijven en verwijderen. Eerst een beperkte rol voor Zarvis voor hij mag schrijven.
- `verify_jwt` werd op 5 september 2026 niet afgedwongen; elke functie controleert zelf.
- In `Handoffprompt CLAUDE.md` van Invensync staat een testwachtwoord leesbaar, en dat bestand zit in git. **Vervangen is aangeraden.**
- Vervuilde leveranciersnamen, 47 en 73 artikelen zonder SKU, mail nog op een sandboxadres.

## Wat altijd een ja van Bram vraagt

Een bestelling bij een leverancier, een betaling, een artikel naar Bouwflow duwen via de robot (niet terug te draaien), iets naar een leverancier versturen.

## Open vragen aan Bram

1. Waar staat vandaag je echte voorraad (Bouwflow, Excel, papier)? Moet Zarvis die bron lezen, of moet er in Invensync een voorraadmodule komen?
2. Welke locaties en bewegingen wil je volgen, en wie boekt: scannen, de Werf-app of Bouwflow?
3. Moet verbruik aan een ZL-dossier hangen, en is de bron Werf of Bouwflow?
4. Mag Zarvis ooit bestellen, of alleen een bestellijst voorbereiden die jij verstuurt?
5. Voor Belhouse, Zolderpunt of beide?

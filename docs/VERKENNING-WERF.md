# Verkenning Werf-app (IDEE-12)

Gemeten op 2026-11-24, alleen gelezen, niets gewijzigd. Geen namen en geen loonbedragen in dit document.

## Wat het is

- Lokale repo `C:\Users\bramk\.claude\projects\Zolderpunt - WERF\zolderpunt-werf-foundation`, Lovable-project `cdc896de-1f47-46cb-b00c-c16182b535c9`, Supabase-ref `yntxppjoocsklsscnblz`. Een ander project dan Compass.
- Arbeiders registreren uren op de gsm (gebruikersnaam en pincode van vier cijfers); Bram controleert op de pc. Zeven gebruikers, zeven medewerkers waarvan één onderaannemer. Nederlands en Pools.
- Een registratie is een `time_block` (start, stop, pauze), verdeeld over werkbonnen via `allocation` (werk of reis). Loon: `pay_period` per medewerker en maand, `pay_day` per dag, een wizard in zeven stappen.
- Controles: fraudevlag (afwijking van 5 minuten tegenover de serverklok, overlap, automatisch afgesloten), een waakhond op de koppeling met Bouwflow, en een robot die uren in Bouwflow typt omdat de API dat niet kan.

## Aantallen

`time_block` 706 (18 juni tot 24 november 2026; 2 open; 331 met een locatiepunt), `allocation` 703 (312 reistijd), `project` 159 (15 met uren), `work_order` 256, `fraud_flag` 92 (alle open), `pay_period` 9 (8 vergrendeld), `pay_day` 276, `absence` 47, `norm_task` 2 (geen enkele met uren per eenheid), `vehicle_trip` 737.

## Koppeling met Compass

Geen rechtstreekse. Beide hangen aan Bouwflow: Werf bewaart `project.bouwflow_project_id` (getal), Compass bewaart `leads.bouwflow_project_pk_id` (hetzelfde getal) en `leads.bouwflow_project_number` (het ZL-nummer). Die gelijkheid is afgeleid uit de code, niet met gegevens bevestigd. Het ZL-nummer staat niet in Werf.

## Berekeningen en zwakke plekken

- Uren per werf: `src/lib/nakalculatie.ts`, op `allocation`.
- Loonkost per project: `src/lib/rentabiliteit.ts`, minuten maal bruto uurloon. Geen werkgeverslast, geen overuren. Dat is geen echte loonkost.
- **Twee waarheden voor uren:** rentabiliteit rekent op `allocation`, het loon op `pay_day`. Ze kunnen verschillen.
- **Reistijd die werk is:** 23 registraties met meer dan vier uur reistijd op een dag zonder werk, samen ongeveer 159 uur. Dat vertekent nakalculatie en rentabiliteit.
- **Tijdsnormen bestaan in de praktijk niet:** geen enkele norm is ingevuld. Over overschrijding van de norm valt niets te signaleren.
- De uren-robot heeft open defecten (audit: 37 gevonden, 19 open); er staan 2 uren te wachten.
- **Pincodes staan leesbaar in `app_user.pin`** (niet gehasht). Dat staat los van Zarvis en is een bevinding over de Werf-app zelf.

## Hoe Zarvis erbij kan

Vandaag niet: Werf heeft eigen gebruikers; een token van Compass is daar ongeldig. Er bestaat in Werf al een patroon voor een toegang zonder gebruiker (`robot_config` met een token als hash en `robot_token_ok`). Voorstel: een alleen-lezen functie of RPC in Werf met een eigen geheim (`ZARVIS_WERF_TOKEN`), die alleen totalen teruggeeft.

`werf_uren(dossier of week)`: per werkbon de werkminuten, reisminuten, aantal registraties, laatste werkdag, en hoeveel uren nog niet in Bouwflow staan; met de bron erbij (`allocation`, niet het loon). Nooit een naam met een bedrag, nooit locatiepunten, nooit `app_user`.

## Wat altijd een ja van Bram vraagt

Alles wat lonen raakt (maand vergrendelen, uurloon, saldo), registraties wijzigen, schrijven naar Bouwflow (verwijderen is onomkeerbaar), een fraudevlag afhandelen, een stap van de wizard tekenen, alles naar het sociaal secretariaat.

## Privacy

Lonen, uren per persoon en locaties zijn persoonsgegevens. Zarvis krijgt alleen totalen. Een fraudevlag is een aanwijzing, geen bewijs; Zarvis mag ze niet als feit brengen.

## Open vragen aan Bram

1. Wat eerst: uren per dossier signaleren (alleen lezen), of de maand voor het loon klaarmaken (raakt lonen, veel zwaarder)?
2. Mag er in Werf een leesloket komen met een eigen geheim, dat alleen totalen geeft?
3. Wat geldt als waarheid voor uren: `allocation` of `pay_day`? Eerst de 23 reisregistraties rechtzetten?
4. Weten de arbeiders van de locatiepunten? Voorstel: Zarvis ziet ze nooit.
5. Welke tijdsnormen bestaan echt?

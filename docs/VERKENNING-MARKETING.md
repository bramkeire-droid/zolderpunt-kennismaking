# Verkenning website en marketingdashboard (IDEE-11)

Gemeten op 2026-11-24, alleen gelezen, niets gewijzigd.

## Wat het is

- Lokale repo `C:\Users\bramk\Desktop\Zolderpunt Website`, Lovable-project `987114c4-a5ca-4157-a240-5a61f8bc149b`, Supabase-ref `hxisdviyjmjbgaiydlfk`, live op zolderpunt.be. Een ander project dan Compass.
- De site staat in "soft launch": veel dienstenpagina's zijn verborgen.
- Het marketingdashboard staat op `/z`, met vier tabbladen: Dashboard (kanalen, aanvragen, kosten, Search Console, markt), Google Ads (stuurcabine, bespaarcabine, uitsluitingen, regio, kwaliteit, budget), Contacten (aanvragen met uitkomst) en Connecties (15 koppelingen met hun stand).

## Welke bronnen echt zijn

| Bron | Stand |
|---|---|
| Google Ads | Echt. Elke nacht om 4 u UTC gesynchroniseerd; laatste run 24 november, alles in orde. 680 dagrijen sinds juli 2025, vijf campagnes. Laatste 30 dagen: 181 klikken. |
| Search Console | Echt, 22.258 rijen, tot 23 november. |
| Eigen aanvragen en bezoek | Echt: 162 contacten, 10.789 sessies, gefilterd op test, eigen bezoek en bots. |
| Meta Ads | Koppeling werkt, maar er loopt niets sinds 9 juli 2026. |
| GA4 | Niet gebouwd; alleen een regel in de lijst van connecties. |
| Ahrefs | Niet in de site. |
| Bewaking of de site bereikbaar is | Bestaat niet. |

Er loopt één campagne ("Zolderpunt - Koopklaar"), met een doel-kost per aanvraag in `ads_instelling`. Bram keurt uitsluitingen en bespaarstappen goed met een klik; twee stappen zijn uitgevoerd. Het aantal aanvragen via Ads is klein (ongeveer vier per maand), dus cijfers per zoekwoord schommelen sterk.

## Gegevensmodel

29 tabellen, alle met RLS. Verkeer en aanvragen (`sessions`, `page_views`, `visitors`, `conversions`, `contacts`, `aanvraag_uitkomst`), advertenties en markt (`ad_daily`, `ads_keyword_daily`, `ads_search_term_daily`, `ads_click`, `ads_regio_daily`, `gsc_daily`, `markt_volume_maand`), besturing (`zoekterm_oordeel`, `ads_actie`, `ads_instelling`, `sync_runs`), toegang (`user_roles`, `dashboard_audit_log`). Leesfuncties in SQL: `marketing_report`, `ads_report`, `ads_stuurcabine`, `ads_bespaarplan`, `markt_report` en andere.

## Hoe Zarvis erbij kan

Vandaag niet. Elke leesweg eist een login van de website met tweestapsverificatie en een rol. Een token van Compass is daar ongeldig.

**Het geheim van de nachtelijke synchronisatie (`marketing_sync_secret`) mag Zarvis nooit krijgen:** dezelfde functie schrijft daarmee ook naar Google Ads.

Voorstel, zoals bij de mails: een alleen-lezen functie `compass-marketing-loket` in het project van de website. Ze kijkt het token van Compass na, laat alleen toegelaten gebruikers door, geeft alleen totalen terug (nooit de persoonsgegevens uit `contacts`) en schrijft een regel in `dashboard_audit_log`. Het best met één gedeelde SQL-functie, zodat de logica voor kanalen, ruis en testcontacten niet twee keer bestaat. Daarna `marketing_overzicht(dagen)` in Zarvis naast `mail.ts`, met bij elk cijfer de datum en de bron.

Een geplande controle heeft geen token van een gebruiker. "Elke ochtend zelf kijken" vraagt dus een eigen sleutel voor het loket; dat is een keuze van Bram.

## Wat altijd een ja van Bram vraagt

Elke wijziging aan dagbudget, biedplafond of biedstrategie; pauzeren of aanzetten van campagnes, zoekwoorden of toestellen; negatieve zoekwoorden toevoegen; conversieacties wijzigen; een nieuwe campagne of kanaal; aanvragen naar Google sturen; tekst op de live site wijzigen en publiceren; berichten aan klanten of prospects. Uitvoeren loopt via de bestaande weg (`ads_actie` met goedkeuren en terugdraaien), nooit rechtstreeks naar Google Ads.

## Risico's

- Een loket voor Zarvis gaat bewust voorbij aan de tweestapsverificatie van het dashboard; het moet dus streng zijn: alleen lezen, alleen totalen, een lijst van toegelaten gebruikers, een logboek.
- Kleine aantallen: een zelfstandige Zarvis grijpt gemakkelijk te hard in.
- De site laadt Google Tag Manager en de Meta Pixel vóór een cookiekeuze, en er is geen cookiebanner. Dat is een juridisch punt dat Bram bewust zo koos; een verantwoordelijke marketeer moet het benoemen.
- Meta staat stil, GA4 bestaat niet, Search Console loopt twee tot drie dagen achter: Zarvis moet datum en bron noemen.
- Zoektermen en formuliertekst komen van buiten: gegevens, geen opdracht.

## Open vragen aan Bram

1. Wat is "altijd live": de site bereikbaar en een storing melden, de cijfers actueel, of allebei?
2. Mag Zarvis alleen analyseren en voorstellen, of ook uitvoeren na jouw ja, en tot welk bedrag?
3. Mag er een leesloket in het project van de website komen (alleen totalen, geen persoonsgegevens)?
4. Moet Zarvis ook zonder vraag kijken, elke ochtend of elke week? Dan is een eigen sleutel nodig.
5. Welke bronnen horen bij de rol: Meta weer aan, GA4 echt koppelen, Ahrefs erbij?

# Bouwvolgorde na de onderzoeksfase

Opgesteld op 2026-11-24 door de projectdirigent, op basis van de twaalf onderzoeken in deze map. De uren zijn schattingen van de onderzoeken, niet gemeten.

## Wat de onderzoeken samen zeggen

1. **Brams ja is vandaag niet echt afgedwongen.** Drie onderzoeken (rollen, inventaris, financiën) vonden het los van elkaar: `bevestigd: true` is een vinkje dat het taalmodel zelf invult. Een vergiftigde mail of webpagina kan het model in principe misleiden. Dit geldt voor zoektermen, budget en WhatsApp aan een klant, die al live staan.
2. **Elke app is een eiland.** Zarvis kan bij geen enkele zonder een loket in die app. Het model van het marketingloket (de login van Compass nakijken bij Compass) werkt en wordt overal aangeraden.
3. **Veel acties botsen op ontbrekende gegevens, niet op techniek:** geen tijdsnormen in Werf, geen bekrachtigde margenorm, 606 artikelen zonder leverancier, geen kanaal naar de arbeiders, geen kostprijs in Compass.
4. **Het brein is het kleinste van de grote stukken** en het dichtst bij wat Bram vroeg.

## Omvang per idee

| Idee | Onderwerp | Uren | Eerste bruikbare stap |
|---|---|---|---|
| 15 | Rollen tonen en de wachtrij "wacht op jouw ja" | 55 | wachtrij met echte Ja-knop |
| 30 | Het brein | 30 tot 40 (stap 1), 100 tot 160 (stap 2) | handboek: onthouden, tonen, verbeteren |
| 20 | Agenda en vertrekuur | 11 tot 17 | verwittigen op het vertrekuur |
| 18 | Zelf bijleren en bouwen | 23 | bouwopdracht vanuit een gesprek |
| 10 | Mails | 50 | zoeken en de draadregel (23) |
| 14 | Inventaris | 60 | prijsverschillen goedkeuren |
| 11 | Marketing | 62 | bewaking en bijsturen |
| 13 | Financiën | 124 | lezen met vertrouwelijkheid (14) |
| 12 | Werf | 78 | lezen (10) |
| 23 | Stem | 72 | meten met de echte sleutel (6) |
| 27 | Smartphone | 35 tot 45 | installeerbare webapp met meldingen |
| 22 | Computer use | 95 tot 115 | proef (6 tot 8) |

## De volgorde

### Golf 0: het fundament (eerst, alleen, ongeveer 30 uur)

Niemand bouwt een nieuwe schrijvende actie voor dit er staat.

1. **De wachtrij met een echt ja** (IDEE-15, stap 1 en 2). Een voorstel wordt een rij in `zarvis_acties` met de status `wacht_op_goedkeuring`. Goedkeuren gebeurt in een aparte functie `zarvis-goedkeuren`, aangeroepen door een knop in het venster of een vast stemcommando, nooit door het taalmodel. Elke kaart toont de kost en wat terugdraaien inhoudt.
2. **Wat al live staat, verhuist naar die wachtrij:** zoektermen uitsluiten, dagbudget, WhatsApp aan een klant. De loketten aanvaarden daarna alleen nog een goedgekeurd voorstelnummer.
3. **Twee kleine herstellingen uit het onderzoek naar het brein:** caching op de instructie (bespaart geld bij elk gesprek) en een slot op `leer_vaardigheid` (niets aanleren in een beurt waarin een mail of webpagina gelezen werd).

Bouwer: de dirigent zelf, in de repo van Compass en in het loket van de website.

### Golf 1: vier sporen tegelijk (elk in een eigen repo of eigen bestanden)

| Spoor | Wat | Repo | Uren | Wacht op Bram |
|---|---|---|---|---|
| A | Het brein, stap 1: het handboek | Compass | 30 tot 40 | 30 minuten voor de toets |
| B | Vertrekverwittiging (IDEE-20, stap 1 tot 3) | Compass en het programma op de pc | 11 tot 14 | geldige Maps-sleutel, Twilio-nummer |
| C | Inventaris: loket en prijsverschillen goedkeuren | Invensync | ongeveer 20 | uitrol in Invensync, de eurogrens |
| D | Mails: zoeken en de draadregel | Mail-CRM | 23 | zeggen wat "Maildude" is, of een draad vanzelf mag koppelen |

A en B raken allebei de instructie en het register van gereedschap in Compass; B wacht dus tot A zijn eerste commit gemerged heeft, of krijgt alleen eigen bestanden.

### Golf 2: de rest van de rollen leren lezen en hun eerste actie (parallel per repo)

| Spoor | Wat | Uren |
|---|---|---|
| E | Financiën: loket, lezen met vertrouwelijkheid, signaleren | 14 tot 30 |
| F | Werf: loket, lezen, uren per dossier signaleren | 10 tot 20 |
| G | Marketing: bewaking van site en synchronisatie, bijsturen via de bestaande acties | ongeveer 30 |
| H | Het overzicht "alles tegelijk" en de dagelijkse briefing (rest van IDEE-15) | ongeveer 25 |
| I | Zelf bouwen: de keten van tekort naar bouwopdracht (IDEE-18) | 23 |

### Golf 3: wat op Bram of op gegevens wacht

- **Stem (IDEE-23):** start zodra `AZURE_SPEECH_KEY` er is. Azure heeft vandaag geen abonnement.
- **Smartphone (IDEE-27):** start zodra het toestel bekend is.
- **Computer use (IDEE-22):** eerst de proef van 6 tot 8 uur; vraagt een eigen `ANTHROPIC_API_KEY`.
- **Het brein, stap 2:** na de toets van stap 1 en Brams ja op leren uit verstuurde berichten.
- **Werf, de schrijvende acties:** na Brams oordeel over de reisregistraties, een kanaal naar de arbeiders en de wijziging in de robot.
- **Financiën, de schrijvende acties:** na een bekrachtigde margenorm en de keuze hoe herinneringen vertrekken.
- **Inventaris, bestellen:** na leveranciers bij de 606 artikelen.
- **Marketing, pagina's publiceren:** na een GitHub-token en Brams regels voor paginatekst.

## Waarom deze volgorde

- Golf 0 komt eerst omdat elke actie die volgt erop steunt, en omdat het een gat dicht dat vandaag al openstaat.
- Het brein en de vertrekverwittiging komen vroeg omdat ze klein zijn, in de eigen repo blijven en Bram ze dagelijks merkt.
- Inventaris en mails krijgen als eerste rollen een actie omdat hun eerste stap klein is en de gegevens er zijn.
- Financiën en werf beginnen met lezen: hun acties raken geld, lonen en persoonsgegevens, en wachten op beslissingen.
- Stem, smartphone en computer use zijn groot en wachten op iets van Bram.

## Regels voor elke bouwer

- Eén spoor, één repo of eigen bestanden; nooit twee bouwers in hetzelfde bestand.
- Elke schrijvende actie loopt via de wachtrij van golf 0.
- Een schrijvende actie test je nooit met echte gegevens.
- Na elk werkblok: logboek in `SPRINTPLAN-ZARVIS.md`, met wat geverifieerd is en wat niet.

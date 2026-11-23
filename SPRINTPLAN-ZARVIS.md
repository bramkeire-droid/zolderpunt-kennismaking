# SPRINTPLAN — Zarvis fase 1: praten met je dossiers

> Bouwdocument voor de eerste fase van Zarvis, de assistent bovenop Zolderpunt Compass.
> Gebaseerd op het interview met Bram van 2026-11-23. Status: **goedgekeurd door Bram op 2026-11-23**; volgorde bijgestuurd op dezelfde dag (zie 4).
> Onderaan komt het voortgangs- en aannamelogboek per sessie, zoals in SPRINTPLAN-COMMUNICATIE.md.

---

## 0. Wat vastligt uit het interview (Bram, 2026-11-23)

1. Zarvis komt **in Compass**, op de Compass-databank (`xgrshvqteylncjbfsqbi`). Geen aparte app.
2. Eindbeeld: **het bedrijf verkoopbaar maken**. Kennis moet uit Brams hoofd in het systeem.
3. Eerst **alleen Bram** als gebruiker; rechten wel zo bouwen dat het team later kan aansluiten.
4. Autonomie: **intern zelfstandig, extern pas na Brams ja**. Alles naar klanten of naar een ander systeem wacht op goedkeuring.
5. Data in de **cloud, EU**.
6. Budget: **geen plafond vooraf**, maar de kost per onderdeel moet zichtbaar zijn.
7. Volgorde van de fases: (1) praten met dossiers, (2) bedrijfsgeheugen en handboek, (3) externe acties met goedkeuring, (4) bewaking, ochtendbriefing en meeluisteren, (5) fotorealistisch gezicht en emotie, (6) mobiele app met wekwoord.

Dit document dekt **alleen fase 1**.

## 1. Wat fase 1 oplevert

Bram opent Compass op bureau of gsm, drukt op de Zarvis-knop en vraagt of zegt iets. Zarvis:

- **antwoordt** op vragen over dossiers, gesprekken, calculaties, rapporten en de mail- en belhistoriek;
- **voert interne acties uit**: een notitie of beslissing vastleggen, een chatbericht bij het dossier plaatsen, velden van "Wat we weten" bijwerken;
- **toont wat het deed** in een logboek, met per actie de waarde vóór en ná en een knop om ze terug te draaien;
- weet **in welk dossier je zit** en gebruikt dat als context ("zet erbij dat de trap blijft").

Niet in fase 1: mails of WhatsApp versturen, agenda, Bouwflow-fases verplaatsen, Todoist, proactieve meldingen, meeluisteren, gezicht, wekwoord. Het datamodel houdt er wel al rekening mee (zie 3.2).

## 2. Architectuur in zes regels

- **Eén nieuwe edge function `zarvis`** met `verify_jwt = true`. Ze draait de redeneerlus: model krijgt de vraag, kiest gereedschap, de functie voert het uit, het model formuleert het antwoord. Antwoord komt gestreamd terug.
- **Gereedschap draait met het token van de ingelogde gebruiker**, niet met de service-sleutel. Zarvis kan dus nooit meer dan Bram zelf in Compass kan; de bestaande RLS blijft de grens. Dat is meteen de voorbereiding op het team.
- **Model: Claude via de Anthropic-API**, met een eigen secret `ANTHROPIC_API_KEY` in Compass. De bestaande functies blijven op `LOVABLE_API_KEY` draaien; Zarvis krijgt een aparte pot zodat de kost apart leesbaar is.
- **(Uitbreiding) Mail-CRM wordt gelezen via het bestaande loket** (`compass-loket`), met hetzelfde gebruikerstoken. Zarvis schrijft niets naar Mail-CRM.
- **Stem en gezicht zitten achter twee smalle interfaces** (`StemIn`, `StemUit`). Fase 1 vult ze in met druk-om-te-praten; fase 5 vervangt de invulling door een realtime stem met gezicht zonder dat de rest verandert.
- **Alles additief**: geen bestaande kolommen, views, policies of functies wijzigen. Enige aanraking van bestaande code: `AppShell.tsx` krijgt de Zarvis-knop en het paneel.

## 3. Bouwstenen

### 3.1 Gereedschap van Zarvis

Lezen:

| Gereedschap | Bron in Compass |
|---|---|
| `zoek_dossier` | RPC `search_leads_fuzzy` (naam, adres, ZL-nummer) |
| `lees_dossier` | `leads`, `pre_intake`, `customers`, laatste `transcript_analyses` |
| `lees_gesprekken` | `gesprekken` + `gesprek_notities` (notitie, beslissing, onthouden) |
| `lees_calculaties` | `calculaties` + `calculator_tarieven` |
| `lees_rapporten` | `rapporten` |
| `lees_communicatie` | Mail-CRM-loket: mails, Leexi-calls, beslissingen per ZL-nummer |
| `pijplijn_overzicht` | `leads` × `bouwflow_phases` × `bouwflow_phase_category_map` (zelfde telling als het kanbanbord) |

Schrijven (intern, zonder goedkeuring, altijd gelogd):

| Gereedschap | Doel |
|---|---|
| `leg_notitie_vast` | rij in `gesprek_notities` met soort notitie / beslissing / onthouden |
| `plaats_chatbericht` | rij in `dossier_chat` |
| `werk_wat_we_weten_bij` | velden van het formulier "Wat we weten", via een vaste lijst toegelaten velden |

Bewust **niet** in de schrijflijst: prijzen en tarieven, dossiers verwijderen, alles wat naar Bouwflow, mail of WhatsApp gaat.

### 3.2 Nieuwe tabellen

- `zarvis_gesprekken` — één rij per gesprek met Zarvis (gebruiker, dossier waarin het startte, tijdstip).
- `zarvis_berichten` — vraag, antwoord, gebruikte gereedschappen, verbruikte tokens per beurt. Hieruit komt het kostenoverzicht.
- `zarvis_acties` — het logboek: gereedschap, invoer, waarde vóór, waarde ná, status (`uitgevoerd`, `teruggedraaid`, `mislukt`, en voor fase 3 al `wacht_op_goedkeuring` en `geweigerd`).

RLS: een gebruiker leest en schrijft alleen zijn eigen rijen; admin leest alles.

### 3.3 Scherm

- Zarvis-knop rechts in de app-balk van `AppShell`, 44 px (duimnorm).
- Paneel als zijpaneel op bureau en als uitschuifblad van onder op gsm.
- Bovenaan het actieve dossier; daaronder het gesprek; onderaan tekstveld en microfoonknop.
- Elke uitgevoerde actie verschijnt als kaartje in het gesprek: wat, in welk dossier, "ongedaan maken".
- Tabblad "Logboek" met alle acties, filterbaar per dossier.

### 3.4 Stem in fase 1

Eén microfoonknop: tik om te spreken, Zarvis stopt vanzelf als je zwijgt. Een gesproken vraag krijgt een gesproken antwoord, zin per zin terwijl het nog geschreven wordt; een getypte vraag krijgt enkel tekst. Na een gesproken antwoord luistert Zarvis meteen verder, zodat je handsfree kan doorvragen; hoort hij niets, dan gaat hij stil terug in rust. Spreken terwijl hij antwoordt onderbreekt hem.

De definitieve spraakdienst wordt **in sprint Z4 gekozen**, na een proef met echte Vlaamse zinnen vol klantnamen, straatnamen en ZL-nummers. Voorwaarde: verwerking in de EU en werkend in Safari op iPhone. Tot dan draait de voorlopige browserstem (zie 4).

## 4. Sprints

**Bijsturing van Bram (2026-11-23): eerst UI, UX en dialoog; koppelingen toevoegen en testen is uitbreiding.** De volgorde is daarop omgegooid: wat je ziet, hoort en zegt komt vooraan, het gereedschap daarna, en de koppelingen met andere systemen helemaal achteraan.

| Sprint | Inhoud | Klaar wanneer |
|---|---|---|
| **Z0 — Fundering** | Secret `ANTHROPIC_API_KEY`; tabellen uit 3.2; functie met login- en rolcontrole; policies nakijken | Functie weigert zonder login (401) en antwoordt met login; migratie staat live |
| **Z1 — Het gesprek** | Zarvis-knop in de app-balk; paneel (zijpaneel op bureau, volledig scherm op gsm); aanwezigheid met vier toestanden; gestreamd antwoord; spreken en hardop antwoorden; onderbreken; doorvragen zonder knop; gesprek wordt bewaard | Een gesprek van vijf beurten lukt getypt op bureau en gesproken op gsm, zonder dat de gebruiker moet wachten op het volledige antwoord |
| **Z2 — Lezen** | Leesgereedschap uit 3.1 op de eigen Compass-databank; Zarvis antwoordt vanuit het dossier waarin je zit | Twintig vaste testvragen (zie 5) geven het antwoord dat ook in de databank staat |
| **Z3 — Doen** | Drie schrijfgereedschappen; `zarvis_acties`; actiekaartjes; ongedaan maken; logboek; kostenoverzicht per dag | Elke actie staat in de brontabel én in het logboek; terugdraaien herstelt de oude waarde; regressielijst R1–R4 groen |
| **Z4 — Definitieve stem** | Proef en keuze van een spraakdienst met verwerking in de EU; vervangt de voorlopige browserstem | Tien gesproken opdrachten op iPhone en op bureau correct verstaan |
| **Uitbreiding — Koppelingen** | Mail-CRM-loket, daarna (fase 3) mail en WhatsApp versturen, agenda en Calendly, Bouwflow, Todoist. Elke koppeling apart toevoegen en testen | Per koppeling een eigen testlijst |

Z1 is bruikbaar zodra de functie live staat en de sleutel geplakt is. Tot Z2 zegt Zarvis eerlijk dat hij de dossiers nog niet leest.

**Voorlopige stem in Z1.** Om de dialoog nu al te kunnen beleven gebruikt Z1 de spraak die in de browser zit. Twee beperkingen: herkenning werkt in Chrome en Edge, wisselvallig in Safari en niet in Firefox (dan verdwijnt de microfoonknop en blijft typen); en Chrome stuurt de opname naar Google, wat **niet** de afgesproken EU-verwerking is. Z4 vervangt dit. Wie dat tot dan niet wil, typt.

## 5. Hoe ik verifieer

- **Vaste vragenlijst** van twintig vragen waarvan het juiste antwoord vooraf met een databankquery is vastgelegd, bv. "hoeveel dossiers staan in offerte?", "wat besliste de klant van ZL-… over de trap?", "welke calculatie is de laatste voor …?". Elke sprint opnieuw afgelopen.
- **Weigerproeven**: Zarvis vragen om een mail te versturen, een tarief te wijzigen of een dossier te verwijderen moet eindigen in "dat kan ik nog niet" of "dat mag ik niet", nooit in een poging.
- **Dubbelzinnigheid**: twee klanten met dezelfde familienaam moet een wedervraag opleveren, geen gok.
- Werkafspraken uit SPRINTPLAN-COMMUNICATIE blijven gelden: niets "af" zonder controle in de echte bron, pushen is niet live, secrets plakt Bram.

## 6. Risico's en open punten

1. **Ruime policies — nagekeken op 2026-11-23, tabellen in orde.** De "Allow all"-namen staan alleen nog in oude migratiebestanden. Op de live databank heeft elke tabel RLS aan, mag lezen alleen wie ingelogd is en vraagt schrijven een rol (admin of user). Enige tabel die zonder login leesbaar is: `google_reviews_cache`, en dat is de bedoeling. Let wel: de migratiebestanden in deze repo lopen dus achter op de live policies. **Nog niet nagekeken:** de dertien functies met `verify_jwt = false`; of ze elk hun eigen controle doen, is een aparte doorlichting.
2. **Verkeerd dossier.** Het grootste praktische risico is een notitie in het dossier van de verkeerde klant. Daarom: wedervraag bij twijfel, klantnaam en ZL-nummer op elk actiekaartje, en ongedaan maken.
3. **Types lopen achter.** Nieuwere tabellen staan niet in de gegenereerde Supabase-types; de app werkt daar met `as any`. De Zarvis-tabellen volgen hetzelfde patroon tot de types opnieuw gegenereerd worden.
4. **Kost onbekend.** Ik geef pas een bedrag na Z1, gemeten op echte vragen. Geen schatting vooraf.
5. **Nuance Labs niet bekeken.** Hun platform was vanuit de bouwomgeving niet bereikbaar. Raakt fase 1 niet, wel fase 5.

## 7. Beslissingen van Bram

| # | Vraag | Mijn voorstel |
|---|---|---|
| B1 | Aparte Anthropic-sleutel voor Zarvis in Compass? | **Beslist 2026-11-23: ja.** Secret `ANTHROPIC_API_KEY`, Bram plakt hem |
| B2 | Mag Zarvis "Wat we weten" zonder vragen overschrijven als er al iets staat? | **Beslist 2026-11-23:** aanvullen mag vanzelf; een bestaande waarde vervangen vraagt eerst bevestiging |
| B3 | Bewaren we de volledige gesprekken met Zarvis? | **Beslist 2026-11-23: ja**, grondstof voor fase 2 |

---

## Voortgangs- en aannamelogboek

- **2026-11-23** — Interview afgerond, dit plan opgesteld. Nog geen code geschreven. Aannames: Anthropic-API als model (Mail-CRM gebruikt die al); fase 1 zonder gezicht en zonder wekwoord, zoals in het interview voorgesteld en met "Go" bevestigd.
- **2026-11-23 (Z0)** — Plan en B1–B3 goedgekeurd. Gedaan:
  - Migratie `20261123210000_zarvis_fundering.sql` toegepast op de live databank via de Lovable-koppeling (Compass staat niet in Brams Supabase-account, dus niet via Supabase MCP). Geverifieerd met een query: drie tabellen bestaan, RLS aan, niet leesbaar zonder login, policies S/I(/U) aanwezig.
  - Functie `supabase/functions/zarvis/index.ts` geschreven: controleert login en rol, antwoordt met wie aanklopt. **Nog niet live en nog niet uitgevoerd** — Lovable zet functies pas uit na merge naar `main`; lokaal typechecken met Deno lukte niet in de bouwomgeving.
  - Policies doorgelicht (zie 6.1).
  - **Open voor Z0:** (a) PR mergen en publiceren, (b) Bram plakt `ANTHROPIC_API_KEY`, (c) daarna live nagaan: zonder login 401, met login `ok: true` en `model_sleutel_aanwezig: true`.
- **2026-11-23 (bijsturing + Z1)** — Bram: "Plaats de UI, UX en dialoog vooraan de build. Alle connectoren toevoegen en testen is uitbreiding van de app." Sprints herschikt (zie 4). Gebouwd:
  - `ZarvisKnop` in de app-balk en `ZarvisPaneel` in `AppShell`; gesprekstoestand in `ZarvisContext` op App-niveau, zodat een gesprek een paginawissel overleeft.
  - `ZarvisOrb`: de aanwezigheid, met vier toestanden (rust, luistert, denkt, spreekt). Hier komt in fase 5 het gezicht.
  - `src/lib/zarvis/`: stem achter de interfaces `StemIn` / `StemUit` (voorlopig de browser), zinnen knippen voor het voorlezen, client voor de antwoordstroom.
  - Functie `zarvis` uitgebreid van logincontrole naar een gestreamde dialoog die vraag en antwoord bewaart in `zarvis_berichten`, met verbruikte tokens.
  - **Geverifieerd** in een echte browser met een nagebootste server (bureau 1280 px en gsm 390 px): knop 44 px hoog; getypte vraag toont "Even denken" en daarna het volledige antwoord; vervolgvraag gaat in hetzelfde gesprek; serverfout toont de melding met "Opnieuw proberen"; gesproken vraag wordt verstuurd, antwoord in vier zinnen uitgesproken, daarna luistert Zarvis verder en valt bij stilte zonder melding terug in rust; geen horizontale scroll op gsm; geen consolefouten. Typecheck, lint en build in orde; 213 tests groen met tijdzone Brussel.
  - **Niet geverifieerd:** de functie zelf tegen het echte model (nog niet live, geen sleutel; wel getypecheckt tegen de Anthropic-SDK 1.13.0); echte microfoon en echte stem (de browserproef gebruikte nagebootste spraak); iPhone Safari.
  - **Los van Zarvis opgemerkt:** de test `rapportMailTekst › bevestigt dag en uur` faalt in een omgeving op UTC (verwacht 14:00, krijgt 13:00) en slaagt met tijdzone Brussel. Bestond al vóór deze wijzigingen.
  - **Aanname:** model `claude-opus-5-5` op lage inspanning voor snelheid, instelbaar via secret `ZARVIS_MODEL`; bij een afwijzing om veiligheidsredenen neemt een ander model automatisch over.

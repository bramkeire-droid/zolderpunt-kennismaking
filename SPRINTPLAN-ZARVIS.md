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

## 8. Wat we overnemen uit OpenJarvis en Nuance Labs

Bram vroeg Zarvis als combinatie van OpenJarvis en Nuance Labs. Dit is wat die twee bij nader inzien opleveren.

### 8.1 OpenJarvis (github.com/open-jarvis/openjarvis, Apache 2.0)

Een Python-raamwerk voor een persoonlijke assistent op eigen toestel, met lokale modellen. De code nemen we niet over (andere taal, andere omgeving, andere keuze voor cloud); de ideeën wel. De studie gebeurde op de broncode door een hulpagent; zijn verslag is niet regel per regel nagetrokken.

| Idee uit OpenJarvis | Hoe het in Zarvis komt | Waar |
|---|---|---|
| Goedkeuringswachtrij: een voorgestelde actie wacht op een ja, en "altijd goed voor dit soort actie" wordt onthouden | Status `wacht_op_goedkeuring` in `zarvis_acties` bestaat al. Twee afwijkingen: de **code** bepaalt de risicoklasse, niet het model; en wat naar een klant gaat, wordt nooit automatisch goedgekeurd | Z3 en uitbreiding |
| Eén poort voor elk gereedschap (limiet, rechten, bevestiging) en een logboek dat niet achteraf aan te passen is | Elk gereedschap loopt via één uitvoerder; `zarvis_acties` is het logboek | Z2 en Z3 |
| Geplande taken als rijen in de databank, met een logboek per run en een toestand die naar de volgende run meegaat | `pg_cron` + edge function, zoals de bestaande Bouwflow-sync | fase 4 |
| Briefing in twee stappen: eerst gegevens verzamelen met vaste queries, dan één keer laten verwoorden onder "alleen deze feiten" | Ochtendbriefing | fase 4 |
| Geheugen in twee sporen: feiten automatisch uit gesprekken gehaald, met een vertrouwensniveau, naast wat je uitdrukkelijk laat onthouden | Bedrijfsgeheugen | fase 2 |
| Vaardigheden als catalogus: alleen naam en omschrijving in de instructie, de volledige werkwijze pas laden als ze nodig is | Het handboek als bron van werkwijzen | fase 2 |
| Vast en wisselend deel van de instructie gescheiden houden | Al zo gebouwd in de functie `zarvis` (persona vast, context apart) | gedaan |
| Antwoord zin per zin uitspreken | Al zo gebouwd (`src/lib/zarvis/zinnen.ts`) | gedaan |

OpenJarvis heeft **geen** wekwoord, **geen** onderbreken tijdens het spreken en **geen** leren uit gecorrigeerde tekst. Die drie bouwen we zelf; onderbreken zit al in Z1.

### 8.2 Nuance Labs (Nuance Live)

Een persona met gezicht en stem waarmee je realtime praat via audio en video (LiveKit). Het werk geeft de persona door aan je eigen pagina of server, die het resultaat terugmeldt. Er is een JavaScript-SDK (`@nuancelabs/js-sdk`, met een React-hook). Als model past dat precies: zij het gezicht, onze functie het werk.

**Niet bruikbaar voor Zarvis zoals het nu is: de persona spreekt en verstaat alleen Engels.** Hun documentatie zegt dat letterlijk, en een instructie met niet-Engelse tekens of de vraag om een andere taal te spreken wordt geweigerd. Verder: de API is in preview, gesprekken draaien op gedeelde capaciteit en kunnen vroegtijdig eindigen; waar de data verwerkt wordt, staat niet in de documentatie. Brams account (nagekeken op 2026-11-23): 10 credits per dag, 1 gesprek tegelijk.

Wat we er wel van overnemen, als ontwerp voor het gezicht in fase 5:
- De **rolverdeling**: het gezicht praat, het eigen systeem doet het werk en meldt terug.
- De **gesprekssignalen** die een gezicht nodig heeft: wat net in de app gebeurde doorgeven zonder dat hij erover begint, hem laten zwijgen terwijl de gebruiker leest, hem midden in een zin stoppen. `ZarvisContext` krijgt die drie als aparte acties wanneer het gezicht komt.
- **Bevestigen per gereedschap**: een actie die iets verstuurt of boekt wordt eerst hardop voorgelezen en pas na een duidelijk ja uitgevoerd.

**Beslissing van Bram (2026-11-23):** een andere avatardienst zoeken die Nederlands spreekt. Zie 8.3.

### 8.3 Avatardiensten met Nederlands (onderzoek 2026-11-23)

**Betrouwbaarheid:** dit komt uit zoekresultaten. Geen enkele pagina van een leverancier kon rechtstreeks geopend worden vanuit de bouwomgeving, dus prijzen en beweringen moeten op de echte pagina's nagekeken worden vóór een keuze. Mobiele Safari is voor geen enkele dienst bevestigd.

Eis: realtime, fotorealistisch, Nederlands zoals in Vlaanderen, in een webpagina, waarbij ons eigen model de woorden levert, en liefst verwerking in de EU.

| Dienst | Waarom wel | Waarom niet |
|---|---|---|
| **Anam** (voorkeur) | Eigen model blijft het brein: de pagina stuurt de tekst door en het gezicht spreekt ze uit, zonder extra server. Onderbreken zit in de SDK. Nederlandse spraakherkenning gedocumenteerd. Ongeveer $49 voor 250 minuten | EU-verwerking alleen in het duurste plan en geen EU-regio genoemd. Vlaamse stem niet bevestigd. Sessies van hoogstens 10 minuten in dat plan |
| **Beyond Presence** (tweede) | Duits bedrijf, prijzen in euro, zegt in de EU te hosten. Het gezicht spreekt wat onze eigen stem levert, dus een echte Vlaamse stem kan | Hun documentatie spreekt de EU-hosting tegen. Vraagt een altijd draaiende dienst naast Supabase, die we nu niet hebben |
| **Simli** (goedkoop) | Ongeveer $0,01 per minuut; krijgt gewoon geluid binnen, dus taal en stem kiezen we zelf | Spraakherkenning, beurtwissel en onderbreken bouwen we dan zelf. Verwerkingslocatie onbekend |
| **Azure TTS-avatar** (streng EU) | Draait in West-Europa; Vlaamse stemmen Dena en Arnaud bestaan | Ongeveer €0,52 per minuut; niet bevestigd dat de avatar met de Vlaamse stemmen werkt |
| HeyGen LiveAvatar | Goedkoop per minuut, eigen model mogelijk | Alle data in de VS |
| Tavus | Technisch een nette pasvorm, Nederlands in de lijst | $0,26 tot $0,35 per minuut |

**Stem zonder gezicht (voor sprint Z4):** de enige uitdrukkelijk Vlaamse combinatie die bevestigd werd in de zoekresultaten is Deepgram Nova-3 met `nl-BE` op hun EU-adres voor herkenning, en Azure (`nl-BE-Dena`, `nl-BE-Arnaud`) of Google Chirp 3 HD in de EU-regio voor de stem. Azure kan beide kanten onder één verwerkersovereenkomst.

**Voorstel:** een korte proef met Anam (gratis 30 minuten) om te horen hoe het Nederlands klinkt, en bij Beyond Presence schriftelijk navragen waar ze verwerken. Pas daarna kiezen.

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
- **2026-11-23 (live + studie)** — PR #20 gemerged en gepubliceerd. Live nagekeken: de gepubliceerde app bevat de Zarvis-knop en het paneel; de functie `zarvis` is door de Lovable-agent ongewijzigd uitgerold (Lovable doet dat niet vanzelf na een merge) en weigert zonder login met 401. **Zarvis antwoordt nog niet:** de secret `ANTHROPIC_API_KEY` ontbreekt. OpenJarvis en de Nuance-documentatie bestudeerd; zie 8. Nuance Live blijkt alleen Engels te doen; Bram kiest voor een andere avatardienst met Nederlands.
- **2026-11-23 (Lovable-route)** — Bram koos ervoor Zarvis voorlopig zonder eigen Anthropic-sleutel te laten draaien. De functie `zarvis` kiest nu zelf: een eigen `ANTHROPIC_API_KEY` heeft voorrang zodra hij bestaat; anders gaat het via de ingebouwde AI-route van Lovable (`LOVABLE_API_KEY`, staat al in het project), met hetzelfde model. **Gevolgen:** de kost gaat van het Lovable-tegoed en is dus niet apart leesbaar (wijkt af van B1 tot er een eigen sleutel is); volgens Lovable bewaart de aanbieder de gegevens bij deze modellen; het vangnet bij een afwijzing om veiligheidsredenen staat op deze route uit omdat het daar niet uitgetest is. **Geverifieerd:** een rechtstreekse testaanroep naar de Lovable-route met exact dit verzoek gaf een geldig antwoord; de functie is getypecheckt en getest tegen een nagebootste server met hetzelfde antwoordformaat. **Niet geverifieerd:** een echte vraag via de ingelogde app.
- **2026-11-23 (proef gezicht met Anam)** — Bram: "Go anam". Gebouwd als proef, naast de bestaande bol en browserstem:
  - Functie `zarvis-gezicht`: controleert login en rol en vraagt bij Anam een kortlevend sessiebewijs. Het taalmodel van Anam staat uit (`CUSTOMER_CLIENT_V1`): `zarvis` blijft het brein. Luisteren staat op Nederlands; zonder vaste stem zoekt de functie zelf een Nederlandse stem, eerst met Belgisch accent. Sessies duren hoogstens vijf minuten, omdat een open sessie blijft tellen.
  - `src/lib/zarvis/gezicht.ts` en een knop "Gezicht" in het paneel. Met het gezicht aan luistert Anam (de microfoonknop verdwijnt), wordt elk antwoord door het gezicht uitgesproken en onderbreekt doorpraten het antwoord. De SDK (`@anam-ai/js-sdk`) wordt pas geladen als het gezicht aangezet wordt.
  - Secrets: `ANAM_API_KEY` (verplicht); optioneel `ZARVIS_ANAM_AVATAR_ID`, `ZARVIS_ANAM_AVATAR_MODEL`, `ZARVIS_ANAM_VOICE_ID`, `ZARVIS_ANAM_VOICE_GENDER`.
  - **Nagelezen in de documentatie van Anam zelf:** eigen taalmodel aan de kant van de browser, Nederlands (`nl`) voor spraakherkenning, het filter op taal en land voor stemmen, en onderbreken. **Niet bevestigd:** of er een stem met Belgisch accent bestaat, en hoe het op iPhone werkt (Anam noemt zelf beperkingen in Safari).
  - **Geverifieerd** in een browser met een nagebootste server: de knop (44 px), de melding als de sleutel ontbreekt, het beeldvak tijdens het verbinden, en de melding plus terugval als Anam niet antwoordt. Typecheck, lint, build en 213 tests in orde. **Niet geverifieerd:** een echte sessie met Anam; daarvoor ontbreekt de sleutel.
- **2026-11-23 (Vlaamse stem, sprint Z4 naar voren)** — Bram ging akkoord om nu al een echte Vlaamse stem te regelen; later wil hij een stem trainen op zijn eigen stem. Gekozen voor Azure Speech in West-Europa: één dienst voor luisteren (`nl-BE`) en spreken (stemmen Arnaud en Dena), met een gratis maandtegoed van 5 uur herkenning en ongeveer een half miljoen tekens voorlezen (cijfers uit zoekresultaten van Microsofts prijspagina's, niet zelf op de pagina nagekeken).
  - Functie `zarvis-stem`: controleert login en rol; geeft de browser een toegangsbewijs van tien minuten voor de herkenning en spreekt zelf zin per zin uit. De sleutel blijft op de server.
  - `src/lib/zarvis/azureStem.ts` vult dezelfde interfaces in als de browserstem. Bij het eerste openen van het paneel kijkt de app of Azure beschikbaar is; zo niet blijft de browserstem. Hiermee werkt de microfoon ook in browsers zonder eigen spraakherkenning.
  - Secrets: `AZURE_SPEECH_KEY` (verplicht voor deze stem), optioneel `AZURE_SPEECH_REGION` (standaard `westeurope`) en `ZARVIS_STEM` (standaard `nl-BE-ArnaudNeural`).
  - **Geverifieerd:** de voorleeswachtrij (volgorde, zwijgen) met tests; de terugval op de browserstem in de browserproef; typecheck van app en functie, lint, build, 216 tests. **Niet geverifieerd:** alles tegen Azure zelf (geen sleutel, en het adres is vanuit de bouwomgeving niet bereikbaar): het toegangsbewijs, het herkennen van Vlaams, de klank van de stem en het afspelen op iPhone.
  - **Later:** een stem getraind op Brams eigen stem. `ZARVIS_STEM` en de interface `StemUit` zijn de plekken waar die inhaakt.
- **2026-11-23 (sprint Z2: lezen)** — Zarvis leest nu de dossiers van Compass.
  - `supabase/functions/zarvis/gereedschap.ts`: vijf leesgereedschappen (`zoek_dossier`, `lees_dossier`, `lees_gesprekken`, `lees_calculaties`, `pijplijn_overzicht`) achter één poort (`voerUit`). Alles loopt met de verbinding van de ingelogde gebruiker; de RLS blijft de grens. `search_leads_fuzzy` kon niet gebruikt worden (ingelogde gebruikers mogen ze niet uitvoeren), dus zoeken gebeurt met een gewone filter op naam, adres en dossiernummer.
  - De functie `zarvis` kreeg een redeneerlus: het model vraagt gereedschap, de functie voert het uit en het model gaat verder, hoogstens zes rondes. Elke opzoeking gaat als stap naar het paneel en wordt bij het antwoord bewaard in `zarvis_berichten.gereedschap`.
  - Het paneel toont de stappen boven het antwoord en, terwijl Zarvis zoekt, wat hij aan het doen is. De voorbeeldvragen hangen af van of er een dossier open staat.
  - **Weggevallen:** het vangnet dat bij een afwijzing om veiligheidsredenen een ander model laat overnemen. Het stond alleen aan met een eigen Anthropic-sleutel, die er niet is, en het maakte de lus dubbel zo ingewikkeld. Een afwijzing geeft nu de melding "Daar kan ik je niet mee helpen."
  - **Geverifieerd:** de vijf zoekopdrachten tegen de echte databank (zonder login: de kolommen en filters worden aanvaard, er komen geen gegevens terug); de hele functie tegen een nagebootst model en een nagebootste databank (twee rondes, stap getoond, antwoord en stappen bewaard, tokens opgeteld); de stappen in het paneel in de browserproef; typecheck, lint, 216 tests.
  - **Niet geverifieerd:** een echte vraag met een echte login en echte dossiers. Vooral onzeker: of de antwoorden kloppen met wat in de dossiers staat (de twintig testvragen uit hoofdstuk 5 zijn nog niet opgesteld), en hoe de fase-indeling uit `bouwflow_phase_category_map` zich verhoudt tot de groepen op het kanbanbord (`src/lib/pipeline.ts` gebruikt een eigen lijst).
- **2026-11-23 (onderzoek en ontwerp)** — (a) UI en connectors van OpenJarvis bestudeerd; overgenomen als ontwerp: stappen in het gesprek, een regel die zegt wat Zarvis doet, bronnen onder het antwoord, een bel met teller voor goedkeuringen, risicoklassen per soort actie (vastgelegd in code, niet door het model), concepten in plaats van verzenden. (b) Ontwerpcanvas met zes schermen gemaakt; Bram keurde de eerste stijl af ("Windows 95"), het eerste scherm is opnieuw gemaakt in een donkere, schermvullende richting en wacht op zijn oordeel. (c) WhatsApp: Meta laat sinds oktober 2025 in de EU toe dat één nummer in de Business-app en via de API werkt ("Coexistence"); Twilio ondersteunt dat niet. Open vraag: of een bedrijf dat zelf kan koppelen of een tussenpartij zoals 360dialog nodig heeft. Meta's eigen documentatie was niet rechtstreeks bereikbaar. (d) 3D-hoofd: eerste versie gebouwd met MakeHuman, technisch volledig (alle mondvormen en botten aanwezig) maar het ziet er duidelijk computergemaakt uit; haar, huid en kleding zijn noodoplossingen omdat de pakketten daarvoor geblokkeerd waren.
- **2026-11-23 (koerswijziging: Zarvis leeft apart)** — Bram: "Ik wil dat Zarvis als klein scherm zweeft op mijn desktop zodat ik die kan laten openstaan en met een toetsencombinatie kan toespreken. Zarvis leeft niet in zolderpunt kennismaking. Ze leeft apart. Ze is gewoon volledig geconnecteerd ermee." Ook: het MakeHuman-hoofd is afgekeurd en wordt niet verder uitgewerkt.
  - Nieuwe pagina `/zarvis` (`src/pages/ZarvisVenster.tsx`): Zarvis zonder Compass eromheen, donker, klein, met het laatste antwoord groot en de opzoekstappen erboven. Zelfde login, zelfde brein, zelfde gereedschap.
  - Nieuwe map `zarvis-desktop/`: een Electron-schil die die pagina in een klein venster toont dat bovenop blijft, met één systeembrede sneltoets (standaard Ctrl + Shift + Spatie), een icoon in het systeemvak, en onthouden plaats en grootte. De pagina krijgt geen toegang tot het systeem.
  - **Geverifieerd:** de schil in een zelftest op Linux (venster bovenop, sneltoets geregistreerd en komt aan in de pagina, pagina heeft geen systeemtoegang, weg-navigeren wordt geweigerd); de pagina in een browserproef (sneltoets start het luisteren, antwoord met stappen, geen fouten); `Zarvis.exe` is gebouwd.
  - **Niet geverifieerd:** het programma op een echte Windows-pc (starten, bovenop blijven, sneltoets, microfoon, systeemvak).
  - **Nog te doen voor "volledig geconnecteerd":** Zarvis weet in dit venster niet welk dossier in Compass open staat. Daarvoor moet Compass dat doorgeven. Het paneel in Compass zelf blijft voorlopig bestaan tot het losse venster bevestigd werkt.
- **2026-11-23 (Compass geeft het open dossier door)** — Nieuwe tabel `zarvis_context` (één rij per gebruiker, alleen de eigen rij leesbaar en schrijfbaar; al toegepast op de live databank en nagekeken). Compass schrijft daarin welke pagina en welk dossier open staan. De functie `zarvis` gebruikt die rij als de vraag zelf geen dossier meegeeft en ze minder dan vier uur oud is; het losse venster toont "In Compass: <klant>". **Geverifieerd:** de functie tegen een nagebootste databank (context komt in de instructie, startbericht meldt het dossier); browserproeven van venster en paneel; 216 tests. **Niet geverifieerd:** met een echte login in Compass en het echte venster ernaast.
- **2026-11-23 (ideeën en WhatsApp)** — Bram parkeerde vijf grote uitbreidingen als IDEE-10 tot 14 in `docs/IDEEENBAK.md` (Maildude overnemen, marketing en Google Ads, werf-app en lonen, CFO-dashboard, inventaris), elk "met 100% verantwoordelijkheid" te bouwen. WhatsApp: Bram wees zelf op koppelen als gekoppeld toestel, zoals WhatsApp Web. Dat kan met open-source bibliotheken (Baileys, whatsapp-web.js) en zou in het Zarvis-programma op zijn pc draaien; het gaat in tegen de voorwaarden van WhatsApp, met een risico op blokkering van het nummer. Wacht op zijn uitdrukkelijke akkoord.
- **2026-11-23 (WhatsApp als gekoppeld toestel, alleen lezen)** — Bram: "Go whatsappkoppeling". Hij aanvaardt daarmee het risico dat WhatsApp het zakelijke nummer kan blokkeren omdat de gebruikte bibliotheek (Baileys) niet van WhatsApp is.
  - **Programma (`zarvis-desktop`)**: `whatsapp.js` meldt zich aan als gekoppeld toestel (QR-code in een eigen venster, via het systeemvak), leest mee zonder als online te verschijnen en roept geen enkele verzendfunctie aan. `whatsapp-vertaal.js` zet een bericht om naar een rij en laat groepen, statusupdates, kanalen, reacties en berichten zonder herkenbaar nummer vallen. Wat nog niet doorgestuurd is, staat op schijf en gaat mee na een herstart of nieuwe login.
  - **Server**: tabel `whatsapp_berichten` (al toegepast op de live databank en nagekeken) en functie `whatsapp-koppeling`, die alleen berichten bewaart van nummers die in een dossier of bij een klant staan, gekoppeld aan het meest recente dossier van dat nummer. Al het andere wordt weggegooid. Zarvis kreeg het gereedschap `lees_whatsapp`.
  - **Geverifieerd:** de vertaling van elf soorten berichten; de wachtrij (zonder login, na herstart, bij weigering); de ontvangstfunctie tegen een nagebootste databank (privénummer weggegooid, koppeling via dossier en via klant, ongeldige rijen geteld); de zelftest van de schil; typecheck.
  - **Niet geverifieerd:** de koppeling met WhatsApp zelf. De servers van WhatsApp zijn vanuit de bouwomgeving niet bereikbaar en er is een gsm nodig om te scannen. Onbekend dus: of de QR-code verschijnt, of het koppelen lukt, hoeveel geschiedenis WhatsApp meestuurt, en of berichten nageleverd worden nadat de pc uit stond.
  - **Bekende beperkingen:** foto's en spraakberichten komen als vermelding binnen, zonder inhoud. Een klant die pas later in een dossier komt, heeft geen eerdere gesprekken. Zichtbaar in Compass zelf is het nog niet; alleen via Zarvis.
- **2026-11-23 (gegevensvenster en zwart gat)** — Twee vragen van Bram. (1) "Als ik praat tegen jarvis op de desktop over een onderwerp dan moet er een extern klein scherm openen om het onderwerp te staven met de data zonder het hoofdscherm te verliezen." (2) "Bedenk een manier om het gezicht te vervangen door een interactieve versie van deze blackhole. Wanneer Zarvis spreekt moet dit visueel duidelijk zijn. Wanneer ik spreek moet dat op een aparte microfoon knop duidelijk zijn."
  - **Gegevensvenster.** Elke opzoeking van Zarvis stuurt nu naast het antwoord voor het model ook de gegevens zelf mee (`bron` op de stap, opgebouwd per gereedschap in `gereedschap.ts`). De vorm is bewust algemeen (titel, secties met velden of lijsten), zodat elke latere rol hetzelfde venster kan vullen (IDEE-15). Nieuwe pagina `/zarvis/bron` (`src/pages/ZarvisBron.tsx`) toont ze; ze krijgt alles van het Zarvis-venster over een lijn in de browser (`src/lib/zarvis/bronKanaal.ts`) en vraagt zelf niets op. In het programma opent het venster vanzelf zodra een antwoord gegevens heeft, naast Zarvis, ook bovenop, en het onthoudt zijn plaats. Sluit je het, dan blijft het dicht tot de volgende vraag. Bij elk antwoord staat een knop "Toon de gegevens" (in een gewone browser de enige weg, wegens de pop-upblokkering).
  - **Zwart gat.** `src/components/zarvis/ZarvisGat.tsx` tekent het live op de grafische kaart (WebGL, één shader, geen afbeelding). Rust: de schijf draait traag. Luisteren: de schijf dooft en stroomt naar binnen. Denken: sneller, met een lichtpunt op een baan rond het gat. Spreken: de schijf licht op en golft naar buiten op het volume van de stem (echt gemeten bij de Azure-stem, een eigen spreekritme bij de browserstem). De microfoonknop is groter en apart: wit in rust, blauw met twee ringen die uitzetten op het volume van de microfoon als Bram spreekt. Zonder WebGL valt het terug op de bol. Het gezicht van Anam blijft alleen nog in het paneel in Compass bestaan.
  - **Het fotorealistische gezicht (onderzoek afgerond, niet gebouwd).** Een Gaussian-splat-hoofd in de browser werkt technisch (20.000 punten geladen en bewogen in een proef), maar de maker van eigen gezichten (LAM) heeft gewichten onder een niet-commerciële licentie en de lipsynchronisatie is niet getest op Nederlands. Brams pc heeft een RTX 5080 met 16 GB (factuur 11-02-2025): ruim genoeg voor een lokaal gezicht. Bram koos intussen voor het zwarte gat; het gezicht staat daarmee in de koelkast.
  - **Geverifieerd:** de functie tegen een nagebootst model (de stap draagt de gegevens); twee echte browservensters (opent vanzelf, antwoord zonder opzoeking laat de gegevens staan, nieuwe opzoeking vervangt ze in hetzelfde venster, ouder antwoord kiezen, sluiten en heropenen, los geopend toont een lege toestand, geen fouten); de schil in de zelftest (gegevensvenster opent naast Zarvis zonder overlap, bovenop, zonder systeemtoegang; een vreemd adres opent geen venster); het zwarte gat in rust, luisteren en spreken op schermafdrukken; typecheck, lint, build, 216 tests.
  - **Niet geverifieerd:** alles op een echte Windows-pc, het zwarte gat op een echte grafische kaart (in de proef getekend door software), de meting van de Azure-stem (geen sleutel), en de gegevens van echte dossiers.
- **2026-11-24 (installatieprogramma en beheersectie)** — Bram: "Zorg dat de exe van een installatie wizard voorzien is om alle connectoren af te vinken in een beheerderssectie." Hij gaf ook toestemming om voor Maildude in de Mail-CRM-databank te schrijven ("3. Ja") en bevestigde dat openstaande ideeën vanzelf starten.
  - **Installatieprogramma** `Zarvis-installatie.exe` (`zarvis-desktop/installatie.nsi`, gebouwd met `npm run bouw:win`): welkom, een aanvinklijst met programma-opties en connectoren, map kiezen, installeren, starten. Per gebruiker, zonder beheerdersrechten, met snelkoppelingen en een verwijderprogramma. Connectoren die nog niet gebouwd zijn staan er grijs bij en zijn niet aan te vinken. De keuzes gaan naar `installatie.json`; Zarvis leest ze bij de eerste start.
  - **Beheersectie** `/zarvis/beheer` (`src/pages/ZarvisBeheer.tsx`), alleen voor beheerders: bij de eerste start als inrichting in drie stappen, daarna via het systeemvak onder "Beheer…". Per connector een vinkje en de echte toestand (WhatsApp gekoppeld of niet, sleutel van de stem aanwezig of niet). Daarnaast: altijd bovenop, starten met de computer, de sneltoets.
  - **Het vinkje doet iets.** Nieuwe tabel `zarvis_instellingen` (al toegepast op de live databank en nagekeken; schrijven alleen voor beheerders). De functie `zarvis` biedt het model alleen gereedschap aan van connectoren die aan staan en weigert het uitvoeren van de rest. WhatsApp uit: het programma stopt ook met meelezen. Stem uit: de stem van de computer.
  - **Waarom een eigen NSIS-script:** het installatieprogramma van electron-builder heeft Wine nodig om op Linux te bouwen, en Wine crasht in de bouwomgeving. Het eigen script gebruikt de NSIS die electron-builder al meebrengt en geeft meteen de aanvinklijst met connectoren.
  - **Geverifieerd:** de beheersectie in een browser met nagebootste server en nagebootst programma (elf connectoren, drie aan, acht niet aan te vinken, bewaren, niet-beheerder geweigerd); de functie met WhatsApp uit (vijf in plaats van zes stuks gereedschap aangeboden); de zelftest van het programma; het installatieprogramma bouwt (118 MB); typecheck, lint, build, 216 tests.
  - **Niet geverifieerd:** het installatieprogramma zelf uitvoeren. Dat kan alleen op Windows; hier is alleen nagekeken dat het bouwt. Onbekend dus: of de wizard correct toont, installeert, de keuzes wegschrijft en Zarvis start. Windows zal waarschuwen voor een onbekende uitgever, want het programma is niet ondertekend.
  - **Nieuw idee:** herhalende taken met verwittiging, genoteerd als IDEE-16.
- **2026-11-24 (het zwarte gat opnieuw, als simulatie)** — Bram: ""licht op naar buiten is niet voldoende" deze animatie moet jouw kroonstuk zijn op deze applicatie". De eerste versie was een tekening van een zwart gat. De nieuwe (`ZarvisGat.tsx`) volgt voor elk beeldpunt een lichtstraal die door de zwaartekracht afbuigt, tot 110 stappen. Daardoor ontstaan de boog boven het gat (de achterkant van de schijf) en de boog eronder vanzelf, en klopt het beeld als het standpunt verandert. De schijf draait binnen sneller dan buiten; de kant die naar je toe draait is helderder.
  - **Spreken** is geen oplichten meer: het gat richt zich op naar de kijker, en de schijf wordt de stem. De stem wordt in acht toonbanden verdeeld; elke band laat een eigen ring oplichten, lage tonen dicht bij het gat en hoge aan de rand, met golven die naar buiten lopen en een nevel die opzwelt met het volume. **Luisteren:** het gat keert zich plat en dooft, de materie stroomt naar binnen. **Denken:** sneller, met een heldere klomp op een baan rond het gat, die mee afbuigt. Met de muis kijk je om het gat heen.
  - **Geverifieerd:** schermafdrukken van de vier toestanden in een browser (getekend door software, dus traag); typecheck, lint, build, tests. **Niet geverifieerd:** de beweging zelf en de vloeiendheid op een echte grafische kaart, en de echte toonbanden van de Azure-stem (geen sleutel; nu een nagebootst spreekritme).
  - **Nieuwe ideeën van Bram, genoteerd als IDEE-17 tot 22** (emoties lezen, zelflerend, Google Maps, agenda en locatie, browser, computer use); IDEE-10 en IDEE-16 aangevuld (meerdere mailboxen; timers en berichten op tijdstip).
- **2026-11-24 (Zarvis gaat doen: taken, timers, versturen, leren)** — Bram: "Gast natuurlijk moet Zarvis versturen", "Kom mij niet voor elke wijziging of publish om goedkeuring vragen", en "Zorg dat elke input van mij van de laatste 2 uren opgepikt wordt en gebouwd wordt want je slaat veel over".
  - **Taken en timers (IDEE-16).** Zarvis plant een herinnering, een controle die herhaalt tot een einde, of een WhatsApp op een tijdstip (`supabase/functions/_shared/zarvis/doen.ts`). Een klok in de databank wekt elke minuut de nieuwe functie `zarvis-taken`, maar alleen als er iets aan de beurt is, en met een eenmalig bewijs in plaats van een sleutel. Een controle laat het model nakijken met alleen leesgereedschap. Taken op de achtergrond zijn voorlopig alleen voor beheerders, omdat de uitvoerder met de serversleutel werkt.
  - **Versturen.** Berichten komen in `whatsapp_uit`; het programma op de pc verstuurt ze via de gekoppelde WhatsApp, hoogstens één keer per bericht, met een pauze ertussen, en kijkt eerst na of het nummer op WhatsApp zit. Naar Bram zelf mag meteen; naar een klant weigert het gereedschap tot Zarvis de tekst voorlas en Bram ja zei. Die grens zit in de code, niet alleen in de instructie.
  - **Meldingen.** Wat Zarvis uit zichzelf komt zeggen, verschijnt in het venster als "Zarvis meldt", wordt hardop gezegd als er niets anders loopt, en komt als Windows-melding.
  - **Leren (IDEE-18, deels).** `leer_vaardigheid` bewaart een werkwijze die bij elk gesprek meegaat. `meld_tekort` noteert wat nog niet kon; Zarvis zegt dan dat het op de bouwlijst staat. Een nachtelijke bouwer pakt die lijst en de ideeënbak op (`docs/ZARVIS-BOUWER.md`).
  - **Geverifieerd:** de omrekening van Belgische kloktijd in winter en zomer; de uitvoerder tegen een nagebootste server (geen of vals bewijs geweigerd zonder iets te lezen; herinnering, gepland bericht en vervulde controle geven de juiste rijen); het gereedschap (bericht aan klant geweigerd zonder ja, herhalen geweigerd zonder einde); tabellen, policies en klok nagekeken op de live databank; typecheck, lint, build, tests.
  - **Niet geverifieerd:** het versturen zelf via WhatsApp (vraagt een gekoppelde gsm), de Windows-melding, en of het model de grens "eerst voorlezen" in een echt gesprek netjes volgt (de code houdt het tegen als het dat niet doet).
  - **Wat van Brams lijst nog niet gebouwd is:** meerdere mailboxen (IDEE-10), emoties (17), Google Maps (19), agenda en locatie (20), browser (21), computer use (22), marketing (11), werf (12), CFO (13), inventaris (14), rollen tonen (15).
  - **Bijgestuurd bij het uitrollen:** Lovable bundelt elke functie alleen met haar eigen map en met `_shared`. De uitvoerder kon het gereedschap in de map van `zarvis` dus niet inladen en rolde niet uit. `gereedschap.ts` en `doen.ts` staan daarom nu in `supabase/functions/_shared/zarvis/`. Gedeelde code voor meerdere functies hoort altijd daar.
- **2026-11-24 (stem tegenover muziek en andere stemmen)** — Bram: "Ik speel veel muziek, Zarvis moet het verschil kennen tussen mijn stem en achtergrondmuziek en tussen mijn stem en die van anderen". Stap 1 gebouwd: de herkenning krijgt de microfoon gefilterd binnen (echo weg, ruis gedempt, stemisolatie waar de pc het kan), in `azureStem.ts`; de microfoonknop meet met hetzelfde filter. Sprekerherkenning (alleen Brams stem aanvaarden) is IDEE-23 en nog niet gebouwd. **Geverifieerd:** typecheck, lint, tests, build. **Niet geverifieerd:** of het filter muziek in de praktijk genoeg wegdrukt; dat vraagt een echte microfoon, echte muziek en de Azure-sleutel. Op de bouwmachine is geen geluid te testen.
- **2026-11-24 (proef op de live databank)** — Een proefherinnering werd door de klok binnen de minuut uitgevoerd: taak op "klaar", melding aangemaakt, bewijs opgebruikt. De keten klok, functie `zarvis-taken`, databank werkt dus live.
- **2026-11-24 (ritten met Google Maps, IDEE-19; verder gebouwd op Brams pc)** — Het cloudgesprek liep vast op toestemmingsvragen; het werk is lokaal overgenomen op branch `ccr-6091d7e4-l6vxke`. Het gereedschap `bereken_route` (`supabase/functions/_shared/zarvis/buiten.ts`) rekent afstand, rijtijd met verkeer en rijtijd zonder verkeer uit, naar een adres of naar het adres van een klant uit een dossier, nu of op een vertrekuur. Connector "Google Maps" in de beheersectie en in het installatieprogramma.
  - **Geverifieerd:** het gereedschap tegen een nagebootste Google (`src/lib/zarvis/__tests__/buiten.test.ts`, vijf tests: sleutel ontbreekt en Google wordt niet gebeld, geen vertrekadres, rit naar een klant met de juiste afstand, rijtijd en vertraging, vertrekuur alleen in de toekomst doorgegeven, dossier zonder adres, geweigerde sleutel, geen route); typecheck; 221 tests; build. Lint: geen nieuwe meldingen (de 453 op `main` bestonden al).
  - **Niet geverifieerd:** een echte rit bij Google. Er is geen sleutel. Ook niet: het vinkje "Google Maps" uit in een echt gesprek, en het installatieprogramma met de nieuwe regel (bouwt alleen in de bouwomgeving).
  - **Nog niet gedaan:** mergen, de functie `zarvis` uitrollen, publiceren. **Nodig van Bram:** het secret `GOOGLE_MAPS_API_KEY` in Lovable (een sleutel van Google Cloud waarvoor de Routes API aan staat) en, als hij een vast vertrekadres wil, `ZARVIS_VERTREKADRES`.
  - **Nieuwe ideeën, genoteerd als IDEE-24 tot 27** (weerbericht, familiale komische modus, savage modus, smartphone use). Brams letterlijke woorden zijn niet mee overgekomen uit het cloudgesprek; dat staat er eerlijk bij.
- **2026-11-24 (overdracht)** — Het cloudgesprek schreef `docs/HANDOFF-ZARVIS.md`: wie Bram is en hoe hij werkt, de vaste afspraken, de techniek en hoe uitrollen gaat, wat er staat, wat nooit op een echt toestel getest is, wat van Bram nodig is, en de volledige lijst van ideeën. IDEE-24 tot 27 in de ideeënbak zijn aangevuld met Brams letterlijke woorden uit het cloudgesprek; voor het weerbericht staat erbij welke gratis dienst nagekeken is en met welke adressen.
- **2026-11-24 (ritten uitgerold)** — PR #34 gemerged, functie `zarvis` uitgerold door de Lovable-agent, site gepubliceerd. **Geverifieerd:** de live bundel ging van `index-BEkc7wMi.js` naar `index-DNoVaJ4c.js` en bevat de tekst "Ritten berekenen"; de functie antwoordt (401 zonder login). **Niet geverifieerd:** een echte ritvraag met login; zonder `GOOGLE_MAPS_API_KEY` meldt Zarvis dat de sleutel ontbreekt.
- **2026-11-24 (weerbericht en twee modi, IDEE-24, 25, 26)** — Bram: "Weerbericht", "familiaire komische modus", "savage modus".
  - **Weerbericht:** gereedschap `weerbericht` in `buiten.ts`, via Open-Meteo, zonder sleutel. Plaats uit de vraag of uit het adres van een dossier (de gemeente na de postcode); een Belgische plaats gaat voor op een naamgenoot elders. Nu en één tot zeven dagen: weer in woorden, temperatuur, neerslag, kans op regen, rukwinden. Ook beschikbaar voor geplande controles ("verwittig mij als het morgen regent").
  - **Modi:** nieuwe kolom `stijl` op `zarvis_instellingen` (gewoon, familie, savage; al toegepast op de live databank en nagekeken). Gereedschap `zet_stijl` bewaart de stijl; de functie `zarvis` voegt de alinea van de stijl toe aan de instructie. Familie: warm en grappig, geen bedragen of klantnamen hardop tenzij Bram erom vraagt. Savage: snoeihard en sarcastisch. In beide blijven de feiten kloppen en blijft een bericht aan een klant professioneel en eerst voorgelezen. Alleen een beheerder kan de stijl veranderen (bestaande policy van de tabel).
  - **Geverifieerd:** zeven tests (`src/lib/zarvis/__tests__/weerEnStijl.test.ts`) tegen een nagebootste weerdienst en databank; het weerbericht één keer tegen de echte Open-Meteo (Aalter, twee dagen, juiste vorm en Nederlandse tekst); kolom, standaardwaarde en controle op de live databank; typecheck, 228 tests, build; lint zonder nieuwe meldingen.
  - **Niet geverifieerd:** een echt gesprek: of het model de stijl goed aanvoelt, of het in familiemodus bedragen echt verzwijgt, en of `zet_stijl` met een echte login de rij aanmaakt (er bestaat nog geen enkele rij in `zarvis_instellingen`).
  - **Niet gebouwd:** een eigen tint of tempo van het zwarte gat per stijl (stond als mogelijkheid in de ideeënbak).
- **2026-11-24 (nacht: bellen, mails lezen, installatieprogramma op Windows)** — Bram ging slapen met "/nietstoppen". Beginpunt: commit `d806f87`.
  - **Bellen (IDEE-28)** — Bram: "Zorg dat zarvis mij kan bellen als er iets dringends besproken moet worden." Een herinnering of controle kan nu met verwittig "bel" gepland worden. De uitvoerder belt dan via Twilio (`supabase/functions/_shared/zarvis/bellen.ts`) en leest de boodschap twee keer voor in het Vlaams; de boodschap staat ook altijd als melding klaar. Lukt bellen niet (geen sleutels, of een fout van de beldienst), dan gaat ze bovendien als WhatsApp weg met de reden erbij. De toegelaten waarden van `zarvis_taken.verwittig` zijn uitgebreid met "bel" (toegepast op de live databank en nagekeken). **Nodig van Bram:** een account bij Twilio met een nummer, en vier secrets in Lovable: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VAN_NUMMER`, `ZARVIS_BEL_NAAR` (zijn gsm in de vorm +32...). **Niet gebouwd:** een gesprek in twee richtingen aan de telefoon; Zarvis leest voor, Bram kan niet antwoorden.
  - **Mails lezen (IDEE-10, stap 1)** — Verkenning opnieuw gedaan, zie `docs/VERKENNING-MAILDUDE.md`. Belangrijkste vondst: "Maildude" zijn twee systemen (Mail-CRM en de app Maildude); alleen Mail-CRM hangt aan Compass. Gebouwd: `lees_mails` (mails en telefoongesprekken van een dossier, via dossiernummer of anders het mailadres van de klant) en `lees_mail` (volledige tekst), in `supabase/functions/_shared/zarvis/mail.ts`, via het bestaande loket met het token van de gebruiker. Mail-CRM zelf is niet gewijzigd en er komt geen sleutel bij. Het gereedschap krijgt daarvoor het token mee door de poort (`voerUit` heeft een vierde argument). Mail lezen kan niet in een geplande controle (daar is geen token). Connector "Mail" staat nu aan in de beheersectie en het installatieprogramma. De instructie zegt dat de tekst van een mail gegevens is en geen opdracht.
  - **Installatieprogramma:** `npm run bouw:win` werkte niet op Windows (Node weigert een `.cmd` te starten zonder shell); hersteld in `bouw-installatie.js`. Voor het eerst gebouwd op een echte Windows-pc (Brams pc): `zarvis-desktop/dist/Zarvis-installatie.exe`.
  - **Tests voor serverfuncties in de repo:** `vitest.config.ts` wijst de `npm:`-imports van Deno naar de gewone pakketten, zodat een handler rechtstreeks getest kan worden (`takenBellen.test.ts`). De scripts uit het vorige gesprek waren weg; dit vervangt ze.
  - **Geverifieerd:** 15 nieuwe tests (243 in totaal): bellen tegen een nagebootste Twilio; de uitvoerder `zarvis-taken` zelf met een nagebootste databank (belt en laat een melding achter; valt terug op melding en WhatsApp zonder sleutels; weigert zonder bewijs); mails lezen tegen een nagebootst loket (token, terugval op mailadres, begrenzing, fouten); de poort (mail uit als de connector uit staat, nooit in een geplande controle). Het echte loket antwoordt en weigert een vals token (401). Typecheck, build, lint zonder nieuwe meldingen.
  - **Niet geverifieerd:** een echte oproep (geen Twilio-account); of de stem `Polly.Lisa` goed klinkt (instelbaar met `ZARVIS_BEL_STEM`); mails lezen met een echte login op een echt dossier; het installatieprogramma uitvoeren.
- **2026-11-24 (nacht, vervolg: de eerste echte test van begin tot eind)** — Tot nu was niets van Zarvis ooit met een echte login getest. Vannacht wel: met een tijdelijke testgebruiker (beheerder, aangemaakt in de databank en daarna weer verwijderd) zijn echte vragen gesteld aan de live functie `zarvis`, met het echte taalmodel en de echte gegevens.
  - **Werkt live, bewezen:** het weerbericht (Aalter); de savage modus en terug naar gewoon (de rij in `zarvis_instellingen` wordt aangemaakt); de familiemodus (zegt bij een uitdrukkelijke vraag eerst dat het zakelijk is); alle dossiers overlopen (142); een dossier zoeken en de calculaties lezen; `lees_mails` en `lees_mail` op een echt dossier via het echte loket van Mail-CRM (3 mails, volledige tekst gelezen); een webpagina lezen (velux.be); een herinnering met verwittig "bel": de klok voerde ze binnen de minuut uit, en omdat bellen niet ingesteld is kwam de boodschap als melding en als WhatsApp-rij, met de reden erbij.
  - **Gevonden en hersteld:** (1) Een denkzin van het model in het Engels stond in het antwoord. (2) In een vervolgvraag trok Zarvis zijn eigen vorige antwoord in ("had ik de calculatie niet echt opgevraagd"), omdat hij in de geschiedenis zijn opzoekingen niet terugziet. Beide opgelost met twee alinea's in de instructie; opnieuw te testen na het uitrollen.
  - **Gevonden, voor Bram:** `bereken_route` krijgt van Google "API key not valid": het secret `GOOGLE_MAPS_API_KEY` bestaat in Lovable maar de waarde is geen geldige sleutel. De uitleg van Google gaat nu mee in het antwoord. Voor bellen bestaan `TWILIO_ACCOUNT_SID` en `TWILIO_AUTH_TOKEN` al; alleen `TWILIO_VAN_NUMMER` en `ZARVIS_BEL_NAAR` ontbreken.
  - **Web (IDEE-21, niveau 1):** `zoek_web` en `lees_webpagina` in `supabase/functions/_shared/zarvis/web.ts`. Alleen openbare https-pagina's; ip-adressen, localhost, interne namen en het eigen Supabase-adres worden geweigerd, ook na een doorverwijzing. De tekst gaat mee als gegevens, niet als opdracht. Zoeken zonder sleutel (DuckDuckGo) werkt vanaf een gewone pc maar wordt vanaf de server van de functie geweigerd; daarom zoekt het gereedschap bij Brave Search zodra het secret `BRAVE_SEARCH_API_KEY` bestaat. Niet afgedekt: een hostnaam die naar een intern adres wijst (de server van Supabase laat dat zelf niet toe, niet nagemeten).
  - **Emoties (IDEE-17, stap 1):** de instructie laat Zarvis uit je woorden lezen hoe je klinkt en zich aanpassen, zonder iets bij te houden.
  - **Programma op Windows:** de zelftest van `zarvis-desktop` is voor het eerst op een echte Windows-pc gedraaid (Brams pc): venster bovenop, sneltoets Ctrl + Shift + Spatie geregistreerd en komt aan, gegevensvenster opent ernaast zonder overlap, geen toegang tot het systeem vanuit de pagina, een vreemd adres wordt geweigerd, de WhatsApp-bibliotheek laadt. Het inlogscherm in het venster was licht, in de stijl van Compass; het is nu donker in de stijl van Zarvis (`LoginPage.tsx`, alleen op de paden van Zarvis; schermafdruk bekeken in het echte venster).
  - **Niet geverifieerd:** het installatieprogramma zelf doorlopen; het zwarte gat na het inloggen (de zelftest logt niet in); de stem; een echte oproep; zoeken met de sleutel van Brave.
- **2026-11-24 (nacht, vervolg: het venster bekeken op Brams pc)** — Zarvis is ingelogd geopend in een echt venster op deze pc. **Geverifieerd:** het zwarte gat wordt getekend door de NVIDIA GeForce RTX 5080 (niet door software), in rust, met de juiste tekst en de meldingen van de nachttest eronder; de beheersectie toont alle connectoren. **Hersteld:** de witte, brede schuifbalk van Windows in de vensters van Zarvis is nu smal en donker. **Gebouwd:** het licht van het zwarte gat kleurt mee met de stijl (koel wit, goud voor familie, rood voor savage; rood bekeken op een schermafdruk); de begintekst van het venster noemt nu ook mails, weer en opzoeken. **Niet geverifieerd:** de beweging zelf (alleen stilstaande beelden bekeken), luisteren, denken en spreken, en de gouden tint.

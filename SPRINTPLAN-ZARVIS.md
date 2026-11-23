# SPRINTPLAN — Zarvis fase 1: praten met je dossiers

> Bouwdocument voor de eerste fase van Zarvis, de assistent bovenop Zolderpunt Compass.
> Gebaseerd op het interview met Bram van 2026-11-23. Status: **goedgekeurd door Bram op 2026-11-23**; sprint Z0 loopt.
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
- **Mail-CRM wordt gelezen via het bestaande loket** (`compass-loket`), met hetzelfde gebruikerstoken. Zarvis schrijft niets naar Mail-CRM.
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

Druk-om-te-praten: opname in de browser, omzetten naar tekst, antwoord voorgelezen. De spraakdienst wordt **pas in sprint Z3 gekozen**, na een proef met echte Vlaamse zinnen vol klantnamen, straatnamen en ZL-nummers. Voorwaarde: verwerking in de EU en werkend in Safari op iPhone. Tot Z3 werkt Zarvis volledig via tekst.

## 4. Sprints

| Sprint | Inhoud | Klaar wanneer |
|---|---|---|
| **Z0 — Fundering** | Secret `ANTHROPIC_API_KEY`; tabellen uit 3.2; lege `zarvis`-functie met logincontrole; nagaan welke bestaande policies ruimer zijn dan "ingelogd" (zie 6.1) | Functie weigert zonder login (401) en antwoordt met login; migratie staat live |
| **Z1 — Lezen** | Alle leesgereedschappen; redeneerlus; gestreamd antwoord; tekstpaneel in `AppShell` | Twintig vaste testvragen (zie 5) geven het antwoord dat ook in de databank staat |
| **Z2 — Doen** | Drie schrijfgereedschappen; `zarvis_acties`; actiekaartjes; ongedaan maken; logboek | Elke actie is terug te vinden in de brontabel én in het logboek; terugdraaien herstelt de oude waarde |
| **Z3 — Stem** | Proef en keuze spraakdienst; microfoonknop; voorlezen; gsm-weergave | Tien gesproken opdrachten op iPhone en op bureau correct uitgevoerd |
| **Z4 — Afwerken** | Kostenoverzicht per dag uit `zarvis_berichten`; foutafhandeling (loket onbereikbaar, dossier niet gevonden, dubbelzinnige naam); regressie | Regressielijst R1–R4 uit SPRINTPLAN-COMMUNICATIE groen; kost per gesprek zichtbaar |

Na Z1 is Zarvis al bruikbaar via tekst. Z3 mag naar achter schuiven zonder de rest te blokkeren.

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

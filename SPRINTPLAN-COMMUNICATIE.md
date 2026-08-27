# SPRINTPLAN — Communicatie in Compass (integratie Mail-CRM)

> Canoniek bouwdocument voor de integratie van Mail-CRM in Zolderpunt Compass.
> Onderaan staat het voortgangs- en aannamelogboek per sessie — bijwerken na elke werksessie.
> Plan van aanpak goedgekeurd door Bram op 2026-08-26.

---

## 0. Vastgelegde besluiten (Bram, 2026-08-26)

1. **Mailsync elk halfuur** (was: elk uur). Cron `mail-sync-hourly` → `5,35 * * * *`.
2. **"Historiek aanvullen" alleen voor dossiers in offerte-fase** (Bouwflow-fases 3, 4, 25, 27 → Compass-categorie `offerte`).
3. **Mail Hub blijft altijd bestaan** als losse review-tool. De review-wachtrij blijft dáár; Compass wordt de leespagina. Compass schrijft in fase 1 níéts naar de Mail-CRM-database (uitzondering: het projecten-doorgeefluik van Sprint 0 en de historiek-classificatie van Sprint 4, beide server-side en afgebakend).
4. **Chat alleen per dossier**, geen algemeen kanaal.

## 1. Architectuur in vijf regels

- Twee aparte Supabase-projecten blijven bestaan: Compass (`xgrshvqteylncjbfsqbi`) en Mail-CRM (`ipnebgcuokehllepqwwm`).
- Compass leest Mail-CRM via **één eigen edge function ("het loket")** die eerst de Compass-login controleert en dan met een server-side sleutel live in Mail-CRM kijkt. Geen kopie van data, geen tweede login.
- Koppelsleutel: `leads.bouwflow_project_number` ⇄ `projects.extern_dossier_id` (ZL-nummer). Op 2026-08-26 geverifieerd: 99 ⇄ 99, teken voor teken identiek.
- **Doorgeefluik projecten**: Compass duwt elke 15 min zijn verse Bouwflow-dossierlijst (nieuw + fasenaam) naar Mail-CRM `projects`, zodat de AI-koppeling daar nooit meer veroudert.
- Alles wat nieuw is komt **naast** het bestaande. Enige aanpassing aan bestaande code: `mail-body` (Mail-CRM) krijgt een tweede toegangspad; navigatie in Compass krijgt de nieuwe pagina erbij.

## 2. Werkafspraken (gelden elke sprint)

- Taal: Nederlands, ook in code-commentaar.
- **Niets "af" noemen zonder eigen verificatie** in de echte bron (database-query, live pagina, functie-aanroep). Zelfrapportage van tools is een claim, geen bewijs.
- Secrets: ik zet klaar en verifieer via digest/health-check, **Bram plakt** ze in de dashboards. Nooit waarden in chat of code.
- Pushen ≠ live (les uit eerdere Lovable-deploys): na elke Compass-wijziging push → build → publiceren → **live gedrag verifiëren**, niet alleen de preview.
- Mail-CRM-functies deployen via Supabase MCP en **ook committen in de lokale mail-crm-repo** (`C:\Users\bramk\Desktop\mail-crm`) zodat code en cloud gelijk blijven.
- Additief-principe: geen bestaande kolommen, enums, views of kritieke functies wijzigen. `pull-bouwflow-projects`, `mail-sync`, `sync_state` en de confidence-drempels blijven dicht.

## 3. Vaste regressielijst (na élke sprint zelf uitvoeren)

| # | Controle | Hoe |
|---|---|---|
| R1 | Kanban-kolomtellingen identiek aan vóór de sprint (behalve echte Bouwflow-wijzigingen) | tellen in UI + query |
| R2 | Bestaande telefoongesprek-flow start en bewaart | click-through |
| R3 | Videocall-intake + briefing openen | click-through |
| R4 | Portal-link opent en toont **geen** nieuwe interne data (chat/notities) | portal-URL openen |
| R5 | Mail Hub: dashboard, review-wachtrij én "Mail lezen" werken nog | preview openen |
| R6 | Mail-CRM `sync_state.laatste_run` vers, halfuur-ritme zichtbaar | query |
| R7 | `koppeling_gezondheid`: bron `bouwflow` én `mailcrm` op ok | query |

**Harde stopcondities:** een bestaande edge function begint te falen · kanban-tellingen verschuiven onverklaard · mail-body breekt voor Mail Hub · een cron-job faalt 2× na elkaar. Dan: stoppen, rapporteren, rollback van die sprint (staat per sprint beschreven).

---

## Sprint 0 — Fundament: loket, doorgeefluik, halfuur-sync

**Doel:** de verbinding tussen beide databases staat, is geverifieerd, en Mail-CRM's dossierlijst veroudert nooit meer. Nog niets zichtbaar voor de gebruiker.

### Taken

- **S0.1 — Secrets klaarzetten.**
  - Compass edge-secrets: `MAILCRM_URL`, `MAILCRM_SERVICE_ROLE_KEY`, `MAILBODY_INTERNAL_SECRET` (nieuw gegenereerd geheim).
  - Mail-CRM edge-secret: `MAILBODY_INTERNAL_SECRET` (zelfde waarde; dashboard toont sha256-digest ter controle).
  - Bram plakt; verificatie via S0.2-health (digest-prefix, nooit de waarde).
- **S0.2 — Compass edge function `mail-crm-loket`** (nieuw). Auth: expliciete gebruikers-JWT-check, zelfde blok als `pull-bouwflow-projects` (verify_jwt wordt in dit project niet afgedwongen, dus in code). Acties, bewust smal en alleen-lezen:
  - `health` → welke secrets gezet zijn (boolean + digest-prefix), bereikbaarheid Mail-CRM.
  - `mails` `{zl}` → project opzoeken op `extern_dossier_id`, dan mails (id, datum, richting, mailbox, onderwerp, samenvatting, bevat_beslissing, beslissing, thread_id, contactnaam/-rol via join) + calls van dat project.
  - `mails_via_email` `{email}` → terugvalpad voor dossiers zonder ZL-nummer: mails van dat contact.
  - `mail_inhoud` `{email_id}` → doorgeven aan Mail-CRM `mail-body` met `x-internal-secret` (pas bruikbaar na S1.4).
  - Geen vrije filters of SQL doorgeven — vaste queries, dat is de veiligheidsgrens rond de service-sleutel.
- **S0.3 — Compass edge function `push-projects-naar-mailcrm`** (nieuw) + cron `mailcrm-projects-push` op `7,22,37,52 * * * *` (kwartier ná de Bouwflow-pull). Auth: zelfde patroon als bouwflow-pull (cron-secret uit `internal_config` óf ingelogde gebruiker).
  - Leest alle leads mét ZL-nummer, vertaalt `bouwflow_phase` → fasetitel via `bouwflow_phase_category_map`.
  - Diff-aanpak richting Mail-CRM `projects`: eerst alles GET-ten (klein, ~99 rijen), dan alléén PATCH `status` waar afwijkend, INSERT voor nieuwe ZL-nummers (`naam` = "Voornaam Achternaam" uit Compass).
  - **UPDATE raakt nooit `naam` of `company_id` aan** — bestaande AI-koppelingen en Bouwflow-namen blijven intact.
  - `dry_run` verplicht vóór de eerste echte run (zelfde patroon als bouwflow-pull).
  - Uitkomst melden in `koppeling_gezondheid` onder nieuwe bron `mailcrm`.
- **S0.4 — Typo-fix** in Compass `bouwflow_phase_category_map`: fase 27 "Raming+ waaborg verstuurd" → "Raming+ waarborg verstuurd" (bronwaarde voor het doorgeefluik; alleen weergave-/pushdata, nergens op gematcht).
- **S0.5 — Mailsync naar halfuur**: op Mail-CRM `cron.alter_job` van `mail-sync-hourly`, **alleen het schedule-veld** (`5 * * * *` → `5,35 * * * *`). Het command-veld (met de bekende platte-tekst-sleutel, openstaand punt) bewust niet herschrijven.
- **S0.6 (aanrader, vergt Brams akkoord):** de mail-crm-repo heeft nog steeds géén git remote — één schijfcrash en de hele ingestpijplijn-code is weg. Voorstel: privé GitHub-repo aanmaken en pushen. Kost 2 minuten, staat los van de rest.

### Verificatie
1. `health` toont alle secrets gezet, digests kloppen.
2. `mails` voor ZL-0116 = zelfde aantallen als rechtstreekse query op Mail-CRM.
3. Doorgeefluik `dry_run`: verwacht ~99 matches, 0 nieuw, en een status-update voor de bekend-verouderde rijen (o.a. **ZL-0132**: "Telefonische kennismaking" → "Adviesgesprek" — dat is meteen het bewijs dat het luik werkt). Daarna echte run + hercontrole in Mail-CRM.
4. Beide crons draaien zichtbaar (cron-tabellen + `sync_state` om :05 én :35).
5. Volledige regressielijst R1–R7.

**Rollback:** beide nieuwe cron-jobs unschedulen; nieuwe functies negeren (worden nergens aangeroepen). Mailsync desnoods terug naar `5 * * * *`.

---

## Sprint 1 — Communicatiepagina met mailsectie (vraag 1)

**Doel:** per dossier één pagina met alle mails en Leexi-calls, zoekfunctie, mail-lezen, beslissingen bovenaan.

### Taken

- **S1.1 — Nieuwe view `communicatie`** in `App.tsx` + component `src/pages/DossierCommunicatie.tsx`. Ingangen: knop in `DossierActionsBar` en in het dossiermenu op het kanbanbord. *Dit is de enige aanraking van bestaande regie-code — kleinst mogelijke diff, alleen additief.*
- **S1.2 — Tabs op de pagina**: **Tijdlijn | Telefoongesprek | Videocall-intake**. In deze sprint zijn de laatste twee tabs enkel doorschakelaars naar de bestáánde flows (`handleOpenCall` / `handleStartVideocall`) — nul wijziging aan die flows zelf.
- **S1.3 — Mailsectie** (React Query op het loket): per rij datum, richting-icoon (in/uit), mailbox-chip, contactnaam + rol (klant/leverancier), onderwerp, uitklapbare samenvatting, 🔴-chip bij beslissing. Leexi-calls er chronologisch tussen (📞 titel, duur, samenvatting). Terugvalpad zonder ZL-nummer: `mails_via_email` met label "gevonden via e-mailadres — dossier nog niet in Bouwflow".
- **S1.4 — Mail-CRM `mail-body` v5**: tweede toegangspad `x-internal-secret` naast de bestaande gebruikerscheck. **Behouden:** input alleen `email_id`, mailbox-allowlist, platte tekst. Deploy + commit in mail-crm-repo. Dit is de enige wijziging aan bestaande Mail-CRM-code in het hele plan.
- **S1.5 — "Mail lezen"-zijpaneel** in Compass via loket-actie `mail_inhoud`. Rendering als platte tekst (pre-wrap), nooit HTML — mailinhoud is externe content (XSS).
- **S1.6 — Zoekveld**: client-side filter over onderwerp, samenvatting, beslissing en contactnaam van de al opgehaalde rijen. (Volumes per dossier zijn klein; geen server-zoek-endpoint nodig — bewuste keuze, minder aanvalsoppervlak.)
- **S1.7 — Beslissingenblok** bovenaan: alle items met `bevat_beslissing` uit de opgehaalde mails + calls, chronologisch, klik scrollt naar het item in de tijdlijn.

### Verificatie
1. ZL-0116: pagina toont exact de aantallen uit een rechtstreekse controle-query; zoeken versmalt correct; mail-lezen toont inhoud.
2. Dossier zonder ZL-nummer toont het terugvalpad met label.
3. **Regressie op mail-body vanuit Mail Hub** ("Mail lezen" daar werkt nog — beide auth-paden getest).
4. Live geverifieerd op de gepubliceerde app, niet alleen de preview.
5. Regressielijst R1–R7.

**Rollback:** nav-ingangen naar de nieuwe view verwijderen; mail-body v5 is backwards-compatibel (bestaand pad ongewijzigd).

---

## Sprint 2 — Gesprekken + post-it-notities (vraag 3)

**Doel:** onbeperkt telefoongesprekken/videocalls per dossier, elk met post-it-notities (notitie / beslissing / onthouden), zonder ooit iets te overschrijven. Bestaande kennismakings- en intakeflow blijven onaangeroerd.

### Taken

- **S2.1 — Migraties Compass** (nieuwe tabellen, RLS authenticated zoals de rest van de app):
  - `gesprekken` (id, lead_id → leads on delete cascade, type `telefoon|videocall`, gestart_op, beeindigd_op, door_user)
  - `gesprek_notities` (id, lead_id, gesprek_id nullable, soort `notitie|beslissing|onthouden`, tekst, door_user, created_at)
  - **Guardrail in code én review:** nieuwe flow schrijft nóóit naar `leads.gesprek_datum`, `leads.gesprek_notities` of `pre_intake` — daar hangt de kanban-categorisering en de 1-per-dossier-aanname (`maybeSingle`) aan.
- **S2.2 — Gespreksmodus-UI**: knop "Nieuw gesprek" op de Communicatiepagina → typekeuze → gespreksscherm met lopende teller, groot invoerveld, drie soort-knoppen (één tik = één post-it met tijdstip + auteur), lijst post-its van dit gesprek, "Gesprek beëindigen".
- **S2.3 — Tijdlijn-integratie**: elk gesprek als uitklapbaar tijdlijn-item met zijn post-its. Post-its van soort **beslissing** komen óók in het Beslissingenblok van S1.7, samengevoegd en gesorteerd met de mail/call-beslissingen, elk met bronlabel (Compass / mail / call).
- **S2.4 — Nesting definitief**: Telefoongesprek en Videocall-intake als volwaardige tabs onder Communicatie; oude losse ingangen blijven werken (niets weggehaald).

### Verificatie
1. 3 gesprekken na elkaar op een testdossier: alles blijft staan, niets overschreven.
2. Kanban-categorie van dat dossier vóór/na identiek; `pre_intake`-telling ongewijzigd (24 vandaag); briefing en transcriptvalidatie werken nog.
3. Beslissing-post-it verschijnt in het Beslissingenblok met juiste bron.
4. Regressielijst R1–R7.

**Rollback:** UI-knoppen weg; tabellen laten staan is onschadelijk (nergens door bestaande code gelezen).

---

## Sprint 3 — Interne chat per dossier (vraag 2)

**Doel:** realtime chatpaneel rechts, per dossier, met naam en tijdstip. Onzichtbaar voor het klantportaal.

### Taken

- **S3.1 — Migratie**: `dossier_chat` (id, lead_id → leads cascade, user_id, bericht ≤2000 tekens, created_at). RLS: authenticated lezen; invoegen alleen met `user_id = auth.uid()`; geen update/delete in v1. Tabel toevoegen aan de realtime-publicatie.
- **S3.2 — `DossierChatPanel.tsx`**: inklapbaar rechterpaneel, gemonteerd via `DossierActionsBar` — daarmee beschikbaar overal waar een dossier actief is (Communicatiepagina, slides, briefing, calling). Namen uit `profiles.display_name` (2 gebruikers, beide met naam — geverifieerd). Realtime-subscription gefilterd op lead_id, optimistisch toevoegen.
- **S3.3 — Portal-verificatie**: `get-portal-data` regel voor regel nalopen — bevestigen dat chat, gesprekken en notities nergens in de portal-payload kunnen belanden (R4 wordt hiermee aangescherpt).
- Chat komt **niet** in de tijdlijn (v1): de tijdlijn is "wat is er met/over de klant gezegd", het paneel is werkoverleg. Toggle kan later.

### Verificatie
1. Twee browsersessies (Bram + tweede gebruiker): bericht verschijnt realtime aan de andere kant, met juiste naam.
2. Portal-URL van datzelfde dossier: geen spoor van chat.
3. Regressielijst R1–R7.

**Rollback:** paneel-knop weg; tabel onschadelijk.

---

## Sprint 4 — Beslissingenregister-afwerking + Historiek aanvullen (alleen offerte-fase)

**Doel:** het register is compleet en gepolijst, en voor offerte-dossiers kan de oude mailhistoriek per dossier tegen zichtbare, kleine kost worden aangevuld.

### Ontwerpkeuze historiek (afwijking t.o.v. plan van aanpak, bewust)
De volledige classificatielogica bestaat al twee keer (edge + backfill); een derde kopie is precies het soort duplicatie waar het mail-crm-handoffdocument voor waarschuwt. Maar hier is het dossier al **bekend** — we hoeven niet te matchen, alleen samen te vatten. Daarom: een **nieuwe, simpelere classifier** in een eigen Mail-CRM-functie, geen kopie van de fragiele match-logica.

### Taken

- **S4.1 — Mail-CRM edge function `historiek-dossier`** (nieuw; auth via `x-internal-secret`, zelfde geheim als mail-body v5):
  - Input: `{project_id, klant_email}` (e-mail komt uit het Compass-dossier).
  - Zoekt via Graph de berichten van/naar dat adres (token- en fetch-patroon hergebruiken uit `mail-body`), matcht op `graph_message_id` met eigen rijen die **`niet_geanalyseerd`** zijn — andere statussen worden nooit aangeraakt.
  - Per mail één eenvoudige Anthropic-call: samenvatting + bevat_beslissing/beslissing + contactkoppeling. `project_id` wordt deterministisch gezet (dossier is gegeven), status → `gekoppeld`; irrelevante mail → `genegeerd`.
  - Max 25 mails per aanroep; response meldt verwerkt/resterend zodat Compass kan doorvragen met voortgangsbalk.
  - Deploy + commit in mail-crm-repo.
- **S4.2 — Loket-actie `historiek` + knop in Compass**: knop "Historiek aanvullen" **alleen zichtbaar** als de dossierfase → categorie `offerte` (Bouwflow-fases 3, 4, 25, 27). Vóór het starten toont de knop het aantal gevonden oude mails en een kostenindicatie (orde van grootte: centen tot enkele tientallen centen per dossier bij 20–80 mails); daarna voortgang per batch.
- **S4.3 — Registerpolish**: bronfilters (mail / call / gesprek), datumafbakening, en de tijdlijn kleurt aangevulde historiek zichtbaar bij ("aangevuld op …").

### Verificatie
1. Eén offerte-dossier als proef: vóór/na-telling per `koppel_status` op Mail-CRM — alleen `niet_geanalyseerd` daalt, alle andere statussen exact gelijk.
2. Aangevulde mails verschijnen in de Compass-tijdlijn en (waar van toepassing) in het Beslissingenregister.
3. Knop is onzichtbaar op een niet-offerte-dossier.
4. Kosten van de proefrun gerapporteerd aan Bram.
5. Regressielijst R1–R7.

**Rollback:** knop verbergen; reeds geclassificeerde mails blijven correct (dat is geen schade maar aanwinst).

---

## Bewust buiten scope (geparkeerd, kandidaten voor de ideeënbak)

- Onzekere mails bevestigen vanuit Compass (schrijven naar Mail-CRM-review) — Mail Hub blijft daarvoor de plek (besluit 3).
- "Wacht op wie"-indicator per dossier · AI-samenvatting "laatste 30 dagen" · ongelezen-badges op chat · chat-toggle in tijdlijn.
- `email_cc`-bugfix (moet synchroon in twee codebases — eigen klusje, niet tussendoor).
- `info@aircoxpert.be` (andere M365-tenant, eigen app-registratie).
- Fijnmaziger RLS zodra er meer dan een handvol medewerkers zijn.

---

## Voortgangs- en aannamelogboek

| Datum | Sessie | Gedaan | Geverifieerd | Aannames / open punten |
|---|---|---|---|---|
| 2026-08-26 | Analyse + plan | Beide apps en databases geanalyseerd; plan van aanpak goedgekeurd; dit sprintplan opgesteld | ZL-dekking 99⇄99 identiek; veroudering ZL-0132/0134 aangetoond; Compass-cron */15 live; Mail-CRM-cijfers nageteld; 2 Compass-gebruikers met display_name; pre_intake strikt 1-per-dossier | Nog te doen: S0.6-besluit (git remote mail-crm); exacte digest-verificatiemethode Compass-secrets bepalen bij S0.1 |
| 2026-08-26 | /nietstoppen-bouwsessie (S0–S4) | **S0**: mailsync naar halfuur (`5,35 * * * *`); typo fase 27 gefixt; doorgeefluik live via bestaande mail-crm-functie `sync-projects` (v3, +`alleen_status`-vlag) + Compass-cron `mailcrm-projects-push` (7,22,37,52) met secret/URL in `internal_config` (bestaand patroon). **S1**: Communicatiepagina + `compass-loket` (mail-crm, v3) + mail-lezen + zoeken + beslissingenregister. **S2**: tabellen `gesprekken`/`gesprek_notities` + gespreksmodus met post-its. **S3**: `dossier_chat` + realtime Teamchat-paneel via DossierActionsBar. **S4**: `historiek`-action (mini-classifier, kandidaat-dossiers van de klant reizen mee) + knop alleen offerte-fase met gratis telling en kostenindicatie. Compass-commits a85eecb→aabbb1a op branch `communicatie`; mail-crm-commits 945afb1→7a393d1 op master. | Dry-run→echte run→zelfheling (ZL-0131) van het doorgeefluik; volautomatische keten bewezen met échte Bouwflow-wijziging (ZL-0134 → Geweigerd, 11:30→11:37 doorgestroomd); loket e2e met echte Compass-sessie (ZL-0116: 8 mails/3 beslissingen, leveranciersmail-inhoud 2434 tekens); alle S1–S4-UI live in de browser doorlopen; realtime chat met extern geïnjecteerd bericht; guardrails: pre_intake 24, `gesprek_datum`/`gesprek_notities` onaangeroerd, kanban-mapping ongewijzigd; portal leest geen nieuwe tabellen; mail-body-gebruikerspad hertest met echte sessie; testdata en testgebruiker volledig opgeruimd; 88/88 Compass-tests + build groen, 44/44 mail-crm-tests groen. | **Afwijkingen t.o.v. plan** (alle beargumenteerd): loket draait in mail-crm i.p.v. Compass (nul nieuwe secrets; Compass-JWT wordt bij Compass-auth geverifieerd); doorgeefluik = bestaande `sync-projects` (was al gecommit door mail-crm-sessie) i.p.v. nieuwe functie, gezondheidslog in mail-crm `sync_state` i.p.v. `koppeling_gezondheid`; mail-body service-bearer-pad na peer-review vervangen door eigen Graph-fetch in het loket (strikter). **Extern geblokkeerd**: Anthropic-tegoed op t/m 01-09 → historiek-verwerk-pad en reguliere classificatie doen het pas weer na verhoging (loket meldt de reden netjes; niets gaat verloren, mails komen binnen als 'onzeker'). Sync-secret passeerde éénmalig de sessietranscript (zelfde blootstelling als `.env`); roteren = 1 SQL-statement + dashboard-secret. R5 (Mail Hub-preview) niet in de UI geopend (Lovable-workspace-login) — wel alle onderliggende paden getest. |
| 2026-08-26 | Ideeën 3–7 | **IDEE-3** inklapbare categorieën in de tijdlijn · **IDEE-4** kostenvraag beantwoord · **IDEE-5** prompt-caching, body-trimming, strengere voorfilter, Historiek-knop op elk dossier · **IDEE-6** gelaagde gratis voorscreening met mailheaders + veiligheidsklep · **IDEE-7** communicatie onderverdeeld per leverancier (subgroepen in het dossier + nieuwe pagina Leveranciers, naamvarianten samengevoegd). Compass-commits t/m 6c50ab0; mail-crm mail-sync v13 en compass-loket v5. | Live geverifieerd met echte Compass-sessies: leveranciersoverzicht 85 bedrijven/748 mails, Trappen Smet-varianten samengevoegd (4+1→5), subgroepen zichtbaar in ZL-0015, Proenergy-detail over 8 dossiers. Kostenscreening gemeten: 61% van de verspilde calls gevangen, 0/120 valse positieven op échte projectmail. 88/88 Compass-tests + 59/59 mail-crm-tests groen. Alle testgebruikers en testdata opgeruimd; Brams eigen teamchatbericht bewust intact gelaten. | Anthropic-tegoed blijft op tot 01-09 (of eerdere verhoging) — dat blokkeert alleen nieuwe samenvattingen, niet het lezen. Dubbele bedrijfsnamen zijn in de weergave opgelost, niet in de data: 5 gevallen gemeten (Pro AF BV, Lakkerij De Groote, Trappen Smet, TRIC N.V., VM Tegels). Mail Hub-kant van IDEE-7 (leveranciersoverzicht in de Mail Hub zelf) nog niet gebouwd. |
| 2026-08-27 | Live-oplevering | PR #3 gemerged (merge-commit cbc1aaa). Lovable pikte de code op maar publiceerde de publieke site NIET automatisch — handmatig `deploy_project` gedaan. Loket v6: bedient nu elke ingelogde tool (Mail-CRM + Compass) i.p.v. alleen Compass, zodat de leveranciers-logica één bron blijft (IDEE-8). | **Live geverifieerd op zolderpunt-kennismaking.lovable.app** (bundle index-afystxyG.js, was Ck-i7keW.js): Leveranciers-knop in de navigatie, 85 leveranciers/748 mails, dossier ZL-0015 toont "Leveranciers(6 · 2 leveranciers)" met subgroepen Trappen Smet(5) en Proenergy(1) — de samengevoegde naamvariant zit erin. Beslissingenregister aanwezig. Loket-auth getest langs vier wegen: Mail-CRM-login OK, Compass-login OK, ongeldig token geweigerd, geen token geweigerd. Testgebruikers in beide databases opgeruimd; Brams eigen teamchatbericht intact. | **Les: een GitHub-merge publiceert de Lovable-site niet vanzelf** — de preview volgde wel (id-preview-cbc1aaaa), de publieke URL niet. Altijd `deploy_project` + bundle-hash controleren. Openstaand: Anthropic-tegoed tot 01-09; Mail Hub-UI voor leveranciers (kan nu goedkoop via het gedeelde loket, wacht op Brams keuze); 5 dubbele bedrijfsnamen bestaan nog in de data (alleen in de weergave samengevoegd). |

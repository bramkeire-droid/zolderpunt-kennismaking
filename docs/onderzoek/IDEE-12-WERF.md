# Onderzoek IDEE-12: de Werf-app, het DOEN

Gemeten op 2026-11-24. Alleen gelezen: code, `docs/`, de migraties, de uren-robot lokaal, en SELECT (tellingen en metadata) op de databanken van Werf (`cdc896de-…`) en Compass (`f2d6309c-…`). Niets geschreven, niets uitgerold. Geen namen, loonbedragen, pincodes of locaties in dit document; alles in aantallen.

Pad Werf-repo: `C:\Users\bramk\.claude\projects\Zolderpunt - WERF\zolderpunt-werf-foundation` (hierna `werf/`). Robot: `...\Zolderpunt - WERF\zolderpunt-uren-robot` (hierna `robot/`).

## 1. Samenvatting

1. Alle vier acties kunnen, maar niet via de bestaande RPC's: die eisen allemaal een ingelogde Werf-beheerder (`has_role(auth.uid(),'admin')`) en weigeren dus een loket. Het loket heeft eigen, kleine functies nodig die enkel de serversleutel mag uitvoeren, met een voorstel-tabel die elke wijziging vooraf vastlegt, na Brams ja uitvoert en kan terugdraaien.
2. Het loket volgt het model van de marketing-loket (Compass-login nagekeken bij Compass), niet dat van `robot_config`: het weet wie ja zei en het maakt geen tweede geheim dat kan lekken. Een apart alleen-lezen geheim komt pas als geplande controles zonder gebruiker dat vragen.
3. De 23 reisregistraties zijn allemaal ouder dan 21 dagen, 21 liggen in een vergrendelde maand en 21 staan al in Bouwflow. De loonberekening gebruikt het type (werk of reis) niet, dus vergrendelen hindert niet; maar de robot controleert na een wijziging het type niet (audit R2-12), dus dit moet eerst in de robot of met een nacontrole.
4. Arbeiders aanspreken heeft vandaag geen kanaal: geen push, geen telefoonnummers in Werf, 5 van 7 hebben een e-mailadres, 1 werkt in het Pools. Elk bericht vertrekt pas na Brams ja (één ja voor een voorgelezen lijst); een vaste herinnering zonder ja is een beslissing van Bram.
5. De maand klaarzetten kan enkel als tellen en nakijken: het rekenwerk van de wizard zit in de browser van Werf, niet op de server. Zarvis bereidt voor en tekent nooit. Totaal geschat: 78 uur bouwwerk in zes stappen (72 in Werf en Zarvis, 6 in de robot); de eerste stap (alleen lezen) is af in ongeveer 10 uur.

## 2. Wat er vandaag is

**Gegevens (SELECT, 24/11):** 706 `time_block` (2 open, geen enkele open ouder dan 24 u), 8 `fraud_flag` met regel `open_langer_dan_24u`, 8 `eind_te_laat`, 12 `overlap`, 64 `start_te_vroeg` (alle 92 open). `write_job`: 599 klaar, 86 `skipped_exists`, 12 `needs_human`, 7 `ignored`, 2 `pending`. `sync_gap`: 672 bevestigd, 9 niet ingepland, 2 in wachtrij, 12 vraagt een mens, 1 onbevestigd. 9 `pay_period` (8 vergrendeld, oktober als laatste; geen novemberperiode), 276 `pay_day`, 46 `pay_wizard_step`, 3026 `audit_log`. Laatste robotrondes en afstemmingen (23-24/11) zijn geslaagd.

**Hoe een registratie wijzigt in de app:**
- Beheerder wijzigt, voegt toe, verwijdert, splitst: vier `SECURITY DEFINER`-functies `beheerder_wijzig_registratie` (`werf/supabase/migrations/20260831210000_bewerk_rpc_kent_insert.sql:21`), `beheerder_voeg_registratie_toe` (`...20260918110000_...sql:33`), `beheerder_verwijder_registratie` (`...20260826113000_beheerder_prestatie_rpcs.sql:68`), `beheerder_splits_registratie` (`...20261103130000_splits_kiest_operatie_op_baseline.sql:76`). Alle vier beginnen met `auth.uid() is null or not has_role(auth.uid(),'admin')` en `EXECUTE` is ingetrokken voor `public, anon`. Ze zijn atomair en kiezen de robotopdracht (`insert`, `update`, `move`, `delete`) in `write_job`.
- Een open registratie afsluiten gebeurt NIET met een RPC maar in de browser: `forceCloseRegistration` (`werf/src/lib/registraties.ts:749-788`) verlaagt allocaties één voor één en zet dan `stop_ts`, zonder transactie. Dat is geen basis voor een loket.
- Automatisch: `close_stale_open_time_blocks` (cron, om de 5 minuten, `...20261028100000_half_bewaard_en_verwijderd_blijft_weg.sql:36`) sluit na 24 u af op 23:59 en vlagt `open_langer_dan_24u`; een blok zonder werkbonregel wordt niet afgesloten maar vlagt `half_bewaard`.
- Overlap is sinds 27/07 geen blokkade meer maar een vlag (`excl_block_no_overlap` is weggehaald, `...20260727160231_...sql:3`; trigger `flag_time_block_overlap`). De app heeft een planner om overlap op te lossen (`werf/src/lib/overlap.ts`, `voerOplossingUit` r. 316 controleert eerst dat de blokken ongewijzigd zijn) en RPC's `split_overlap`, `resolve_fraud_flag`.

**De regel van 21 dagen:** zit in RLS voor medewerkers (`...20260615222545_...sql:5-14`: `work_date >= current_date - 21 OR has_role(admin)`) en in de scherm-functie `isFrozen` (`registraties.ts:682`). Een beheerder en de serversleutel vallen er buiten.

**Het anker:** `fraud_set_anchor` (`...20260618090000_fraude_controle_kern.sql:49-62`) zet `start_anchor_ts`/`stop_anchor_ts` = `now()` tenzij `auth.role() = 'service_role'` of de gebruiker beheerder is. `fraud_check_time` maakt dan een vlag bij 5 minuten afwijking.

**Robot:** `robot/runner.mjs` (1872 regels) haalt opdrachten met `robot_fetch_jobs(p_token…)`, schrijft in Bouwflow met Playwright, 3 rondes per dag (GitHub Actions, structureel 2 tot 5 u te laat). Na 15 pogingen gaat een opdracht naar `needs_human` en wordt niet meer opgepikt. De audit (`robot/AUDIT-2026-09-10.md`) telt 11 open defecten van 37. Er bestaat ook een tweede lokale map `zolderpunt-uren-robot-uitvoerder`; dat is een git-worktree van dezelfde repo op branch `robot-uitvoerder-ontbreekt` (één commit voor op `main`), geen kopie.

**Toegang zonder gebruiker:** `robot_config` (één rij, enkel de sha256 van het token) plus `robot_token_ok(p_token)` (`...20260729160000_robot_token_rpcs.sql:24`), met RPC's die voor `anon` uitvoerbaar blijven en het token als parameter meekrijgen.

**Meldingen naar arbeiders:** niets. Geen push-plug-in in `werf/package.json` (Capacitor: android, barcode-scanner, network, preferences, splash-screen, status-bar), geen tabel voor meldingen, geen telefoonnummer in `employee` (kolommen: `email`, `language`, `bouwflow_executable_id`, ...). 5 van 7 actieve medewerkers hebben een e-mailadres; taal: 6 Nederlands, 1 Pools.

**Maand:** de zeven stappen staan in `werf/docs/maandoverzicht-wizard.md` en `werf/src/lib/maandoverzicht-wizard.ts` (`berekenPoorten`, r. 345). De berekening (`generatePeriod`, `recomputePeriod`, `herberekenEnCascade`) is TypeScript in de browser (`werf/src/lib/verloning-data.ts:373`, `:947`) en schrijft met de login van de beheerder; handtekeningen lopen via `pay_wizard_tekenen`, `pay_wizard_forceren`, `pay_wizard_terugnemen` (admin-only, `...20260828160000_maandoverzicht_handtekeningen.sql:74,102,129`).

## 3. Bevindingen per vraag

### 3.1 Registraties rechtzetten (open of ontbrekende registraties; 23 reisregistraties, IDEE-54)

- **Wat de app er zelf mee doet, en met welke controles:** wijzigen en splitsen controleren dat de netto tijd groter is dan nul, dat de allocatieminuten niet boven het netto blok uitkomen (trigger `check_allocation_minutes`), en dat de categorie bij de rol van de werkbon past (`enforce_allocation_routing`). Toevoegen weigert een einduur voor het beginuur. Overlap en afwijking tegenover het anker geven een vlag, geen blokkade. De regel van 21 dagen geldt enkel voor medewerkers.
- **Wat een loket kan aanroepen:** niets van de vier RPC's, want met de serversleutel is `auth.uid()` leeg en dus weigert elke `has_role`. De bestaande functies `retry_write_job` en `complete_write_job` aanvaarden de serversleutel (hun check slaat enkel een ingelogde niet-beheerder af; `...20260812113000_write_job_rpc_anon_dichtgezet.sql`), maar `write_job_negeren` en `write_job_herstellen` niet (`has_role(auth.uid(),…)`).
- **Wat er nieuw moet komen:** eigen functies met voorvoegsel `zarvis_`, `EXECUTE` enkel voor `service_role`, die dezelfde berekening doen als de beheerderfuncties (`floor` voor de netto minuten, niet afronden: les van 18/09) en bovendien in dezelfde transactie een rij in een nieuwe tabel `zarvis_voorstel` bijwerken. Direct schrijven met de serversleutel in de loket-functie is minder goed: dan staan er twee rekenroutes naast elkaar.
- **Het anker blijft schoon enkel als het loket met de serversleutel schrijft** (`auth.role() = 'service_role'`, dus geen anker, geen vlag). Een RPC die met de gewone sleutel en een token wordt aangeroepen (zoals de robot) zou `auth.role() = 'anon'` hebben en elke correctie alsnog verankeren op nu. Dit is een argument voor een edge function met de serversleutel in plaats van een anon-RPC met token.
- **Logboek:** `audit_trigger` (`...20260615224033_...sql:20`) schrijft `actor_id = auth.uid()`, dus leeg bij het loket. De `zarvis_voorstel`-rij (met de Compass-gebruiker die ja zei) is dan de enige link tussen wijziging en persoon; de functie moet bovendien zelf een `audit_log`-rij met actie `zarvis:…` schrijven.
- **Hoe een voorstel eruitziet** (één ja, terug te draaien): een rij met `soort` (`afsluiten`, `werk_i.p.v._reis`), de te wijzigen `time_block`/`allocation`-ids, een snapshot `voor` (start, stop, pauze, type, werkbon, `naar_bouwflow`, laatste `updated_at`) en `na`, een bewijs in woorden (bv. "reistijd 9 u 54 min op een dag zonder werkregistratie"), de gevolgen (staat al in Bouwflow: ja/nee; maand vergrendeld: ja/nee; robotopdracht die klaarstaat), een status (`voorgesteld`, `toegepast`, `teruggedraaid`, `mislukt`) en wie wanneer ja zei. Toepassen controleert eerst dat de rijen nog gelijk zijn aan `voor` (zoals `voerOplossingUit`); terugdraaien zet `voor` terug en zet een nieuwe `update`-opdracht klaar. Een verwijdering is niet terug te draaien (blok en allocatie zijn weg; `beheerder_verwijder_registratie`) en komt niet in de eerste bouwstappen.
- **De 23 registraties (SELECT):** 23 dagen met meer dan 4 u reistijd en nul werk, samen 9518 minuten; alle 23 zijn ouder dan 21 dagen; 21 liggen in een vergrendelde maand; 21 hebben een robotopdracht die `done` is. Gevolgen: (a) vergrendeld hindert niet voor het loon: het type werk/reis komt in `verloning.ts` enkel voor als typedefinitie (r. 23) en niet in een berekening (bij `grep` één treffer; niet elke berekening is nagelopen); de wijziging raakt wel nakalculatie en rentabiliteit, die op `allocation` rekenen. (b) Voor Bouwflow moet de robot de soort (Reistijd naar Werktijd) wijzigen. Audit R2-12 zegt dat de controle na het opslaan enkel begin en einde vergelijkt; een soortwijziging die stil niet doorkomt, wordt "klaar" gemeld en komt twaalf uur later opnieuw als verschil terug. Audit R1-10 meldt dat het omgekeerde (Reistijd als Werktijd geschreven) al bewezen is. Daarom: eerst de robotcontrole uitbreiden (voorstel van de audit staat klaar), of per registratie in Bouwflow nakijken.
- **Of een volle dag reis echt kan:** dat weet enkel Bram; Zarvis kan het niet afleiden. Hij kan wel het bewijs per rij klaarzetten (uren, werkbon, wat die medewerker die dag nog registreerde) en een groepsvoorstel maken met één regel per registratie waarvan Bram er rijen uit kan halen.
- **Open registraties afsluiten:** vandaag staan er 2 open, geen enkele ouder dan 24 u; de 8 vlagen `open_langer_dan_24u` zijn gevallen die de cron al op 23:59 afsloot. Zarvis weet het echte einduur niet. Een voorstel moet dus een tijd van Bram (of de medewerker) krijgen; als aanwijzing kan Zarvis het laatste ritje van `vehicle_trip` van die dag gebruiken (alleen het tijdstip, nooit de plaats). Dat laatste is niet gecontroleerd op bruikbaarheid.

### 3.2 Arbeiders aanspreken (niet ingestempeld, niet afgesloten)

- **Bestaande weg:** geen. Alleen de beheerders zien alarmen (alarmbalk, `werf/src/lib/alarmen.ts`); de medewerker ziet bij het openen van de app wat hem aangaat (bv. "Werkbon ontbreekt: tik om te herstellen"). Geen push (Capacitor-plug-in en FCM ontbreken), geen sms, geen WhatsApp, geen telefoonnummer.
- **Welke kanalen kunnen, per kanaal wat nodig is:**
  - *Melding in de app* (rij in een nieuwe tabel, getoond bij openen): geen extern kanaal, geen extra gegevens; werkt enkel als de arbeider de app opent, en dat doet hij net niet als hij vergeet in te stempelen. Voorwaarde dus: aanvullen met een tweede kanaal.
  - *E-mail*: bestaat voor 5 van 7; Zarvis' bestaande uitgaande mailweg is niet onderzocht voor deze toepassing.
  - *WhatsApp*: loopt via Baileys op Brams nummer (HANDOFF). Telefoonnummers van arbeiders staan niet in Werf; ze moeten toegevoegd worden en elk bericht komt van Brams eigen nummer. Dat risico (blokkering) aanvaardde Bram voor Zarvis algemeen, niet specifiek voor personeel.
  - *Sms via Twilio*: de account en twee sleutels bestaan al voor bellen (SPRINTPLAN). Kost per sms; nummers nodig.
  - *Push*: Firebase-project, `google-services.json`, plug-in, nieuwe APK-build en uitrol op 7 toestellen, en een tabel met toesteltokens. Veruit het zwaarst.
- **Taal:** één arbeider heeft taal `pl`; Werf heeft Poolse teksten (`werf/src/lib/translations.ts`). Een bericht hoort in zijn taal, met een vaste, door Bram goedgekeurde tekst per soort en per taal.
- **Privacy:** een melding "u stempelde niet in" is een bericht over werktijd van een persoon. Houd haar neutraal en een vraag ("Je registratie van gisteren is nog niet afgesloten; wil je ze afsluiten?"), noem nooit een fraudevlag en nooit locatie of afwijking. Telefoonnummers zijn een nieuwe persoonsgegeven en horen in een (aan te vullen) mededeling aan de medewerkers; dat is een beslissing van Bram, niet van Zarvis. Zarvis ziet nooit de naam met iets anders dan de feiten van de dag (geen locatie, geen afwijkingen). Fraudevlaggen blijven een aanwijzing en geen bewijs. Juridische beoordeling is niet gedaan.
- **Vaste herinnering zonder ja of elk bericht na ja?** De regel uit IDEE-29 en de bijsturing van 24/11 zeggen: wat buiten Compass iets verandert of iemand bereikt, gebeurt pas na Brams uitdrukkelijk ja. Voorstel: standaard is elk bericht na ja, gebundeld: Zarvis zegt "3 arbeiders hebben gisteren niets afgesloten: dit is het bericht, dit gaat naar wie, nu versturen?" en Bram zegt één keer ja voor de lijst. Een vaste herinnering zonder ja (met grenzen: één bericht per persoon per dag, enkel werkdagen overdag, enkel vaste tekst, een uitschakelaar, volledig logboek) is technisch klein, maar het is zijn beslissing en ze moet in de code staan, niet enkel in de instructie. Vraag 3 hieronder.

### 3.3 De maand klaarzetten voor het loon (wizard in zeven stappen)

| # | Stap | Is rekenwerk dat Zarvis kan voorbereiden | Vraagt een oordeel | Tekent Bram |
|---|---|---|---|---|
| 1 | Keuze medewerker en maand, open wijzigingsaanvragen | ja: welke medewerkers/maanden nog open zijn, aantal open aanvragen (nu 1) | de aanvragen beslissen | handtekening stap 1 |
| 2 | Afwezigheden | ja: dagen zonder registratie op een werkdag tellen, die naast een afwezigheid leggen | is een dag zonder registratie vergeten of verlof? | stap 2 |
| 3 | Track & trace (km) | ja: ontbreken ritten, of is km bewust overgeslagen | overslaan of inlezen | stap 3 |
| 4 | Loonfiche | enkel lezen: aanwezig ja/nee, controlewaarden | het verschil tegenover het loon beoordelen | stap 4 |
| 5 | Data (dagtabel, rekenregels) | ja: de tellingen; het echte berekenen niet (browser) | dagen met een aanname beslissen | stap 5 |
| 6 | Meegenomen materiaal | ja: aantal regels, regels zonder eenheidsprijs | prijs invullen | stap 6 |
| 7 | Afsluiten, vergrendelen | nee | ja | vergrendelen; ook het saldo |

- **Waar tekent Bram:** altijd zelf; `pay_wizard_tekenen/forceren/terugnemen` blijven beheerder-only en Zarvis krijgt er geen aparte weg naartoe. Een handtekening is een handeling van een mens (`maandoverzicht-wizard.md`, "Een stap is nooit af omdat de toestand er goed uitziet"). Zarvis mag dus nooit een stap afvinken en nooit vergrendelen.
- **De duurste aanname:** in `werf/src/lib/herkomst.ts:11` genoemd: een werkdag zonder registratie krijgt acht officiële uren, dus een delta van min acht uur, en dat ziet er uit als een gemeten dag. Er zijn nu 5 zulke dagen in 276 (2 zonder status, 3 `recup`), 3 in een vergrendelde maand. Twee andere aannames: de standaardpauze, en dagen die nog komen in een lopende maand.
- **Hoe Zarvis die vermijdt:** hij rekent nooit zelf een delta uit en vult nooit een dag in; hij telt "dagen zonder registratie" en zet ze apart als vraag aan Bram ("verlof, vergeten of ziek?"), met de bron (`has_erp`, afwezigheden, kalender). Hij zegt bij elk getal waar het vandaan komt (gemeten of aangenomen), in de woorden van `herkomst.ts`, en noemt een maand pas "klaar" als er geen enkele onbeslist aangenomen dag meer is. Bedragen en loon rekent hij niet en toont hij niet.
- **Wat niet kan zonder grote ombouw:** het echte voorbereiden (genereren van `pay_day`) loopt in de browser. Zarvis moet dat niet nabouwen: twee berekenwijzen voor loon is gevaarlijker dan geen. Eerste versie: enkel tellen en nakijken via het leesloket. Pas later, met een ja van Bram, een SQL-versie van de berekening of een knop in Werf die Zarvis kan openen (deep link).

### 3.4 Uren in Bouwflow krijgen (robot: `write_job`, `sync_gap`)

- **Stand (SELECT):** 2 `pending`, 12 `needs_human`, 7 `ignored`, 9 uren "niet ingepland" (wachten op de afstemming van 05:15 of 17:15 UTC), 1 onbevestigd. De robot en de afstemming zijn de laatste dagen geslaagd.
- **Wat het systeem zelf al doet:** `bouwflow-robot` (`werf/supabase/functions/bouwflow-robot/index.ts`) zet alle `failed` terug op `pending` via `retry_write_job` (bewust NIET `needs_human`: "herhalen lost niets op"). `robot_markeer_verlopen` zet na 15 pogingen op `needs_human`. De waakhond `sync_watchdog` (cron 15 min) opent alarmen in `sync_alert`.
- **Wat Zarvis kan doen als een uur niet aankomt:**
  - *Melden*: altijd, met de reden in woorden (uit `sync_gap.gap_state` en `write_job.last_error`, zonder namen), en met een voorstel.
  - *Opnieuw in de wachtrij*: `failed` en `ignored` terugzetten is weinig riskant, maar Werf doet het voor `failed` al zelf. Voor `needs_human` heeft herproberen enkel zin nadat de oorzaak weg is (werkbon bestaat niet, uitvoerder niet te kiezen); blind opnieuw aanbieden herstart 15 nutteloze pogingen. Dus: per opdracht een voorstel met oorzaak, en één ja van Bram. Er is geen bestaande functie die de serversleutel mag: `write_job_herstellen/negeren` eisen een gebruiker; er moet een `zarvis_`-omweg bij (zelfde regels, met voorstelrij).
  - *Nieuwe opdracht maken*: enkel via de beheerderfuncties (hierboven), nooit met een losse `insert` in `write_job`. De payload (`bouwPayload` in `werf/src/lib/prestatie-beheer.ts:276`, met `verwacht` uit `sync_baseline`) wordt vandaag in de browser gebouwd en moet voor het loket naar een SQL-functie verhuizen, anders zijn er twee bouwers.
  - *De robot laten draaien*: kan via een GitHub-workflow (`workflow_dispatch`) met een persoonlijke toegangssleutel; dat schrijft echt in Bouwflow (verwijderen is onomkeerbaar), dus altijd ja, en niet in de eerste stappen.
- **Risico bij herproberen:** audit R2-19 en `skipped_exists`: een uur dat Bram met de hand in Bouwflow zette (zonder referentie) wordt door de robot later nogmaals toegevoegd. Daarom geen automatische herstelronde van Zarvis tijdens een storing.

### 3.5 Het loket: eigen geheim of de weg van de mails en marketing

Er zijn twee modellen.

**A. Compass-login nakijken bij Compass** (`C:\Users\bramk\Desktop\Zolderpunt Website\supabase\functions\compass-marketing-loket\index.ts`, r. 60-70, 129-137): de functie vraagt aan Compass `GET /auth/v1/user` en `rpc/has_role('admin')` met het token dat Zarvis van de ingelogde gebruiker meekrijgt; het logboek krijgt `door: e-mail` en `compass_user`. Geen gedeeld geheim. De sleutel van Compass in die functie is de publieke anon-sleutel.

**B. Eigen geheim (`ZARVIS_WERF_TOKEN`)** zoals `robot_config`/`robot_token_ok`: een hash in een tabel, het token wordt als parameter meegestuurd.

| | A. Compass-login | B. Eigen geheim |
|---|---|---|
| Wie deed het | de beheerder, in het logboek | "het token": de persoon is weg |
| Lek | geen langlevend geheim; het token vervalt | wie het token heeft, kan schrijven, tot iemand het wisselt |
| Geplande controles zonder gebruiker (`zarvis-taken`) | niet mogelijk (geen token) | mogelijk |
| Anker en logboek in Werf | werkt als de functie met de serversleutel schrijft | als de RPC met `anon` wordt aangeroepen is `auth.role()='anon'` en wordt het anker geschreven |
| Past bij "uitgerold in vier stappen" | ja, één functie, geen secret in Lovable | vraagt een secret in Werf én in Zarvis |

**Aanbeveling: A voor alles wat Werf wijzigt en voor gewone leesvragen; B alleen later en alleen leesrecht (totalen) als een geplande controle ook buiten Brams sessie moet kijken.** Waarom: dezelfde logica als de marketing-loket, die al live bewezen is, en een wijziging krijgt zo de naam van wie ja zei (nodig omdat `audit_trigger` geen gebruiker kent). Twee praktische voorwaarden: `config.toml` heeft maar één regel `verify_jwt = false` (voor `pin-login`); het nieuwe loket heeft dezelfde regel nodig, want een Compass-token is geen geldig Werf-JWT. En uitrollen van een edge function in Werf gaat niet met een push (`DEV-WORKFLOW.md`: functies worden niet meegedeployd); dat loopt via de Lovable-agent met nacontrole op een versiestempel.

### 3.6 De sleutel tussen een werf en een dossier

Bevestigd met SELECT op beide databanken, zonder te schrijven:
- Werf: 159 `project`, 159 met `bouwflow_project_id`, 159 verschillend, geheel getal (bereik 1 tot 226); 15 projecten met uren.
- Compass: 142 `leads`, alle met `bouwflow_project_pk_id` en `bouwflow_project_number`, alle verschillend (bereik 4 tot 226), alle nummers beginnen met ZL.
- **Alle 142 `bouwflow_project_pk_id` van Compass komen voor als `project.bouwflow_project_id` in Werf (142 van 142), geen enkele ontbreekt.** Van de 15 werven met uren hebben er 14 een dossier in Compass; de ene zonder is het project met Bouwflow-id 1, dat volgens zijn naam een intern project is. De 17 werven zonder dossier zijn dus werven die Compass niet kent (zonder uren, op id 1 na).
- **Let op:** Compass heeft ook een kolom `bouwflow_project_id` (tekst) die NIET gelijk is aan `bouwflow_project_pk_id` (0 van 142 gelijk). De sleutel is `leads.bouwflow_project_pk_id`, niet de kolom met dezelfde naam als in Werf. Het ZL-nummer staat niet in Werf; een vertaling van werf naar dossiernummer loopt dus altijd via dit getal. Zarvis moet dat in de tool vastleggen (naam van de kolom in de code en een test).
- Niet nagegaan: of ze ook inhoudelijk hetzelfde project zijn (adres en klant vergelijken). De getalsgelijkheid is bewezen; de betekenis volgt uit de code van de synchronisatie, niet uit een vergelijking van namen (die zijn niet vergeleken om geen adressen te verwerken).

## 4. Voorstel in bouwstappen (klein naar groot)

**Stap 1. Leesloket in Werf, totalen en tellingen (model A).**
- Zarvis kan dan: per dossier of week de uren zeggen (werkminuten, reisminuten, aantal registraties, laatste werkdag, hoeveel nog niet in Bouwflow), de lijst van aandachtspunten tellen (open registraties, 23 reisgevallen, robotstand, vlaggen als aantal), de sleutel werf naar dossier toepassen.
- Geraakt: nieuwe functie `zarvis-werf-loket` + `config.toml` in `werf/`; in Zarvis een bestand `supabase/functions/_shared/zarvis/werf.ts` en de connector in de beheersectie; geen tabel in Werf.
- Ja van Bram: geen (alleen lezen); wel eenmalig de uitrol in Werf.
- Van Bram nodig: de beslissing over vraag 1 en 2; de uitrol loopt via Lovable.
- Omvang: 10 uur.
- Bewijs: tegen een nagebootst loket (tests zoals bij marketing); echt loket weigert een vals token (403) en geeft totalen met een beheerder-login; getallen vergeleken met de SELECT's in dit document (2 open, 23/9518, 14 van 15).

**Stap 2. Voorstellen met logboek en terugdraaien (gedeeld fundament).**
- Zarvis kan dan: een wijziging voorstellen, vastleggen en na ja toepassen of terugdraaien.
- Geraakt: migratie in Werf (`zarvis_voorstel`, functies `zarvis_*` met `EXECUTE` enkel voor `service_role`, de payload-bouwer in SQL), actie `voorstel`/`toepassen`/`terugdraaien` in het loket; in Zarvis een poort die `bevestigd: true` enkel doorgeeft als Bram letterlijk ja zei (zelfde patroon als `sluit_zoektermen_uit`).
- Ja van Bram: bij elk toepassen.
- Van Bram nodig: niets extra.
- Omvang: 14 uur.
- Bewijs: in een teruggedraaide transactie op de live databank (zoals Werf zelf bewijst) voorstel, toepassen, teruggedraaid; anker onaangetast (geen `start_anchor_ts` veranderd), `audit_log` bevat een `zarvis:`-rij; een proef met een niet-bestaande werkbon nooit met een echte registratie.

**Stap 3. Robotstand en `failed`/`ignored` terugzetten, `needs_human` met ja.**
- Zarvis kan dan: zeggen welk uur niet aankomt en waarom (in woorden, zonder namen), `failed`/`ignored` terugzetten, `needs_human` opnieuw aanbieden na ja.
- Geraakt: loket-acties, `zarvis_`-omweg voor `write_job_herstellen/negeren`.
- Ja van Bram: voor `needs_human` en voor elke verwijdering; `failed` terugzetten mag zonder ja (Werf doet dat al zelf).
- Van Bram nodig: beslissing of Zarvis `failed` zelf mag terugzetten.
- Omvang: 8 uur.
- Bewijs: tegen de 2 `pending` en 12 `needs_human` bekijken zonder iets te wijzigen; een proef in een teruggedraaide transactie.

**Stap 4. Registraties rechtzetten: open afsluiten en de 23 reisgevallen.**
- Zarvis kan dan: een groepsvoorstel met één regel per registratie tonen; na ja zet hij het type op werk, of sluit een open registratie af op een tijd die Bram geeft, en kan het teruggedraaid worden.
- Geraakt: `zarvis_voorstel`, nieuwe functies, en in `robot/` de verbetering uit audit R2-12 (de soort na het opslaan controleren) (6 uur, apart).
- Ja van Bram: per groep; elke rij kan eruit gehaald worden. Een verwijdering krijgt geen eigen weg.
- Van Bram nodig: per registratie het oordeel (waar is reis echt reis), en de robotwijziging in `robot/` goedkeuren.
- Omvang: 14 uur in Werf en Zarvis, 6 uur in de robot.
- Bewijs: op één registratie eerst; daarna Bouwflow met de hand nakijken dat het type klopt en dat het volgende verslag van de afstemming niet opnieuw een verschil meldt (de lus uit R2-12).

**Stap 5. De maand voorbereiden (tellen, nakijken, nooit tekenen).**
- Zarvis kan dan: per medewerker en maand zeggen waar de wizard staat, welke dagen een aanname dragen, wat open staat, en die dagen als vragen aan Bram voorleggen.
- Geraakt: leesacties in het loket (op `pay_period`, `pay_day`, `pay_wizard_step`, `absence`, `change_request`, `public.sync_gap`), niets schrijvend; eventueel een deep link naar de wizard.
- Ja van Bram: niets (lezen); het tekenen blijft zijn handeling in Werf.
- Van Bram nodig: vraag 4 (welke definitie van waarheid), en de beslissing over de 3 dagen zonder registratie die al in een vergrendelde maand zitten.
- Omvang: 10 uur.
- Bewijs: de getallen (5 dagen met aanname, 1 open aanvraag, 46 handtekeningen) komen overeen met wat de wizard toont voor dezelfde maand; geen enkel getal verschilt.

**Stap 6. Arbeiders aanspreken, per bericht met ja.**
- Zarvis kan dan: een bericht in de taal van de arbeider voorstellen, voorlezen, na ja versturen en het resultaat noteren.
- Geraakt: `employee` (telefoon, voorkeur kanaal), nieuw `zarvis_bericht` in Werf, de melding in de Werf-app, en het gekozen kanaal (sms via Twilio het goedkoopst; WhatsApp via Brams nummer; mail waar bekend). Push zit niet in dit plan.
- Ja van Bram: per lijst van berichten, vooraf met de tekst.
- Van Bram nodig: kanaal, nummers (en dat de medewerkers het weten), goedgekeurde teksten NL en PL, vraag 3.
- Omvang: 16 uur (melding in app, tabel, tool, sms); 8 uur extra voor push als hij die toch wil.
- Bewijs: een bericht aan Bram zelf als proef; een arbeider ziet de melding in de app; het logboek toont wat verstuurd is.

Totaal stap 1 tot 6: 72 uur in Werf en Zarvis plus 6 uur in de robot, samen 78 uur (zonder push, +8 uur, en zonder het echte rekenen van de maand op de server).

## 5. Afhankelijkheden van andere ideeën

- **IDEE-29** (doen met een ja): de poort in de code, met `bevestigd` zoals bij marketing; Stap 2 bouwt dit.
- **IDEE-15** (rollen overzichtelijk tonen): voorstellen van Werf horen in hetzelfde overzicht van wat op een ja wacht.
- **IDEE-13 (financiën)**: de uren en de loonkost per project (`rentabiliteit.ts`) leveren de uren die de marge van een offerte bewaken; de 23 reisgevallen vertekenen die. Eerst Stap 4, dan pas conclusies.
- **IDEE-16** (herinneringen en taken): de geplande controle die dagelijks kijkt wie niet afsloot, is een geplande taak; die heeft geen token van de gebruiker. Ze kan lezen via model B (later), maar nooit zonder ja versturen.
- **IDEE-11/10 (marketing, mails)**: hetzelfde patroon van loket; hergebruik de poort en de proefregels.
- **Werf zelf:** de open defecten van de robot (R2-12, R1-10, R2-19) en IDEE-51 (functies aanroepbaar zonder geheim; `bouwflow-robot` heeft geen eigen toegangscontrole) liggen op het pad van Stap 3 en 4.

## 6. Risico's

- **Twee rekenwijzen voor dezelfde registratie** als Zarvis eigen SQL schrijft naast de beheerderfuncties. Beperk dat: één bron (nieuwe functies delen de berekening, `floor` en `check_allocation_minutes` blijven de grens) en een test die ze naast elkaar zet.
- **Het anker vervuilen** als een wijziging met de gewone sleutel loopt (anker = nu, mogelijk een vals vlagje). Daarom de serversleutel in het loket.
- **De logboekrij ontbreekt** (`audit_trigger` kent geen gebruiker): zonder eigen `audit_log`- of voorstelrij weet niemand wie de wijziging deed.
- **Bouwflow dubbel of fout**: een soortwijziging die de robot stil niet doorvoert (R2-12), dubbele uren na een storing (R2-19). Eerst herstellen of nakijken.
- **Een bericht aan een arbeider dat te veel zegt**: een fraudevlag of locatie in een melding. Het loket geeft die niet door.
- **Een model dat zelf kiest**: "reis of werk" en "verlof of vergeten" zijn oordelen; het model stelt voor, het weet niet.
- **Uitrollen**: een edge function in Werf rolt niet vanzelf uit; zonder versiestempel denk je dat het draait terwijl het niet draait (`DEV-WORKFLOW.md`).
- **Pincodes staan leesbaar in `app_user.pin`** (bevinding over Werf zelf). Het loket leest die tabel nooit; maar een lek van de serversleutel zou ze tonen. Los daarvan zou dit eerst opgelost worden.
- **Slot niet getest**: of een token van Compass in Werf echt geweigerd wordt, is afgeleid, niet geprobeerd.

## 7. Zeker tegenover niet kunnen nagaan

**Zeker (gemeten of gelezen):** de aantallen hierboven (SELECT, 24/11); dat de vier beheerderfuncties een ingelogde beheerder eisen; de logica van de 21 dagen, het anker, de overlapvlag; dat `fraud_set_anchor` enkel `service_role` of beheerder overslaat; dat er geen kanaal voor meldingen is (geen plug-in, geen tabel, geen telefoonkolom); de sleutel werf naar dossier (142 van 142, 14 van 15 met uren); dat het type werk/reis in `verloning.ts` niet in een berekening staat (alleen een typedefinitie, één treffer); dat de uren-robot en de afstemming recent slaagden.

**Niet kunnen nagaan:**
- Of het loon werkelijk ongevoelig is voor het type werk/reis over de hele keten (loonfiche, rentabiliteit, afdrukken); enkel de zoekopdracht in `verloning.ts` is gedaan.
- Of een Compass-token in Werf echt geweigerd wordt (afgeleid uit de code).
- Of een `zarvis_`-functie met de serversleutel via Lovable Cloud wel `auth.role() = 'service_role'` geeft; dat moet bij Stap 2 bewezen worden met een teruggedraaide transactie.
- Of `bouwflow-robot`/`bouwflow-reconcile` zonder geheim aanroepbaar zijn (IDEE-51 zegt het van `bouwflow-sync`; de rest niet geprobeerd).
- Of het arbeidsreglement de verwerking van telefoonnummers en berichten dekt (juridisch niet beoordeeld).
- Of een persoonlijk toegangsmiddel voor GitHub gebruikt kan worden om de robot te starten; niet geprobeerd.
- Of de inhoud van de 12 `needs_human` een gemeenschappelijke oorzaak heeft; de foutteksten bevatten namen en zijn bewust niet gelezen.
- Of de 17 werven zonder dossier in Compass echte werven zijn of oude of interne projecten; enkel het aantal is bekeken.
- Of `vehicle_trip` een bruikbare aanwijzing geeft voor het echte einduur van een open registratie.

## 8. Vijf vragen voor Bram

1. Wat eerst: de uren per dossier alleen lezen (Stap 1, 10 uur), of meteen de voorstellenlaag (Stap 2) zodat de 23 reisgevallen en de robotopdrachten kunnen opgelost worden?
2. Mag er in Werf een loket komen dat aanvaardt wat Compass aanvaardt (jouw login), met `verify_jwt = false` en een uitrol via de Lovable-agent?
3. Mag een vaste herinnering aan arbeiders ooit zonder jouw ja vertrekken (met grenzen: één per dag, vaste tekst NL en PL, uitschakelaar), of komt elk bericht pas na jouw ja, één ja voor een lijst?
4. Welke registratie geldt als waarheid voor de uren: `allocation` (werf) of `pay_day` (loon), en mag eerst de 23 reisregistraties nagekeken worden, ook in vergrendelde maanden, op voorwaarde dat de robot eerst het type controleert?
5. Welk kanaal naar de arbeiders: melding in de app plus sms (Twilio, kost per bericht, nummers nodig), WhatsApp van jouw nummer, of mail waar bekend; en weten de arbeiders het?

# IDEE-11 Marketing, het DOEN (onderzoek, 2026-11-24)

Alleen gelezen. Bronnen: repo van de website (`C:\Users\bramk\Desktop\Zolderpunt Website`, hierna "website"), repo Zarvis (Compass), live databank van de website (Lovable `query_database`, alleen SELECT). Niets gewijzigd, niets uitgerold.

## 1. Samenvatting

1. Pagina's verbeteren kan veilig als branch + pull request in `look-learn-launch`; de inhoud staat hard in `.tsx`-bestanden, dus elke tekstwijziging is een codewijziging. Zarvis mag voorstellen en een branch/PR openen; mergen en publiceren (`deploy_project`) blijft een ja van Bram, afgedwongen in de code van het loket.
2. Aanvragen opvolgen is vooral Compass-werk (dossier, taak, WhatsApp), niet website-werk: dat kan Zarvis grotendeels al (`plan_taak`, `stuur_whatsapp`). Nieuw nodig: een brug van dossier naar de uitkomst in de website, en de uitkomst voorstellen vanuit Compass (offerte, getekend) in plaats van dat Bram klikt.
3. Biedingen, zoekwoorden, regio en toestellen bijsturen: `ads_actie` kent al 12 soorten met terugdraaien en automatische stopregels voor proeven. Het loket kan ze hergebruiken, maar de SQL-functies `ads_bespaarplan()` en `ads_stuurcabine()` weigeren elke aanroep zonder gebruikerslogin met `aal2`; het loket heeft die niet. Eerst nodig: een intern wrapperpaar in de website-databank.
4. Bewaking kan zonder het synchronisatiegeheim: een openbare, alleen-lezen functie `site-status` (geen geheim, enkel tijdstippen en ok/fout) die `zarvis-taken` elke 15 minuten bevraagt. Vandaag bestaat geen enkele bewaking; de nachtelijke cron (`0 4 * * *`) is de enige geplande job.
5. Kleine aantallen: 34 contacten in 90 dagen, 5 getekend, 7 offerte. Alles wat uit Ads-cijfers afgeleid wordt, moet in code drempels, wachttijden en een maximum aan acties per week krijgen; de bestaande drempels van de stuurcabine zijn een goed vertrekpunt.

Totaal bouwwerk: ongeveer 62 uur (zie sectie 4).

## 2. Wat er vandaag is

**Loket** `supabase/functions/compass-marketing-loket/index.ts` (website, 297 regels): beheerder-van-Compass-controle via het eigen token (r. 47-61), acties `overzicht`, `zoektermen`, `sluit_uit`, `laat_weer_toe`, `budget`. Grenzen in code: uitsluiten alleen bij 5 klikken, 20 euro, 0 conversies in 90 dagen, max 20 per keer (r. 38-45); beschermde termen (relevant, kernzoekwoord, eigen zoekwoord, r. 105-120); budget max 45, verhogen pas als er niets meer uit te sluiten valt en minstens 10% verloren door budget (r. 253-266); alles zonder `bevestigd: true` is alleen een voorstel; elke aanroep komt in `dashboard_audit_log` als `zarvis:...`. Schrijven naar Google Ads gebeurt nooit door het loket: het zet een rij in `zoekterm_oordeel` of `ads_actie` en de nachtelijke sync (04:00 UTC) voert uit.

**Zarvis-kant** `supabase/functions/_shared/zarvis/marketing.ts`: vijf gereedschappen die het loket aanroepen met het token van de gebruiker; niet beschikbaar in geplande controles (`marketing.ts` r. 74).

**Live gemeten** (query_database, 2026-11-24): laatste run van alle 12 syncstappen (google_ads, detail, klik, regio, markt, upload, uitsluiting, bespaar, staat, gsc, meta_ads) om 04:00 UTC, status ok, de hele sync duurt ongeveer 11 seconden. `ads_actie`: 2 rijen (1 `doel_secundair`, 1 `uitsluiten`). `dashboard_audit_log`: 21 rijen `zarvis:*`. `aanvraag_uitkomst`: 67 rijen (47 geen_match, 7 in_proces, 7 offerte, 5 getekend, 1 geen_lead). Contacten laatste 90 dagen: 34. Cron: één job, `marketing-sync-nachtelijk`.

**Geen toegangsbeperking op GitHub:** `gh api .../branches/main/protection` geeft 403 (repo is privaat zonder GitHub Pro). Branchbescherming en verplichte review zijn dus niet af te dwingen op GitHub; elke poort moet in onze eigen code zitten.

## 3. Bevindingen per vraag

### 3.1 Pagina's verbeteren en publiceren

**Hoe de inhoud is opgebouwd.**
- Alle paginatekst staat in React-componenten, geen CMS: `src/pages/diensten/*.tsx` (14 bestanden plus drie submappen), `Index.tsx`, `Werkwijze.tsx`, `Realisaties.tsx`, `FAQ.tsx`. Realisaties en reviews staan in `src/data/realisaties.ts` en `reviews.ts`. `Zolderrenovatie.tsx` is 856 regels.
- Prerender (`scripts/prerender-plugin.ts`): bij `vite build` rendert een SSR-bundel elke URL uit `public/sitemap.xml` naar `dist/<pad>.html` (r. 17-60), zodat crawlers zonder JavaScript echte tekst zien. Een pagina die in soft launch een `<Navigate/>` rendert (lege HTML, minder dan 1000 tekens) wordt overgeslagen (r. 47). Faalt de prerender dan blijft de gewone SPA staan: de build breekt niet, maar dan verliest de pagina haar vooraf gerenderde tekst zonder dat iemand het ziet. Dit moet Zarvis na elke wijziging controleren.
- `SOFT_LAUNCH_MODE = true` (`src/config/launchConfig.ts` r. 7) verbergt routes, navigatie en footerlinks. Wie een pagina verbetert die in `hiddenRoutes` staat, verbetert iets wat bezoekers niet zien. Zarvis moet dus eerst `activeRoutes` lezen.
- Het wijzigen van `SOFT_LAUNCH_MODE`, `activeRoutes` of de sitemap is een andere categorie dan een tekstwijziging (het toont of verbergt hele pagina's): altijd een ja, en buiten het bereik van tekstvoorstellen.

**Welke gegevens tonen een zwakke pagina.**
- `paginas_overtuigen(p_van, p_tot)` (`20261110100000_ads_keuzes_bram.sql` r. 353+): per pagina bezoekers, aanvragen erna, kans, bezoekers via Ads; alleen pagina's met minstens 30 bezoekers. Vereist `aal2` en een rol, dus niet bruikbaar vanuit het loket zoals het nu is (zie 3.3). Zelfde logica als SELECT is wel aan te roepen in een nieuwe interne functie.
- `ads_kwaliteit(p_van, p_tot)` (`20261110140000_ads_kwaliteit.sql`): per zoekwoord kwaliteitsscore, `pagina_ervaring` (qs_landingspagina), landingspagina waar de klikken echt landen, en een schatting "zelfde klikken goedkoper" bij score 1 tot 6. Dit is het sterkste signaal voor "deze pagina is zwak voor dit zoekwoord".
- Search Console: tabel `gsc_daily` (dag, query, page, klikken, vertoningen, positie), 22.258 rijen volgens `docs/VERKENNING-MARKETING.md`; loopt 2 tot 3 dagen achter.
- Uit `docs/TOP10-INZICHTEN-LLM-FEEDBACK.md` punt 7: /werkwijze 7,8% en /realisaties 6,6% kans op aanvraag tegenover 1,8% voor /diensten/zolderrenovatie. Dat is correlatie ("wie al overtuigd is kijkt verder"), geen bewijs van oorzaak. Punt 10 stelt een prijsblok voor op /diensten/zolderrenovatie (keyword "zolder renovatie prijs", kwaliteitsscore 5), met als voorbeeld `src/pages/diensten/dakraam-plaatsen/Prijs.tsx`.
- Wat ik niet kon nagaan: de huidige kwaliteitsscore per zoekwoord (de RPC eist een login); wel zichtbaar via `ads_keyword_daily` met SELECT, maar dat heb ik niet uitgevoerd omdat de opdracht om een compact document vraagt.

**De veilige weg voor een tekstwijziging.**
1. Zarvis (of de nachtbouwer) bepaalt een zwakke pagina uit bovenstaande gegevens en schrijft een voorstel: bestand, oude tekst, nieuwe tekst, de reden met cijfers en datum.
2. Een branch `zarvis/pagina-<naam>-<datum>` en een pull request in `bramkeire-droid/look-learn-launch`, met alleen tekstwijzigingen in een lijst toegelaten bestanden (`src/pages/**`, `src/data/**`). Geen wijziging aan `launchConfig.ts`, `supabase/`, `package.json`, `scripts/`.
3. Controle zonder mens, in code: `npm run build` groen, prerender schrijft de pagina nog (logregel `[prerender] n/m pagina's`), een diff-limiet (bijvoorbeeld 60 gewijzigde regels), geen nieuwe externe links of scripts, geen prijzen of beloftes die niet al in de oude tekst stonden, woordenlijst met verboden beloftes (bijvoorbeeld premies: de feedbackdoc, tabel "Verworpen", zegt dat de VerbouwPremie voor binnenrenovatie sinds 1 juli 2025 weg is).
4. Bram krijgt de PR voorgelezen (wat verandert, waarom, voorbeeld van de pagina). Pas na ja: merge. Daarna `deploy_project` en verifiëren dat `get_project.latest_commit_sha` de merge-commit is (les uit het logboek van 24 november) en dat de nieuwe tekst in de live pagina staat.
5. Nameting na 30 dagen: dezelfde kansmaat van `paginas_overtuigen` en de kwaliteitsscore van het zoekwoord, teruggemeld aan Bram.

**Wat Zarvis zelf mag:** lezen, voorstellen, een branch en PR openen, de build laten lopen in een voorbeeld. **Wat een ja vraagt:** mergen in `main`, `deploy_project`, elke wijziging aan `SOFT_LAUNCH_MODE` of routes. Dit is de categorie "tekst op de live site wijzigen en publiceren" uit `docs/VERKENNING-MARKETING.md`.

**Tegenstrijdigheid om te beslissen:** `CLAUDE.md` in de website zegt "niet vragen of je mag pushen of publiceren" voor de bouwer in Claude Code. Dat is geen regel voor Zarvis: IDEE-29 zegt dat wat buiten Compass iets verandert pas na Brams ja gebeurt. Zarvis moet dus een eigen, strengere regel krijgen en die staat in code, niet in `CLAUDE.md`.

**Techniek om te pushen.** Zarvis draait in een edge function van Compass. Een branch maken vraagt een GitHub-token. Voorstel: een fine-grained token beperkt tot één repo (`contents: write`, `pull_requests: write`, geen `administration`), opgeslagen als Compass-secret en alleen gebruikt door een nieuwe functie `zarvis-pagina` (niet door het taalmodel zelf). Omdat GitHub geen branchbescherming biedt, kan het token in theorie naar `main` pushen: de functie moet in code weigeren iets anders te doen dan een branch maken en een PR openen, en het mergen doet een aparte stap die alleen na ja draait. Alternatief zonder GitHub-token in Compass: Zarvis stuurt de wijziging als bericht naar de Lovable-agent (`send_message`); dat kost credits en geeft minder controle over de diff. Ik raad het token aan.

**Merge zonder GitHub-token:** `mcp__...lovable__deploy_project` bestaat in Brams Lovable-koppeling, maar Zarvis (edge function) heeft geen Lovable-MCP. Publiceren kan dus alleen langs een van twee wegen: de nachtbouwer/Claude Code met Brams koppeling na ja, of de Lovable-API als daar een token voor bestaat. Dat heb ik niet kunnen nagaan.

### 3.2 Aanvragen opvolgen

**Wat er vandaag gebeurt met een nieuwe aanvraag.**
1. Formulier op de site → `submit-contact` (`supabase/functions/submit-contact/index.ts`): honeypot, rate limit (3 per uur per ip, in geheugen), validatie, insert in `contacts` (service role), tracking uit `conversions` en `sessions` erbij, dan een POST naar de Make-webhook (`MAKE_WEBHOOK_URL`, met een vaste reserve-URL in de code).
2. Make/Zapier roept `create-website-lead` in Compass aan (`supabase/functions/create-website-lead/index.ts`): secret-check, ontdubbeling op e-mail of laatste 9 cijfers telefoon binnen 10 minuten, insert in `leads` met status `nieuw`, en push naar Bouwflow met het projectnummer op het dossier. Een kwartiertaak `push-nieuwe-dossiers` vangt mislukte pushes op.
3. De website roept Bouwflow bewust niet meer zelf aan (comment in `submit-contact`, na het dubbele dossier ZL-0138/ZL-0139). `push-lead-to-bouwflow` is alleen voor handmatig aangemaakte leads, met `PUSH_LEAD_SECRET`.
4. Compass kent de aanvraag als `leads`-rij; de website kent haar als `contacts`-rij. Er is geen sleutel ertussen: de koppeling kan alleen via e-mail of telefoon. De uitkomst (`aanvraag_uitkomst`, sleutel `contact_id`) leeft in de website; Compass weet van offertes en tekening meer (fasen in Bouwflow, `calculaties`), maar de twee spreken niet.
5. `aanvraag_uitkomst_zetten` vereist een beheerder met `aal2` in de website. `geen_lead` heeft een bijwerking: `is_testcontact` sluit daarmee alle contacten met hetzelfde e-mailadres uit van elke statistiek (`20261110180000...sql`). Een verkeerde `geen_lead` van Zarvis verandert dus alle rapporten en de upload naar Google.

**Wat Zarvis kan doen, per soort.**
- **Dossier aanvullen** (intern, Compass): ontwerp bestaat (`leg_notitie_vast`, `werk_wat_we_weten_bij`, `plaats_chatbericht`, sprintplan Z3), niet gebouwd. Policies laten het toe (logboek 24 november). Dit hoort bij een andere rol (dossiers) en is een voorwaarde, geen marketingwerk.
- **Uitkomst invullen:** twee kanten. (a) In Compass is de echte waarheid: Bouwflow-fase (offerte 27, 3, 4, 25; beslissing 6, 7; voltooid 18; geannuleerd 19, zie `src/lib/pipeline.ts`) en calculatie. Zarvis kan per website-contact de uitkomst voorstellen door te koppelen via e-mail of telefoon aan het Compass-dossier. (b) Schrijven in `aanvraag_uitkomst` moet via het loket (nieuwe actie `uitkomst`), nooit `geen_lead` zonder ja, en bedrag alleen als Compass een calculatie of een vastgelegd bedrag heeft.
- **Opvolgtaak plannen:** bestaat al: `plan_taak` met soort `herinnering` en verwittig `melding`/`whatsapp`/`bel` (`doen.ts` r. 57-77), uitgevoerd door `zarvis-taken`. Een nieuwe aanvraag mist alleen de trigger: "een aanvraag zonder bericht aan de klant na 4 uur". Dat kan een geplande controle zijn die `pijplijn_overzicht` leest (geen token nodig, de uitvoerder gebruikt de serversleutel van Compass en beperkt zich tot leesgereedschap).
- **Antwoord aan de klant voorbereiden:** het gereedschap `stuur_whatsapp` bestaat en vraagt voor een klant `bevestigd: true` in code (`doen.ts` r. 60-62 en 88). Een mailantwoord bestaat niet voor Zarvis (alleen lezen via `mail.ts`). Een WhatsApp is dus nu al mogelijk, een mailconcept niet.

**Privacy en grenzen.** Het marketingloket geeft bewust nooit persoonsgegevens terug (`docs/VERKENNING-MARKETING.md`). Het opvolgen van aanvragen vraagt dossiergegevens: dat hoort in Compass, niet in het marketingloket. Het loket mag hoogstens een `contact_id` en een uitkomst kennen.

### 3.3 Biedingen, zoekwoorden, regio en toestellen bijsturen

**De bestaande weg** `ads_actie` (migratie `20261106200000_ads_bespaar.sql`, uitgebreid in `20261110100000` en `20261110120000`), uitgevoerd door `adsBespaar()` in `supabase/functions/sync-marketing/index.ts` r. 424-560, in de nachtelijke run en via een knop. Elke rij: `sleutel` (uniek zolang actief), `soort`, `titel`, `payload`, `goedgekeurd_op`, `uitgevoerd_op`, `resultaat` (met de oude waarde om terug te draaien), `fout`, `terugdraaien_gevraagd_op`, `teruggedraaid_op`, `proef_einde`, `proef_oordeel`. De functie `ads_proeven_evalueren()` draait voor de uitvoering en zet een proef zelf terug (zie 3.5).

| Soort | Payload | Wat het in Google Ads doet | Terugdraaien |
|---|---|---|---|
| `doel_secundair` / `doel_primair` | `resources` (lijst conversieacties) | `primary_for_goal` aan of uit | omgekeerd |
| `telling_een` | `resources` | telling ONE_PER_CLICK | terug naar MANY_PER_CLICK |
| `zoekwoord_pauzeren` | `ad_group_id`, `criterion_id`, `tekst` | status PAUSED | status ENABLED |
| `breed_naar_woordgroep` | `ad_group_id`, `criterion_id`, `tekst` | woordgroep aanmaken, breed zoekwoord pauzeren | woordgroep verwijderen, breed weer aan |
| `toestel_uit` | `toestel` (MOBILE of TABLET), `campagnes` | bodmodifier 0 | oude modifier uit `resultaat.vorige` |
| `doel_cpa` | `campagnes`, `doel` | `target_cpa_micros` | 0 |
| `uitsluiten` | `termen` (max 200) | negatief zoekwoord via `zoekterm_oordeel` | `relevant` |
| `proef_cpc` | `campagnes`, `plafond`, `duur`, `minimum` | portefeuillestrategie met `cpc_bid_ceiling` | strategie verwijderen, oud doel terug |
| `proef_budget` | `campagnes`, `bedrag`, `duur`, `minimum` | `amount_micros` op het budget | oud bedrag uit `resultaat.vorige` |
| `proef_merk` | `termen`, `duur` | merktermen uitsluiten, 28 dagen | termen terug op `relevant` |
| `regio_uitsluiten` | `plaatsen` (geoTargetConstants), `campagnes` | negatieve locatiecriteria | criteria verwijderen |

Dat zijn 12 soorten, de lijst staat in de `check`-constraint van `20261110120000_ads_regio.sql`. Het loket gebruikt nu twee ervan (`uitsluiten`, `proef_budget`, die laatste met `bedrag` en `campagnes`).

**Wat uit `ads_bespaarplan()` en `ads_stuurcabine()` hergebruikbaar is.**
- Beide functies berekenen de voorstellen (sleutel, soort, titel, uitleg, payload, `standaard`, `proef`, `wacht`). Dat is precies wat een loketactie `stappen` nodig heeft: de logica (90 dagen, drempels, beschermde stappen) niet nabouwen.
- **Blokkade:** beide eisen `auth.uid() is not null`, `aal = aal2` en rol admin of marketing_reader (`ads_bespaar.sql` r. 47; bevestigd in de andere migraties). Het loket werkt met de service role en heeft dus geen `auth.uid()`; een aanroep geeft `geen toegang`. Oplossing: de functierompen verhuizen naar een interne functie `ads_bespaarplan_intern()` zonder toegangscontrole, alleen uitvoerbaar door `service_role`, en de huidige `ads_bespaarplan()` laat die aanroepen na de controle. Dat raakt een bestaande functie van de website (twee migraties herschrijven de functietekst met `replace`; zie `20261110190000_proef_cpc_voorwaarde.sql`, fragiel). Veiliger: een nieuwe migratie die de intern-versie als kopie maakt via `pg_get_functiondef` en de toegangscontrole verwijdert, zonder de bestaande functie aan te raken.
- Goedkeuren van stappen loopt in de UI via `ads_acties_goedkeuren` (`Bespaarcabine.tsx` r. 176) en terugdraaien via `ads_actie_terugdraaien` (r. 201). Beide eisen weer een gebruiker. Het loket schrijft nu rechtstreeks een rij in `ads_actie` (budgetactie): hetzelfde patroon past voor de andere soorten, met `sleutel` `zarvis_<soort>:<id>`.
- Het schema van `ads_acties_goedkeuren` kon ik niet volledig lezen (de definitie staat in een migratie die ik niet doorlopen heb); dat is een open punt voor de bouwer.

**Welke soorten verdienen een loketactie, en met welke grens (voorstel, alle met ja en `bevestigd: true`):**
1. `zoekwoord_pauzeren`: alleen volgens de strengere regel uit de feedback (punt 1): minstens 450 euro kost, minstens 35 klikken, nul aanvragen, ook niet als eerste klik van een latere aanvraag. De huidige `ads_bespaarplan()` pauzeert nog bij `>= doel` (150 euro), wat volgens ChatGPT en Gemini te vroeg is en wat de bouwer van de website nog niet heeft omgezet (de v2-migratie bestaat niet in `supabase/migrations`). Het loket moet de strengere drempel zelf afdwingen, niet de bestaande SQL.
2. `regio_uitsluiten`: alleen gemeenten buiten West- en Oost-Vlaanderen met minstens 25 euro kost en nul Ads-aanvragen (de bestaande regel). De feedback waarschuwt voor gsm-masten en tweede verblijven: alleen als er geen aanvraag van buiten de regio kwam. Dit is zelf al ingebouwd (`not exists` op `contact_ads_klik`).
3. `toestel_uit` en `doel_cpa`: niet als loketactie. De feedback markeert ze als diagnose; mobiel uit riskeert de telefoonklikken (11 in 90 dagen, allemaal mobiel). Alleen Bram zelf, in het dashboard.
4. `proef_cpc` (plafond 15 euro): kan, met stopregel die al bestaat (zie 3.5), pas na de stap `telling_een`. Ja van Bram, altijd.
5. `breed_naar_woordgroep`: kan, de stap is al ontworpen met `ruis ≥ 15%` van de zichtbare kost.
6. `proef_budget` is al gebouwd. Het loket stuurt nu een vast `bedrag` zonder `duur`/`minimum` in de payload; `adsBespaar` valt dan terug op 30 dagen en `ads_proeven_evalueren` op minimum 2 (`payload->>'minimum'` is nul). Zarvis' budgetactie krijgt dus de standaard proefregel, maar een verhoging boven het huidige budget loopt dan ook onder die regel van "stop als geen aanvraag". Dat is gewenst, maar niet bewust gebouwd; de bouwer moet het expliciet maken.

**Een bevinding die bij 3.3 hoort:** de huidige budgetstap in het loket (`budget`) schrijft `soort: "proef_budget"`, dat in `adsBespaar` na uitvoering `proef_einde` krijgt tenzij `p.vast`. Het loket zet geen `vast`. Een door Zarvis gevraagd budget gaat dus na 30 dagen automatisch terug naar het oude bedrag. Dat is waarschijnlijk niet wat Bram verwacht bij "zet het budget op 30 euro". Controle op de live databank heb ik niet uitgevoerd (er is nog geen bevestigde budgetactie).

### 3.4 Altijd live: bewaking

**Wat er is.** Niets dat de site bewaakt. `connections` (de tab Connecties) toont de stand per koppeling maar draait alleen op aanvraag van een ingelogde gebruiker (`requireRole`). De enige geplande job is `marketing-sync-nachtelijk`. `sync_runs` bevat per stap `status`, `started_at`, `finished_at`, `error`. Er is wel een versiecontrole die openbaar werkt: `GET submit-contact?versie=1` (`submit-contact/index.ts` r. 128-135), die niets aanraakt.

**Wat bewaken.**
- A. Site bereikbaar: HTTP 200 op `https://zolderpunt.be/` en een tweede pagina, met een tekstcontrole ("Zolderpunt" aanwezig) zodat een lege SPA-fallback niet als goed telt, en tijd van antwoord. Daarnaast de versiecontrole van `submit-contact`, want een formulier dat niet werkt is erger dan een trage pagina.
- B. Nachtelijke sync gelukt: de laatste rij van `sync_runs` per `provider` heeft `status = ok` en `finished_at` minder dan 26 uur geleden; meer dan één stap met `error` is een alarm. Ook `ok` met 0 rijen blijft ok (de upload meldt dat nu terecht).
- C. Actualiteit: `max(dag)` in `ad_daily` hoogstens 2 dagen oud. `gsc_daily` hoogstens 4 dagen oud (loopt 2 tot 3 dagen achter). Meta wordt niet bewaakt zolang er niets loopt (sinds 9 juli stil); anders alarmeert het elke dag.

**Geplande controles en het ontbrekende token.** `zarvis-taken` werkt met de serversleutel van Compass, niet met het token van een gebruiker, en `loket()` in `marketing.ts` weigert dan (r. 73-75). Oplossing zonder `marketing_sync_secret`:
1. Een nieuwe functie `site-status` in de website, alleen lezen, geen persoonsgegevens, met enkel `{ laatste_ok_per_stap, oudste_ad_dag, aantal_fouten, serverversie }`. Twee mogelijkheden voor toegang: openbaar (gegevens zijn onschuldig: tijdstippen en ok/fout), of met een eigen geheim `ZARVIS_STATUS_TOKEN` dat alleen die ene functie kent en niets anders kan. Mijn voorkeur: openbaar met rate limit, want geen geheim betekent geen geheim dat kan lekken en een eventuele aanvaller leert niets nuttigs. Dat hangt af van Brams oordeel over "wat mag een buitenstaander zien": "uw sync draaide om 04:00" is geen gevoelige informatie, maar toont wel het bestaan en ritme. Bram beslist.
2. Een aparte tabel of kolom in Compass hoeft niet: `zarvis-taken` roept `site-status` aan met een gewone `fetch`, geen sleutel, en vergelijkt.
3. Het geheim `marketing_sync_secret` blijft in de vault van de website en wordt nergens gedeeld. Er is ook geen reden om `check_sync_secret` anders te gebruiken.
4. Voor een "dood-man"-bewaking (de website zelf valt volledig weg): `zarvis-taken` draait in Compass. Vallen Compass én de website weg dan zwijgt Zarvis. Een aanvullend gratis extern controlepunt (bijvoorbeeld een uptime-dienst die Brams gsm een bericht stuurt) is aan te raden; dat heb ik niet onderzocht. Het is Brams keuze of hij een derde partij wil.

**Verwittigen.** `zarvis-taken` ondersteunt `verwittig` `melding`, `whatsapp`, `beide` en `bel` (`zarvis-taken/index.ts` r. 128-135, via Twilio). Bellen is nog niet geconfigureerd: `TWILIO_VAN_NUMMER` en `ZARVIS_BEL_NAAR` ontbreken, de oproep valt dan terug op melding en WhatsApp (logboek 24 november). Een site die offline is, rechtvaardigt bellen; een sync die één nacht mislukt niet. Ik stel voor: eerste fout melding, tweede opeenvolgende fout WhatsApp, site offline na twee controles op rij bellen. Dit past bij 5.

**Beperking van het huidige controlegereedschap.** `controleer()` laat het taalmodel de controle uitvoeren met alleen `LEES_GEREEDSCHAP`. Een vaste controle zoals "is de site bereikbaar" hoeft geen taalmodel: dat is een vergelijking in code. Een LLM-controle elke 15 minuten kost onnodig geld en geeft onbetrouwbare uitkomsten. Voorstel: een nieuwe taakvorm `bewaking` die code uitvoert, zonder model. Of een aparte klok voor bewaking in `pg_cron` op Compass.

### 3.5 Kleine aantallen: drempels en wachttijden

**Cijfers.** 34 contacten in 90 dagen op de hele site, 67 uitkomsten sinds de start, waarvan 5 getekend en 7 offerte. Ongeveer 4 aanvragen per maand via Ads. Daarmee heeft een zoekwoord of toestel zelden meer dan één aanvraag, en een enkele aanvraag verandert elke gemiddelde kost.

**Wat de feedback zegt** (`docs/TOP10-INZICHTEN-LLM-FEEDBACK.md`):
- Een zoekwoord dat in werkelijkheid 150 euro per aanvraag kost, staat toch nog 37% van de keren na 150 euro op nul; na 450 euro 5% (punt 1). Dus: waarschuwing vanaf 225 euro en 0 aanvragen; stap pas vanaf 450 euro, 35 klikken, 0 aanvragen.
- Spelregel van Bram bij rangschikken: een besparing die een aanvraag kan kosten, weegt zwaar; zulke stappen alleen als proef met stopregel. Een verloren aanvraag is veel duurder dan 50 euro te veel aan klikken.
- Google Ads levert meer dan het dashboard telt (5 eerste-klik-aanvragen; telefoonklikken op mobiel niet meegeteld). Wie op de huidige cijfers snoeit, snoeit mogelijk in wat werkt (punten 3 en 4).
- Besparingen op papier zijn geen echte besparing zolang het dagbudget gelijk blijft (punt 2): het geld gaat elders heen.

**Bestaande bescherming in code.**
- `ads_proeven_evalueren()`: proef stopt vanaf dag 10 zonder één Ads-aanvraag, vanaf dag 20 onder (minimum min 1), en eindigt altijd na `duur` dagen; merkproef stopt als de organische merkklikken onder 80% zakken (`20261110100000...sql` r. 57-98).
- Stuurcabine: elke regel heeft een minimumdrempel (kostenpiek +50% t.o.v. 14 dagen met gemiddelde minstens 10 euro; klikprijs +30% met 20 klikken per venster; droogte 5 dagen en 100 euro; moment of toestel 50 euro en 0 aanvragen in 28 dagen; zoekwoord 2 keer doel en 60 dagen; score ≤ 5 met 50 euro kost). "Onvoldoende data is dat zeggen" is een uitgangspunt in `BOUWPLAN-GOOGLE-ADS-EN-MARKT.md`.
- Loket: zie sectie 2; verlagen van het budget heeft geen drempel (alleen verhogen is begrensd). Dat is een gat, want een verlaging is het gevaarlijkste voor de aanvraagstroom.

**Voorstel voor harde regels in het loket (niet bij het model):**
1. **Eén wijziging per week** in totaal over alle soorten die iets in Google Ads veranderen, behalve terugdraaien. Reden: met 4 aanvragen per maand is een wijziging pas na twee tot vier weken te beoordelen; twee gelijktijdige wijzigingen maken het resultaat niet toe te rekenen.
2. **Geen nieuwe wijziging terwijl een proef loopt** (`proef_einde` in de toekomst, niet teruggedraaid).
3. **Wachttijd na een uitvoering:** 14 dagen voor zoekwoord, regio en uitsluiting; 30 dagen voor budget, biedstrategie en CPC.
4. **Dagbudget verlagen:** max 20% per keer, nooit onder een ondergrens (bijvoorbeeld 20 euro) en alleen met bewijs dat minder dan 10% van de vertoningen aan budget verloren gaat én dat er 14 dagen niets meer gewijzigd is. De bestaande verhoogregel is een goed spiegelbeeld.
5. **Geen conclusie uit minder dan 30 klikken of 100 euro per object**; voorstellen onder die grens heten "onvoldoende gegevens" en tellen niet als actie.
6. **Alles met `proef` en stopregel**: een stap die een aanvraag kan kosten loopt altijd als proef met terugdraaien, nooit definitief zonder tweede ja (`ads_proef_vastzetten` bestaat al).
7. **Maximum aan uitgave naar boven blijft 45 euro**; boven 45 doet alleen Bram zelf in Google Ads.
8. **Zarvis zegt altijd datum en bron en dat het over kleine aantallen gaat**; de instructie bevat dat al, maar het loket moet een veld `onzekerheid` meegeven dat het model niet kan weglaten (aantal klikken, aantal aanvragen, periode).
9. **Eigen aanvragen zijn de waarheid, Google-conversies staan ernaast** (uitgangspunt 4 van het bouwplan). Het loket gebruikt nu `conversions_google` voor "geen conversie" (zie comment r. 36-40 in het loket). Die telt 15 conversies voor 11 echte aanvragen (feedbackpunt 5). Voor wat een uitsluiting raakt is dat veilig (liever te veel dan te weinig conversies), maar voor een pauzeer- of snoeibeslissing moet de eigen telling meegewogen worden via `contact_ads_klik`.

## 4. Voorstel in bouwstappen (klein naar groot)

Ik schat bouwwerk, inclusief tests en uitrol, in uren. Elke stap steunt op de poort die er al is: lezen en voorstellen zonder ja; alles wat in Google Ads of op de live site iets verandert, alleen met `bevestigd: true` in de code van het loket.

**Stap 1. Drempels en wachttijden in het loket (4 u).**
- Zarvis kan dan: niets nieuws, maar bestaande acties worden veiliger (één wijziging per week, wachttijd, verlagingsgrens, veld `onzekerheid`).
- Geraakt: `compass-marketing-loket/index.ts`, een kleine migratie voor een tabel `zarvis_wijziging_log` of gebruik van `dashboard_audit_log`, en tests in `marketing.test`.
- Ja van Bram: nee, de regels beperken alleen. Wel zijn bevestiging van de getallen nodig.
- Nodig van Bram: de getallen van 3.5 goedkeuren of aanpassen (vraag 1).
- Bewijs: tests tegen het nagebootste loket (tweede wijziging in dezelfde week wordt geweigerd; verlaging 30% wordt geweigerd; tweede wijziging tijdens een proef geweigerd); één echte voorstelaanroep met een tijdelijke beheerder.

**Stap 2. Bewaking van site en synchronisatie (6 u).**
- Zarvis kan dan: Brams gsm of pc verwittigen als de site niet antwoordt of de nachtelijke sync mislukt of oud is, zonder model en zonder sleutel van de gebruiker.
- Geraakt: nieuwe functie `site-status` in de website (alleen lezen, geen geheim) en `config.toml`; in Compass een nieuwe taakvorm `bewaking` in `zarvis-taken` (code, geen LLM) plus een migratie voor de tabel. Aanvulling op het sprintplan van Zarvis, geen wijziging van `controleer()`.
- Ja van Bram: nee voor lezen en melden. Wel een keuze over bellen.
- Nodig van Bram: beslissing openbare of beveiligde `site-status`; `TWILIO_VAN_NUMMER` en `ZARVIS_BEL_NAAR` als hij gebeld wil worden (vraag 3).
- Bewijs: de functie geeft de echte laatste syncs terug (live gemeten: alle 12 stappen om 04:00 UTC, ok); een nagebootste mislukte run en een nagebootste oude run geven een melding; een herstel na een alarm meldt "weer in orde" één keer; een test dat het geheim nergens in de functie of de aanroep voorkomt.

**Stap 3. Interne wrapper voor de stuurcabine en het bespaarplan (8 u).**
- Zarvis kan dan: de voorstellen van de website zelf lezen (`stappen`, `letop`, `bewaking`, `acties`, `kwaliteit`, `paginas_overtuigen`), met bron, in plaats van zelf cijfers te herrekenen.
- Geraakt: nieuwe migratie in de website met `ads_*_intern()`-functies (kopie zonder `auth.uid()`-controle, alleen `service_role`); nieuwe loketacties `voorstellen`, `kwaliteit`, `paginas` (alleen lezen); `marketing.ts` en de beheersectie.
- Ja van Bram: nee (lezen).
- Nodig van Bram: toestemming om een migratie op de live databank van de website toe te passen (hij zei dit eerder per ingreep).
- Bewijs: de uitvoer van de interne functie is gelijk aan de uitvoer van `ads_bespaarplan()` als admin voor dezelfde dag (vergelijk de JSON); de bestaande functie is ongewijzigd (hash van `pg_get_functiondef` voor en na).

**Stap 4. Zoekwoorden, regio en woordgroepen via het loket (10 u).**
- Zarvis kan dan, na ja: een zoekwoord pauzeren (alleen volgens de strenge regel), een brede soort omzetten naar woordgroep, gemeenten buiten het werkgebied uitsluiten, met terugdraaien.
- Geraakt: loketactie `stap` die rijen in `ads_actie` zet met sleutel `zarvis_<soort>:...`; `marketing.ts` krijgt `voer_stap_uit` en `draai_stap_terug`; tests. Geen wijziging aan `sync-marketing`.
- Ja van Bram: bij elke stap, voorgelezen met kost, bewijs en onzekerheid.
- Nodig van Bram: bevestiging dat de strengere drempel (450 euro, 35 klikken) geldt (vraag 1) en welke regio's "werkgebied" zijn (nu West- en Oost-Vlaanderen).
- Bewijs: elk soort getest met een niet bestaande term of id (les van 24 november: nooit een echte term testen); één echte uitvoering met een tijdelijk zoekwoord in Google Ads en terugdraaien; nagekeken dat de rij verschijnt bij "uitgevoerde stappen" van het dashboard.

**Stap 5. Uitkomst van aanvragen koppelen en voorstellen (10 u).**
- Zarvis kan dan: bij elke aanvraag de uitkomst voorstellen uit Compass (fase en calculatie) en na ja invullen in `aanvraag_uitkomst`, zodat kost per offerte en per getekend project klopt; en een opvolgtaak plannen voor aanvragen zonder reactie.
- Geraakt: website: loketactie `uitkomst` (nooit `geen_lead` zonder tweede ja, vanwege de bijwerking op `is_testcontact`) en een leesactie `aanvragen_zonder_uitkomst` zonder persoonsgegevens (alleen `contact_id`, datum, kanaal, postcode eerste twee cijfers); Compass: een koppelfunctie dossier ↔ contact op e-mail of telefoon (de gegevens leven in twee projecten; de koppeling moet dus in Compass gebeuren, waar de persoonsgegevens al staan); gereedschap `stel_uitkomst_voor`.
- Ja van Bram: voor elke uitkomst, behalve de eerste lezing; en elk bericht aan een klant (`stuur_whatsapp` bestaat).
- Nodig van Bram: welke Bouwflow-fasen tellen als `offerte` en welke als `getekend` (nu afgeleid uit `pipeline.ts`: 27, 3, 4, 25 voor offerte; 6, 7 voor beslissing; 18 voltooid); of een bedrag uit de calculatie mag gelden als `bedrag`; of mailadressen mogen dienen als sleutel (vraag 4).
- Bewijs: 20 historische aanvragen waarvan Bram de uitkomst al klikte (67 rijen); het voorstel komt overeen in minstens 90% van de gevallen; de rest wordt bekeken. Geen enkele automatische `geen_lead`.

**Stap 6. Tekstwijzigingen voorstellen en een pull request openen (14 u).**
- Zarvis kan dan: een zwakke pagina aanwijzen met cijfers, een tekstvoorstel schrijven, een branch en pull request openen in de repo van de website met build- en prerendercontrole, en Bram de wijziging voorlezen. Na ja: mergen. Publiceren blijft de stap daarna.
- Geraakt: nieuwe functie `zarvis-pagina` in Compass (GitHub-token, diff-limiet, lijst toegelaten bestanden, woordenlijst), loketactie `paginagegevens`; website: geen codewijziging nodig behalve een lijst `pagina-regels` (toegelaten bestanden). Geen CI nodig; de build wordt in de functie niet uitgevoerd (Deno kan geen Vite-build), dus de buildcontrole loopt in een GitHub Action in de website (`.github/workflows/`, nieuw) die op elke PR van `zarvis/*` draait en een statuscheck geeft; dat is een extra bouwstuk.
- Ja van Bram: bij elke merge en elke publicatie; één ja per PR. Branch en PR openen is geen ja nodig (niets verandert op de site).
- Nodig van Bram: een fine-grained GitHub-token (vraag 2) als secret in Lovable; keuze om GitHub Actions te gebruiken; zijn goedkeuring voor een lijst van beloftes die nooit in de tekst mogen staan (prijsvorken, premies, termijnen).
- Bewijs: een PR op een testbestand (bijvoorbeeld een regel in `FAQ.tsx`) die build en prerender groen krijgt en die een diff boven de limiet weigert; een PR die `launchConfig.ts` raakt wordt geweigerd; het token kan niet pushen naar `main` (proef met een toegestane en een geweigerde bewerking).

**Stap 7. Publiceren na ja en nameting (6 u).**
- Zarvis kan dan: na Brams ja de PR mergen, de publicatie volgen (`latest_commit_sha` gelijk aan de merge-commit, nieuwe tekst op de live pagina, `site-status` ok) en na 30 dagen de kansmaat en kwaliteitsscore terugmelden.
- Geraakt: `zarvis-pagina` (merge), eventueel de nachtbouwer als uitvoerder van `deploy_project` (alleen als die de Lovable-koppeling krijgt), nameting als geplande controle.
- Ja van Bram: bij merge en bij publiceren, in één bevestiging, met een terugdraaiknop (een revert-PR).
- Nodig van Bram: de Lovable-koppeling bij de nachtbouwer of een andere manier om te publiceren (vraag 2).
- Bewijs: een echte kleine wijziging (bijvoorbeeld één zin) van begin tot einde, met bewijs van de live pagina vóór en na, en een revert.

**Stap 8. Proeven met stopregel via Zarvis (4 u).**
- Zarvis kan dan: een CPC-plafondproef (`proef_cpc`, 15 euro) of een merkproef voorstellen en na ja starten, en elke dag melden hoe die ervoor staat, met stopregel en automatische terugdraai.
- Geraakt: loketactie `proef`; Zarvis-gereedschap; geplande controle voor de voortgang.
- Ja van Bram: bij start en bij vastzetten (`ads_proef_vastzetten`).
- Nodig van Bram: nee, behalve dat de stap `telling_een` eerst klaar moet zijn. Uit de live `ads_actie` blijkt dat die stap nog niet als aparte rij bestaat (de rijen zijn `doel_secundair` en `uitsluiten`); de cabine meldt dat `telling_een` al niet meer nodig is (`proef_cpc_voorwaarde`). Dat klopt zolang de bedankpagina op één per klik staat.
- Bewijs: een proef van een testcampagne of een nagebootste database met de stopregel op dag 10; terugdraaien herstelt de oude strategie.

**Totaal:** 4 + 6 + 8 + 10 + 10 + 14 + 6 + 4 = 62 uur. Stap 1 tot 3 zijn de fundering en kunnen eerst. Stap 6 en 7 zijn het grootste en meest risicovolle stuk.

## 5. Afhankelijkheden van andere ideeën

- **IDEE-12 tot 14 (andere rollen) en IDEE-15 (rollen tonen):** elke rol krijgt een eigen loket en melding; bewaking (stap 2) moet in dezelfde meldingen landen als de andere rollen.
- **IDEE-10 (mail):** een antwoord aan de klant na een aanvraag wil een mailconcept; dat bestaat niet (alleen lezen).
- **Z3 (dossiers aanvullen met logboek):** stap 5 (opvolgen) wil `leg_notitie_vast` en `werk_wat_we_weten_bij`, nu niet gebouwd. Zonder die twee blijft opvolgen bij herinneringen en WhatsApp.
- **IDEE-16 (herhalende taken):** gebouwd en live; de bewaking hergebruikt de klok, de uitvoerder en de meldingen.
- **IDEE-28 (bellen):** de bewaking bij uitval gebruikt het; Twilio nog niet geconfigureerd.
- **Feedback uit `TOP10-INZICHTEN-LLM-FEEDBACK.md`:** de punten 1 (strengere pauzeerregel), 3 (eerste klik), 4 (telefoonklikken) en 5 (meting) zijn aanpassingen aan de website zelf die niet in het marketingloket thuishoren, maar die de uitkomsten bepalen waarop Zarvis zou handelen. Zonder punt 3 en 4 wijst Zarvis mogelijk op toestellen en zoekwoorden die wel werken.
- **GitHub-token en Lovable-publicatie:** een vroegere regel (IDEE-29): wat buiten Compass iets verandert gebeurt pas na ja, met die poort in de code.

## 6. Risico's

- **Te hard ingrijpen met kleine aantallen** (zie 3.5). Mitigatie: stap 1 vóór elke nieuwe schrijfactie.
- **Een enkele bevestiging omvat te veel.** Een bevestiging van een voorstel van 20 termen of een PR met veel tekst wordt snel "ja" gezegd zonder lezen. Mitigatie: de poort vraagt een bevestiging per voorstel en toont het totaal aan kost en aantal.
- **Het model schrijft beloftes in paginatekst** (prijsvork, premie, termijn). Mitigatie: lijst met verboden beloftes in code en een PR die ze bevat wordt geweigerd; nooit prijzen die niet al in de bron staan.
- **GitHub-token met schrijfrecht.** Geen branchbescherming mogelijk (403 gemeten). Een lek van het token laat iemand naar `main` pushen, en Lovable publiceert `main`. Mitigatie: token beperkt tot één repo en alleen in één functie gebruikt; geen `administration`; rotatie; een nachtelijke controle dat `main` alleen commits van Bram of Lovable bevat.
- **`geen_lead` verandert alle statistiek** en de upload naar Google voor dat e-mailadres (`is_testcontact`). Mitigatie: nooit automatisch.
- **Het loket gaat voorbij aan tweestapsverificatie van het dashboard** (reeds benoemd in `VERKENNING-MARKETING.md`). Een gestolen Compass-beheerderstoken geeft nu uitsluit- en budgetrechten. Mitigatie: de grenzen in het loket blijven bindend; overweeg een extra bevestiging van Bram in Compass zelf (niet alleen in het gesprek).
- **Een proef die automatisch terugdraait** terwijl Bram een definitief budget verwacht (zie 3.3). Mitigatie: expliciet `vast` of een proef in de tekst van het voorstel.
- **De cron en de sync zijn één punt van falen:** de site van Compass en de website draaien beide op Lovable Cloud. Een uitval van de hele dienst stilt zowel de site als de bewaking. Een extern controlepunt zou dat dekken.
- **Juridisch:** Google Tag Manager en Meta Pixel laden vóór een cookiekeuze (`VERKENNING-MARKETING.md`); een verantwoordelijke marketeer benoemt dat. Zarvis mag er geen oordeel over vellen maar moet het op vraag kunnen melden.
- **Uitrollen van edge functions staat los van publiceren.** Een merge van een functie rolt haar niet uit; de `VERSIE`-stempel van `submit-contact` bestaat daarom. Elk nieuw loket of elke `site-status` moet een versiepunt krijgen.

## 7. Zeker tegenover niet kunnen nagaan

**Zeker (gelezen of gemeten):**
- Loket, `marketing.ts`, `adsBespaar()` en de 12 soorten van `ads_actie`, de payloadvelden en terugdraaiwaarden.
- `ads_bespaarplan()`, `ads_stuurcabine()`, `paginas_overtuigen()` en `ads_kwaliteit()` eisen `auth.uid()` en `aal2`.
- Pagina-inhoud staat in `.tsx`; de prerender; `SOFT_LAUNCH_MODE = true`.
- De live syncstatus: alle 12 stappen ok om 04:00 UTC op 24 november; één cronjob; 34 contacten in 90 dagen; 67 uitkomsten met verdeling.
- GitHub-branchbescherming niet beschikbaar (403).
- `submit-contact` en `create-website-lead` doen wat ik beschrijf (ontdubbeling 10 minuten; geen sleutel tussen `contacts` en `leads`).

**Niet kunnen nagaan:**
- Of Zarvis de Lovable-koppeling kan gebruiken voor `deploy_project` vanuit een edge function (waarschijnlijk niet; geen API gevonden).
- Of de bestaande budgetactie van het loket na 30 dagen inderdaad terugdraait (geen bevestigde actie in de live databank om op te toetsen; gelezen uit de code).
- De volledige definitie van `ads_acties_goedkeuren` en `ads_actie_terugdraaien` (niet doorgelezen).
- De huidige kwaliteitsscore en `pagina_ervaring` per zoekwoord (RPC eist login; geen SELECT uitgevoerd).
- Of de v2-regels van de feedback (strengere pauzeerdrempel, eerste klik, telefoonklikken) ooit in de website zijn doorgevoerd: ik vond de migratie niet in `supabase/migrations`, maar kan niet uitsluiten dat de live functie anders is dan de repo.
- Of `site-status` openbaar blijven veilig is voor Bram; dat is een keuze.
- Of een mailadres een betrouwbare sleutel is tussen `contacts` en `leads` (de ontdubbeling in Compass gebruikt e-mail of telefoon, maar voor historische rijen heb ik geen koppelproef gedaan).
- Een echte aanroep, een echte uitvoering in Google Ads, een echte pull request, een echte uptimecontrole: niets daarvan is uitgevoerd.

## 8. Vragen voor Bram

1. Mogen de drempels en wachttijden uit 3.5 zo gelden: één wijziging per week, 14 dagen wachttijd na zoekwoord of regio, 30 dagen na budget of biedstrategie, pauzeren pas bij 450 euro en 35 klikken zonder aanvraag, verlagen van het budget hoogstens 20% per keer met ondergrens 20 euro?
2. Mag Zarvis een GitHub-token krijgen dat alleen branches en pull requests kan maken in `look-learn-launch`, en wie publiceert na jouw ja: de nachtbouwer met jouw Lovable-koppeling, of doe je dat zelf?
3. Moet de bewaking openbaar leesbaar zijn (`site-status` zonder geheim, alleen tijdstippen en ok of fout), en wil je gebeld worden bij een site die uitvalt (dan zijn de Twilio-nummers nodig)?
4. Mag Zarvis de uitkomst van een aanvraag voorstellen op basis van het Compass-dossier (gekoppeld via e-mail of telefoon), en welke Bouwflow-fasen tellen voor jou als offerte en als getekend?
5. Welke dingen mogen nooit in een door Zarvis geschreven paginatekst staan (prijzen, premies, termijnen, garanties), en mag een wijziging aan een pagina die in soft launch verborgen is ook voorgesteld worden?

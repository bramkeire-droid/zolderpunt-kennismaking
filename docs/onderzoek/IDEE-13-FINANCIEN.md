# IDEE-13 Financiën: Zarvis als iemand die het DOET (onderzoek, 2026-11-24)

Alleen gelezen. Niets aangeroepen op Yuki, niets geschreven, niets uitgerold. Databank van FINDASHBOARD gelezen met `query_database` (alleen SELECT, alleen tellingen en structuur). Geen bedragen van het bedrijf in dit document; percentages van normen staan er wel in, want dat zijn normen.

Bronnen in het FINDASHBOARD-project: `C:\Users\bramk\Desktop\Belhouse Financial Compass`. Afgekort als FD.

## 1. Samenvatting

1. Alle vier de acties zijn haalbaar, maar geen enkele kan vandaag: Zarvis kan niet in FINDASHBOARD (ander Supabase-project, andere gebruikers) en FINDASHBOARD kent geen openstaande facturen, geen documenten bij boekingen en geen offertes. De sleutel is één `financieel-loket` naar het model van `compass-marketing-loket`, met een voorstel-dan-ja-handdruk die in code zit.
2. Yuki biedt wat nodig is: openstaande posten van klanten én leveranciers (met vervaldatum, referentie, `DocumentID`, contactnaam en e-mail), het factuurbestand, en een manier om een document in het Yuki-archief te zetten (`UploadDocument`). De rechten van een Yuki-sleutel zijn per dienst, niet alleen-lezen: de grens moet in onze code staan.
3. Marge van offertes bewaken kan nog niet echt: er is geen bekrachtigde norm (drie verschillende staan naast elkaar: 15, 20 en 35 procent, alle "te valideren"), Compass rekent met een prijsvork en niet met een kostprijs, en slechts 1 van 142 dossiers heeft een offertebedrag in Compass; de echte offerte lijkt elders gemaakt te worden.
4. Eén fout moet vooraf weg: `bevestigd: true` wordt vandaag door het taalmodel zelf meegegeven. De "poort in de code" is dus zo sterk als het model. Voor geld en klantcontact moet het ja van Bram langs een weg komen die het model niet kan vervalsen.
5. Vertrouwelijkheid wordt afgedwongen door niet te geven wat niet gezegd mag worden: die cijfers komen alleen in het gegevensvenster (`bron`) en nooit in wat het model te zien krijgt (`tekst`). Dat bestaat al in de code en is dus goedkoop. Totaal ongeveer 124 uur bouwwerk, eerste bruikbare stap 14 uur.

## 2. Wat er vandaag is

**FINDASHBOARD** (Lovable `50e67fe4-d103-4d97-b856-2d95a10b2aa3`, Supabase `lrlmcnpbaybgtvqgerde` volgens `supabase/config.toml:1`).
- Opmerking: `HANDOFF Claude Code.md` §0 noemt nog twee databanken (een externe `rnifynae...`). Dat is achterhaald: `kb_*` en `kpi_daily` staan in dezelfde databank, nagemeten.
- Tabellen met aantallen: `kpi_daily` 265, `kpi_maand_stand` 3.000, `gl_history` 30.589, `kb_assumptions` 46, `kb_workers` 3, `kb_vehicles` 6, `kb_audit_findings` 10, `manual_ledger_entries` 0, `tenants` 3, `tenant_members` 5 (waarvan 1 in Belhouse, rol owner), `tenant_integrations` 1 (Yuki, status verified).
- `gl_history` (migratie `20261104120000_gl_history.sql`) bewaart alleen afgesloten boekjaren: laatste boeking 2025-12-31, niets uit 2026. Het lopende jaar komt elke keer live uit Yuki (`yuki-ledger/index.ts:335` weigert expliciet het lopende jaar). Kolommen: boekjaar, datum, rekening, bedrag, omschrijving. Geen documentverwijzing, geen boekstuknummer.
- `kpi-snapshot` rekent elke nacht het boekjaar door naar `kpi_daily` (laatste rij 2026-11-24) en `kpi_maand_stand`, en weigert te schrijven bij 0 transacties.
- `controleorgaan` (06.30 u) schrijft naar `kb_audit_findings`. Categorieën in de code: `auto:koppeling`, `auto:volledigheid`, `auto:kaart_onbekend`, `auto:kpi_restbak`, `auto:reconciliatie`, `auto:plausibiliteit`, `auto:validity`, `auto:entiteit`, `auto:nieuwe_leverancier`. Nu in de tabel: 10 bevindingen, waarvan 7 open (1 kritiek `auto:kaart_onbekend`, 1 waarschuwing `auto:nieuwe_leverancier`, de rest info).
- Yuki-koppeling: `yuki-ledger` gebruikt alleen `Accounting.asmx/GLAccountTransactions` en `AccountingInfo.asmx` (Authenticate, GetGLAccountScheme). Sleutel als secret `YUKI_API_KEY` voor Belhouse, per tenant in `tenant_integrations` voor andere (`yuki-ledger/index.ts:84-120`).
- Toegang: `_shared/auth.ts` laat binnen: een cron-sleutel, de serversleutel, of een gebruiker die lid is van de tenant. **De cron-sleutel staat als vaste tekst in `auth.ts:17`.** Wie ze kent, roept elke functie aan. Ze staat bewust niet in dit document.
- Rekenlogica zit in de browser: `src/lib/` (`sectie-kaart.ts`, `hefbomen.ts`, `signalen.ts`, `mist.ts`, `soort-klant.ts`, `grondslag.ts`) en `src/components/analyses/margin-simulator/formulas.ts`. Alles zuiver TypeScript, geen DOM.
- Er bestaat al een gedeeld bestand voor server én app: `supabase/functions/_shared/kaart-data.ts` (de app importeert het relatief, `signalen.ts:9`). Dat is het precedent om twee versies te vermijden.
- Er bestaan al twee versies van dezelfde rekenlogica: `controleorgaan/index.ts:60-130` is "port van metrics-engine.ts", en `annualizeYtd` is een "Deno-spiegel van kpi-mapping.ts".

**Zarvis** (repo `C:\Users\bramk\.claude\projects\Zarvis`).
- Gereedschap loopt door één poort `voerUit` met een gebruikerstoken (`gereedschap.ts`). Een resultaat heeft twee delen: `tekst` gaat naar het model, `bron` gaat alleen naar het gegevensvenster (`supabase/functions/zarvis/index.ts:351-372`).
- Het patroon voor een loket naar een ander project staat er twee keer: `mail.ts` (Mail-CRM) en `marketing.ts` met `compass-marketing-loket` (`C:\Users\bramk\Desktop\Zolderpunt Website\supabase\functions\compass-marketing-loket\index.ts`). Dat loket legt het Compass-token voor aan Compass (`/auth/v1/user` en rpc `has_role` admin), heeft grenzen in code, en logt elke aanroep.
- "Eerst voorlezen, dan ja" bestaat bij `stuur_whatsapp` en `plan_taak` (`doen.ts:174`, `:245`): het model moet `bevestigd: true` meesturen.
- Er is een WhatsApp-weg naar klanten (Baileys), webzoeken (`zoek_web`, `lees_webpagina`), mails lezen (`lees_mails`, `lees_mail`). Er is geen weg om een mail te versturen.
- Een geplande controle heeft geen gebruikerstoken, dus kan geen loket aanroepen.

**Compass** (offertezijde, via de Zarvis-repo).
- `calculaties`: 47 rijen, per dossier `budget_excl`, `budget_min_excl`, `budget_max_excl`, `btw_percentage`, `calculator_state` (JSON met onder meer `netto_m2`, `bruto_m2`, `marge`, `overrides`, `extras`, `badkamer`, `maatwerk`).
- `leads`: 142, alle 142 met `bouwflow_project_number` (het ZL-nummer); slechts 1 met `offerte_bedrag_excl`. Velden `offerte_nummer`, `offerte_datum`, `offerte_bijlage_settings`.
- De prijscalculator (`src/lib/prijscalculator.ts`, `src/components/calculator/MargeBalk.tsx`, `MargeRedenDialog.tsx`) rekent tarief × oppervlakte met een bandbreedte (standaard 15 procent) en laat de gebruiker de uiteinden schuiven met een verplichte reden. Dat is een prijsvork, geen kostprijs en geen marge in de zin van FINDASHBOARD.
- `OffertebijlageDialog.tsx` maakt een bijlage-pdf in de browser met een ingetypt bedrag en offertenummer.
- Hulpfunctie `search_leads_fuzzy` bestaat al in Compass.

## 3. Bevindingen per vraag

### 3.1 Onbetaalde facturen opvolgen

**Wat Yuki biedt** (webdiensten op `api.yukiworks.be/ws/`, per dienst):

| Dienst | Bewerking | Geeft | Bron |
|---|---|---|---|
| Accounting | `OutstandingDebtorItems`, `...ByDate`, `...WithPaymentReference` | openstaande posten klanten; parameters `includeBankTransactions`, `sortOrder` (en `startDate`, `endDate`) | api.yukiworks.be/ws/Accounting.asmx |
| Accounting | `OutstandingCreditorItems`, `...ByDate`, `...WithPaymentReference` | idem leveranciers | idem |
| Accounting | `CheckOutstandingItem(Reference)` | actueel openstaand bedrag van één post | idem |
| AccountingInfo | `GetTransactionDetails` | per boekingsregel o.a. `documentID`, `documentReference`, `project`, `projectCode` | docs/YUKI-FASE3-ONDERZOEK.md in FD |
| Archive | `DocumentDownloadUrl`, `DocumentBinaryData`, `SearchDocuments`, `DocumentFolders`, `UploadDocument` | factuurbestand lezen; document in het archief zetten (`sessionID`, `fileName`, `data` base64, `folder` int, `administrationID`) | api.yukiworks.be/ws/Archive.asmx |
| Contact | `SearchContacts`, `GetSuppliersAndCustomers`, `UpdateContact` | contacten zoeken (maximaal 100); `UpdateContact` schrijft | api.yukiworks.be/ws/Contact.asmx |

Een post van `OutstandingDebtorItemsByDate` bevat (support.yuki.nl artikel 80001125073): `Date`, `Description`, `Reference`, `DueDate`, `Contact`, `ContactCode`, `CoCNumber`, `VATNumber`, `OpenAmount`, `OriginalAmount`, `Type`, `DocumentID`, `PaymentMethod`, adres, `RecipientEmail`, telefoonnummers. De velden van de leveranciersvariant stonden niet in het gelezen artikel. De `.asmx`-pagina zelf toont de resultaatstructuur niet (alleen "xml"). Niets hiervan is aangeroepen.

**Welke rechten de sleutel vraagt** (support.yuki.nl artikel 80000787845):
- Een sleutel krijgt per dienst rechten; alleen een gebruiker met rol Management of Backoffice stelt dat in. Per administratie een eigen sleutel.
- Er is geen alleen-lezen-schakelaar. "Accounting" is ook `ProcessJournal` (boekingen maken). "Archive" is lezen én uploaden. "Contact" is lezen én `UpdateContact`. Een lek of een fout in onze code kan dus ook schrijven in de boekhouding.
- De huidige sleutel werkt voor `Accounting` en `AccountingInfo` (de koppeling is "verified" en leest elke nacht). Openstaande posten zitten in `Accounting`, dus waarschijnlijk al toegestaan. Of `Archive` en `Contact` aan staan, is niet na te gaan zonder Yuki te bevragen.
- Voorstel: de bestaande sleutel enkel gebruiken voor lezen. Voor stap 5 (uploaden) een tweede sleutel aanvragen met alleen `Archive`. Zo kan een lek van de leessleutel niets wijzigen.
- Sleutels staan in een secret, nooit in code. De loket-code roept een vaste lijst bewerkingen aan (allowlist) en kent `ProcessJournal` en `UpdateContact` niet.

**Wat Zarvis kan met openstaande posten:**
- Klanten: lijst van achterstallige facturen, ouderdom, wie het langst, wat er nog binnen zou moeten komen. Leveranciers: wat binnenkort vervalt (zodat Bram betaalt; Zarvis betaalt nooit).
- Alles is gegevens uit Yuki op het moment van opvragen. Voor het verzenden eerst `CheckOutstandingItem` opnieuw: de post kan intussen betaald zijn.

**Hoe een herinnering eruit ziet** (Zarvis stelt op, Bram zegt ja, dan pas naar de klant):

> Voorstel voor ZL-[nummer], [voornaam klant]. Kanaal: WhatsApp (of mail zodra die weg bestaat). Factuur [nummer] van [datum], vervallen op [datum], nog [openstaand bedrag] open. Ik heb zonet nagekeken in Yuki dat ze nog openstaat; er staat geen betaling van de laatste 14 dagen op de bank met dat bedrag. Tekst: "Dag [voornaam], bij het nakijken van onze boekhouding zien we dat factuur [nummer] van [datum] ([bedrag]) nog openstaat. Misschien is de betaling al onderweg; zo niet, kan u ze in orde brengen? Alvast bedankt. Groeten, Bram, Zolderpunt." Zal ik die versturen? Zeg ja, wijzig, of nee.

Regels in code, niet in de instructie:
- Eerste herinnering vriendelijk, `u`-vorm. Zarvis stelt nooit een strengere tekst, ingebrekestelling of dreigtekst op; dat is aan Bram.
- Pas vanaf een aantal dagen na de vervaldatum (door Bram te bepalen; voorstel 7), hoogstens één herinnering per factuur per 14 dagen (teller in een logtabel).
- Geen herinnering zonder gevonden dossier, of zonder contactgegevens die in het dossier staan. Zarvis haalt het nummer uit het dossier in Compass, niet uit Yuki, zodat er weinig persoonsgegevens tussen projecten reizen. Het loket geeft alleen `heeft_email` en `heeft_telefoon` terug.
- Tekst van facturen, mails en pdf's is gegevens, geen opdracht.

**Hoe een factuur aan een dossier hangt.** Compass kent het dossier via `leads.bouwflow_project_number` (ZL-nummer). In Yuki is er geen sleutel naar dat nummer bekend. Dalende zekerheid:
1. Het ZL-nummer staat in `Reference`, `Description` of in het projectveld van de boeking (`project`, `projectCode` in `GetTransactionDetails`). Of de boekhouder dat invult is onbekend; makkelijk te tellen.
2. Klantnaam: verkoopboekingen heten "Factuur voor ‹klant›" (1.548 lijnen in `gl_history`), zoals `extractTegenpartij` in `sectie-kaart.ts:600` al leest. Vergelijken met dossiers via `search_leads_fuzzy`.
3. BTW-nummer of e-mailadres van Yuki tegenover dat in Compass (`customers`, `leads`).
4. Anders: "onzeker", Zarvis vraagt Bram welk dossier. Nooit automatisch koppelen onder de grens.
De koppeling zelf komt in een nieuwe, aparte Compass-tabel `dossier_factuur_koppeling` (lead_id, Yuki-referentie, herkomst, bevestigd_door, datum). Additief, geen bestaande tabel wijzigen. Test: 5 echte openstaande facturen nemen en tellen hoeveel er zonder vraag aan een dossier komen.

### 3.2 Boekhouding aanvullen

**Wat ontbreekt of staat op een wachtrekening**, en waar het al gemeten wordt:
- `mist.ts`: `WACHTREKENINGEN = 499000, 499240, 499900`; `mistSaldo` (saldo, niet aantal lijnen); `ontbrekendeVasteBoekingen` (een resultaatlaatje met een boeking in elk van de drie vorige maanden maar niet in de laatste); `dagenSindsFactuur`.
- De restbak (`sectie-kaart.ts:54`, `classify`): een resultaatrekening (6 of 7) die niet op de kaart staat. Geeft alarm op de pagina en een kritieke melding `auto:kaart_onbekend` van het controleorgaan. Op dit moment: 1 open.
- `kb_audit_findings`: 7 open, zie hierboven. Het veld `question` en `suggested_rule` bestaan al voor een vraag aan Bram.
- Gemeten in `gl_history` (afgesloten jaren): 568 lijnen op de wachtrekeningen, saldo netto nul, 386 daarvan zonder omschrijving. Het lopende jaar is niet meetbaar zonder Yuki live; ik kon dus niet zeggen wat er nu op de wachtrekening staat.
- Wat nergens bestaat: een koppeling tussen een boeking en haar document. `gl_history` heeft geen `documentID`; Yuki levert dat wel (`GetTransactionDetails`).

**Wat Zarvis zelf kan uitzoeken:**
- Een bevinding of een lijn op een wachtrekening nemen, de leverancier uit de omschrijving halen (zoals "Factuur van ‹naam›": 14.131 lijnen in `gl_history` hebben dat patroon) en de mails van die leverancier zoeken via het Mail-CRM-loket (`leveranciers`, `leverancier_mails`, `mails_via_email`).
- Beperking: het Mail-CRM-loket heeft geen zoeken op tekst, en geeft bij een mail alleen `heeft_bijlagen` (true of false), niet de bijlage zelf (`mail-crm/supabase/functions/compass-loket/index.ts:471`). Voor de factuur-pdf is een nieuwe, alleen-lezen actie `bijlage` in Mail-CRM nodig. Mail-CRM heeft geen git-remote en geen testomgeving (zie `VERKENNING-MAILDUDE.md`), uitrollen gaat recht naar productie.
- Zarvis stelt een voorstel op: "Voor [leverancier], [datum], op wachtrekening: ik vond mail [onderwerp] met bijlage; dit lijkt de factuur. Dit moet naar de boekhouder."

**Hoe het bij de boekhouder komt** (drie wegen, na ja van Bram, nooit boeken):
- (a) Het document in het Yuki-archief zetten met `UploadDocument` (`folder` ophalen via `DocumentFolders`). Dit is de weg waarlangs de boekhouder zelf werkt. Vraagt een Archive-sleutel (zie 3.1) en is voor Yuki-gebruikers zichtbaar; terugdraaien kan alleen de boekhouder.
- (b) Een bericht met de uitleg naar de boekhouder. WhatsApp bestaat, mail niet.
- (c) Beide: upload plus een bericht "ik zette factuur X in het archief, hij hoort bij [dossier]".
- Voorstel: (c) met (a) als kern. Zarvis boekt nooit zelf (`ProcessJournal` blijft buiten het loket).

### 3.3 Marge van offertes bewaken

**Waar een offerte ontstaat.**
- Compass: de prijscalculator (intakegesprek en dossier) bewaart in `calculaties` een prijsvork; de offertebijlage-pdf maakt Bram in `OffertebijlageDialog.tsx`; het rapport met prijsindicatie vertrekt via `send-rapport-mail`.
- Slechts 1 van 142 dossiers heeft `offerte_bedrag_excl`. Waar de echte offerte met regels gemaakt wordt, is niet te zien in Compass. Bouwflow (waaraan elk dossier hangt) is de logische plaats, maar ik kon dat niet nagaan.
- FD: de margesimulator (`MarginCapacitySimulator.tsx`, `formulas.ts`: `computeCapacity`, `computeOverhead`, `computeProject`, `projectStatus`) en de projectregiecalculator (`ProjectregieCalculator.tsx`, `computeRegieCalc`, `buildErpOverdracht`). Hier zit de kostprijs: personeelskost per uur (kennisbank), materiaal- en onderaannemingsopslag, overheaddekking, winstdoel. Dat is dus de enige plek die een marge kan uitrekenen.

**Waar een controle kan staan.**
1. Een alleen-lezen `toets_offerte(dossier)` in Zarvis: leest het offertebedrag en de calculatie uit Compass, vraagt de kostenbasis aan het loket (uren, materiaal, onderaanneming uit `calculator_state`, of door Bram gegeven), en antwoordt "boven, op, onder de norm, en wat er ontbreekt". Dit kan zonder iets in Compass te wijzigen.
2. Een signaal bij het maken van de bijlage in `OffertebijlageDialog.tsx` en bij `send-rapport-mail`: onder de ondergrens vraagt de knop om een reden (analoog aan `MargeRedenDialog`), net zoals de prijsvork nu een reden vraagt. Dit raakt Compass (additief). Een harde blokkade is alleen mogelijk voor wat Compass zelf verstuurt; een offerte die elders gemaakt wordt, houd je niet tegen. Dat moet je eerlijk zeggen.

**Welke norm geldt, en of Bram ze bekrachtigde.** Gemeten in `kb_assumptions`:

| Sleutel | Waarde | Betekenis volgens de notitie | Status |
|---|---|---|---|
| `signal_projectmarge_min` | 15 | waarschuwing op Overzicht | "sectorvuistregel" |
| `benchmark_projectmarge_min` / `_max` | 20 / 30 | kleurt de projectmarge-kaart | "sectorvuistregel, te valideren met de boekhouder" |
| `marge_pct_min` / `_max` | 20 / 45 | controleorgaan, onder 20 "onvoldoende om overhead te dragen" | "technische parameter" |
| `brutomarge_pct_recurring` | 36,6 (berekend, vanaf 2026-01-01) en 35 (ingesteld, 2026-06-16) | twee rijen naast elkaar | berekend en ingesteld; geen aanduiding welke geldt |
| `werkmarge_min` in `signalen.ts` | 15 (standaard) | "te herijken" | niet bekrachtigd |

Geen van deze is door Bram als norm voor een offerte bekrachtigd. `DEFINITIES-KERNCIJFERS.md` is zelf nog "concept, niet bekrachtigd". De werkelijke norm in Brams methode (`OfferteOpbouwCard.tsx`) is geen vast percentage maar: eerst overhead dekken, nooit verlies, soms bewust minder dekking om een planningsgat te vullen. Dat is een functie van kostprijs, vaste kosten en winstdoel, niet één getal. Zarvis moet dus drie zaken kennen: de kostprijsgrens (onder kostprijs = verlies, altijd stop), een ondergrens op marge (door Bram vast te leggen, met geldigheidsdatum) en een streefwaarde. Tot dan antwoordt `toets_offerte` met "geen bekrachtigde norm" en toont het de drie bestaande getallen met hun bron, zonder een oordeel te vellen.

### 3.4 Kosten drukken

**Wat de gegevens al tonen** (allemaal in FD, op boekingen van Yuki):
- `hefbomen.ts`: `trendlijn` (kleinste kwadraten met betrouwbaarheid, minder dan 6 maanden is "te weinig"), `kostengedrag`, `kostenGroepen` (groeit mee, vast, onduidelijk, met "verplaatst sinds"), `gemiddeldeTegenoverExtra` en `rollendAandeel` in `sectie-kaart.ts:451` (kosten per 100 euro omzet over een venster van 3 maanden, goedgekeurd 03/11), `hefboomTabel` (wat 1 procent oplevert per knop), `groeiweg`.
- `perTegenpartij` en `drijvers` (`sectie-kaart.ts:462`, `:476`): per leverancier de verandering tegenover de vorige periode ("wie dreef het").
- `ontbrekendeVasteBoekingen` in `mist.ts` kent al het patroon "elke maand, nu niet"; dezelfde gedachte (elke maand, zelfde tegenpartij, vergelijkbaar bedrag) vindt abonnementen. Dat bestaat nog niet.
- Grootboek per rekening en leverancier: `gl_history` (afgesloten jaren) en live Yuki voor het lopende jaar.
- Beperking van gegevens: de lopende maand is altijd onvolledig; lonen kunnen achterlopen (`rijpheid.ts`); een dalende kostenlijn wijst op boekingsmoment, niet op werking (`hefbomen.ts:67`).

**Wat Zarvis kan doen:**
- Een overzicht van abonnementen en vaste kosten: per tegenpartij het maandbedrag, sinds wanneer, verschil tegenover vorig jaar, laatje (overhead, ploeg: middelen). Nieuw: een detector van terugkerende tegenpartijen, zuiver en met test.
- Een alternatief zoeken op het web met `zoek_web` en `lees_webpagina` (bestaan). Altijd met bron en datum van de prijs; prijzen op websites zijn indicatief.
- Een opzeg- of heronderhandelingsbrief opstellen die Bram leest. Vertrekken kan alleen na ja en alleen via een weg die bestaat (WhatsApp naar iemand die in een dossier staat; mail bestaat niet). Zarvis kent de contractvoorwaarden niet: hij zoekt het contract of de mail op en zegt wat hij niet vindt (opzegtermijn, einddatum). Hij zegt nooit zelf iets op in een webportaal (computer use is niet gebouwd en zou onder "geld en onomkeerbaar" vallen).
- Niet in "kosten drukken" voorlezen: lonen en wat bij het zaakvoerderspakket hoort (zie 3.6).

### 3.5 Het loket: `financieel-loket`

**Waar.** Een nieuwe functie in FINDASHBOARD (project `lrlmcnpbaybgtvqgerde`), naar het voorbeeld van `compass-marketing-loket`. Uitrollen gaat via de Lovable-agent in dat project (zelfde weg als Compass, `lovable-deploy`-werkwijze). De functie gebruikt de serversleutel van FINDASHBOARD zelf; ze kent geen gedeeld geheim met Zarvis.

**Toegang, in deze volgorde, met weigering bij de eerste fout:**
1. `Authorization: Bearer <token van Compass>` aanwezig, anders 401.
2. Het token aan Compass voorleggen (`/auth/v1/user`) en de rol `admin` nakijken (rpc `has_role`), zoals het marketingloket (`index.ts:56-70`). Anders 403.
3. Het mailadres uit Compass toetsen aan een korte lijst. Voorstel: een secret `FINANCIEEL_TOEGELATEN` (komma-gescheiden) in Lovable, zodat adressen niet in code of in dit document staan. Anders 403 met "geen toegang tot financiën".
4. Tenant vast op Belhouse (`00000000-0000-0000-0000-000000000001`). Er is geen tenantkeuze in het verzoek.
5. Niet `authorizeRequest` uit `_shared/auth.ts` gebruiken: die laat de cron-sleutel en de serversleutel binnen. Het loket aanvaardt alleen een gebruiker.

**Verzoek.** `POST /functions/v1/financieel-loket`, JSON:

```json
{ "action": "overzicht", "params": { }, "voorstel_id": "…", "bevestigd": true }
```

`params` per actie; `voorstel_id` en `bevestigd` alleen bij een doe-actie.

**Antwoord.**

```json
{
  "ok": true,
  "actie": "overzicht",
  "gegevens": { },
  "actueel": { "kpi_snapshot": "JJJJ-MM-DD", "boekhouding_tot": "JJJJ-MM-DD", "lonen_tot": "JJJJ-MM", "lopende_maand_onvolledig": true },
  "onzeker": [ "…" ],
  "definities": { "bekrachtigd": false },
  "weggelaten": [ "zaakvoerderspakket", "loon per persoon", "aandeel grootste klant" ]
}
```

Bij weigering: `{ "ok": false, "code": "GEEN_TOEGANG" | "BUITEN_GRENS" | "VOORSTEL_VERLOPEN" | "BRON_STIL", "fout": "…" }`. `actueel` en `onzeker` zijn altijd aanwezig; Zarvis moet ze kunnen zeggen. `definities.bekrachtigd` komt uit een sleutel in `kb_assumptions` (niet aanwezig is gelijk aan niet bekrachtigd), zodat de waarschuwing niet afhangt van een instructie.

**Acties.**

| Actie | Soort | Wat | Ja nodig |
|---|---|---|---|
| `overzicht` | lezen | laatste twee rijen `kpi_daily`, `actueel`, open bevindingen per categorie | nee |
| `verklaring` | lezen | waarom veranderde het resultaat (waterval tussen twee standen) | nee |
| `signalen` | lezen | `signalen()` met drempels en of ze "te herijken" zijn | nee |
| `kostentrend` | lezen | kosten per 100 euro omzet, groepen, wie dreef het | nee |
| `abonnementen` | lezen | terugkerende tegenpartijen | nee |
| `openstaand` | lezen (Yuki live) | debiteuren en crediteuren, ouderdom, `heeft_email` | nee |
| `aanvullen` | lezen | mistsaldo, ontbrekende vaste boekingen, restbak, open bevindingen | nee |
| `marge_norm` | lezen | de norm(en), status, geldigheid | nee |
| `herinnering_voorstel` | voorstel | stelt tekst op, bewaart een voorstel (inhoud en hash, geldig 30 minuten, per gebruiker). Geen effect buiten FD. | nee |
| `herinnering_gedaan` | schrijft in FD | registreert dat Zarvis de herinnering verstuurde (teller, 14 dagen) | ja, hoort bij het versturen |
| `bezorg_boekhouder_voorstel` / `_uitvoeren` | voorstel / uitvoeren | `UploadDocument` naar het Yuki-archief | ja |
| `vertrouwelijk_overzicht` | lezen | de vertrouwelijke cijfers, alleen voor het venster | nee, maar nooit voor het model |

Geen enkele actie betaalt, boekt, wijzigt een contact in Yuki of geeft een bankopdracht. Elke aanroep komt in een logtabel in FD (`door`, actie, parameters zonder inhoud van documenten, `voorstel_id`), in de stijl van `dashboard_audit_log` met voorvoegsel `zarvis:`.

**De ja-handdruk (versterking).** Vandaag zet het model zelf `bevestigd: true` (`doen.ts:174`, `:245`). Voor geld en klantcontact volstaat dat niet. Voorstel:
- Het loket bewaart het voorstel en geeft een `voorstel_id` terug. Uitvoeren eist die id, dezelfde gebruiker, ongewijzigde inhoud, niet verlopen.
- Het ja zelf komt van een knop in het venster van Zarvis die rechtstreeks het loket (of een Compass-functie) aanroept, niet via het model. Bram kan ook gewoon "ja" typen, maar dan toetst de poort op de laatste gebruikersboodschap (een ja na het voorlezen); de knop is de sterke weg.
- Dit raakt de poort en het venster in de Zarvis-repo en geldt daarna ook voor marketing en WhatsApp.

**Wat naar de server moet, en hoe we twee versies vermijden.**
- Naar de server: alles wat Zarvis als feit uitspreekt en dat nu enkel in de browser rekent: `signalen`, de kostengroepen en trend (`hefbomen.ts`), de mistfuncties (`mist.ts`), `omzetPerSoort` en `perTegenpartij`, en voor stap 6 de marge-kernen (`computeCapacity`, `computeProject`, `computeRegieCalc`). Wat al op de server staat (`kpi_daily`) wordt gewoon gelezen, niet herrekend.
- Probleem: de server heeft het lopende jaar niet als lijnen (alleen afgesloten jaren in `gl_history`) en `kpi_maand_stand` gebruikt "andere laatjes dan de waterval" (verkenning FD). Oplossing: een nachtelijke kopie van het lopende jaar in een eigen tabel (naast `gl_history`, niet in `gl_history`, want `archiveren` weigert bewust het lopende jaar), geschreven door `kpi-snapshot`. Alternatief: elk verzoek live uit Yuki; trager en afhankelijk van Yuki op dat moment.
- Eén versie: de zuivere kernen verhuizen naar `supabase/functions/_shared/kern/` (precedent: `_shared/kaart-data.ts`). De bestanden in `src/lib/` worden dunne doorgeefluiken (`export * from`). Het enige afhankelijkheidsprobleem is `Transaction` uit `@/lib/api/yuki` en `maandMin` uit `./vensters`: die verhuizen mee of worden lokale types. Bewijs: dezelfde vitest-test met vaste invoer draait de kern; het loket heeft één test die dezelfde kern met dezelfde invoer aanroept; een controle die faalt als `src/lib/<x>.ts` meer is dan een doorgeefluik.
- De bestaande dubbele versies (mini-engine in `controleorgaan`, `annualizeYtd`) horen er in dezelfde stap bij, anders blijven twee waarheden bestaan.
- Een functie kan niet importeren uit de map van een andere functie; `_shared` is de enige veilige plaats (Zarvis-overdracht, "Techniek").

### 3.6 Vertrouwelijkheid

**Nooit hardop** (Bram: loonkost per persoon, pakket zaakvoerder, grootste klant). Concreet in FD:
- Loonkost per persoon: `kb_workers` (bruto, RSZ, fonds, extralegaal, subsidie, gefactureerd) en `loon_allin` per werker, de personeelskost per uur per persoon, namen met bedrag.
- Pakket zaakvoerder: de sectie `zaakvoerder` en `spiegel_zaakvoerder` in de kaart, rekeningen 618xxx, `management` in `kpi_daily`, `mgmt_cash_618_year`, `warrants_vaa_year`, de wagens met `cost_object = owner`, het signaal "Zaakvoerder-kost hoog" (`signalen.ts:77`) dat bedrag en percentage noemt.
- Aandeel van de grootste klant: `klantAandelen` (`sectie-kaart.ts:486`), `perTegenpartij` op de verkooprekeningen, "afhankelijkheid van klanten".

**Twee sluipwegen die ik vond:**
- Kleine groepen. Er zijn 3 werkers in `kb_workers`. Het totaal "ploeg: mensen" is dan bijna het cijfer van één persoon. Een regel in code: een totaal van minder dan een door Bram bepaald aantal personen (voorstel 5) is zelf vertrouwelijk.
- Afleidbaar. Dekkingsgraad en break-even rekenen met "vast blok" = zaakvoerder plus overhead plus afschrijving plus intresten. Het vaste blok mag als totaal, het ontleden niet. Of een break-even-omzet genoemd mag worden, is een keuze van Bram (vraag 4).

**Afdwingen in code, in lagen:**
1. Bron: het loket heeft een vaste lijst `VERTROUWELIJK` (rekeningen en kaartsecties, kb-velden, `kpi_daily`-groep `management`, klantaandelen). Elke leesactie laat die velden weg en zegt dat in `weggelaten`. Er is geen parameter om ze erbij te vragen. Dat is de sterkste laag: wat het model niet krijgt, kan het niet zeggen.
2. Venster: één actie `vertrouwelijk_overzicht`. Het Zarvis-gereedschap zet de cijfers alleen in `bron` (het gegevensvenster) en geeft het model als `tekst` enkel "getoond in het venster, niet voorgelezen". Dat bestaat al zo: `index.ts:351-372` stuurt `bron` apart. Het model kan er dan niets over zeggen, ook niet bij een rechtstreekse vraag.
3. Test: een test met herkenbare nepgetallen in de loketantwoorden die faalt als één van die getallen in `tekst` of in de berichtgeschiedenis (`zarvis_berichten`) van een financieel gereedschap opduikt, voor elk financieel gereedschap.
4. Terugvaller: het loket geeft de getallen die het weglaat als lijst `verboden_getallen` terug aan de Zarvis-functie (niet aan het model); die scant vóór het streamen en vóór de stem de uitvoer op de gewone schrijfwijzen. Dat vangt een uitlek via een ander gereedschap; het vangt geen afleiding (A min B). Het is een extra laag, geen hoofdlaag.
5. Wie: alleen het mailadres op de korte lijst. Een medewerker die Zarvis gebruikt heeft geen enkel financieel gereedschap (`gereedschapVoor` en het loket zelf).
6. De instructie van het model zegt het ook, maar niets hangt daarvan af.

Een opmerking: de gegevensvensters staan op het scherm van de pc; "niet hardop" is niet "niet zichtbaar". Of Bram een tweede klik voor "toon" wil, is een ontwerpkeuze.

## 4. Voorstel in bouwstappen

Volgorde: eerst wat niets verandert (lezen met eerlijke actualiteit en de vertrouwelijkheid vanaf dag één), dan wat geld en klanten raakt. Alles wat buiten Compass iets verandert gaat na een ja via de versterkte handdruk.

### Stap 1: Loket en lezen met vertrouwelijkheid (14 u)
- **Zarvis kan dan:** vertellen hoe het ervoor staat, met `actueel`, `onzeker` en "definities nog niet bekrachtigd", zonder vertrouwelijke cijfers; open bevindingen van het controleorgaan opnoemen.
- **Geraakt:** FD (nieuwe functie `financieel-loket`, logtabel, secret `FINANCIEEL_TOEGELATEN`); Zarvis (`financieel.ts`, connector "Financiën" in de beheersectie, niet voor geplande controles).
- **Ja van Bram:** niet nodig om te lezen.
- **Nodig van Bram:** antwoorden op de vragen 4 en 5; het mailadres op de lijst in Lovable; een uitrol in het FD-project; de cron-sleutel eerst naar een secret.
- **Bewijs:** tests tegen een nagebootst loket (zoals `marketing`); echt loket: 401 zonder token, 403 voor een andere gebruiker, 200 voor Bram; test met nepgetallen dat vertrouwelijke waarden nergens in `tekst` komen; één echte vraag in het venster.

### Stap 2: Eén versie van de rekenlogica en het lopende jaar op de server (20 u)
- **Zarvis kan dan:** verklaren waarom het resultaat veranderde, signalen geven, en de kostentrend en "wie dreef het" noemen, met dezelfde cijfers als het scherm.
- **Geraakt:** FD: `_shared/kern/` (kernen uit `src/lib` en `formulas.ts`), `src/lib/*` worden doorgeefluiken, nieuwe tabel voor de lopende-jaar-lijnen, `kpi-snapshot`, mini-engine in `controleorgaan`. Zarvis: nieuwe leesacties.
- **Ja van Bram:** niet nodig.
- **Nodig van Bram:** akkoord dat zijn dashboard intern verhuist (geen zichtbaar verschil bedoeld); optioneel bekrachtigen van de definities.
- **Bewijs:** de bestaande tests (`sectie-kaart`, `hefbomen`, `signalen`, `engines-sluiting`) blijven groen zonder één aangepast getal; een vaste-invoertest geeft identiek JSON in app en loket; het scherm toont voor dezelfde dag dezelfde cijfers als Zarvis.

### Stap 3: Openstaande posten lezen en aan dossiers koppelen (14 u)
- **Zarvis kan dan:** zeggen welke klantfacturen achterstallig zijn en bij welk dossier, en welke leveranciersfacturen binnenkort vervallen.
- **Geraakt:** FD (`openstaand` met een Yuki-allowlist), Compass (nieuwe tabel `dossier_factuur_koppeling`, additief), Zarvis (`openstaande_facturen`).
- **Ja van Bram:** niet om te lezen; een koppeling die onzeker is wordt aan Bram voorgelegd en pas na ja bewaard.
- **Nodig van Bram:** controleren dat de Yuki-sleutel `Accounting` toelaat (of een bijgemaakte sleutel); 5 echte facturen als proef.
- **Bewijs:** met de echte sleutel de ruwe xml van `OutstandingDebtorItemsByDate` bewaren en met de Yuki-scherm vergelijken (aantal, bedrag, vervaldatum, `DocumentID`); een telling van hoeveel facturen automatisch aan een dossier komen en hoeveel "onzeker" zijn.

### Stap 4: Herinneringen opstellen en na ja versturen (18 u, waarvan 6 voor de handdruk)
- **Zarvis kan dan:** een herinnering opstellen, voorlezen, na ja versturen via WhatsApp, het in het dossier en de log noteren, en niet opnieuw sturen binnen 14 dagen.
- **Geraakt:** Zarvis (poort `voerUit` en het venster: een Ja-knop die het model omzeilt), FD (voorstel- en logtabellen, `herinnering_*`), bestaande `stuur_whatsapp`.
- **Ja van Bram:** per herinnering, na het voorlezen met bedrag, ontvanger en kanaal.
- **Nodig van Bram:** het aantal dagen na vervaldatum, het kanaal, de toon van de tekst (vraag 2).
- **Bewijs:** test dat zonder geldig `voorstel_id` en ja niets vertrekt; test dat een model dat `bevestigd: true` meegeeft zonder knop niets verstuurt; test op de 14 dagen; de eerste echte herinnering aan Bram zelf als proefklant.

### Stap 5: Boekhouding aanvullen (24 u: lijst 6, mail 8, bezorgen 10)
- **Zarvis kan dan:** per gat (wachtrekening, restbak, bevinding, ontbrekende vaste boeking) uitleggen wat er ontbreekt, de mail met de factuur opzoeken, en na ja document en bericht naar de boekhouder brengen.
- **Geraakt:** FD (`aanvullen`, `bezorg_boekhouder_*`, tweede Yuki-sleutel met `Archive`), Mail-CRM (nieuwe alleen-lezen actie `bijlage` in `compass-loket`, rechtstreeks naar productie), Zarvis.
- **Ja van Bram:** per bezorging (document plus bericht).
- **Nodig van Bram:** hoe en naar wie (vraag 3); een Archive-sleutel; toestemming om Mail-CRM aan te raken.
- **Bewijs:** de lijst klopt met `mist.test.ts` en de bevindingen in de databank; één echte mail met pdf wordt gevonden en gelezen; een upload van een testdocument in een testmap in Yuki (met toestemming van de boekhouder) verschijnt in het archief; niets in het journaal gewijzigd.

### Stap 6: Marge van offertes bewaken (18 u: norm en toets 10, poort in Compass 8)
- **Zarvis kan dan:** een offerte toetsen aan de bekrachtigde norm en zeggen wat ontbreekt; Compass vraagt een reden bij het maken van een bijlage of rapport onder de ondergrens.
- **Geraakt:** FD (`marge_norm`, kern van `computeProject`), Compass (`OffertebijlageDialog.tsx`, `send-rapport-mail`), Zarvis (`toets_offerte`).
- **Ja van Bram:** de norm zelf; een bijlage onder de grens maakt hij met een reden.
- **Nodig van Bram:** de norm (vraag 1); waar de echte offerte gemaakt wordt.
- **Bewijs:** drie dossiers met gekende uitkomst (boven, op, onder); een test dat de kern in loket en simulator hetzelfde geeft; de reden komt in de calculatiehistoriek.

### Stap 7: Kosten drukken (16 u: overzicht 8, alternatief en brief 8)
- **Zarvis kan dan:** een lijst van abonnementen en vaste kosten tonen, zeggen wat steeg, een alternatief zoeken met bron, en een brief opstellen die pas na ja vertrekt.
- **Geraakt:** FD (`abonnementen` met een nieuwe detector in de kern), Zarvis (bestaande web- en WhatsApp-gereedschap).
- **Ja van Bram:** voor het vertrekken van een brief of bericht; opzeggen doet hij zelf.
- **Nodig van Bram:** niets nieuws; een keuze of lonen en zaakvoerder er nooit in komen (zie 3.6).
- **Bewijs:** de detector vindt op afgesloten jaren de bekende terugkerende kosten en geeft geen vals alarm bij kosten die één keer voorkomen; een brief wordt voorgelezen en verstuurd naar Bram zelf.

**Totaal: ongeveer 124 uur** (marge 100 tot 160, vooral stap 2 en 5 zijn onzeker).

## 5. Afhankelijkheden van andere ideeën

- **IDEE-29:** bepaalt de regel (intern zelf, extern vragen); stap 4 versterkt de poort voor alle rollen.
- **IDEE-15 (rollen tonen):** voorstellen die op ja wachten (herinneringen, bezorgingen) moeten daar zichtbaar zijn, anders ontstaat de chaos die Bram wil vermijden.
- **IDEE-16 (taken en herinneringen):** een wekelijkse controle op openstaande facturen kan niet met het huidige loket, want een geplande taak heeft geen token. Oplossing later: de voorbereiding in FD zelf plannen (pg_cron) en voorstellen in een tabel zetten die Zarvis bij het volgende gesprek toont.
- **IDEE-10 (mails):** stap 5 hangt aan `lees_mails` en een nieuwe `bijlage`-actie; Mail-CRM heeft geen testomgeving.
- **IDEE-12 (werf):** een betrouwbare kostprijs per uur voor de marge (uren, reistijd) wacht op de tijdsnormen en op één waarheid over uren (zie `VERKENNING-WERF.md`).
- **IDEE-11 (marketing):** marketingkost hoort in "kosten drukken"; dezelfde handdruk.
- **IDEE-30 (brein):** de bekrachtigde norm en de beslissingen "waarom deze prijs" horen daar in te landen.
- **IDEE-21 (web):** bestaat, wordt gebruikt voor alternatieven.

## 6. Risico's

- **Sleutelrechten zijn breed.** Een Yuki-sleutel met `Accounting` kan boekingen maken, met `Archive` kan hij uploaden, met `Contact` kan hij contacten wijzigen. Mitigatie: allowlist in het loket, een aparte schrijfsleutel alleen voor `Archive`, nooit de leessleutel gebruiken om te schrijven.
- **Vaste cron-sleutel in de code van FD** (`_shared/auth.ts:17`): wie ze kent, roept alle functies aan, ook die de boekhouding lezen. Het nieuwe loket gebruikt ze niet, maar het probleem blijft.
- **`bevestigd` kan door het model vervalst worden.** Gevaar: een herinnering die zonder echte ja vertrekt. Mitigatie: voorstel-id en Ja-knop (stap 4).
- **Verouderde of foute herinnering.** Een betaling die op de bank staat maar nog niet aan de post gekoppeld is, geeft een onterechte herinnering aan een klant. Mitigatie: `CheckOutstandingItem` vlak voor het versturen, een controle op bankbetaling van hetzelfde bedrag in de laatste 14 dagen, en altijd een ja van Bram.
- **Verkeerde koppeling aan een dossier.** Namen lijken op elkaar; een herinnering aan de verkeerde klant is erger dan geen. Mitigatie: onder de zekerheidsgrens altijd vragen, koppeling bewaren met herkomst.
- **Twee versies van de rekenlogica.** Bestaan al; een derde in het loket zou de Zarvis-cijfers van het scherm laten afwijken. Mitigatie: stap 2.
- **Cijfers die Bram niet bekrachtigd heeft** worden als feit voorgelezen. Mitigatie: `definities.bekrachtigd` uit de databank, in elk antwoord.
- **Uitlek van vertrouwelijke cijfers** via kleine groepen of afleiding. Mitigatie: zie 3.6; een rest-risico blijft, vooral bij afleiding.
- **WhatsApp via Baileys** kan geblokkeerd worden; herinneringen aan klanten vergroten dat risico. Bram aanvaardde het eerder voor versturen. Mail zou een alternatief zijn, maar bestaat niet.
- **Mail-CRM** gaat bij elke wijziging rechtstreeks naar productie; vier schrijvers op dezelfde kolommen.
- **Persoonsgegevens van klanten** (naam, e-mail, telefoon) zitten in de Yuki-antwoorden. Mitigatie: het loket geeft er zo weinig mogelijk van door en Zarvis gebruikt de gegevens uit het dossier.
- **Tekst van facturen en mails** kan opdrachten bevatten. Mitigatie: gegevens, geen opdracht, zoals bij `lees_mail`.
- **Lopende maand en achterlopende lonen** maken kostentrends vals; het loket zegt het in `onzeker`.

## 7. Zeker tegenover niet kunnen nagaan

**Zeker (zelf gelezen of gemeten):**
- Aantallen en structuur van FD (hierboven), dat `gl_history` alleen afgesloten jaren bevat en `gl_history` geen documentverwijzing kent.
- De drie tot vijf normen voor marge en hun notitie; dat geen enkele bekrachtigd is volgens de notitie.
- De lijst bewerkingen van `Accounting.asmx`, `Archive.asmx` en `Contact.asmx`, de parameters van `OutstandingDebtorItems`, `...WithPaymentReference` en `UploadDocument`; de rechten per dienst en dat er geen alleen-lezen-schakelaar is.
- Dat `bron` en `tekst` in Zarvis apart lopen; dat `bevestigd` door het model komt; het patroon van `compass-marketing-loket`.
- Dat Compass 142 dossiers, 47 calculaties en 1 offertebedrag heeft; dat het mail-loket `heeft_bijlagen` geeft maar geen bijlage.
- Het bestaan van de dubbele versies in `controleorgaan`.

**Niet kunnen nagaan:**
- Of er ooit een Yuki-aanroep voor openstaande posten of documenten werkt met de huidige sleutel: niets is aangeroepen. De velden komen uit het supportartikel voor `OutstandingDebtorItemsByDate` (niet voor `OutstandingDebtorItems`); die van de leveranciersvariant stonden niet in het gelezen artikel. Of de sleutel `Archive` en `Contact` toelaat, weet ik niet.
- Of het ZL-nummer, een projectcode of alleen een klantnaam op de Yuki-factuur staat, en dus hoe goed het koppelen werkt.
- Wat er nu op de wachtrekeningen staat (het lopende jaar is niet opgeslagen).
- Waar de echte offerte gemaakt wordt, en of `calculator_state` genoeg is voor een kostprijs.
- Of Lovable een functie in FD die relatief importeert uit `_shared/kern/` correct bundelt; het precedent `kaart-data.ts` is een bestand zonder imports. Eerst proberen met één klein bestand.
- Of het Yuki-archief een testmap kan krijgen, en welke `folder`-nummers gelden.
- Hoe snel Yuki antwoordt bij een live vraag per Zarvis-vraag.
- Of de hoeveelheid werkers in `kb_workers` (3) de realiteit weergeeft; alleen gemeten in de tabel.

## 8. Vragen voor Bram (hoogstens vijf)

1. **Offerte:** waar wordt de echte offerte gemaakt (Bouwflow of Compass), en welke ondergrens op marge bekrachtig je? Nu staan 15, 20 en 35 procent naast elkaar, alle "te valideren". En geldt "nooit onder kostprijs, altijd stop"?
2. **Herinneringen:** via welk kanaal (WhatsApp, of wachten op mail), na hoeveel dagen na de vervaldatum, en mag Zarvis nooit een tweede, strengere herinnering sturen zonder jou?
3. **Boekhouder:** hoe wil je dat het bij hem komt (in het Yuki-archief, per bericht, of beide), en mag er een tweede Yuki-sleutel komen met alleen het archiefrecht?
4. **Vertrouwelijk:** mogen loonkost per persoon, je pakket en je grootste klant alleen op het scherm verschijnen en nooit hardop, ook niet als je er rechtstreeks om vraagt? Telt een totaal van de ploeg ook mee zolang het maar drie werkers zijn? Mag een break-even-omzet wel hardop?
5. **Voorwaarden:** wil je eerst de definities van de kerncijfers bekrachtigen en de vaste cron-sleutel naar een echt secret laten verhuizen, vóór Zarvis er cijfers uit voorleest?

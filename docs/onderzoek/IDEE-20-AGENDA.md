# IDEE-20: agenda en locatie, verwittigen als Bram nog niet onderweg is

Onderzoek van 2026-11-24. Alleen gelezen; niets gebouwd, uitgerold of verstuurd.

## 1. Samenvatting

1. De afspraken met klanten staan vandaag in Calendly (plaatsbezoek en videocall). Compass haalt ze al op en bewaart het tijdstip in `pre_intake.plaatsbezoek_scheduled_at` en `videocall_scheduled_at`; het werfadres staat in `leads.adres` (met `adres_lat` en `adres_lng`). Voor plaatsbezoeken is dus geen nieuwe sleutel nodig.
2. Welke agenda Bram zelf bijhoudt (Google of Outlook) kon ik niet nagaan. Er is geen enkele agenda-code in Mail-CRM of Maildude: die lezen alleen mail (Mail.Read). Een Google Meet-link in Calendly wijst op Google Calendar, maar dat is een gevolgtrekking.
3. De kleinste versie die werkt: een geplande controle die per plaatsbezoek het vertrekuur berekent (`bereken_route` met verkeer, min marge) en op dat uur meldt, dan WhatsApp, dan belt. "Nog op kantoor" wordt afgeleid uit het feit dat de pc nog actief gebruikt wordt (Electron `powerMonitor`). Geen gsm nodig.
4. Locatie van de gsm geven we op: iPhone kan geen betrouwbare achtergrondlocatie vanuit een webpagina of Opdracht, Android kan met Tasker. Toestel is nog onbekend. De ritten van de Werf-app zijn een maandelijkse Excel-import voor het loon en kunnen niet dienen.
5. Totaal: ongeveer 14 tot 20 uur voor de volledige keten zonder klantbericht en zonder agenda buiten Calendly. Oproepen naar Google blijven ruim onder de gratis 5000 per maand.

## 2. Wat er vandaag is

- **Calendly in Compass.** `supabase/functions/sync-calendly-event/index.ts` roept `https://connector-gateway.lovable.dev/calendly` aan (regel 4) met `LOVABLE_API_KEY` en het secret `CALENDLY_API_KEY` (regels 95 tot 102). Het leest `/users/me`, `/scheduled_events` (met `user`, `status=active`, `min_start_time`, `invitee_email`) en `/scheduled_events/{id}/invitees`. Het sorteert afspraken in `videocall` of `plaatsbezoek` op de naam en de locatie (regels 44 tot 49). Het zoekt per klant, niet per dag.
- **Opslag.** `src/pages/LiveCalling.tsx` regels 225 tot 283 zet het resultaat in `pre_intake` (`plaatsbezoek_scheduled_at`, `videocall_scheduled_at`, `google_meet_link`). De automatische synchronisatie draait alleen bij het openen van een telefoongesprek; bij een bestaand tijdstip overschrijft enkel de knop "Calendly verversen" (regels 244 tot 262). Een verzet plaatsbezoek in Calendly staat dus niet vanzelf juist in Compass.
- **Adres.** `leads.adres` is het werfadres per dossier (`supabase/migrations/20261119120000_werfadres_per_dossier.sql`, regels 8 tot 12). `leads` heeft ook `adres_lat` en `adres_lng` (`src/integrations/supabase/types.ts` regels 577 en 578). `pre_intake.lead_id` verwijst naar het dossier (`20260518120000_create_pre_intake.sql` regel 4).
- **Zarvis-gereedschap.** `bereken_route` (`supabase/functions/_shared/zarvis/buiten.ts` regels 25 tot 144) neemt `naar` of `dossier_id`, `van` of het secret `ZARVIS_VERTREKADRES`, en `vertrek_op`; het geeft rijtijd met en zonder verkeer en `vertraging_minuten`. Het gebruikt `routingPreference: 'TRAFFIC_AWARE'` (regel 106). Het is gebouwd maar niet uitgerold (HANDOFF regel 53) en wacht op `GOOGLE_MAPS_API_KEY`. Het staat niet in de lijst met schrijvende gereedschappen, dus het zit in `LEES_GEREEDSCHAP` (`gereedschap.ts` regel 457) en de achtergrondcontrole mag het gebruiken.
- **Op de achtergrond.** `supabase/functions/zarvis-taken/index.ts`: elke minuut, een controle krijgt alleen leesgereedschap (regels 87 tot 88), verwittigen via `melding`, `whatsapp`, `beide` of `bel` (regels 115 tot 122; bellen via Twilio, `bellen.ts`). Alleen taken van een beheerder worden uitgevoerd (regels 133 tot 138). Een taak kent geen "pas als"-voorwaarde buiten wat het model bij elke beurt zelf controleert.
- **Programma op de pc.** `zarvis-desktop/main.js` is een Electron-schil (363 regels) zonder enige activiteitsmeting; ik vond geen `powerMonitor` of idle-code in de map.
- **Beheer.** `src/pages/ZarvisBeheer.tsx` regel 43 en `zarvis-desktop/installatie.nsi` regel 70 hebben al een rij "Agenda en Calendly", soort `later`.
- **Andere projecten.** Mail-CRM (`C:\Users\bramk\Desktop\mail-crm`) gebruikt Microsoft Graph als toepassing met `client_credentials` en alleen `Mail.Read` (`HANDOFF-MAIL-CRM.md` regels 201 tot 205), voor `info@belhouse-atelier.be` en `hello@zolderpunt.be` (`SPRINTPLAN.md` regels 20 en 21). Maildude (`C:\Users\bramk\.claude\projects\Maildude`) gebruikt Graph namens de gebruiker (device flow) met `Mail.Read`, `Mail.ReadWrite`, `Mail.Send` (`app/mail/graph_connector.py` regels 19 en 23; `app/mail/sender.py` regel 9). Geen van beide heeft een agenda-permissie. Een agenda-woord in mail-sync is enkel een filter dat Calendly-mails negeert (regel 41).

## 3. Bevindingen per vraag

### 3.1 Welke agenda gebruikt Bram?

- Zeker: klantafspraken worden via Calendly geboekt (links `calendly.com/belhouse/...` in `src/pages/LiveCalling.tsx` regels 455 en 456 en `src/lib/rapportMailTekst.ts` regel 16). Ze komen met een Calendly-bevestiging en agenda-uitnodiging bij de klant.
- Waarschijnlijk: Calendly schrijft naar een agenda van Bram. `.lovable/plan/planning-sectie-herstellen-...-2026-09-18.md` regel 6 spreekt over een afspraak met Meet-link; Meet vraagt Google Calendar als gekoppelde agenda. Of Bram daarnaast Outlook gebruikt (zijn mail is Microsoft 365) of Bouwflow voor afspraken, is niet na te gaan uit de code.
- Niet gevonden: afspraken in Bouwflow of in een dossierveld buiten de twee `pre_intake`-kolommen. Het is wel mogelijk dat Bram ook losse afspraken (leverancier, werf, privé) rechtstreeks in zijn agenda zet; die staan dan niet in Calendly of Compass.
- Eerlijk: ik las Brams echte agenda niet. De vraag aan hem (vraag 1 hieronder) lost dit in één antwoord op.

### 3.2 Per bron: hoe leest een serverfunctie de afspraken van vandaag en morgen

| Bron | Weg | Toestemming en sleutels | Bestaat al? |
|---|---|---|---|
| Compass zelf | SQL op `pre_intake` en `leads` met de rechten van de gebruiker (of de serversleutel in `zarvis-taken`) | geen nieuwe | Ja |
| Calendly | `GET /scheduled_events?user=...&min_start_time=...&max_start_time=...&status=active`, daarna de invitees per afspraak voor de klantnaam; het veld `location` (type en tekst) staat in elke afspraak | `CALENDLY_API_KEY` bestaat al als secret en wordt via de poort van Lovable gebruikt | Ja, in `sync-calendly-event`; alleen "per dag" ontbreekt |
| Microsoft Outlook | Graph `GET /users/{id}/calendarView?startDateTime=...&endDateTime=...`; met `Prefer: outlook.timezone="Romance Standard Time"` krijg je lokale tijden; het veld `location` en `start` zitten in het resultaat | Als toepassing of namens de gebruiker: minimaal `Calendars.ReadBasic`, voor locatie en details `Calendars.Read`; admin consent voor de toepassing, en best een toegangsbeperking tot Brams mailbox (zelfde procedure als Mail-CRM, `HANDOFF-MAIL-CRM.md` regels 205 tot 216) | Gedeeltelijk: de app-registratie `mail-crm-sync` bestaat, maar met alleen `Mail.Read`; een extra permissie en nieuwe consent zijn nodig. Namens-de-gebruiker in Maildude vraagt een nieuwe aanmelding met de extra scope |
| Google Calendar | `GET https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=...&timeMax=...&singleEvents=true&orderBy=startTime`; veld `location` | OAuth-toestemming van Bram (scope `calendar.readonly`, of `calendar.events` om te schrijven) en een Google Cloud-project met een vernieuwingstoken als secret; of de Lovable-connector als die voor Google Calendar bestaat | Nee, nergens in Brams projecten |

Bronnen (officieel): Microsoft Graph calendarView, https://learn.microsoft.com/en-us/graph/api/user-list-calendarview?view=graph-rest-1.0 (permissietabel: delegated en application, minimaal Calendars.ReadBasic; start en einde als ISO 8601; zonder tijdzone-header komt alles in UTC terug). Calendly, https://developer.calendly.com/api-docs (de pagina `list-events` gaf mij alleen de inleiding; de parameters hierboven komen uit de bestaande code, `sync-calendly-event/index.ts` regels 114 tot 120, en de OpenAPI-beschrijving op https://developer.calendly.com/openapi/calendly-api.yaml die ik niet kon openen). Google Calendar `events.list`, https://developers.google.com/workspace/calendar/api/v3/reference/events/list (niet door mij geopend; de parameters zijn uit mijn geheugen en moeten bij de bouw nagekeken worden).

### 3.3 Van agendapunt naar adres

- Calendly: het `location`-veld van een plaatsbezoek is niet het werfadres. In de code staat dat de classificatie op `klantadres` of `physical` steunt (regel 46), dus het veld bevat een soort of een vaste tekst, geen straat; dat is te bevestigen met één echte afspraak. Betrouwbaarder: de invitee (naam, e-mail, telefoon) gaat naar het dossier, zoals `sync-calendly-event` al doet met zijn scoring. Het dossier geeft `leads.adres`.
- Nog beter: lees niet Calendly maar `pre_intake.plaatsbezoek_scheduled_at` en spring met `lead_id` naar `leads.adres`. Dan is het adres meteen het werfadres en `adres_lat` en `adres_lng` kunnen aan Google gegeven worden in plaats van een tekstadres (nauwkeuriger).
- Afspraken zonder dossier (losse agendapunten): het veld `location` van Google of Outlook; als dat leeg is, vraagt Zarvis het één keer ("Waar is dit?") in plaats van te gokken. Nooit een klant "opzoeken" op de titel zonder dat Bram het ziet.
- Beperking: `pre_intake.plaatsbezoek_scheduled_at` is verouderd als de klant in Calendly verzet en niemand "Calendly verversen" drukt. De controle moet daarom zelf de dag van Calendly verversen (stap 1 hieronder).

### 3.4 Waar is Bram: opties

| Optie | Haalbaarheid | Privacy | Opmerking |
|---|---|---|---|
| **A. Altijd verwittigen op het vertrekuur** | Meteen te bouwen, geen locatie nodig | Geen locatiegegevens | Meldt ook als hij al onderweg is: ruis. Kleinste, maar niet wat Bram vroeg |
| **B. Pc actief = nog op kantoor** (`zarvis-desktop`, Electron `powerMonitor.getSystemIdleTime()` en `getSystemIdleState`, officiële API, https://www.electronjs.org/docs/latest/api/power-monitor; `lock-screen` bestaat voor Windows en macOS) | Zelf te bouwen: de pc stuurt om de minuut zijn toestand naar de databank | Alleen "actief of niet", geen plaats | Zwakke punten: de pc staat soms thuis of in de camionette; een pc die stil staat kan ook "in vergadering op kantoor" zijn. Past bij Brams eigen voorstel in IDEE-20 en wordt door hem nog te bevestigen (open vraag in de ideeënbak) |
| **C. Locatie van de gsm** | Android: Tasker kan via een vaste taak elke paar minuten de locatie naar een webadres sturen (HTTP-opdracht), geen eigen app nodig. iPhone: een Opdracht (Shortcuts) kan "Haal huidige locatie" doen maar draait niet betrouwbaar op de achtergrond zonder een automatisering met een trigger (aankomen of vertrekken uit een plaats), waarmee wel "verlaat kantoor" te melden valt. Een webpagina of PWA krijgt op iPhone en Android in de achtergrond geen locatie | Echte locatie van Bram, bewaard op de server: gevoelig; zo beperken: enkel "binnen 300 m van kantoor ja of nee" opslaan, nooit de plaats | Toestel is onbekend (HANDOFF regel 74). iPhone kan wel een geofence-automatisering "ik verlaat kantoor"; dat is eigenlijk het gewenste signaal |
| **D. Ritten van de Werf-app** (`vehicle_trip` uit Autotracker) | Niet bruikbaar | Voertuigritten van werknemers | Gemaakt door een maandelijkse `.xlsx`-import voor het loon (`Zolderpunt - WERF/.../src/lib/verloning-data.ts` regels 1307 en 1427), hoort bij `pay_period`, en bevat geen live gegevens. De Werf-app heeft een Android-schil (Capacitor) maar geen locatieplugin (`package.json`), en is voor werknemers, niet voor Bram |

**De kleinste die werkt:** B, met A als terugval. Dat is ook wat Bram zelf voorstelde. Zodra zijn toestel bekend is: C als iPhone-automatisering "vertrokken van kantoor", die zijn dan één signaal per vertrek en niet een dure stroom locaties.

### 3.5 De regel

- Vertrekuur = begin afspraak min rijtijd met verkeer min marge. Marge: 10 minuten als vertrekpunt kantoor, vast in een instelling (niet in de code), door Bram aan te passen.
- Vertrekpunt: `ZARVIS_VERTREKADRES` (bestaat in `buiten.ts` regel 91) of het adres van de vorige afspraak als die korter dan 90 minuten voor de volgende eindigt. Eerste versie: altijd kantoor.
- Verwittigen, in stappen, met een rem:
  1. 15 minuten voor het vertrekuur: een melding in Zarvis, alleen als de pc actief is.
  2. Op het vertrekuur: nog actief, dan WhatsApp aan Bram ("Je moet nu vertrekken naar X, rijtijd nu 38 min, aankomst 14:02 voor een afspraak van 14:00").
  3. 10 minuten na het vertrekuur: nog altijd actief en de rit zou nu te laat aankomen: bellen (bestaat via Twilio; wacht op de vier secrets, IDEE-28). Slechts één oproep per afspraak.
  4. Meldt de pc "inactief of vergrendeld": geen enkel bericht, behalve als er na het vertrekuur nog geen teken is van vertrek (dan eenmaal WhatsApp).
- Herberekenen: eenmalig om 06:00 voor alle afspraken van de dag; dan elke 10 minuten vanaf 90 minuten voor het vertrekuur, tot het vertrekuur voorbij is (hoogstens ongeveer 9 oproepen per afspraak). De controle draait al elke minuut; de herberekening zelf is een intern schema.
- Kost: een verkeersbewuste route valt onder de Pro-SKU van de Routes API (zie https://developers.google.com/maps/documentation/routes/usage-and-billing: `TRAFFIC_AWARE` is Pro); volgens https://mapsplatform.google.com/pricing/ zijn 5000 Pro-oproepen per maand gratis. Rekenvoorbeeld: 3 afspraken per dag, 22 werkdagen, 9 oproepen: ongeveer 600 oproepen per maand, dus gratis. De prijs per 1000 boven de grens kon ik niet vinden; de pagina verwees naar een aparte prijslijst.
- Aandachtspunt: `bereken_route` geeft nu `vertrek_op` pas door als dat in de toekomst ligt (regel 107); voor het vertrekuur van straks klopt dat.

### 3.6 Doen: verzetten, klant verwittigen, inplannen

Alles wat buiten Compass iets verandert gaat via Brams uitdrukkelijk ja, in de code afgedwongen met `bevestigd: true` (IDEE-29 en HANDOFF regel 25).

- **Klant verwittigen dat Bram later is.** Het technisch kleinste: een WhatsApp-bericht aan de klant via `stuur_whatsapp` (bestaat), met de tekst vooraf voorgelezen en pas verstuurd na ja. Tekstvoorbeeld: "Goeiedag mevrouw X, ik ben iets later dan voorzien, rond 14:15 bij u." Dat gebruikt het telefoonnummer uit het dossier. Dit kan in stap 3.
- **Afspraak verzetten.** In Calendly kan een host een afspraak annuleren (`POST /scheduled_events/{uuid}/cancellation`) maar niet rechtstreeks verplaatsen; verzetten gaat via een nieuwe link voor de klant. Dat staat in de documentatie van Calendly en ik heb het niet nagegaan in de code. Veiliger en waar het kan: Zarvis stuurt de klant een bericht met de Calendly-link om zelf te verzetten. In Google of Outlook is verplaatsen een gewoon `PATCH` van de afspraak (extra schrijfrecht nodig).
- **Afspraak inplannen.** Calendly laat een host of een derde een afspraak maken via een link voor eenmalig gebruik (scheduling link); de klant kiest zelf het moment. Rechtstreeks een afspraak voor een klant boeken vraagt een Calendly-planabonnement met schrijf-API, wat ik niet kon nagaan. Voor een eigen agenda: `events.insert` bij Google of `POST /me/events` bij Graph, met Calendars.ReadWrite.
- Voor al deze acties: de uitvoerder op de achtergrond (`zarvis-taken`) mag niets schrijven of versturen (regels 11 tot 14); het gebeurt dus in het gesprek met Bram, of als een taak met een voorgelezen tekst die pas na ja vertrekt.

## 4. Voorstel in bouwstappen

**Stap 1. Vandaag en morgen lezen (`lees_agenda`)**
- Zarvis kan DOEN: "Wat staat er vandaag?" beantwoorden met de plaatsbezoeken en videocalls, elk met klant, uur en adres.
- Geraakt: `supabase/functions/_shared/zarvis/buiten.ts` (nieuw gereedschap, zit zo in `LEES_GEREEDSCHAP`), `gereedschap.ts` voor de connector `agenda`, `ZarvisBeheer.tsx` (rij van `later` naar `nu`), Calendly via het bestaande `CALENDLY_API_KEY`.
- Ja van Bram: geen (alleen lezen).
- Nodig van Bram: niets nieuws als `CALENDLY_API_KEY` werkt (te controleren).
- Omvang: 3 tot 4 uur.
- Bewijs: een proefafspraak in Calendly voor morgen; Zarvis noemt ze juist met adres; een verzette afspraak toont het nieuwe uur zonder dat iemand "verversen" drukt.

**Stap 2. Vertrekuur en melding (zonder locatie)**
- Zarvis kan DOEN: bij elke dag met een plaatsbezoek een controle plannen en op het vertrekuur melden, dan WhatsApp, dan bellen.
- Geraakt: `zarvis-taken/index.ts` (de controle krijgt `bereken_route` al), een instelling voor marge en vertrekadres in `zarvis_instellingen`, een dagelijkse taak (06:00) die de herberekeningen plant; de gebouwde `bereken_route` moet eerst uitgerold worden.
- Ja van Bram: een eenmalig ja op de regel (marge, wanneer WhatsApp, wanneer bellen), daarna vanzelf; verwittigen van Bram zelf is intern en vraagt geen ja per bericht.
- Nodig van Bram: `GOOGLE_MAPS_API_KEY` (Routes API aan); voor bellen de vier Twilio-secrets; een beslissing over de marge.
- Omvang: 4 tot 5 uur.
- Bewijs: een nagebootste Google (zoals in `src/lib/zarvis/__tests__/buiten.test.ts`) met drie scenario's: ruim op tijd, net op tijd, te laat; daarna één echte proefafspraak met de echte sleutel.

**Stap 3. "Nog op kantoor" uit de pc**
- Zarvis kan DOEN: alleen verwittigen als de pc nog actief is; zwijgen als Bram weg is.
- Geraakt: `zarvis-desktop/main.js` en `preload.js` (de `powerMonitor`-meting en een melding om de minuut), een kleine tabel `zarvis_aanwezigheid` (user_id, laatste_teken, toestand; alleen de eigen rij), een functie die de pc de toestand laat bewaren, en de controle van stap 2 die ze leest. Installatieprogramma opnieuw bouwen.
- Ja van Bram: ja op "pc actief betekent op kantoor" (open vraag in IDEE-20).
- Nodig van Bram: het nieuwe installatieprogramma installeren en een week zeggen of het klopt.
- Omvang: 4 tot 5 uur.
- Bewijs: pc een uur laten rusten en vergrendelen, daarna gebruiken; de tabel toont actief, inactief en vergrendeld op de juiste momenten; een proefafspraak toont dat er bij een inactieve pc geen melding komt.

**Stap 4. Klant verwittigen na ja**
- Zarvis kan DOEN: als de rit te laat dreigt, voorstellen "Zal ik mevrouw X laten weten dat je rond 14:15 komt?" en na ja een WhatsApp sturen.
- Geraakt: `stuur_whatsapp` bestaat; nieuwe instructie en een klaargezet voorstel in de controle (`zarvis_meldingen` met een actie "klant verwittigen").
- Ja van Bram: ja per bericht aan de klant, in de code afgedwongen.
- Nodig van Bram: telefoonnummer staat in het dossier; niets nieuws.
- Omvang: 2 tot 3 uur.
- Bewijs: proefklant met Brams eigen nummer; zonder ja vertrekt er niets; met ja komt het bericht aan.

**Stap 5. Locatie van de gsm (alleen als B tekortschiet)**
- Zarvis kan DOEN: weten dat Bram echt weg is van kantoor.
- Geraakt: een nieuwe functie `zarvis-locatie` met een geheim webadres; op de gsm: Tasker (Android) of een Opdracht-automatisering "verlaat kantoor" (iPhone); tabel `zarvis_aanwezigheid` krijgt een tweede bron.
- Ja van Bram: ja op het delen van een "binnen of buiten kantoor"-signaal.
- Nodig van Bram: toestel (Android of iPhone), een afgesproken kantooradres met straal.
- Omvang: 3 tot 4 uur plus testen op het echte toestel.
- Bewijs: wandelen of rijden weg van kantoor; binnen enkele minuten staat de toestand op buiten.

**Stap 6. Een eigen agenda (Google of Outlook) lezen en schrijven, afspraken verzetten of inplannen**
- Zarvis kan DOEN: ook losse afspraken kennen; een afspraak verzetten of inplannen na ja.
- Geraakt: nieuw gereedschap in `buiten.ts` met een leesconnector; voor Outlook uitbreiden van de app-registratie `mail-crm-sync` met Calendars.Read, of een nieuwe registratie; voor Google een Google Cloud-project met toestemming.
- Ja van Bram: ja per wijziging aan een agenda of per bericht naar een klant.
- Nodig van Bram: welke agenda hij gebruikt; toestemming in de portalen (admin consent, of Google OAuth); nieuwe secrets in Lovable.
- Omvang: 8 tot 12 uur, afhankelijk van de agenda, met Calendly-annuleren erbij.
- Bewijs: een proefafspraak maken, verzetten en weer verwijderen in een testagenda; zonder ja verandert er niets.

Totaal: stappen 1 tot 4 samen 13 tot 17 uur; met stap 5 ongeveer 16 tot 21 uur; met stap 6 erbij 24 tot 33 uur. Kleinste nuttige pakket: stappen 1 tot 3, ongeveer 11 tot 14 uur.

## 5. Afhankelijkheden van andere ideeën

- IDEE-19 (`bereken_route`): eerst uitrollen met `GOOGLE_MAPS_API_KEY`; zonder rijtijd geen vertrekuur.
- IDEE-16 (taken op tijd, af): de controle en de verwittiging steunen hierop.
- IDEE-28 (bellen via Twilio): voor de derde trap; zonder de vier secrets valt Zarvis terug op WhatsApp (dat doet de code al, `zarvis-taken` regels 118 tot 121).
- IDEE-27 (smartphone): het toestel is nodig voor stap 5.
- IDEE-29 (alleen na ja): bepaalt dat berichten aan de klant en wijzigingen aan een agenda een ja vragen.
- IDEE-22 (computer use): niet nodig.

## 6. Risico's

- **Verkeerd alarm.** De pc staat aan terwijl Bram al weg is of thuis werkt: een onnodig bericht. Daarom de trappen met een rem en een marge, en een duidelijke zin in het bericht ("je pc is nog actief").
- **Gemiste melding.** De pc staat uit of in slaapstand terwijl Bram nog binnen is: geen bericht. De terugval is de WhatsApp op het vertrekuur als er geen teken van vertrek was.
- **Verouderde afspraak.** Een verzette afspraak staat in Compass nog op het oude uur. Opgelost door in stap 1 rechtstreeks Calendly te lezen.
- **Verkeerde klant bij een afspraak.** Dossier wordt via naam, e-mail en telefoon gekoppeld; de bestaande scoring in `sync-calendly-event` laat twijfel zien (regel 218). Bij twijfel vraagt Zarvis het.
- **Privacy.** De pc-toestand en vooral een gsm-locatie zijn gegevens over Bram; alleen een toestand opslaan, geen plaats; geen bijhouden over tijd.
- **Klantbericht naar de verkeerde.** Alleen na een voorgelezen tekst en ja, in de code.
- **Kosten.** Bellen kost per oproep (één per afspraak); Google blijft gratis onder de grens.
- **Tijdzones.** Calendly levert UTC; Graph levert UTC zonder `Prefer`-header. Overal omzetten naar Europe/Brussels (de code gebruikt dit al).

## 7. Zeker tegenover niet kunnen nagaan

**Zeker (uit de code):**
- Calendly is gekoppeld via de poort van Lovable en geeft plaatsbezoeken en videocalls.
- `pre_intake` heeft de twee tijdstippen; `leads` heeft `adres`, `adres_lat` en `adres_lng`.
- `bereken_route` bestaat, geeft rijtijd met verkeer, en mag in de achtergrondcontrole.
- `zarvis-taken` kan melden, WhatsApp sturen en bellen, en doet dat alleen voor beheerders.
- Mail-CRM en Maildude lezen geen agenda; Mail-CRM heeft alleen `Mail.Read` en Maildude `Mail.Read`, `Mail.ReadWrite` en `Mail.Send`.
- `vehicle_trip` is een maandelijkse Excel-import voor het loon.
- `zarvis-desktop` meet geen activiteit.

**Niet kunnen nagaan:**
- Welke agenda Bram echt gebruikt (Google of Outlook) en of Calendly daarin schrijft; dat hij Meet-links krijgt wijst op Google.
- Wat het veld `location` van een echt plaatsbezoek in Calendly bevat.
- Of `CALENDLY_API_KEY` vandaag geldig is en welke rechten (lezen of ook schrijven) het abonnement geeft.
- Of Bram een Calendly-abonnement heeft dat verzetten of inplannen via de API toelaat.
- Of `GOOGLE_MAPS_API_KEY` al bestaat; de site gebruikt al een Google Maps-koppeling via de poort van Lovable (`fetch-google-reviews/index.ts` regel 9), maar of dezelfde sleutel de Routes API mag gebruiken, is niet nagegaan.
- Brams toestel, en dus wat de gsm kan.
- Of de pc op kantoor staat en hoe vaak hij thuis of mobiel werkt.
- De prijs per 1000 Pro-oproepen boven de gratis grens; de officiële prijslijst kon ik niet openen.
- De exacte regels van de Calendly-API voor annuleren en de eenmalige links; ze staan hier uit mijn kennis, niet uit een geopende bron.
- Brams echte agenda en werkelijke afspraken: bewust niet gelezen.

## 8. Vragen voor Bram

1. Welke agenda gebruik je zelf voor afspraken: Google, Outlook, of enkel wat Calendly toont? En komen er afspraken in die niet via Calendly gaan (leveranciers, werven)?
2. Mag Zarvis "je pc is nog actief" als teken nemen dat je nog op kantoor bent, en bij een slapende of vergrendelde pc zwijgen?
3. Welk toestel heb je, Android of iPhone, en wil je later je locatie laten doorgeven als alleen "op kantoor ja of nee"?
4. Hoeveel marge wil je bovenop de rijtijd (voorstel: 10 minuten), vanwaar vertrek je (kantoor?), en vanaf welke trap mag Zarvis je bellen (voorstel: 10 minuten na het vertrekuur, één keer per afspraak)?
5. Mag Zarvis de klant een bericht voorstellen als je te laat dreigt te zijn, met jouw ja per bericht, en is verzetten via een Calendly-link naar de klant goed, of wil je dat hij rechtstreeks in je agenda wijzigt?

# IDEE-27 — Smartphone use: Zarvis op en via de gsm

Onderzoek van 2026-11-24. Alleen gelezen en opgezocht, niets gebouwd. Bronnen: de repo (pad en regel) en officiële documentatie (URL). Waar ik iets uit eigen kennis aanvul of niet kon nagaan, staat dat erbij en in deel 7.

## 1. Samenvatting

1. Het toestel van Bram is nog altijd onbekend; het bepaalt vooral de grote lezing (apps bedienen). De kleine lezing (Zarvis zelf op de gsm) werkt op allebei en is het eerste om te bouwen.
2. Kleine lezing: `/zarvis` als installeerbare webapp met pushmeldingen, een spreekknop en een opdracht "Praat met Zarvis". Dat is nu niets: geen manifest, geen service worker, geen push. Ongeveer 30 tot 44 uur.
3. Apps bedienen kan op Android technisch (toegankelijkheidsdienst, of ADB vanaf de pc) maar niet via de Play Store, en het is zwaar werk. Op iPhone kan het niet: Apple laat geen app een andere app bedienen. Voor de meeste dingen die een zaakvoerder wil, volstaat een diepe link of een rechtstreekse koppeling, zonder scherm te bedienen.
4. Locatie voor IDEE-20 komt het best van een Opdracht (iPhone, automatisering "aankomen/vertrekken") of van Tasker (Android) die de positie naar een Zarvis-adres stuurt. Een PWA kan dat niet op de achtergrond.
5. Google bouwt zelf "schermautomatisering" in Gemini, maar nu enkel op Pixel 10/11 en Galaxy S26 en later, in vijf landen waar België niet bij zit, en zonder koppeling voor derden. Daar rekenen we niet op.

## 2. Wat er vandaag is

- Zarvis is een React-pagina: `/zarvis` in `src/App.tsx` (rond regel 493), met `src/pages/ZarvisVenster.tsx` (405 regels) en toestand in `src/contexts/ZarvisContext.tsx`. Geen router; paden staan in `src/App.tsx`. Bron: `docs/HANDOFF-ZARVIS.md` (sectie Techniek).
- Er is geen PWA: `public/` bevat enkel `favicon.ico`, `placeholder.svg`, `robots.txt`. Geen manifest, geen service worker, geen iconen. `vite-plugin-pwa` en `workbox` staan niet in `package.json`. Zoekopdracht naar `serviceWorker` en `PushManager` in `src`: geen treffer.
- `index.html` heeft wel een viewport maar niet de rest: titel is nog "Lovable App", geen `theme-color`, geen `apple-touch-icon`, geen `manifest`-link.
- Meldingen: `src/contexts/ZarvisContext.tsx` (regels 180 tot 195) leest elke 20 seconden de tabel `zarvis_meldingen` en toont een `new Notification(...)`. Dat werkt enkel zolang de pagina open is. Er is geen echte push.
- Microfoon: `getUserMedia` in `src/lib/zarvis/azureStem.ts` (regel 73) en `niveau.ts` (regel 88); `SpeechRecognition` in `src/lib/zarvis/stem.ts` (regel 67 tot 68). De stem-uit gebruikt `speechSynthesis` en Azure via de functie `zarvis-stem`.
- Locatie: niets. `geolocation` komt in `src` niet voor (de coördinaten in `buiten.ts` regel 162 tot 167 zijn voor weer, niet voor Bram).
- Bellen: `supabase/functions/_shared/zarvis/bellen.ts` belt via Twilio met vier secrets en leest een tekst voor, twee keer. Gebouwd tot aan de sleutels (IDEEENBAK, IDEE-28).
- WhatsApp: `stuur_whatsapp` in `supabase/functions/_shared/zarvis/doen.ts` (regel 88 en 248) zet het bericht in `whatsapp_uit`; het verzenden doet het programma op de pc (`zarvis-desktop/`). Zonder de pc aan, geen WhatsApp.
- Login: Supabase-sessie; de functies controleren zelf login en rol (`HANDOFF-ZARVIS.md`, "verify_jwt wordt niet afgedwongen").
- IDEE-27 in `docs/IDEEENBAK.md` (regel 252 tot 259): status open, "eerst het toestel kennen". IDEE-20 (regel 189) noemt de gsm als de enige betrouwbare bron voor Brams locatie.

## 3. Bevindingen per vraag

**Eerste vraag voor Bram: welk toestel heb je (merk, model, Android of iPhone, en welke versie)?** Hieronder staat alles voor allebei.

### Overzicht Android tegenover iPhone

| Onderwerp | Android | iPhone |
|---|---|---|
| Zarvis als webapp installeren | Chrome: "Toevoegen aan startscherm", manifest en service worker nodig | Enkel via Safari, "Zet op beginscherm"; manifest met `display: standalone` vereist |
| Pushmeldingen van de webapp | Ja (Push API met service worker) | Ja vanaf iOS 16.4, enkel als de webapp op het beginscherm staat en de toestemming volgt op een tik van de gebruiker |
| Spreekknop op het startscherm | Manifest-`shortcuts` en widget via Tasker/KWGT (niet nagegaan) | Opdracht op het beginscherm, Actieknop of Siri-zin |
| Siri / Google Assistant als start | Gemini vervangt de Assistant; vaste zin naar een eigen app niet nagegaan | "Hé Siri, <naam van Opdracht>" werkt voor Opdrachten (niet uit de hand van Apple bevestigd, zie deel 7) |
| CarPlay / Android Auto | Enkel navigatie, interessepunten, IoT en weer als categorie voor de Car App Library; een pagina of algemene assistent hoort er niet bij | Eigen app met toestemming van Apple vereist; een webapp kan niet; categorie "stem-gebaseerd gesprek" bestaat volgens mijn kennis maar niet bevestigd |
| Van op afstand iets laten gebeuren op de gsm | Push + Tasker, of ADB vanaf de pc | Pushmelding die Bram aantikt; Pushcut met "Automation Server" |
| Andere apps bedienen via scherm | Technisch ja (toegankelijkheidsdienst of ADB); Play Store verbiedt zelfstandige agenten | Nee. App Intents laten een app eigen acties aanbieden, niet een andere app besturen |
| Via de pc de gsm bedienen | scrcpy en ADB: werkt zonder root en zonder app op de gsm | iPhone Mirroring op een Mac bestaat, maar is in de EU niet beschikbaar |
| Locatie voor IDEE-20 | Tasker of HTTP Shortcuts-app stuurt positie; PWA enkel bij open scherm | Opdracht-automatisering "aankomen/vertrekken" stuurt positie; PWA enkel bij open scherm |
| Eigen app buiten de winkel | Kan; vanaf 2027 wereldwijd registratie van de ontwikkelaar nodig, met een route voor persoonlijk gebruik | Niet voor gewone gebruikers in de EU zonder alternatieve marktplaats (niet onderzocht) |

### 3.1 De kleine lezing: Zarvis op de gsm als webapp

**Installeren.** Apple: een webapp op het beginscherm heeft een manifest met `display` gelijk aan `standalone` of `fullscreen` nodig (https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). Android/Chrome: manifest plus service worker (MDN-pagina over de Push API bevestigt dat een actieve service worker nodig is: https://developer.mozilla.org/en-US/docs/Web/API/Push_API).

**Wat ontbreekt in de repo.** (1) `public/manifest.webmanifest` met naam, `start_url: /zarvis`, `display: standalone`, kleuren, iconen 192 en 512 (en een maskable); (2) iconen en een `apple-touch-icon`; (3) een service worker `public/sw.js` die minstens `push` en `notificationclick` afhandelt; (4) in `index.html`: `<link rel="manifest">`, `theme-color`, echte titel in plaats van "Lovable App", `apple-mobile-web-app-capable`; (5) registratie van de service worker in `src/main.tsx`; (6) een tabel voor push-abonnementen en een server-kant die ze gebruikt. Let op: Lovable bouwt de webapp; `public/` komt gewoon mee, maar een service worker die oude bestanden vasthoudt kan een publicatie "niet zichtbaar" maken. Houd ze klein (geen cache van de app zelf).

**Pushmeldingen op iPhone.** Voorwaarden volgens Apple: (a) webapp op het beginscherm, (b) manifest `standalone`, (c) toestemming vragen op een rechtstreekse tik, (d) Push API, Notifications API en service worker samen, (e) het gaat via Apples eigen pushdienst; je server moet `*.push.apple.com` kunnen bereiken (zelfde bron). Of elke push een zichtbare melding moet tonen, staat niet in dat artikel (uit eigen kennis: ja, anders trekt Safari de toestemming in; niet bevestigd). De EU: Apple wilde in iOS 17.4 beginscherm-webapps in de EU uitschakelen en heeft dat op 2024-03-01 teruggedraaid (https://www.macrumors.com/2024/03/01/apple-walks-back-decision-to-disable-eu-web-apps/). Of web push in de EU nu volledig werkt, stellen die bronnen niet uitdrukkelijk; ik leid af van "bestaande werking blijft" dat het kan. Dat moet op Brams toestel getest worden.

**Pushmeldingen op Android.** Standaard Push API, `userVisibleOnly: true`, VAPID-sleutels (eigen kennis, niet op de MDN-pagina). Werkt ook met scherm uit, via Googles pushdienst.

**Microfoon.** `getUserMedia` werkt in een webapp over HTTPS. Of de `SpeechRecognition` in `stem.ts` in een iPhone-beginschermapp werkt, kon ik niet nagaan; het is in Safari bekend onbetrouwbaar. Zarvis heeft al Azure-spraak via de functie `zarvis-stem` als eigen pad. Op een gsm is dat de veiligste keuze: opnemen met `getUserMedia`, naar de server, terug als stem.

**Werken met het scherm uit.** Een webapp kan niet blijven luisteren met het scherm uit; de microfoon stopt in de achtergrond (eigen kennis, niet bevestigd door een officiële pagina). Wat wel kan met scherm uit: Zarvis stuurt een push, Bram tikt, de webapp opent. Voor "praat zonder aanraken" is een Opdracht of Siri nodig.

**Knop of widget om meteen te spreken.** Een Opdracht "Praat met Zarvis" die `https://…/zarvis?spreek=1` opent, op het beginscherm of aan de Actieknop (iPhone) of een manifest-`shortcuts`-ingang op Android (niet nagegaan). Automatisch beginnen met opnemen na het openen vraagt op iPhone een tik (toestemming moet op een gebruikersactie volgen; Apple zegt dat voor push; voor de microfoon eigen kennis). Plan: de pagina opent en toont één grote knop "Spreek".

**Siri en Google Assistant.** Opdrachten (Shortcuts) kunnen met een zin gestart worden; dat is een stuk eigen kennis, de Apple-pagina over automatiseringen die ik las gaat enkel over triggers (https://support.apple.com/guide/shortcuts/intro-to-personal-automation-apd690170742/ios). Google Assistant wordt vervangen door Gemini; wat Gemini met een eigen app doet, heb ik niet kunnen nagaan.

**CarPlay en Android Auto.** Android Auto: de Car App Library beperkt zich tot navigatie, interessepunten, IoT en weer, en elke app moet in een ondersteunde categorie zitten (https://developer.android.com/training/cars/apps). Een webapp of algemene assistent past daar niet in. CarPlay: de Apple-pagina gaf mij geen inhoud; mijn kennis zegt dat een eigen app plus een door Apple toegekend recht nodig is. Beide zijn dus een eigen-app-verhaal en niet voor nu. In de auto bestaat al een alternatief: Zarvis belt Bram (Twilio) of Bram belt een nummer dat Zarvis opneemt, en handenvrij met Siri of Gemini een link openen.

### 3.2 De grote lezing, Android: apps bedienen

1. **Eigen app met toegankelijkheidsdienst.** De dienst kan het scherm lezen, tikken en gebaren doen (`canRetrieveWindowContent`, `canPerformGestures`, `performAction`, `dispatchGesture`: https://developer.android.com/guide/topics/ui/accessibility/service). Google waarschuwt dat het geen gewone weg is en enkel voor algemene hulpmiddelen. **Play Store:** assistenten en automatiseringsapps tellen niet als toegankelijkheidstool; apps die zelfstandig acties plannen en uitvoeren zijn "strikt verboden"; vaste "als X, doe Y"-regels mogen; verplichte, aparte melding in de app met uitdrukkelijke toestemming; Play Console-verklaring met video (https://support.google.com/googleplay/android-developer/answer/10964491). Een Zarvis die zelf beslist wat hij tikt, valt dus buiten de Play Store.
2. **Buiten de winkel.** Mag. Googles ontwikkelaarsverificatie is op 2026-09-30 begonnen in Brazilië, Indonesië, Singapore en Thailand (niet België) en gaat in 2027 wereldwijd (https://developer.android.com/developer-verification/guides). Voor een persoonlijke app zijn er drie wegen: volledige verificatie met identiteit; "beperkte distributie" voor hobbyisten tot 20 toestellen zonder identiteitscontrole; of een niet-geregistreerde app installeren met de "geavanceerde stroom" of via ADB. Tijdlijn: de pagina vermeldt voor augustus 2026 ook de geavanceerde stroom; of ze in België al actief is, kon ik niet bevestigen. Eigen kennis, niet bevestigd: sinds Android 13 blokkeert de telefoon toegankelijkheidsrechten van apps die niet uit de winkel komen tot de gebruiker in de instellingen "beperkte instellingen" toelaat.
3. **Bedienen vanaf de pc: ADB en scrcpy.** scrcpy vraagt Android 5 of hoger, USB-foutopsporing, werkt op Windows, "zonder root en zonder app op de gsm"; ook draadloos; toetsenbord en muis kunnen de gsm bedienen (https://github.com/Genymobile/scrcpy). Een lus die een schermafbeelding neemt en tikken en tekst terugstuurt kan met `adb` (`screencap`, `input tap`, `input text`; dit is eigen kennis, niet door een bron hierboven bevestigd). De gsm moet aan de pc hangen (USB of wifi), ontgrendeld en op Brams bureau. Handig als proef en voor een gsm die op kantoor blijft liggen, niet voor "Bram is onderweg".
4. **Tasker en AutoInput.** Tasker is een automatiseringsapp (taken, profielen); de gebruikersgids die ik opende was enkel een inhoudsopgave (https://tasker.joaoapps.com/userguide/en/index.html), dus over AutoInput, HTTP-verzoeken en pushkoppeling heb ik niets officieel kunnen lezen. Wat ik weet uit eigen kennis: Tasker kan een positie of melding naar een webadres sturen en op een bericht een taak starten, en AutoInput gebruikt de toegankelijkheidsdienst om op knoppen te tikken. Betaalde app, geen Play Store-probleem voor Bram als gebruiker.
5. **Wat Google zelf biedt.** (a) **AppFunctions**: apps tonen functies aan assistenten zoals Gemini, lokaal op het toestel; vooral agenda, notities, taken, en Samsung Galerij (https://developer.android.com/blog/posts/the-intelligent-os-making-ai-agents-more-helpful-for-android-apps). Voor een eigen assistent (Zarvis) staat daar geen open toegang; Google zegt "later dit jaar meer details". (b) **Gemini-schermautomatisering**: beta, enkel Pixel 10 en 11, Galaxy S26/Z Flip 8/Z Fold 8/Tab S12; enkel India, Japan, Zuid-Korea, Verenigd Koninkrijk en VS; enkel Engels, Japans en Koreaans; "geselecteerde apps"; geen koppeling voor derden vermeld; vraagt toestemming per app (altijd, telkens vragen, nooit) en pauzeert voor wachtwoorden en betalingen (https://support.google.com/gemini/answer/16940971). Voor Bram in België: niet beschikbaar.
6. **Verhouding tot computer use van Anthropic.** De tool "computer use" laat Claude een bureaublad zien (schermafbeeldingen) en bedienen (klik, typ); **jouw eigen programma voert elke actie uit**; hij is ontworpen voor een afgezonderde omgeving met virtuele display; Anthropic raadt aan: afgezonderde omgeving, geen gevoelige logins, beperkt netwerk, een mens laat acties met gevolgen goedkeuren (https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool). Er is geen mobiele variant; het toestel moet via een eigen brug (ADB vanaf de pc, of een eigen app) als "bureaublad" aangeboden worden. Dat is dus hetzelfde patroon als IDEE-22 (computer use op de pc), met ADB als uitvoerder. Ik las 100.000 van de 115.000 tekens; de laatste 15.000 niet.

### 3.3 De grote lezing, iPhone: wat Apple toelaat en niet

- **Niet:** een app die een andere app bedient. App Intents zijn acties die een app zelf aanbiedt aan Opdrachten, Siri, Spotlight en de Actieknop; een intent draait in de app die hem definieert (https://developer.apple.com/documentation/appintents; de pagina gaf mij enkel de titel, het antwoord daarover is eigen kennis). Geen schermlezen, geen tikken in andere apps.
- **Wel: een Opdracht die Zarvis aanroept.** De actie "Haal inhoud van URL op" doet een HTTP-aanroep (eigen kennis). Vragen aan Zarvis stellen, een foto doorsturen, dicteren, positie doorgeven: allemaal haalbaar.
- **Wel: automatiseringen op tijd en plaats.** Triggers: tijdstip, aankomen op een plaats, app openen, enz.; bij het afgaan krijg je een melding "uitvoeren?", tenzij je instelt dat het zonder vragen draait (https://support.apple.com/guide/shortcuts/intro-to-personal-automation-apd690170742/ios). Of dat "zonder vragen" voor elke trigger kan, staat daar niet; eigen kennis zegt: voor "aankomen/vertrekken" wel. Automatiseringen horen bij één toestel.
- **Wel: een opdracht die Zarvis van op afstand start.** Twee wegen: (1) een gewone pushmelding (webapp op het beginscherm) die Bram aantikt en die dan de Opdracht of Zarvis opent; (2) **Pushcut**: dienst waarmee een HTTP-aanroep op `api.pushcut.io/<geheim>/execute?shortcut=<naam>` een Opdracht op je iPhone start zonder tik, via de "Automation Server". Beperking uit Pushcuts eigen documentatie (https://pushcut.io/help/automation_server): de app moet zichtbaar in de voorgrond staan, bedoeld voor een toestel dat altijd aan staat; opdrachten mogen niet om hulp van de gebruiker vragen; ze lopen een voor een en hoogstens 60 seconden; gratis 100 aanvragen per dag, uitgebreid pakket 5.000 per dag; aanvragen ouder dan 5 minuten mislukken. Pushcut Pro is betalend (bedrag niet nagegaan). Voor een gsm in Brams zak is dat dus onbetrouwbaar; voor een tweede, vast toestel op kantoor wel zinvol.
- **iPhone-synchronisatie op een Mac.** "iPhone Mirroring" laat een Mac een iPhone bedienen, maar is in de EU niet beschikbaar en volgens Apple blijft dat zo op macOS Tahoe (https://www.macrumors.com/2025/06/18/apple-on-iphone-mirroring-still-not-in-eu/). Bram heeft bovendien een Windows-pc (`HANDOFF-ZARVIS.md`); een Mac is er niet. Niet bruikbaar.
- **Grenzen.** Geen achtergrondluisteren, geen scherm lezen, geen vrije tikken, achtergrondopdrachten hangen af van iOS-regels. Bram moet op iPhone aanvaarden dat Zarvis enkel doet wat een app of Opdracht aanbiedt.

### 3.4 Wat Bram waarschijnlijk wil, en de eenvoudigste weg

Telkens eerst een rechtstreekse koppeling of diepe link; het scherm bedienen is de laatste keuze.

| # | Wens | Eenvoudigste weg | Scherm bedienen nodig? |
|---|---|---|---|
| 1 | Foto van de werf bij het dossier zetten | Upload in de Zarvis-webapp (`<input type="file" accept="image/*" capture>`), "bij dossier X" gezegd of gekozen; Zarvis legt hem in de opslag van Compass. Of een Opdracht "Foto naar Zarvis" in het deelmenu. Waar dossierfoto's nu staan in Compass kon ik niet nagaan. | Nee |
| 2 | Een WhatsApp beantwoorden | Bestaat al: `stuur_whatsapp` via de pc. Voor de gsm: Zarvis stelt in een push een antwoord voor met een knop die `https://wa.me/<nummer>?text=<tekst>` opent; Bram tikt "verzend" zelf. (De pagina met de linkvorm gaf geen inhoud; vorm uit eigen kennis.) | Nee |
| 3 | Navigatie starten naar de volgende afspraak | Link `https://www.google.com/maps/dir/?api=1&destination=<adres>&travelmode=driving&dir_action=navigate` in een push of in de Zarvis-pagina; opent de Maps-app op Android en iPhone en start de navigatie (https://developers.google.com/maps/documentation/urls/get-started). Past bij de al gebouwde `bereken_route` voor IDEE-19. | Nee |
| 4 | Een oproep starten | Link `tel:<nummer>` in de pagina of de push; Bram tikt. Voor "Zarvis belt jou": Twilio staat al klaar (`bellen.ts`). Een oproep zonder tik laat Android enkel met extra rechten toe (CALL_PHONE; eigen kennis) en iPhone nooit. | Nee |
| 5 | Zarvis iets vragen onderweg | Beginschermknop of Opdracht "Praat met Zarvis"; antwoord uitgesproken via de Azure-stem. | Nee |
| 6 | Melding "vertrek nu" | Push met knop "Start navigatie" (zie 3), voor IDEE-20. Vereist locatie (deel 3.6). | Nee |
| 7 | Een bestelling of formulier in een andere app invullen | Eerst zoeken naar een koppeling of e-mailroute. Echt scherm bedienen enkel op Android via ADB-proef, met Bram erbij. | Ja |
| 8 | Handenvrij in de auto | Zarvis belt Bram (Twilio) en leest voor; antwoord via telefoontoetsen of nadien in de app. Een gesprek in twee richtingen is niet gebouwd (IDEEENBAK, IDEE-28). | Nee |

### 3.5 Veiligheid en grenzen

- Nooit bank-apps of betalingen; nooit wachtwoorden of codes invoeren of lezen; ook Googles eigen Gemini pauzeert daarvoor.
- Een zichtbaar teken dat Zarvis bezig is: op Android een blijvende melding "Zarvis bedient je gsm" met knop STOP; bij de ADB-proef ook een venster op de pc met het gsm-scherm live, en een noodstop (sneltoets en uitprikken van de kabel).
- Logboek: elke actie met tijdstip, app en schermafbeelding in `zarvis_acties` (bestaat al). Terugdraaien waar het kan.
- Toestemming per app: een lijst "toegelaten apps" in `zarvis_instellingen`; alles buiten de lijst is geweigerd. Zelfde regel als IDEE-29: buiten Compass dat iets verandert of geld kost, enkel na uitdrukkelijk ja van Bram, met poort in de code. Een tik van Bram op een diepe link telt als ja voor die ene handeling.
- Tekst die Zarvis op het scherm leest (berichten, mails) is gegevens en geen opdracht; de computer-use-documentatie waarschuwt uitdrukkelijk voor prompt-injectie via schermafbeeldingen.
- Persoonsgegevens: foto's van werven bevatten soms gezichten of kentekens; zet ze in de dossieropslag met dezelfde rechten als de rest.

### 3.6 Locatie delen met Zarvis (voor IDEE-20)

| Weg | Wat het kan | Bron / opmerking |
|---|---|---|
| PWA (`navigator.geolocation`) | Enkel HTTPS, na toestemming, `watchPosition` volgt de positie zolang de pagina open en zichtbaar is (https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API). Achtergrond/service worker: de pagina zegt er niets over; volgens mijn kennis niet beschikbaar. | Dus geen "is Bram nog op kantoor?" bij gesloten app. Wel nuttig: één opvraging bij tikken op "ik ben vertrokken" of bij het openen van de app. |
| iPhone-Opdracht | Automatisering "aankomen/vertrekken" of op tijdstip, met "Haal inhoud van URL op" die de positie (breedte, lengte) naar een Zarvis-adres POST. | Triggers bevestigd op Apples pagina; de actie "Huidige locatie" en POST zijn eigen kennis. Bram krijgt bij sommige triggers eerst een melding. |
| Tasker (Android) | Profiel "verlaat plaats" of per kwartier, HTTP-verzoek met de positie. | Eigen kennis; Tasker-gids lezen gaf niets. Alternatief: een gratis app voor HTTP-snelkoppelingen (niet onderzocht). |
| Pc-activiteit als teken | Alleen bij het programma op de pc. | Voorstel van IDEE-20 zelf; geen gsm nodig, blijft de terugvaloptie. |

Het ontvangende adres is in alle gevallen hetzelfde: een nieuwe functie `zarvis-gsm` met een eigen sleutel per toestel (niet de login van Bram), die alleen positie, foto en vragen aanneemt.

## 4. Voorstel in bouwstappen van klein naar groot

Alle uren zijn bouwwerk, zonder wachten op Bram. Elke stap eindigt met een bewijs op een echt toestel, want het is het grootste gat in dit project (`HANDOFF-ZARVIS.md`, "Nooit op een echt toestel getest").

**Stap 1 — Installeerbare webapp.**
- Zarvis kan: op Brams gsm als app met eigen icoon openen op `/zarvis`.
- Geraakt: `public/manifest.webmanifest`, `public/sw.js` (alleen push en klik, geen cache), iconen, `index.html`, `src/main.tsx`. Project Compass (Lovable), publiceren.
- Ja van Bram: geen (er verandert niets buiten Zarvis).
- Nodig van Bram: toestel, een tik "Toevoegen aan beginscherm", een logo of akkoord met een standaardicoon; opnieuw inloggen in de app (op iPhone heeft de beginschermapp eigen opslag, eigen kennis).
- Omvang: 4 tot 6 uur.
- Bewijs: app staat op het beginscherm, opent zonder adresbalk, titel is "Zarvis", login blijft na herstarten; Lighthouse "installeerbaar" op de gepubliceerde site.

**Stap 2 — Echte pushmeldingen.**
- Zarvis kan: een melding op de gsm laten verschijnen, ook met de app dicht (herinnering, "vertrek nu", antwoord klaar).
- Geraakt: nieuwe tabel `zarvis_push` (abonnement per toestel) met migratie; functie `zarvis-taken` en `zarvis` sturen een push naast het bestaande rijtje in `zarvis_meldingen`; knop "Meldingen aanzetten" in `ZarvisVenster.tsx` (op een tik); `sw.js`.
- Ja van Bram: nee voor meldingen aan hemzelf.
- Nodig van Bram: VAPID-sleutelpaar als secrets in Lovable (ik maak het paar; hij plakt het); op iPhone eerst stap 1 en toestemming aantikken.
- Omvang: 8 tot 12 uur. Risico: een pushbibliotheek onder Deno, niet nagegaan.
- Bewijs: een herinnering van `zarvis-taken` komt aan bij scherm uit, op iPhone en/of Android, en een tik opent `/zarvis`.

**Stap 3 — Spreken en diepe links.**
- Zarvis kan: sneller starten (`?spreek=1`, grote spreekknop), en in een antwoord of push knoppen tonen die Maps-navigatie, `tel:` en WhatsApp openen.
- Geraakt: `ZarvisVenster.tsx`, `ZarvisContext.tsx`, een kleine hulp die links bouwt uit `bereken_route`; Opdracht of manifest-`shortcuts`.
- Ja van Bram: elke link wordt door hem aangetikt; Zarvis start zelf niets op de gsm.
- Nodig van Bram: toestel, één keer de Opdracht installeren (ik lever een deelbare of een beschrijving).
- Omvang: 6 tot 8 uur.
- Bewijs: "Hé Siri, Zarvis" of Actieknop opent de app; link start navigatie in Google Maps naar de volgende afspraak; `tel:` toont het belscherm.

**Stap 4 — Gsm-adres `zarvis-gsm`: foto, tekst, positie.**
- Zarvis kan: een foto bij een dossier zetten, een gedicteerde notitie opslaan, zijn positie ontvangen.
- Geraakt: nieuwe functie `supabase/functions/zarvis-gsm`, gedeelde code in `_shared/zarvis/`, tabel `zarvis_toestellen` (sleutel per toestel, laatste positie, tijdstip), uploadknop in de webapp, Opdracht of Tasker-profiel. Dossieropslag in Compass: nog uit te zoeken.
- Ja van Bram: één keer toestemming om de positie te delen (en per keer uit te zetten); foto naar een dossier is intern en vraagt geen ja.
- Nodig van Bram: toestel; een apparaatsleutel die hij in de Opdracht of Tasker plakt (die leveren we); akkoord met locatie-uitwisseling.
- Omvang: 10 tot 14 uur.
- Bewijs: foto verschijnt in het juiste dossier in Compass; verlaat hij het kantoor met de Opdracht aan, dan staat er binnen een kwartier een nieuwe positie met tijdstip in `zarvis_toestellen`.

**Stap 5 — Vertrekverwittiging (IDEE-20 op de gsm).**
- Zarvis kan: een push sturen "vertrek nu naar <klant>" als Bram nog niet weg is, met knop "Start navigatie".
- Geraakt: `zarvis-taken` (leest agenda, rijtijd van `bereken_route`, laatste positie), push uit stap 2.
- Ja van Bram: nee (alleen een melding aan hemzelf).
- Nodig van Bram: de Google Maps-sleutel (staat al op de lijst), agenda gekoppeld.
- Omvang: 4 tot 6 uur (zonder het stuk positie, dat zit in stap 4).
- Bewijs: een proefafspraak over 40 minuten, Bram blijft zitten, melding komt op het juiste moment; vertrekt hij, dan komt er geen melding.

Totaal stappen 1 tot 5 (kleine lezing en locatie): 32 tot 46 uur, afgerond 35 tot 45.

**Stap 6 (optioneel, enkel Android) — ADB-proef: Zarvis bedient de gsm via de pc.**
- Zarvis kan: op Brams verzoek een gsm aan zijn pc met een schermafbeelding lezen en tikken in apps uit een lijst, met zichtbare noodstop.
- Geraakt: `zarvis-desktop/` (ADB-aanroepen, venster met live gsm-scherm), functie `zarvis` (uitvoerder voor de computer-use-lus), `zarvis_acties`, `zarvis_instellingen` (lijst toegelaten apps).
- Ja van Bram: per taak en per app, en altijd bij versturen, wijzigen, betalen of verwijderen.
- Nodig van Bram: Android-toestel, USB-foutopsporing aanzetten, kabel; keuze van de apps; akkoord dat de gsm aan de pc moet hangen.
- Omvang: 14 tot 20 uur (bouwt voort op IDEE-22 als die er is; zonder IDEE-22 de volle 20).
- Bewijs: Zarvis opent op bevel een niet-gevoelige app, leest een scherm en tikt één knop; noodstop werkt binnen een seconde; logboek met schermafbeeldingen.

**Stap 7 (niet voorgesteld) — eigen Android-app met toegankelijkheidsdienst.** 60 tot 100 uur, niet in de Play Store toegelaten voor zelfstandig handelen, vraagt later ontwikkelaarsregistratie of beperkte distributie. Pas overwegen als stap 6 bewezen waarde heeft en Bram zonder pc wil bedienen.

**iPhone:** voor "apps bedienen" is er geen stap; Pushcut met een vast toestel op kantoor kan later bekeken worden (5 tot 8 uur plus abonnement), maar het is geen oplossing voor een gsm in Brams zak.

## 5. Afhankelijkheden van andere ideeën

- **IDEE-22 (computer use pc):** deelt de veiligheidsregels, het logboek en het uitvoerderspatroon. Stap 6 profiteert ervan.
- **IDEE-20 (agenda en locatie):** hangt van stap 4 af voor de positie; de pc-activiteit blijft de terugval.
- **IDEE-19 (rijtijd, `bereken_route`):** de link voor navigatie bouwt erop; Google Maps-sleutel nog te plakken.
- **IDEE-16 (taken op tijd):** `zarvis-taken` verstuurt de push.
- **IDEE-28 (Zarvis belt):** wacht op de vier Twilio-secrets; in de auto is dat het eerste handenvrije kanaal.
- **IDEE-29:** poort "buiten Compass enkel na ja" geldt ook voor wat op de gsm gebeurt.
- Overal: de Azure-sleutel voor de stem (`HANDOFF-ZARVIS.md`, lijst van Bram).

## 6. Risico's

- **iPhone-beperkingen** (geen scherm bedienen, achtergrond) kunnen Bram teleurstellen; de verwachting moet vooraf rechtgezet worden.
- **Service worker** die iets vasthoudt, waardoor Brams gsm een oude versie toont; oplossing: geen cache van de app.
- **Push op iPhone** hangt van een beginschermapp, toestemming op een tik, en Apple-regels in de EU af; kan na een iOS-update veranderen.
- **Sleutel in de Opdracht of Tasker-profiel**: wie het toestel heeft, kan positie en foto's sturen; sleutel intrekbaar maken, enkel schrijfrechten in `zarvis-gsm`.
- **Locatie is persoonlijk** (ook van wie bij hem is); enkel laatste positie bewaren, vervallen na een dag, uit te zetten.
- **Googles regels** kunnen veranderen (ontwikkelaarsverificatie, Android 17 en agent-API's); stap 6 steunt op ADB en is daar weinig van afhankelijk.
- **Foto's** met personen of kentekens in Compass.
- **Telefoon bedienen via schermafbeeldingen** kan fout tikken; daarom lijst met apps, geen betalen, mens bevestigt.

## 7. Zeker tegenover niet kunnen nagaan

**Zeker (bron gelezen):**
- Geen manifest, service worker, push of `geolocation` voor Bram in de repo (bestanden en zoekopdracht).
- Meldingen komen nu door elke 20 s te bevragen (`ZarvisContext.tsx` 180 tot 195).
- iPhone-webpush: beginscherm, `standalone`, toestemming op een tik, Apples pushdienst (webkit.org).
- Play Store: zelfstandige agenten via toegankelijkheidsdienst verboden; verplichte melding en verklaring met video (Google Play-beleid).
- Ontwikkelaarsverificatie: begonnen 2026-09-30 in vier landen, wereldwijd 2027, beperkte distributie tot 20 toestellen zonder identiteit, geavanceerde stroom voor niet-geregistreerde apps (developer.android.com).
- Gemini-schermautomatisering: toestellen, landen en talen zoals vermeld; geen koppeling voor derden vermeld (Google-helppagina).
- Computer use: uitvoerder is jouw programma; afgezonderde omgeving, bevestiging door een mens aanbevolen (Anthropic-docs, 100.000 van 115.000 tekens gelezen).
- Pushcut: voorgrondvereiste, 60 seconden, quota (pushcut.io).
- scrcpy: geen root, geen app op de gsm, Android 5 of hoger, ook draadloos.
- Maps-URL met `dir_action=navigate`.
- iPhone Mirroring niet in de EU; blijft zo op Tahoe (volgens Apple, via MacRumors).

**Niet kunnen nagaan of eigen kennis (moet op een echt toestel of in een andere bron):**
- Welk toestel Bram heeft en welke versie.
- Of web push in België op iOS 26 volledig werkt na de beginscherm-herroeping (Apple zegt niets over push in het EU-artikel dat ik vond).
- Of elke iOS-push een zichtbare melding moet tonen.
- Of de spraakherkenning in `stem.ts` in een iPhone-beginschermapp werkt; of de microfoon met scherm uit stopt.
- Of de Siri-zin, de Actieknop en de actie "Haal inhoud van URL op" precies zo werken (Apples pagina gaf enkel de triggers en de titel van App Intents).
- Of "aankomen/vertrekken" zonder vragen kan draaien.
- Alles over Tasker, AutoInput en de HTTP-snelkoppelingen-app (de gids was een inhoudsopgave).
- ADB-opdrachten `screencap`, `input tap`, `input text` en de bruikbaarheid met de computer-use-lus; niets uitgeprobeerd.
- Android "beperkte instellingen" voor toegankelijkheid bij buiten de winkel geïnstalleerde apps.
- Of een Android-pagina met `shortcuts`/widget in het manifest zich gedraagt zoals ik veronderstel; of Android een PWA-melding-met-knop toont.
- CarPlay-categorieën en rechten (Apple-pagina gaf geen inhoud).
- De WhatsApp-linkvorm (`wa.me`): helppagina gaf geen inhoud.
- Waar dossierfoto's in Compass nu leven en welke rechten daarbij horen.
- Prijs van Pushcut Pro en Tasker.
- Of de Deno-omgeving van de functies een pushbibliotheek draait.
- Niets is op een echt toestel gedaan.

## 8. Hoogstens vijf vragen voor Bram

1. Welk toestel heb je: merk, model, Android of iPhone, en welke versie? (Bepaalt stap 6 en alle details van stap 2 tot 4.)
2. Is een tik op een link (navigatie, bellen, WhatsApp verzenden) goed genoeg, of wil je dat Zarvis echt zelf zonder aanraking dingen op de gsm doet?
3. Mag je gsm zijn laatste positie delen met Zarvis (enkel bij vertrek en niet permanent), voor de verwittiging van IDEE-20?
4. Welke apps wil je ooit door Zarvis laten bedienen, als het scherm dan toch moet? (Zo houden we de lijst klein.)
5. Is de gsm op kantoor of in de auto het belangrijkste moment, en ligt hij 's nachts aan de pc? (Bepaalt of de ADB-weg zin heeft.)

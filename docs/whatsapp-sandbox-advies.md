# Advies — de herjoin-plicht op WhatsApp

**Bram, in vijf regels:** nee, dit is niet met code op te lossen. De "join check-pocket"-verplichting zit aan de kant van Twilio en WhatsApp, niet in jouw app. De enige echte uitweg is een eigen WhatsApp-nummer via Twilio, en de vergunning van Meta daarvoor is een verplichte poort waar 1 tot 3 weken doorlooptijd op staat. Start die aanvraag deze week. Ondertussen kan er in de app wél iets nuttigs gebouwd worden — maar minder dan je hoopt, en het belangrijkste deel van de pijn blijft onzichtbaar tot je overstapt.

---

## 1. Kan de herjoin-plicht met code weggenomen worden?

**Nee. Ondubbelzinnig nee.** Niet met slimmere code, niet met een truc, niet met een omweg.

Drie redenen, elk op zich al beslissend:

**Het joinbericht moet van de gebruiker zelf komen.** Het nummer +1 415 523 8886 is niet van jou — het wordt gedeeld door alle Twilio-klanten wereldwijd. Het woord "check-pocket" is precies datgene wat een gsm-nummer aan jóuw account koppelt in plaats van aan dat van duizenden anderen. Jij kunt dat bericht niet namens iemand versturen; het moet uit hun eigen WhatsApp komen.

**De klok van 72 uur is niet te verlengen.** Twilio's eigen foutpagina rekent expliciet vanaf het moment van joinen ("joined more than three days ago"), niet vanaf het laatste bericht. Een "houd de verbinding warm"-bericht om de dag helpt dus niet. Sommige blogs schrijven "verloopt na 3 dagen inactiviteit" — dat is fout en wordt door geen enkele Twilio-bron gedekt.

**Je ziet het niet eens gebeuren.** Wanneer iemands sessie verlopen is en die stuurt jou een foto, bereikt dat bericht jouw app naar alle waarschijnlijkheid niet. Twilio ontvangt het wel, maar weet niet meer naar welke klant het moet, dus jouw webhook wordt nooit aangeroepen. Er komt geen foutmelding, geen logregel, niets. De foto verdwijnt geruisloos. *(Dit is een afleiding uit hoe het systeem werkt, niet een uitspraak van Twilio zelf — Twilio documenteert alleen de uitgaande kant. Zie de onzekerheden onderaan.)*

En er is nog iets dat losstaat van het herjoinen: Twilio zet zelf in de documentatie dat de sandbox uitsluitend voor testen en verkennen bedoeld is en niet in productie hoort. Je draait vandaag dus productie op een testomgeving. Het herjoinen is daarvan het symptoom dat je toevallig ziet.

---

## 2. Je echte opties

### Optie A — Niets doen, op de sandbox blijven

**Lost op:** niets.
**Kost:** €0 aan werk. Berichten worden wel gewoon gefactureerd (ca. $0,005 per bericht, in en uit).
**Duurt:** —
**Wat er misgaat:** dit is geen "blijft zoals het is", het wordt slechter naarmate je er meer op bouwt. Foto's van klanten en partners verdwijnen zonder spoor. Jouw eigen "tbc"-notities gaan verloren precies op de momenten dat je ze het hardst nodig hebt — 's avonds en in het weekend, wanneer je niet controleert of er een bevestiging terugkwam. Gebruikers concluderen dat jouw app onbetrouwbaar is, want vanuit hun kant is er niets te zien: ze sturen een foto, er gebeurt niets. En Twilio kan de sandbox in principe altijd wijzigen zonder rekening met je te houden — er is geen enkele toezegging dat dit blijft werken.

### Optie B — Eigen WhatsApp-productienummer via Twilio *(de aanbevolen weg)*

Je registreert een eigen telefoonnummer als officiële WhatsApp-zender via Twilio's Self Sign-up, en Meta verifieert Belhouse Atelier BV als bedrijf.

**Lost op:** alles. Geen joincode, geen 72 uur, geen gedeeld Amerikaans nummer. Klanten zien een Belgisch nummer met "Zolderpunt" als weergavenaam in plaats van een onbekend nummer uit San Francisco. Ook de limiet van één bericht per drie seconden verdwijnt.

**Kost:**
- Meta Business Verification: **gratis** (niet te verwarren met het betalende "Meta Verified"-abonnement — dat heb je niet nodig).
- Een telefoonnummer: ongeveer €1 à €2 per maand bij Twilio, of een losse simkaart die je toch al hebt.
- Berichten: Twilio rekent ca. $0,005 per bericht, in en uit. Antwoorden binnen 24 uur na een bericht van de klant zijn bij Meta vandaag nog gratis. Bij jouw volume — een handvol gebruikers — praten we over enkele euro's per maand.
- **Let op vanaf 1 oktober 2026:** Meta gaat dan ook antwoorden binnen dat venster van 24 uur aanrekenen, ongeveer $0,007 per bericht. Voor jouw volume blijft dat verwaarloosbaar, maar het is een echte wijziging die eraan komt.
- De limiet van 250 gesprekken per 24 uur die je misschien tegenkomt: die geldt alleen voor gesprekken die jij zelf start naar unieke nummers, en jouw hele flow is antwoorden op wat klanten sturen. Die telt dus niet eens mee.

**Duurt:** de technische registratie is een kwestie van uren. De bedrijfsverificatie bij Meta is de onbekende: van 10 minuten (als Meta Belhouse Atelier automatisch terugvindt in de Kruispuntbank) tot 14 werkdagen. Reken op 1 tot 3 weken. **Dit is een harde poort:** Twilio's eigen documentatie stelt dat je zonder afgeronde verificatie niet in productie kunt. Het is dus geen "nice to have voor later", het staat op het kritieke pad. Meta verwacht bovendien dat je de verificatie binnen ongeveer 30 dagen na het opstarten afrondt.

**Wat je klaar moet hebben:** de gegevens van Belhouse Atelier BV exact zoals ze in de KBO staan (elke komma telt — een afwijking tussen jouw invoer en het document is de meest voorkomende afkeurreden), een KBO-uittreksel of BTW-registratiebewijs als de automatische match faalt, en een e-mailadres op je eigen domein — Meta weigert gmail.com en hotmail.com voor de bevestigingscode. Je website moet de juridische naam vermelden, meestal in de footer.

**De valkuil waar je over gaat struikelen — welk telefoonnummer:** het nummer dat je registreert mag nog niet in gebruik zijn op de gewone WhatsApp of WhatsApp Business-app. Meta heeft sinds eind 2025 een functie ("Coexistence") waarmee één nummer tegelijk in de app én via de API kan werken, maar **Twilio ondersteunt dat niet** — hun documentatie schrijft juist voor dat je het WhatsApp-account op dat nummer moet verwijderen, waarna je de app op dat nummer kwijt bent. Neem daarom een vers nummer voor de app. Gebruik niet het nummer waarmee je vandaag met klanten chat.

### Optie C — Terugvallen op het e-mailadres dat je al hebt

Je app heeft al een tweede ingangskanaal dat perfect werkt en nooit verloopt: `fotos@inbox.zolderpunt.be`. Diezelfde verwerking, dezelfde koppeling aan dossiers.

**Lost op:** het verlies van foto's, volledig. Er is geen joincode, geen vervaldatum, geen limiet.
**Kost:** €0, het bestaat al.
**Duurt:** vandaag.
**Wat het niet oplost:** doorsturen per e-mail vanaf een gsm is omslachtiger dan doorsturen in WhatsApp, en je "tbc"-truc — een WhatsApp-bericht doorsturen en er "tbc" op antwoorden — laat zich niet netjes naar e-mail vertalen. Dit is een tussenoplossing, geen eindpunt.

### Optie D — Overstappen naar een andere aanbieder dan Twilio

Alleen relevant als je per se je bestaande WhatsApp Business-nummer wilt behouden én de app erop wilt blijven gebruiken. Infobip ondersteunt Coexistence wel, net als Meta's Cloud API rechtstreeks en 360dialog.

**Lost op:** hetzelfde als optie B, plus behoud van je huidige nummer.
**Kost:** echt ontwikkelwerk. De webhook die Twilio's formaat verwacht (`/home/user/zolderpunt-kennismaking/supabase/functions/inbound-whatsapp/index.ts`) en het versturen (`sendWhatsApp` in `/home/user/zolderpunt-kennismaking/supabase/functions/_shared/ingestMedia.ts`) moeten allebei herschreven worden. Reken op meerdere dagen werk plus opnieuw testen van een pad waar je dagelijks van afhangt.
**Duurt:** de Meta-verificatie loopt hier hetzelfde, plus de migratie.
**Mijn oordeel:** doe dit niet. Je koopt er één ding mee — behoud van een nummer — en betaalt met een verbouwing van werkende code. Een apart nummer voor de app is bovendien inhoudelijk beter: je klantenchat en je fotostroom blijven gescheiden.

---

## 3. Wat er ondertussen in de app gebouwd kan worden

Wees hier realistisch over de verhouding: de sandboxpijn bestaat uit twee helften, en code kan er maar één van raken.

### Wat wél kan

**a) Eén tik om opnieuw te joinen — het meest waardevolle, en het kleinste werk.**
Vandaag staat er in het scherm "stuur `join check-pocket` naar +1 415 523 8886". Dat is precies wat niemand onthoudt. Vervang dat door een knop die een link opent van de vorm `https://wa.me/14155238886?text=join%20check-pocket`. WhatsApp gaat open, de juiste chat staat er, de tekst is al ingevuld — de gebruiker hoeft alleen op verzenden te tikken. Zet er een QR-code van dezelfde link naast voor wie op een laptop zit. Dit haalt de herjoin-plicht niet weg, maar het haalt het onthouden weg, en dát is jouw eigenlijke probleem. Dit hoort in `/home/user/zolderpunt-kennismaking/src/components/dossier/InboundHint.tsx`, het bestand dat volgens zijn eigen commentaar de enige plek is waar de doorstuurinstructies staan.

**b) Een alarm wanneer jouw antwoord niet aankomt.**
De functie `sendWhatsApp` (regel 436 in `/home/user/zolderpunt-kennismaking/supabase/functions/_shared/ingestMedia.ts`) doet vandaag dit wanneer Twilio weigert:

```
if (!res.ok) console.error('twilio send failed', res.status, await res.text());
```

Dat verdwijnt in een logboek dat niemand leest. Twilio geeft in dat antwoord foutcode **63015** terug, wat letterlijk betekent "dit nummer is niet (meer) gejoind". Die code kun je uitlezen en er een e-mail over sturen — de mailfunctie staat er al klaar in `/home/user/zolderpunt-kennismaking/supabase/functions/_shared/sendMail.ts`. Je krijgt dan een mail in de trant van "de bevestiging voor 3 foto's van +32 4xx kon niet verstuurd worden: sessie verlopen". Een halve dag werk, hoogstens.

**Belangrijke beperking:** dit vangt alleen het halve geval. Als jij deze mail krijgt, betekent dat dat de foto's wél zijn binnengekomen — jouw antwoord raakt er alleen niet meer uit. De foto's zitten veilig in het dossier. Dit is dus vooral een signaal dat je die persoon moet aanporren, niet een reddingsboei voor verloren data.

**c) Een gebruikte-taal-signaal in de app.**
Zet bij het doorstuurscherm: "Krijg je binnen twee minuten geen bevestiging? Tik hier om opnieuw te joinen." Kost tien minuten en zet de verantwoordelijkheid op een plek waar de gebruiker ze kan oppakken.

**d) Een wekelijkse herinneringsmail met de joinlink.**
Voor je handvol gebruikers: één keer per week automatisch een mailtje met die ene knop erin. Ruw, maar effectief, en volledig binnen wat je vandaag hebt draaien.

### Wat níét kan — en waarom dat de doorslag geeft

**Je kunt niet detecteren dat iemands foto verloren is gegaan.** Dit is de andere helft, en het is de ergste. Als de sessie van een gebruiker verlopen is en die stuurt een foto, komt er geen enkel signaal bij jou binnen. Geen fout, geen lege webhook, niets. Je kunt geen alarm bouwen op een gebeurtenis die je nooit te zien krijgt. Dit is niet moeilijk of duur — het is onmogelijk.

**Je kunt niet opvragen of iemand nog gejoind is.** Er bestaat geen Twilio-functie waarmee je vraagt "is dit nummer nog verbonden?". De enige manier om erachter te komen is een bericht sturen en kijken of het faalt — en dat kost je een bericht en werkt alleen als je al reden had om iets te sturen.

**Je kunt niet vooraf waarschuwen dat iemands sessie afloopt.** Je weet niet wanneer iemand gejoind is; je weet alleen wanneer je hem voor het laatst hoorde. Je zou daar iets op kunnen bouwen ("dit nummer is al 2,5 dag stil, stuur maar een herinnering"), maar dat levert vooral valse alarmen op bij mensen die gewoon niets te sturen hadden. Ik zou het niet bouwen.

**Je kunt niet rekenen op een automatisch antwoord van Twilio aan de gebruiker.** Twilio bevestigt gedocumenteerd een geslaagde join, maar of het iets terugstuurt naar een verlopen deelnemer staat nergens beschreven. Ga ervan uit dat de gebruiker niets krijgt.

---

## 4. Mijn aanbeveling

**Ga voor optie B — een eigen WhatsApp-nummer via Twilio — en start de Meta-verificatie deze week, vóór alles.**

De motivering, in volgorde van gewicht:

**De verificatie is de lange lat, niet het codewerk.** Alle technische stappen samen zijn een halve dag. De vergunning van Meta duurt onvoorspelbaar lang en is een harde poort. Elke dag dat je die niet aanvraagt, is een dag die je achteraan aanplakt. Dit is de enige stap in dit hele advies die je niet kunt inhalen door harder te werken.

**Het bouwwerk erboven wordt anders steeds waardevoller op een fundering die niet mag dragen.** Je hebt net de "tbc"-functie gebouwd. Die is nuttig precies op de momenten dat je niet controleert of hij gewerkt heeft. Op de sandbox faalt hij stil. Elke feature die je hierna op dit kanaal zet, erft dat gebrek.

**De helft van het probleem is per definitie onzichtbaar.** Je klaagt over herjoinen omdat je het merkt. Wat je niet merkt, is elke foto die iemand met een verlopen sessie stuurde en die nooit is aangekomen. Je weet niet hoe vaak dat gebeurd is, en je kunt het ook niet achterhalen. Dat is geen argument om nog een tussenoplossing te bouwen — het is een argument om het kanaal te vervangen.

**De kosten zijn geen factor.** Gratis verificatie, een paar euro per maand aan berichten en nummer. De enige echte investering is aandacht: een uur formulieren en het geduld om op Meta te wachten.

### Concrete volgorde

**Deze week, in deze volgorde:**

1. **Kies een telefoonnummer** dat vandaag níét op WhatsApp of WhatsApp Business staat. Een nieuw Twilio-nummer of een lege simkaart. Niet je klantennummer.
2. **Start Meta Business Verification** via Twilio's WhatsApp Self Sign-up. Zorg vooraf dat je bedrijfsnaam, adres en telefoonnummer exact overeenkomen met de KBO, en gebruik een e-mailadres op zolderpunt.be of belhouse-atelier.be. Dit is de stap die op de klok staat.
3. **Bouw ondertussen twee dingen** (samen ongeveer een halve dag): de één-tik-joinknop met QR in `InboundHint.tsx`, en de foutcode-63015-melding per mail in `sendWhatsApp`.
4. **Zeg je gebruikers vandaag** dat `fotos@inbox.zolderpunt.be` de betrouwbare weg is zolang de overstap loopt. Dat kanaal werkt al en verloopt nooit.
5. **Na goedkeuring:** nummer omzetten in de secrets (`TWILIO_WA_FROM`), joininstructies uit `InboundHint.tsx` halen, en de tests uit je handoff-document opnieuw aflopen — de fotokoppeling is daar de regressietest die telt.

Wat je **niet** moet doen: overstappen naar een andere aanbieder om je huidige nummer te behouden, of nog een laag slimmigheid bouwen om de sandbox draaglijk te maken. Beide kosten meer dan wat ze opleveren.

---

## Waar ik onzeker over ben

Deze punten heb ik niet hard kunnen bevestigen. Ze veranderen mijn aanbeveling niet, maar bouw er geen aannames op zonder ze te testen.

- **Dat een bericht van een verlopen deelnemer jouw app niet bereikt** is een zeer waarschijnlijke afleiding, geen officiële uitspraak van Twilio. Alle documentatie over de 72 uur gaat over de uitgaande richting. **Test dit zelf** voor je conclusies trekt over hoeveel foto's je bent kwijtgeraakt: laat iemand met een verlopen sessie een foto sturen en kijk of er iets in je logs landt.
- **Of Twilio de gebruiker iets terugstuurt** bij een verlopen sessie is nergens beschreven. Ik heb geen enkele bron gevonden die zegt wat die persoon te zien krijgt.
- **De exacte Belgische tarieven** per berichtcategorie heb ik niet van het scherm kunnen aflezen; de omgeving waarin ik werkte kon twilio.com niet bereiken. België valt bij Meta in de groep "Rest of Western Europe" en de precieze cijfers staan op Twilio's prijspagina met land op België. Voor jouw volume gaat het over enkele euro's per maand — maar controleer het cijfer zelf als je budgetteert, zeker met de wijziging van 1 oktober 2026 op komst.
- **De doorlooptijd van de Meta-verificatie** varieert echt sterk. Ik heb bronnen gezien met 10 minuten en met 14 werkdagen. Dat is precies waarom ze eerst moet.
- **Dat Twilio geen Coexistence ondersteunt** volgt uit hun eigen documentatie (die je opdraagt het WhatsApp-account op je nummer te verwijderen), maar staat nergens als expliciete uitspraak. Als het behouden van je huidige nummer voor jou toch doorslaggevend blijkt, vraag het dan uitdrukkelijk aan Twilio-support voor jouw account voor je optie D overweegt.

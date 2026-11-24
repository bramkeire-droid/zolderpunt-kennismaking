# IDEE-15: de rollen overzichtelijk tonen (ontwerp)

Onderzoek en ontwerp van 2026-11-24. Alleen gelezen en geschreven in dit ene document; niets gebouwd, niets uitgerold. Geen bedragen van het bedrijf, geen sleutels, geen persoonsgegevens.

Brams woorden: "Denk dus ook goed na hoe al die verschillende rollen ook naar mij toe duidelijk gevisualiseerd zullen worden en niet chaotisch zullen zijn."

## 1. Samenvatting

1. Eén Zarvis, één stem. De rol is geen tweede persoonlijkheid maar een naamlabel dat de code afleidt uit het gereedschap dat gebruikt werd (marketing, mails, ...). Het label is tekst met een eenkleurig icoon, nooit een kleur: de kleuren van het venster hebben al een betekenis (blauw, groen, amber, rood, en goud en rood in het zwarte gat voor de stijlen).
2. Eén wachtrij "wacht op jouw ja" voor alle rollen, bewaard in `zarvis_acties` met status `wacht_op_goedkeuring` (die status bestaat al maar wordt nergens gebruikt). Het kleine venster toont één kaart tegelijk met Ja, Nee en Later; elke kaart noemt altijd de kost en wat terugdraaien inhoudt. Het ja komt uit een knop of een strikt stemcommando, niet uit het taalmodel.
3. "Alles tegelijk" is een derde klein venster "Zarvis · rollen", naar het model van het gegevensvenster: wacht, deed vandaag, fout, per rol.
4. Vaste regel per soort melding, niet per rol: stil, briefing, melding of bellen. Een nieuwe soort begint altijd op briefing.
5. De briefing is een dagstart bij het eerste openen na 07.00 op een werkdag (met een stille melding om 08.00 dat ze klaarstaat): per rol hoogstens drie zinnen, rollen zonder nieuws vallen weg, en "niets" wordt alleen gezegd als de rol echt kon nakijken.

Omvang: ongeveer 55 uur bouwwerk in acht stappen. Van Bram nodig: vijf beslissingen (punt 8), geen sleutels.

## 2. Wat er vandaag is

**Het kleine venster** (`src/pages/ZarvisVenster.tsx`). Standaardmaat 380 bij 560 (`zarvis-desktop/main.js:114-115`), bij jou 383 bij 563. Verticaal: kop met het zwarte gat 196 beeldpunten (regel 206), onderbalk ongeveer 76, dus de gesprekszone is ongeveer 290 beeldpunten hoog. Twee ronde knoppen rechtsboven (nieuw gesprek, uitloggen; 44 bij 44). Onder het gat: een statusregel van 16 punten en een regel van 13 punten die de lopende stap, de dossiernaam of de sneltoets toont (regels 219-228). Kleuren: achtergrond `#07090F`, tekst `#F3F5FA`, tweede tekst `#A9B4C8`, gedempt `#8792A8`, blauw `#2E8BFF` en `#8CCBFF`, groen `#5BE49B`, amber `#FFB547`, fout `#3A1418` met `#FFD9D9`. Vlakken zijn `white/[0.05]` tot `white/[0.12]`, hoeken `rounded-2xl`, koppen in `font-headline`.

**Meldingen**. Eén soort: de kaart "Zarvis meldt" met een belletje, blauw omrand (regels 269-277). De tabel `zarvis_meldingen` heeft alleen `tekst`, `taak_id`, `created_at`, `getoond_op` (`20261124010000_zarvis_taken.sql:35-43`). Er staat dus nergens van welke rol een melding komt, en ook niet hoe dringend ze is. Het venster haalt ze elke 20 seconden op (`ZarvisContext.tsx:194`), toont ze, zegt ze hardop als Zarvis in rust is, en geeft een Windows-melding (regels 187-190). Een rolmelding zou dus nu altijd hardop klinken.

**Het logboek** `zarvis_acties` (`20261123210000_zarvis_fundering.sql:45-60`): `gereedschap`, `invoer`, `voor`, `na`, `status` met de waarden uitgevoerd, teruggedraaid, mislukt, `wacht_op_goedkeuring`, geweigerd, `fout`, `lead_id`, `gesprek_id`, `teruggedraaid_op`. Elke gebruiker mag zijn eigen rijen aanmaken en bijwerken. **Geen enkele code schrijft erin**: in `src/` en `supabase/functions/` komt de tabelnaam alleen voor in de gegenereerde types. Er is ook geen kolom voor rol, kost, een leesbare titel of een einddatum.

**Hoe "ja" vandaag werkt**. Het gereedschap weigert zonder `bevestigd: true` (`doen.ts:174` en `:245`, `marketing.ts:115` en `:148`), en de instructie zegt dat het model eerst moet voorlezen en vragen. Maar `bevestigd` is een parameter die het model zelf invult. De poort in de code controleert niet dat het ja van Bram kwam. Een mail of webpagina met een verborgen zin kan het model dus in principe ook een `bevestigd: true` laten sturen. De instructie waarschuwt ervoor (tekst uit mails is gegevens), maar dat is een vraag aan het model, geen slot. Het voorstel zelf wordt nergens bewaard: bij het ja roept het model het gereedschap opnieuw aan met dezelfde invoer.

**De rollen**. Gebouwd: dossiers, mails lezen (`mail.ts`), marketing (`marketing.ts`: overzicht, zoektermen, uitsluiten, dagbudget), web, route, weer. Niet gebouwd: werf, financiën, inventaris, agenda, computer use (`ZarvisBeheer.tsx:36-50` toont ze als "Nog niet gebouwd"). De verkenningen (`docs/VERKENNING-*.md`) geven per rol wat altijd een ja vraagt: dagbudget en biedingen, negatieve zoekwoorden, publiceren (marketing); lonen, registraties wijzigen, schrijven naar Bouwflow (werf); betalen, boeken, btw (financiën); bestellen en naar Bouwflow duwen (inventaris).

**Het gegevensvenster** (`ZarvisBron.tsx`) is al het model voor een tweede venster: 420 breed, zelfde kleuren, opent vanzelf, leest zelf niets maar krijgt alles van het hoofdvenster via een `BroadcastChannel` (`bronKanaal.ts`). Het toont secties met velden en lijsten (`BronBlok`, regels 113-155), dus een lijst van twaalf zoektermen met kost past er al in.

**Achtergrondwerk**. `zarvis-taken` draait elke minuut een klok, maakt meldingen aan en kan bellen via Twilio (`supabase/functions/zarvis-taken/index.ts:115-121`). Een geplande controle heeft geen token van Bram en kan daarom geen mail, marketing of ander loket gebruiken (`LEES_GEREEDSCHAP`, `gereedschap.ts:459`; `VERKENNING-MARKETING.md`, "Een geplande controle heeft geen token"). Dat bepaalt hoe de briefing gemaakt kan worden (punt 5).

## 3. Bevindingen per vraag, met het ontwerp

### 3.1 Eén wachtrij "wacht op jouw ja"

**Wat erin staat.** Alleen wat buiten Compass iets verandert of geld kost, of naar buiten gaat (IDEE-29). Wat Zarvis binnen Compass mag doen, doet hij zelf met een logboekregel (status `uitgevoerd`); dat komt niet in de wachtrij maar wel in het overzicht. Elk item is een rij in `zarvis_acties` die op zichzelf staat:

- rol (afgeleid uit het gereedschap), een titel in één zin ("Twaalf zoektermen uitsluiten"), een korte uitleg waarom;
- **kost**: eenmalig, per dag of per maand, en de grens waar het onder blijft (bijvoorbeeld "plafond 45 euro per dag", dat in de code van het loket staat);
- **terugdraaien**: ja, beperkt of nee, met één zin wat dat betekent ("Zarvis zet het terug; de wijziging gaat de nacht erna in Google Ads", "Een verstuurd bericht kan niet terug");
- **risicoklasse** (zie hieronder), de details voor het gegevensvenster (de lijst termen, de volledige tekst van een bericht), een einddatum en een sleutel om gelijkaardige voorstellen te groeperen.

**Vier klassen, vastgelegd in de code per gereedschap, niet door het model gekozen:**

| Klasse | Voorbeeld | Hoe goedkeuren |
|---|---|---|
| A. Gratis en terug te draaien | zoektermen uitsluiten of weer toelaten | Stem, één tik, of bulk |
| B. Kost geld, binnen een plafond | dagbudget aanpassen | Tik; de kost staat bovenaan de kaart; geen bulk |
| C. Gaat naar een persoon buiten het bedrijf | bericht aan een klant, aan een arbeider | Tik, na het volledige bericht gezien of gehoord te hebben; geen bulk |
| D. Niet terug te draaien of gevoelig | loon vergrendelen, bestelling, publiceren, naar Bouwflow schrijven | Tik, en daarna een tweede tik "Zeker?" met de gevolgen in één zin; nooit met de stem alleen |

De klasse beperkt de manier van goedkeuren, nooit de reden om te vragen: ook klasse A staat in de wachtrij, want Bram zei letterlijk "Er worden alleen zaken uitgesloten na mijn bevestigen".

**Hoe Bram goedkeurt.**

1. *Met zijn stem*, alleen klasse A. Zarvis leest het item voor: wat, wat het kost, of het terug kan, en vraagt "Akkoord?". Het venster (niet het taalmodel) herkent een antwoord van één of twee woorden uit een kleine vaste lijst ("ja", "akkoord", "doe maar", "nee", "laat maar", "later"), enkel als dat item de laatste twee minuten voorgelezen werd en nog openstaat. Alles anders gaat naar het gesprek als gewone vraag. Waarom niet voor B tot D: de sprekerherkenning bestaat niet (IDEE-23, "niet gebouwd"); muziek, een collega of een klant op de achtergrond mag geen bericht of uitgave goedkeuren.
2. *Met één tik*. De kaart heeft een grote Ja-knop (44 punten hoog, zoals `rondeKnop`).
3. *In bulk*, alleen in klasse A: in het overzichtsvenster "Keur de 4 gratis voorstellen goed", met de som van de kost (nul) en het aantal dat terug kan. Nooit gemengd met B tot D.

**Technisch: waar het ja vandaan komt.** Het voorstel wordt een rij met status `wacht_op_goedkeuring`, aangemaakt door een nieuw gedeeld hulpje in de poort (`maakVoorstel`) dat het gereedschap in plaats van het huidige `bevestigd` gebruikt. Het model krijgt terug "voorstel 7 ligt klaar", niet de mogelijkheid om het uit te voeren. Uitvoeren gebeurt in een nieuwe functie `zarvis-goedkeuren` die door het venster wordt aangeroepen met het toegangsbewijs van Bram en een id. Ze controleert login en rol, dat de rij van hem is en nog wacht, dat ze niet vervallen is, en voert dan zelf het gereedschap uit. Het resultaat gaat in `voor` en `na`; status wordt `uitgevoerd` of `mislukt`. Het taalmodel kan niets goedkeuren; een vergiftigde mail kan hooguit een voorstel aanmaken dat Bram ziet.

Twee gevolgen die ik nagekeken heb. (a) De huidige policy laat de eigenaar zijn eigen rij zomaar bijwerken (`fundering.sql:86-92`); een gebruiker zou de status dus buiten de functie om kunnen omzetten. Voorstel: het bijwerken van `status` voor gewone gebruikers intrekken en alleen `zarvis-goedkeuren` met de serversleutel laten schrijven, op dezelfde manier als `zarvis-taken` (alleen voor beheerders). Dat is een wijziging aan een eigen tabel van Zarvis en moet in het logboek staan. (b) De check op `status` kent geen `vervallen` of `vervangen`; die twee waarden moeten erbij (additief).

**Kolommen die erbij moeten** (alle optioneel, bestaande rijen blijven geldig): `rol`, `titel`, `uitleg`, `klasse` (A tot D), `kost` (jsonb: eenmalig, per dag, per maand, plafond), `terugdraaibaar` (ja, beperkt, nee) met `terugdraai_uitleg`, `terugdraai` (jsonb: wat Zarvis doet om het te herstellen), `bron` (jsonb in dezelfde vorm als `ZarvisBron`, zodat het gegevensvenster het toont), `groep_sleutel`, `vervalt_op`, `voorgelezen_op`, `beslist_op`, `beslist_via` (klik, stem, bulk), `taak_id`. De bestaande kolommen `voor`, `na`, `fout`, `teruggedraaid_op`, `lead_id` dekken de rest.

**Wat het kost en terugdraaien.** Beide staan op elke kaart in twee vaste regels, altijd in dezelfde volgorde, ook als het antwoord "niets" of "kan niet" is. Na uitvoering toont het overzicht "Terugdraaien" bij elk uitgevoerd item dat `terugdraaibaar` ja of beperkt heeft; de knop roept dezelfde functie aan met `actie: terugdraaien`, voert `terugdraai` uit en zet de status op `teruggedraaid`.

**Vier regels tegen goedkeuringsmoeheid.** Alle vier komen uit de bronnen in punt 3.6.
- Een nieuw voorstel met dezelfde `groep_sleutel` als een open voorstel vervangt het (oude rij: status `vervangen`), zodat dezelfde vraag niet tien keer in de rij staat.
- Als de inhoud van een voorstel verandert, vervalt het ja: er komt een nieuwe rij, en de goedkeuring geldt alleen voor de versie die Bram zag (`voorgelezen_op` en een controlesom van `invoer`).
- Hoogstens vijf open voorstellen per rol en tien in totaal. Daarboven wacht de rol met nieuwe voorstellen. Een voorstel vervalt automatisch (marketingvoorstellen na twee dagen, omdat de cijfers veranderen; berichten na zeven).
- Afgewezen en vervallen voorstellen blijven zichtbaar in het overzicht, met de afwijzingsgraad per soort. Zegt Bram bij een soort altijd ja, dan toont het overzicht dat als een vraag aan hem, niet als een reden om het stilletjes zelf te doen.

**Schets: de kaart in het kleine venster (383 breed).** De kop met het gat blijft. Onder de statusregel verschijnt, alleen als er iets wacht, een pil "Wacht op jou · 3". Tikken op de pil vervangt de gesprekszone door de kaart; het gesprek blijft bewaard en komt terug met een knop "Terug naar het gesprek".

```
┌─────────────────────────────────────┐
│        (zwart gat, 196 hoog)        │
│              Zeg het maar           │
│   In Compass: Dossier Janssens      │
│         [ Wacht op jou · 3 ]        │
├─────────────────────────────────────┤
│  1 van 3                    ‹  ›    │  <- 12px gedempt
│  ▣ MARKETING                        │  <- chip: icoon + 12px kapitalen
│  Twaalf zoektermen uitsluiten       │  <- headline 19px
│  Ze kostten samen geld en brachten  │
│  niets op in 90 dagen. Geen enkele  │
│  past bij zolders.                  │
│  [ Bekijk de lijst ]                │  <- opent het gegevensvenster
│  ─────────────────────────────────  │
│  Kost         niets, bespaart geld  │
│  Terugdraaien kan, gaat 's nachts in│
│                                     │
│  [  Ja  ]    [ Nee ]    [ Later ]   │  <- 44 hoog
├─────────────────────────────────────┤
│  ( typ of spreek                 ◉ )│
└─────────────────────────────────────┘
```

Kaart voor klasse C (bericht aan een klant): de volledige tekst staat in de kaart (scrollbaar), "Kost: niets", "Terugdraaien: kan niet, het is verstuurd", en de knop heet "Verstuur". Kaart voor klasse D: de knop heet "Ja, ik weet het zeker" en vraagt na de tik één extra bevestiging.

Bij 0 voorstellen verdwijnt de pil; er is dan niets nieuws in het venster ten opzichte van vandaag.

### 3.2 Welke rol spreekt

**Keuze: één stem, de rol als tekstlabel met een eenkleurig icoon, op twee plaatsen.**

1. *De statusregel onder het gat* (regel 222-228 toont nu `bezigeStap.label`): "Marketing · zoektermen opzoeken…". De rol komt voor de stap, in dezelfde 13 punten tekst.
2. *Boven elk antwoord en elke melding* een chip van 12 punten kapitalen in `#8CCBFF` dat nu al "Zarvis meldt" draagt (regel 272). Een antwoord met stappen uit één rol krijgt die chip; uit twee rollen ("Dossiers + Mails"); uit meer dan twee geen chip.

De rol is een eigenschap van het gereedschap: één lijst in de code (`ROL_VAN_GEREEDSCHAP`) naast `GEREEDSCHAP`, bijvoorbeeld `marketing_*` en `sluit_zoektermen_uit` naar marketing, `lees_mail*` naar mails. De server stuurt `rol` mee in het bestaande `stap`-bericht (`client.ts:34`). Het model kiest de rol dus niet en kan zich niet in de rol vergissen. Dat beantwoordt de eerste vraag uit de ideeënbak ("één Zarvis die zelf de juiste rol kiest, of kies jij"): één Zarvis, de rol is zichtbaar maar niet te kiezen. Wil Bram een gesprek binnen één rol houden, dan zegt hij het ("praat met marketing"), maar dat is geen scherm.

**Waarom dit en niet iets anders.**
- *Een kleur per rol*: zes tot negen kleuren in een venster van 383 punten geven precies de chaos die Bram wil vermijden, en botsen met de bestaande betekenis: groen is klaar, amber is let op, rood is fout, en het zwarte gat kleurt goud voor de familiemodus en rood voor savage (`ZarvisGat.tsx:150-152`). Een rode marketingrol zou lijken op een fout.
- *Tabs per rol*: er past geen tabbalk naast het gat van 196 punten en de gesprekszone van ongeveer 290; en het zou van één assistent een app met negen schermpjes maken.
- *Een eigen avatar of gat per rol*: Bram noemde het gat "jouw kroonstuk"; er kan er maar één zijn.
- *Alleen tekst zonder icoon*: kan, maar een eenkleurig icoon (lucide, zoals de rest) leest sneller bij een snelle blik. Eén vorm per rol, nooit kleur, nooit animatie.

De chip is niet klikbaar; ze is een etiket. Klikken doe je op de pil "Wacht op jou" of op het overzicht.

### 3.3 Overzicht "alles tegelijk"

**Keuze: een derde klein venster "Zarvis · rollen"** op `/zarvis/rollen`, geopend zoals het gegevensvenster (`window.open` met `popup=yes`), met een knop in het systeemvak en met de zin "toon het overzicht" (een gereedschap dat het venster opent). Maat 520 bij 720, zoals het beheervenster (`main.js:65`), zodat een tabel met kolommen past.

Waarom hier en niet elders:
- *Het gegevensvenster zelf*: dat is bewust dom en hoort bij één antwoord ("Bij: jouw vraag"); er een dagoverzicht in stoppen mengt twee soorten inhoud, en het krijgt zijn gegevens van het hoofdvenster, terwijl het overzicht ook moet werken als het hoofdvenster dicht is.
- *Een pagina in Compass*: Compass is licht en gebouwd voor het team met dossiers; Zarvis is donker, en Bram zei: "Ze leeft apart." Voor een enkele gebruiker met een eigen venster is een tweede app om open te zetten omslachtiger. Een Compasspagina zou pas nuttig zijn als anderen dan Bram rollen gaan volgen; dat is vandaag niet gevraagd.
- *In het kleine venster*: er past hooguit een rij per rol, en dat is wat Bram nu al kan krijgen door te vragen.

Het venster leest zelf uit de databank met de login van Bram. De beheerspagina doet dat al in een eigen venster (`ZarvisBeheer.tsx` roept `leesInstellingen` en `supabase.functions.invoke` aan), dus de sessie wordt gedeeld; dat is afgeleid uit de code, niet getest voor dit nieuwe venster.

**Indeling in tekst (520 breed, donker, dezelfde kaarten als het gegevensvenster):**

```
┌───────────────────────────────────────────────────┐
│ ROLLEN                    dinsdag 24 november  ✕  │
│ Alles loopt, behalve marketing (1 fout)           │  <- één zin, 16px
├───────────────────────────────────────────────────┤
│ WACHT OP JOU (3)                  oudste: 2 uur   │
│ ▣ Marketing   12 zoektermen uitsluiten  [Ja][Nee] │
│ ▣ Marketing   Dagbudget 30 euro         [Bekijk]  │
│ ▣ Werf        Bericht aan arbeider      [Bekijk]  │
│ [ Keur de gratis voorstellen goed (1) ]           │
├───────────────────────────────────────────────────┤
│ PER ROL           wacht   deed vandaag     fout   │
│ ▣ Dossiers          0     14 opgezocht      0     │
│ ▣ Mails             0     3 gelezen         0     │
│ ▣ Marketing         2     1 uitgesloten     1  ▸  │
│ ▣ Werf              1     niets             0     │
│ ▣ Financiën         ·     nog niet gebouwd        │  <- gedempt
│ ▣ Inventaris        ·     nog niet gebouwd        │
│ ▣ Agenda            ·     later                   │
│ ▣ Computer          ·     later                   │
├───────────────────────────────────────────────────┤
│ MISLUKT                                           │
│ Marketing · nachtelijke synchronisatie            │
│ "Google gaf geen antwoord" · 04.12 · [Opnieuw]    │
├───────────────────────────────────────────────────┤
│ LOOPT NOG                                         │
│ Controle: komt de offerte binnen? · elk uur tot   │
│ 20.00 · beurt 6 van 24 · [Stop]                   │
├───────────────────────────────────────────────────┤
│ AFGEWEZEN OF VERVALLEN (laatste 7 dagen)       ▸  │
└───────────────────────────────────────────────────┘
```

Een rij uitklappen (▸) toont de uitgevoerde acties van die rol vandaag, elk met "Terugdraaien" als het kan, en de laatste mislukking met haar reden.

**Waar elk cijfer vandaan komt, zonder nieuwe tabel:**
- *Wacht*: `zarvis_acties` met status `wacht_op_goedkeuring`, per `rol`.
- *Deed vandaag*: `zarvis_acties` met status `uitgevoerd` van vandaag, per `rol`; plus een regel "keek 14 keer in dossiers" uit `zarvis_berichten.gereedschap` (alleen lezen), gedempt weergegeven.
- *Fout*: `zarvis_acties` met status `mislukt`, en `zarvis_taken` met status `mislukt`.
- *Loopt nog*: `zarvis_taken` met status `actief`. Let op: een geplande controle logt geen eigen beurten, alleen `beurten` en `laatste_resultaat`; "wat deed ze vandaag" voor controles is dus een teller, geen lijst, tenzij `zarvis-taken` bij een uitslag een rij in `zarvis_acties` schrijft (hoogstens één per taak per dag, anders loopt het log vol).
- Een rol die nog niet bestaat toont "nog niet gebouwd", zoals de beheersectie al doet; zo blijft de rij en groeit de lijst mee.

Eén view of functie in SQL (`zarvis_rollen_overzicht`) geeft die tellingen in één oproep terug, zodat het venster niet vijf keer vraagt.

### 3.4 Onderbreken: vaste regel per soort

Eén test per kanaal, naar het voorbeeld van Apple (zie 3.6): bellen of een melding mag alleen als het nu gebeurt of binnen het uur, en als niet kijken geld of een klant kost. Alles anders wacht.

**De regel hangt aan de soort melding, niet aan de rol of het model.** In de code staat één lijst `SOORTEN` met per soort het kanaal. Een rol kan een nieuwe soort alleen op `briefing` aanmaken; verhogen vraagt een beslissing van Bram. Daardoor kan een nieuwe rol nooit zelf luider worden.

| Kanaal | Wat het doet | Mag alleen voor |
|---|---|---|
| **Stil** | Alleen in het overzicht | Elke geslaagde routinehandeling (een controle zonder bevinding, een uitsluiting die Bram goedkeurde en lukte) |
| **Briefing** | Verschijnt in de dagelijkse briefing en in het overzicht; een open voorstel verhoogt alleen de teller op de pil | Standaard voor alles. Nieuwe voorstellen, cijfers, afwijkingen, een mislukking die tot morgen kan wachten, aanvragen van de site |
| **Melding** | Windows-melding en een kaart in het venster; geen stem; WhatsApp alleen als Bram dat zo instelde | (1) Wat Bram zelf vroeg ("verwittig mij zodra X"), (2) een voorstel met een einddatum vandaag (een prijs die vandaag vervalt), (3) een uitgevoerde actie die faalde en geld kost zolang ze faalt, (4) dezelfde mislukking twee nachten op rij |
| **Bellen** | Telefoonoproep met voorlezen (bestaat: IDEE-28) | (1) Wat Bram zelf met "bel" plande, (2) iets dat binnen het uur geld of een klant kost en dat Bram vermoedelijk niet ziet, bijvoorbeeld een afspraak in het uur terwijl hij nog op kantoor zit (IDEE-20) of een site die langer dan 30 minuten onbereikbaar is |

Bijkomende regels (voorstel, te bevestigen):
- Een rolmelding wordt nooit hardop gezegd tenzij Bram die zelf plande. Vandaag zegt het venster elke melding hardop als Zarvis in rust is (`ZarvisContext.tsx:189`); voor een herinnering die hij zelf vroeg klopt dat, voor een rol die uit zichzelf iets meldt niet. Het gat toont een stille aanwijzing: een kleine stip bij de pil.
- Hoogstens drie spontane meldingen per uur; de vierde en volgende worden één melding "nog 4 dingen, zie het overzicht".
- Bellen: hoogstens één keer per rol per dag en twee keer in totaal; niet tussen 21.00 en 07.30, en niet op zondag, behalve voor iets dat Bram zelf met "bel" plande; een tweede oproep over hetzelfde pas na een uur. De boodschap staat altijd ook als melding klaar en de terugval op WhatsApp blijft zoals gebouwd.
- "Stil tot 14 uur" kan Bram zeggen; dat wordt een rij in `zarvis_instellingen`. Tijdens stil komt alles in de briefing, behalve bellen voor wat hij zelf met "bel" plande.
- Een mislukte routinehandeling is niet automatisch een melding: één keer mislukt is briefing, twee keer is melding.

### 3.5 De briefing

**Wanneer en hoe ze gemaakt wordt.** De rollen mail, marketing en later werf en financiën zijn alleen bereikbaar met het token van Bram; een geplande taak heeft dat niet (`gereedschap.ts:459`, verkenning marketing). Een briefing om 08.00 uit de rollen zelf vraagt dus per loket een eigen sleutel, een beslissing van Bram. Het ontwerp vermijdt dat:

1. Om 08.00 op werkdagen (instelbaar in `zarvis_instellingen`) komt een stille melding, gebouwd door `zarvis-taken` uit wat in Compass zelf staat: "Briefing staat klaar: 3 dingen wachten op jou, 1 fout." Dat gebruikt alleen `zarvis_acties`, `zarvis_taken` en `zarvis_meldingen`.
2. Bij het eerste openen of de eerste sneltoets na 07.00 vraagt het venster zelf de volledige briefing, met het token van Bram. Het stuurt een gesprek met een vaste instructie (`modus: briefing`): ga langs elke rol met een overzichtsgereedschap, hoogstens drie zinnen per rol, sla rollen over zonder nieuws, schrijf het resultaat weg. Het resultaat zijn rijen in `zarvis_meldingen` met `ernst: briefing`, `rol` en `briefing_dag`, zodat ze als kaarten per rol getoond kunnen worden en niet opnieuw berekend worden bij elke keer openen.
3. Het zegt de briefing niet hardop zonder dat Bram openklapt: eerst "Goeiemorgen. Wil je de briefing?" en een ja of tik. Hij zit soms in de auto of bij een klant; luidop beginnen zou storen.

**Hoe ze klinkt.** Gesproken zoals de rest van Zarvis: geen opmaak, korte zinnen, dag en maand, geen opsomming van getallen. Volgorde: eerst wat op jou wacht, dan de rollen met nieuws op volgorde van dringendheid.

Voorbeeld (opgesteld, niet uitgeprobeerd):
> Goeiemorgen Bram. Er wachten drie dingen op jou: twee van marketing en één van werf. Marketing: de nachtelijke synchronisatie is gelukt. Twaalf zoektermen kosten geld en brengen niets op; ik stel voor ze uit te sluiten. Het dagbudget kan blijven staan. Werf: één registratie lijkt reistijd die werk is; ik laat ze aan je zien. Mails en dossiers: niets bijzonders. Zeg maar welke ik als eerste toon.

**Hoe lang.** Hoogstens drie zinnen per rol en hoogstens ongeveer 90 seconden gesproken (rond 220 woorden bij een normaal spreektempo; geschat, niet gemeten met de Vlaamse stem). Past het niet, dan sluit Zarvis af met "en nog drie kleinere dingen staan in het overzicht". Bram kan met "volgende" of "stop" overslaan. De tekst staat altijd ook als kaarten per rol in het venster; wie niet wil luisteren, leest.

**Als er niets is.** Eén zin, zes seconden: "Goeiemorgen Bram. Er wacht niets op jou en er liep niets fout." Geen opvulling, geen weer, geen grapje. Eén belangrijke eerlijkheidsregel: "niets" mag alleen gezegd worden als de rol echt kon nakijken. Kon marketing het loket niet bereiken, dan zegt de briefing "Marketing kon ik niet nakijken" in plaats van de rol over te slaan, want een stilte is anders niet te onderscheiden van "alles is goed". Elke rol schrijft daarvoor `laatst_nagekeken` weg.

**Niet elke dag.** Weekend, feestdag en dagen waarop Bram niet opent: geen briefing, maar de stille melding van 08.00 met de teller blijft op werkdagen. Wat in een gemiste briefing stond, gaat niet verloren (het staat in het overzicht) en wordt niet de volgende dag herhaald.

### 3.6 Wat anderen doen, en wat ik overneem

Wat ik las staat hier met de bron. Vendorblogs zijn als zodanig aangeduid; waar ik alleen een samenvatting van een zoekresultaat zag, staat dat erbij.

| Bron | Wat staat er | Overgenomen | Niet overgenomen |
|---|---|---|---|
| Claude Code Docs, [agent view](https://code.claude.com/docs/en/agent-view) (gelezen) | Overzicht van alle achtergrondsessies, gegroepeerd per toestand: vastgepind, klaar voor nazicht, wacht op invoer, bezig, klaar. Elke rij heeft een toestandsicoon, een naam, één regel samenvatting en een leeftijd. Een melding komt alleen bij "wacht op invoer", "klaar" of "mislukt". Antwoorden op een toestemmingsvraag vanuit de lijst tellen niet: daarvoor open je de sessie zelf. | De groepering "wacht op jou" bovenaan, dan bezig, dan klaar; één regel samenvatting per rij; de leeftijd van het oudste item; een melding alleen bij wacht, fout of klaar. Vooral de laatste regel: een goedkeuring is een eigen handeling in een eigen plaats, niet een vrij antwoord in het gesprek. Dat is de basis voor `zarvis-goedkeuren`. | Groeperen per sessie of map: bij Zarvis is de eenheid de rol, niet de sessie. Sneltoetsen en toetsenbordbediening: Bram bedient met stem en tik. |
| WorkOS, [Curating queues beats approving actions](https://workos.com/blog/curating-queues-beats-approving-actions) (gelezen; vendorblog) | Bij een agent die doorwerkt wordt elke actie goedkeuren een flessenhals en een stempel. Onomkeerbaar werk (publiceren, berichten, geld, verwijderen) houdt een poort per actie, buiten de agent om afgedwongen. Wachtrij: dubbels weigeren, afwijzingen zichtbaar houden, een bewerking maakt het ja ongeldig, de aanmaak begrenzen tot wat de mens kan nakijken, de leeftijd van het oudste item en de afwijzingsgraad bijhouden (bijna honderd procent ja is een stempel). | Alle vijf: dubbels vervangen, afwijzingen zichtbaar, ja vervalt bij wijziging, hoogstens vijf per rol, de afwijzingsgraad en de oudste leeftijd in het overzicht. En de scheiding: gratis en terug te draaien (klasse A) mag in bulk, de rest poort per actie. | Een samenvatting naar een gedeeld kanaal voor het team: Bram is de enige lezer. |
| Apple, [Managing notifications](https://developer.apple.com/design/human-interface-guidelines/managing-notifications.md) (gelezen) | Vier niveaus: passief, actief, tijdgevoelig, kritiek. Tijdgevoelig breekt door een Focus alleen als het nu of binnen het uur speelt; het niveau moet de echte dringendheid weergeven; de gebruiker kan het afzetten; een samenvatting op gekozen tijden vermindert onderbrekingen. | De vier niveaus als vier kanalen (stil, briefing, melding, bellen); de test "nu of binnen het uur" voor bellen; de regel dat een niveau nooit hoger staat dan de echte dringendheid; "stil tot 14 uur" door Bram te zetten. | Het niveau "kritiek" (gezondheid en veiligheid): bestaat voor Zarvis niet. Meldingen laten doorbreken met de stem (hardop): voor een rolmelding niet, zie 3.4. |
| OpenAI, [ChatGPT Pulse](https://help-lb.openai.com/en/articles/12293630-chatgpt-pulse) (alleen uit een zoekresultaat; mijn rechtstreekse oproep van de pagina gaf 404) en [Bloomberg](https://www.bloomberg.com/news/articles/2025-09-25/chatgpt-feature-offers-users-a-personalized-daily-briefing) (niet geopend) | Elke ochtend vijf tot tien kaarten, kort te lezen en uit te klappen; niet bewaarde kaarten verdwenen na een dag; feedback met duim omhoog of omlaag. Volgens het zoekresultaat wordt Pulse stopgezet en gaan proactieve updates naar geplande taken. | Kaarten die je snel scant en uitklapt; kaarten per rol; verdwijnen als je ze niet nodig had. En de richting "geplande taak in plaats van een feed", omdat dat bij `zarvis-taken` past. | Vijf tot tien kaarten per dag: voor Bram is het per rol drie zinnen, en een rol zonder nieuws toont niets. Een feed op basis van geheugen over zijn gesprekken: dat is IDEE-30 en nog niet gebouwd. |
| Autonomous.ai, [multi-agent dashboard](https://www.autonomous.ai/en-CA/ourblog/multi-agent-dashboard), en AgentsRoom (alleen als zoekresultaat gezien; vendorblogs) | Eén scherm met per agent de toestand, de activiteit en het resultaat, gegroepeerd naar wie jou nodig heeft. Een overzicht dient om te sorteren, niet om alles te lezen of tijdens het werk in te grijpen. Een gemis in de bestaande tools: er is nergens een kostenoverzicht. | Het overzicht als sorteerscherm: eerst wie iets van mij wil. De kost per voorstel en per rol (Bram vroeg om te zien wat het kost) is hier de aanvulling. | Productvergelijkingen van die blogs: niet neutraal en niet over een assistent voor één persoon. |
| Zoekresultaten van [Airtable](https://www.airtable.com/articles/human-in-the-loop-ai-agents) en [Zoho](https://www.zoho.com/agentinbox/articles/human-approval-loops-ai-email-agents.html) (alleen samenvattingen gezien; vendorblogs) | Goedkeuring in lagen (automatisch, melden, blokkeren) naar risico; blanket-goedkeuringen leiden tot doorklikken; toon het volledige concept voor het verstuurd wordt. | Lagen naar risico (mijn vier klassen); het volledige bericht tonen voor klasse C. | Een anekdote over 14.000 openstaande items: geen maatstaf. |

Wat ik niet vond: een geschreven studie over voice-only goedkeuren door één eigenaar. Mijn beperking van het stem-ja tot klasse A is mijn eigen afweging op basis van wat in de code ontbreekt (geen sprekerherkenning), geen overgenomen regel.

## 4. Voorstel in bouwstappen, van klein naar groot

Totaal: ongeveer 55 uur (bandbreedte 48 tot 65). Volgorde zo dat elke stap op zichzelf staat en na de stap bruikbaar is. De volgorde van de bouw ligt bij de projectdirigent; stap 1 en 2 zijn de voorwaarde voor elke volgende rol.

**Stap 1: rol als label (3 u).**
- Zarvis kan dan: bij elk antwoord en elke stap zeggen welke rol het is.
- Raakt: `supabase/functions/_shared/zarvis/gereedschap.ts` (lijst `ROL_VAN_GEREEDSCHAP`), `supabase/functions/zarvis/index.ts` (`rol` in het stap-bericht), `src/lib/zarvis/client.ts:34`, `ZarvisContext.tsx`, `ZarvisVenster.tsx` (statusregel en chip, regels 222 en 272). Geen databank.
- Ja van Bram: nee, alleen tonen.
- Nodig van Bram: de naam en de volgorde van de rollen (punt 8, vraag 4 is aanverwant).
- Bewijs: een test dat elk gereedschap precies één rol heeft; een schermafdruk van het echte venster bij 383 bij 563 met chip en statusregel; geen overloop van de regel bij de langste rolnaam ("Financiën").

**Stap 2: het fundament van de wachtrij (12 u).**
- Zarvis kan dan: een voorstel bewaren in plaats van het ja aan het model over te laten, en dat voorstel pas uitvoeren op een knop.
- Raakt: een migratie op `zarvis_acties` (kolommen uit 3.1, statussen `vervallen` en `vervangen`, intrekken van `status` bijwerken voor gewone gebruikers), nieuwe functie `zarvis-goedkeuren`, hulpje `maakVoorstel` in de poort (`gereedschap.ts`), en de bestaande gereedschappen `sluit_zoektermen_uit`, `stel_dagbudget_in`, `stuur_whatsapp` en `plan_taak` (klant) die op `bevestigd` steunen. Het loket van de website blijft ongewijzigd (het houdt zijn eigen `bevestigd: true`; `zarvis-goedkeuren` stuurt dat pas na Brams ja).
- Ja van Bram: dit is zelf de poort; hij moet de migratie en de uitrol in Compass (vier stappen uit de overdracht) toelaten, en de wijziging van het recht op een eigen tabel.
- Nodig van Bram: beslissing vraag 3 (stem-ja) maakt hier nog niets uit.
- Bewijs: tests tegen een nagebootste databank en loket (zoals `takenBellen.test.ts`): het model kan geen voorstel uitvoeren; een voorstel van een andere gebruiker niet; een vervallen voorstel niet; een gewijzigde invoer maakt het ja ongeldig; een dubbele sleutel vervangt. Daarna met een tijdelijke beheerder (zoals in het logboek) één voorstel aanmaken en weigeren, nooit met een echte term of echte klant uitvoeren (les uit het logboek).

**Stap 3: de kaart in het kleine venster (8 u).**
- Zarvis kan dan: Bram een voorstel tonen met kost en terugdraaien, en goedkeuren met één tik.
- Raakt: `ZarvisVenster.tsx` (pil en kaartweergave), `ZarvisContext.tsx` (open voorstellen ophalen, zoals de meldingen, regel 174-196), `bronKanaal.ts` (het voorstel met `bron` naar het gegevensvenster sturen), `ZarvisBron.tsx` (geen wijziging nodig voor een lijst).
- Ja van Bram: het ja zelf, in dit scherm.
- Nodig van Bram: een blik op de schets (3.1) en zijn oordeel over de kaart.
- Bewijs: `uicontrole` in de draaiende app bij 383 bij 563: de kaart past zonder schuiven bij klasse A, B en D; bij C (lange tekst) schuift alleen het berichtvak; knoppen 44 punten hoog; schermafdruk van elke klasse; pil verdwijnt bij nul.

**Stap 4: ja met de stem, klasse A (4 u).**
- Zarvis kan dan: een gratis voorstel voorlezen en een ja of nee van Bram herkennen zonder dat het model ertussen zit.
- Raakt: `ZarvisContext.tsx` (herkenning vóór `stuurIntern`, regel 211), `voorgelezen_op` bijwerken.
- Ja van Bram: het stem-ja zelf. Nodig: beslissing vraag 3.
- Bewijs: tests op de herkenning (alleen de vaste woorden; "ja maar" niet; een voorstel van klasse B tot D nooit; na twee minuten niet meer); één proef met de echte microfoon op zijn pc, eerlijk gemeld als niet getest op de Vlaamse stem zolang de sleutel van Azure ontbreekt.

**Stap 5: meldingen met soort en kanaal (6 u).**
- Zarvis kan dan: een melding een soort geven met een vast kanaal, bundelen, en een rol nooit hardop laten spreken.
- Raakt: migratie op `zarvis_meldingen` (`rol`, `soort`, `ernst`, `briefing_dag`), de lijst `SOORTEN` in `_shared/zarvis/`, `zarvis-taken/index.ts` (de functie `verwittig`, regels 115-121, en de bellimiet), `ZarvisContext.tsx` (regel 187-190: hardop alleen voor wat Bram zelf plande), beheersectie (instelling "stil tot").
- Ja van Bram: nee; wel zijn beslissing over de belregels (vraag 2).
- Bewijs: tests voor de lijst en de bellimiet (een tweede oproep binnen het uur, nacht, zondag); testen met de bestaande nagebootste Twilio; schermafdruk van de bundel-melding.

**Stap 6: het overzichtsvenster (10 u).**
- Zarvis kan dan: per rol tonen wat wacht, wat hij deed en wat misliep, en terugdraaien.
- Raakt: `src/pages/ZarvisRollen.tsx` (nieuw), `src/App.tsx` (pad `/zarvis/rollen`, naast regel 485-490), `zarvis-desktop/main.js` en het systeemvak (menu), een SQL-functie `zarvis_rollen_overzicht`, een gereedschap `toon_overzicht`.
- Ja van Bram: terugdraaien en bulk gebeuren hier; ze lopen door `zarvis-goedkeuren`.
- Nodig van Bram: vraag 4 (derde venster of Compass), en een oordeel over de indeling.
- Bewijs: `uicontrole` van het venster met testrijen in alle toestanden (leeg, één rol met fout, alle rollen); het getal in het overzicht gelijk aan een telling rechtstreeks in de databank; controleren dat het venster ook werkt met het hoofdvenster dicht en met een verlopen sessie.

**Stap 7: de briefing (8 u).**
- Zarvis kan dan: bij de eerste opening van de dag per rol in hoogstens drie zinnen zeggen wat er is, en "niets" zeggen als dat klopt.
- Raakt: `zarvis/index.ts` (modus briefing in de instructie), `zarvis-taken` (de stille melding van 08.00), `ZarvisContext.tsx` (eerste opening na 07.00), `zarvis_instellingen` (tijd en dagen), elke rol (`laatst_nagekeken`).
- Ja van Bram: nee; de briefing leest alleen en stelt voor.
- Nodig van Bram: vraag 1.
- Bewijs: een echte briefing met een tijdelijke beheerder; de lengte gemeten in woorden en seconden met de echte stem (niet mogelijk zonder de sleutel van Azure: dan alleen in woorden); een lege dag; een dag waarop een loket weigert (de briefing zegt "kon ik niet nakijken"); en dat de briefing de tweede keer openen niet opnieuw het model aanroept.

**Stap 8: bulk, vervallen, begrenzing en afwijzingsgraad (5 u).**
- Zarvis kan dan: gratis voorstellen in één keer laten goedkeuren, voorstellen laten vervallen, de aanmaak per rol begrenzen en tonen wanneer Bram altijd ja zegt.
- Raakt: `zarvis-goedkeuren` (actie bulk, alleen klasse A), `zarvis-taken` (vervallen), het overzicht (afwijzingsgraad, leeftijd van het oudste).
- Ja van Bram: bulk-ja. Nodig: niets extra.
- Bewijs: een test dat bulk een klasse B tot D weigert; een test op verval; en een controle dat de afwijzingsgraad klopt met de rijen.

Geen stap vraagt een nieuwe sleutel. Wel gelden de bestaande: Twilio voor bellen (vier secrets, twee ontbreken volgens het logboek) en Azure voor de stem.

## 5. Afhankelijkheden van andere ideeën

- **IDEE-29** (doen, niet vertellen; alles buiten Compass na Brams ja): de wachtrij is de uitwerking ervan. Marketing is de eerste rol die erop overgaat.
- **IDEE-10 tot 14** (de rollen zelf): elk loket moet een voorstel kunnen teruggeven zonder iets te veranderen (marketing doet dat al met `bevestigd`), en een manier hebben om terug te draaien. Werf, financiën en inventaris bestaan nog niet; hun rij in het overzicht blijft grijs tot ze er zijn. Stap 1 tot 6 hoeven daar niet op te wachten.
- **IDEE-28** (bellen): de belregels in 3.4 vervangen de open vragen daar (wat is dringend, 's nachts, kost). De sleutels `TWILIO_VAN_NUMMER` en `ZARVIS_BEL_NAAR` ontbreken nog.
- **IDEE-16** (taken): `zarvis_taken` krijgt een kolom `rol`; de controles zelf blijven zoals ze zijn.
- **IDEE-23** (sprekerherkenning): zolang die ontbreekt, geldt het stem-ja alleen voor klasse A. Met herkenning kan klasse B naar stem.
- **IDEE-20** (agenda: verwittigen als hij nog op kantoor is) levert de eerste echte reden om te bellen; dit ontwerp geeft de regel maar het idee zelf is niet gebouwd.
- **IDEE-22 en 27** (computer use, smartphone): een rol die klikt, heeft een eigen poort nodig: een plan als voorstel, een zichtbare noodstop en een logboek met schermafdrukken. Dat valt buiten dit ontwerp; het past in de klassen als D.
- **IDEE-30** (het brein): een briefing die schrijft zoals Bram en onthoudt wat hij vorige keer oversloeg, hangt daar af. Eerste versie zonder.
- **IDEE-17** (emoties): de toon van de briefing kan meebewegen; vandaag niet nodig.
- **Het logboek van gegevens aanpassen met terugdraaien** (open punt in de overdracht): gebruikt dezelfde kolommen en dezelfde terugdraaiknop. Het is verstandig om één mechanisme te bouwen en dit er niet naast.

## 6. Risico's

1. **Het ja in het model.** Zolang `bevestigd` een parameter van het model is, is de poort zo sterk als het gehoorzamen van een instructie. Stap 2 sluit dat. Tot dan is elke bestaande goedkeuring (marketing, WhatsApp aan een klant) onderhevig aan een vergiftigde mail of webpagina. Dat is een lacune die los van dit ontwerp bestaat en pas dichtgaat door stap 2.
2. **Het recht om een eigen rij bij te werken.** Zonder aanpassing kan het venster of iemand met het token van Bram `status` rechtstreeks omzetten. Stap 2 neemt het weg; dat is een wijziging aan de rechten van een tabel van Zarvis en moet in het logboek.
3. **Te weinig ruimte.** Een gesprekszone van ongeveer 290 punten is krap voor een kaart met tekst, kost, terugdraaien en drie knoppen. De schets past op papier; bewijs vraagt een schermafdruk (stap 3). Valt het tegen, dan schuift de kaart over het gat heen in plaats van naast het gesprek te staan.
4. **Goedkeuringsmoeheid.** Bij bijna alleen ja's wordt de wachtrij een stempel. De begrenzing, het verval en de afwijzingsgraad dienen daarvoor; ze lossen het niet op als Bram zelf alles toch blind goedkeurt.
5. **Stem-ja met lawaai.** Daarom alleen klasse A en alleen voor een item dat net voorgelezen werd. Een vals ja op een gratis, terug te draaien uitsluiting is te herstellen; op iets anders niet.
6. **Briefing die faalt zonder dat Bram het merkt.** Een rol die niet kan nakijken moet dat zeggen. Dat is de enige verdedigbare betekenis van "niets".
7. **De briefing hangt aan openen.** Opent Bram een dag niet, dan komt er geen volledige briefing; alleen de stille melding van 08.00. Dat is een gevolg van het ontbreken van een sleutel voor de achtergrond (zie 3.5) en geen ontwerpfout.
8. **Voorstellen die oud worden.** Marketingcijfers veranderen elke nacht; een voorstel van gisteren kan fout zijn. Daarom verval na twee dagen en het opnieuw nakijken van de invoer bij het uitvoeren (het loket doet dat al voor uitsluiten, met zijn eigen slot).
9. **Meer rollen, meer ruis.** Een nieuwe rol begint stil of op briefing; ze kan nooit zelf luider worden. Het slot zit in de lijst `SOORTEN`, niet in een afspraak.
10. **Kosten van de briefing.** Eén gesprek met hoogstens zes tot negen gereedschapsoproepen per dag. Niet gemeten; vergelijkbaar met één lange vraag, en begrensd door de tweede keer niet opnieuw te rekenen.
11. **Meldingen van Windows.** De zelftest van de Windows-melding is nog niet bevestigd op een echt toestel (overdracht, "Nooit op een echt toestel getest").

## 7. Zeker tegenover niet kunnen nagaan

**Zeker (gelezen in de code of documenten):**
- `zarvis_acties` heeft de status `wacht_op_goedkeuring` en is verder niet in gebruik: geen code schrijft erin.
- `zarvis_meldingen` heeft geen rol en geen ernst; het venster zegt elke melding hardop bij rust en toont één soort kaart.
- `bevestigd` is een invoer van het model in de gereedschappen voor marketing en WhatsApp.
- De afmetingen, kleuren en regelnummers uit punt 2; het gegevensvenster ontvangt zijn inhoud van het hoofdvenster; het beheervenster leest zelf uit de databank.
- Een geplande controle heeft geen token en kan geen mail of marketing gebruiken.
- De rollen werf, financiën, inventaris, agenda en computer bestaan nog niet; wat ze altijd met een ja moeten doen staat in de verkenningen.
- De bronnen met "gelezen" in 3.6.

**Niet kunnen nagaan:**
- Of het overzichtsvenster de login deelt met het hoofdvenster in het Electron-programma: afgeleid uit het beheervenster, niet geprobeerd.
- Of de kaart in 383 bij 563 echt past: alleen een schets op papier; geen schermafdruk gemaakt, niets gebouwd.
- Hoe lang een briefing van ongeveer 220 woorden in de Vlaamse stem duurt: de sleutel van Azure ontbreekt (overdracht).
- Of Bram een derde venster prettig vindt; of "wacht op jou" voor hem de juiste naam is.
- Het precieze effect van de wijziging aan het recht op `zarvis_acties` op andere onderdelen van Compass: ik heb alleen de migratie en de types nagekeken, geen andere lezers van die tabel buiten `src/` en `supabase/functions/`.
- De bronnen die in 3.6 "alleen uit een zoekresultaat" zijn: de OpenAI-pagina gaf 404 bij rechtstreeks openen; Bloomberg, Autonomous.ai, AgentsRoom, Airtable en Zoho heb ik niet zelf geopend. Wat ik daaruit overnam, steunt zo weinig dat het niets van het ontwerp afhangt.
- Of de afwijzingsgraad bij Bram ooit hoog genoeg is om iets te zeggen: één campagne en ongeveer vier aanvragen per maand geven weinig voorstellen.

## 8. Hoogstens vijf vragen voor Bram

1. **Briefing.** Is een stille melding om 08.00 en de volledige briefing bij het eerste openen goed, of wil je dat Zarvis op een vast uur uit zichzelf spreekt (dan is voor elke rol een eigen sleutel voor de achtergrond nodig)?
2. **Bellen.** Mag Zarvis alleen bellen voor wat je zelf met "bel" plande of wat binnen het uur geld of een klant kost, hoogstens twee keer per dag, niet tussen 21.00 en 07.30 en niet op zondag?
3. **Stem.** Mag je alleen met je stem "ja" zeggen voor wat gratis en terug te draaien is (zoektermen uitsluiten), en moet alles met geld, een bericht of iets onomkeerbaars met een tik, zolang Zarvis jouw stem niet van andere stemmen onderscheidt?
4. **Overzicht.** Een derde klein venster naast Zarvis (mijn voorstel), of een pagina in Compass?
5. **Altijd ja.** Als je twintig keer op rij ja zegt op dezelfde soort voorstel, mag Zarvis dan aan jou vragen of hij dat voortaan zelf mag doen binnen een grens? Hij doet het nooit zonder jouw antwoord. Dit raakt je zin "Er worden alleen zaken uitgesloten na mijn bevestigen", daarom vraag ik het.

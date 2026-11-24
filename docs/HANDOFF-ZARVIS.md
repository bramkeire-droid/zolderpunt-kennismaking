# Overdracht Zarvis

Dit is de overdracht van het gesprek waarin Zarvis gebouwd werd (23 en 24 november 2026) naar een nieuw gesprek. Lees dit volledig voor je iets doet. De drie andere bronnen zijn `SPRINTPLAN-ZARVIS.md` (logboek, onderaan het recentste), `docs/IDEEENBAK.md` (elk idee met Brams letterlijke woorden) en `docs/ZARVIS-BOUWER.md` (werkregels).

## Wie en wat

Bram is zaakvoerder van Zolderpunt (Belhouse Atelier BV), zolderrenovaties in België. Hij bouwde zelf het ERP "Compass" (deze repo). Zarvis is zijn assistent bovenop Compass, in de stijl van Jarvis. Zijn einddoel: het bedrijf verkoopbaar maken. In zijn woorden: "een AI kloon dat steeds meer en meer het brein van de app wordt. Al mijn intelligentie maar dan met onvermoeibare butler karakteristieken."

Zarvis leeft apart van Compass: "Ze leeft apart. Ze is gewoon volledig geconnecteerd ermee." Het is een klein zwevend venster op zijn Windows-pc dat hij met een sneltoets toespreekt.

## Hoe Bram werkt, en wat hij van je verwacht

- Antwoord in het Nederlands zoals in Vlaanderen. Kort. Hij typt vaak vanaf zijn gsm, met tikfouten ("lij" is "mij", "ol" is "om").
- Niet zeveren en niet om toestemming vragen. Letterlijk: "Kom mij niet voor elke wijziging of publish om goedkeuring vragen. Bij deze goedkeuring om alles uit te voeren en toegang te verschaffen." En later: "Je onderbreekt constant om toestemming te vragen." Bouwen, mergen, uitrollen en publiceren doe je zelf.
- Niet opgeven: "Ik wil dat je niet zo makkelijk forfait geeft."
- Kwaliteit van wat hij ziet telt zwaar. Een eerste ontwerp noemde hij "UI design in Windows 95". Donker, modern, rustig is de richting.
- Niets overslaan: "Zorg dat elke input van mij van de laatste 2 uren opgepikt wordt en gebouwd wordt want je slaat veel over." Elk nieuw idee gaat meteen in `docs/IDEEENBAK.md` met zijn letterlijke woorden, en wordt daarna vanzelf gebouwd, het oudste eerst. Vraag er niet opnieuw toestemming voor.
- Eerlijk blijven over wat getest is en wat niet. Hij aanvaardt "niet getest op Windows", hij aanvaardt geen "werkt" dat niet klopt.
- Zijn eigen skills `/graaf` en `/ponytail` bestonden niet in het vorige gesprek; wat ze moeten doen is onbekend. Vraag het in gewone woorden als hij ze opnieuw typt.

## Vaste afspraken

- Geheimen plakt Bram zelf in Lovable (Project Settings, Secrets). Ze staan nooit in code, commits, documenten of chat. Hij plakte ooit een Nuance-sleutel in de chat; die moet hij nog vervangen.
- Zarvis doet alles met de rechten van de ingelogde gebruiker. Alleen de uitvoerder van taken (`zarvis-taken`) werkt met de serversleutel, en alleen voor beheerders.
- Een bericht aan een klant leest Zarvis eerst voor en verstuurt pas na ja. Dat zit in de code van het gereedschap, niet alleen in de instructie. Bram koos bij het begin "intern zelf, extern vragen". Hij zei later "natuurlijk moet Zarvis versturen"; versturen is dus gebouwd, de vraag om ja bij klanten is gebleven. Wil hij die weg, dan zegt hij dat.
- Geen gezicht dat op een bestaand persoon lijkt. Het fotorealistische gezicht ligt stil sinds hij voor het zwarte gat koos.
- WhatsApp loopt via een bibliotheek die niet van WhatsApp is (Baileys). Bram aanvaardde het risico op blokkering, voor lezen op 23 november en voor versturen op 24 november.
- In de databank van Mail-CRM mag geschreven worden: Bram zei "3. Ja" op die vraag.
- Additief bouwen: geen bestaande tabel, policy of functie van Compass aanpassen zonder dat het in het logboek staat.

## Techniek

- Repo: `bramkeire-droid/zolderpunt-kennismaking`. Vite, React 18, TypeScript, Tailwind, shadcn. Geen router: de paden staan in `src/App.tsx` (`/zarvis`, `/zarvis/bron`, `/zarvis/beheer`).
- Compass draait op Lovable Cloud: Lovable-project `f2d6309c-8fb2-4154-be16-1f927dbbe385`, Supabase-ref `xgrshvqteylncjbfsqbi`, gepubliceerd op `https://zolderpunt-kennismaking.lovable.app`.
- De databank van Compass is alleen bereikbaar via de Lovable-koppeling (`query_database`), niet via de Supabase-koppeling. Mail-CRM ("Maildude") is een ander Supabase-project, ref `ipnebgcuokehllepqwwm`, en is wel via de Supabase-koppeling bereikbaar.
- Uitrollen in vier stappen: (1) pull request mergen op GitHub, (2) migraties zelf toepassen op de live databank en nakijken, (3) de Lovable-agent in een bericht vragen om de genoemde functies uit te rollen, met de zin dat hij geen code wijzigt en geen migraties uitvoert, (4) publiceren en nakijken dat de nieuwe tekst in de live bundel zit. Functies rollen niet vanzelf uit na een merge.
- Gedeelde code van functies hoort in `supabase/functions/_shared/`. Een functie kan niet uit de map van een andere functie importeren; dat brak het uitrollen van `zarvis-taken` één keer.
- `verify_jwt` wordt in dit project niet afgedwongen. Elke functie controleert zelf login en rol.
- Het taalmodel: `claude-opus-5-5` met lage inspanning. Met een eigen `ANTHROPIC_API_KEY` rechtstreeks, anders via de AI-route van Lovable (`LOVABLE_API_KEY`, bestaat al).
- Testen: `npx tsc --noEmit -p tsconfig.app.json`, `TZ=Europe/Brussels npx vitest run` (één bestaande test is afhankelijk van de tijdzone), `npm run build`. Functies testen we tegen een nagebootste server; die scripts stonden in een tijdelijke map van het vorige gesprek en zijn weg. Schrijf ze opnieuw als je een functie wijzigt: zet `Deno` na met een kleine `env`, vervang de `npm:`-imports en roep de handler rechtstreeks aan.

## Wat er staat (alles op `main`, live tenzij anders vermeld)

- **Venster** `/zarvis` (`src/pages/ZarvisVenster.tsx`, toestand in `src/contexts/ZarvisContext.tsx`): gesprek, opzoekstappen, meldingen, microfoonknop met niveau.
- **Zwart gat** (`src/components/zarvis/ZarvisGat.tsx`): WebGL, volgt per beeldpunt een lichtstraal rond het gat. Rust, luisteren, denken, spreken. Bij spreken wordt de stem in acht toonbanden verdeeld. Bram noemde de eerste versie onvoldoende ("deze animatie moet jouw kroonstuk zijn"); de tweede heeft hij nog niet beoordeeld.
- **Gegevensvenster** `/zarvis/bron`: tweede klein venster met de gegevens waarop een antwoord steunt.
- **Beheersectie** `/zarvis/beheer`: connectoren aan en uit, alleen voor beheerders. Tabel `zarvis_instellingen`.
- **Functie `zarvis`**: gesprek met gereedschap. Lezen (`zoek_dossier`, `lees_dossier`, `lees_gesprekken`, `lees_calculaties`, `lees_whatsapp`, `pijplijn_overzicht`) en doen (`plan_taak`, `toon_taken`, `stop_taak`, `stuur_whatsapp`, `leer_vaardigheid`, `meld_tekort`). Code in `supabase/functions/_shared/zarvis/`.
- **Functie `zarvis-taken`**: voert geplande taken uit. Een klok in de databank wekt haar elke minuut met een eenmalig bewijs uit `zarvis_tik`. Live bewezen met een proefherinnering.
- **Functies `zarvis-stem`** (Azure, Vlaams), **`zarvis-gezicht`** (Anam, proef), **`whatsapp-koppeling`** (ontvangt meegelezen berichten).
- **Programma** `zarvis-desktop/` (Electron, versie 0.5.0): venster bovenop, sneltoets Ctrl + Shift + Spatie, systeemvak, gegevensvenster, beheervenster, WhatsApp meelezen en versturen. Installatieprogramma met `npm run bouw:win` (eigen NSIS-script; de standaardweg van electron-builder vraagt Wine en dat crasht op de bouwmachine).
- **Tabellen**: `zarvis_gesprekken`, `zarvis_berichten`, `zarvis_acties`, `zarvis_context`, `zarvis_instellingen`, `zarvis_taken`, `zarvis_meldingen`, `zarvis_vaardigheden`, `zarvis_tekorten`, `zarvis_tik`, `whatsapp_berichten`, `whatsapp_uit`. Alle migraties in de repo zijn al toegepast op de live databank.
- **Gebouwd maar niet uitgerold:** `bereken_route` (Google Maps) in `supabase/functions/_shared/zarvis/buiten.ts`, en de bijhorende regel in de beheersectie en het installatieprogramma. Getest tegen een nagebootste Google. Nog te doen: `zarvis` uitrollen, publiceren, installatieprogramma opnieuw bouwen.
- **Nachtbouwer:** een geplande taak in Claude ("Zarvis nachtbouwer", elke nacht 1.43 u) die `docs/ZARVIS-BOUWER.md` volgt. Ze heeft geen Lovable-koppeling en kan dus niets uitrollen tot Bram die toevoegt.

## Nooit op een echt toestel getest

Dit is het grootste gat. Niets hiervan is bevestigd:

- het installatieprogramma en het programma op een echte Windows-pc;
- een echte vraag met een echte login op echte dossiers;
- WhatsApp koppelen, meelezen en versturen met een echte gsm;
- de Vlaamse stem, het microfoonfilter en de toonbanden (de sleutel van Azure ontbreekt);
- het zwarte gat op een echte grafische kaart (alleen stilstaande beelden, getekend door software);
- de Windows-melding.

Brams pc: RTX 5080 met 16 GB, i9-14900KS, 32 GB, Windows 11.

## Wat van Bram nodig is

- Secrets in Lovable: `AZURE_SPEECH_KEY` (blokkeert alles rond stem), `GOOGLE_MAPS_API_KEY` (ritten), optioneel `ANTHROPIC_API_KEY`, `ANAM_API_KEY`.
- De Lovable-koppeling toevoegen aan de geplande taak "Zarvis nachtbouwer".
- `Zarvis-installatie.exe` 0.5 installeren en zeggen wat er gebeurt.
- Zeggen welk toestel hij heeft, Android of iPhone (voor IDEE-27).
- De Nuance-sleutel vervangen die in de chat stond.

## De volledige lijst van ideeën

Elk idee staat met Brams letterlijke woorden, een inschatting en open vragen in `docs/IDEEENBAK.md`. Stand op 24 november 2026:

| Nr | Wat | Stand |
|---|---|---|
| 10 | Alles wat Maildude kan maar beter; meerdere mailboxen | Niet gebouwd. Inventaris gedaan, zie hieronder |
| 11 | Marketeer en Google Ads-expert, website en marketingdashboard altijd live | Niet begonnen |
| 12 | Werf-app: arbeidsuren, tijdsnormen, loonadministratie | Niet begonnen |
| 13 | FINDASHBOARD: persoonlijke CFO | Niet begonnen |
| 14 | INVENSYNC: beheerder van de inventaris | Niet begonnen |
| 15 | De rollen overzichtelijk tonen, niet chaotisch | Niet begonnen; moet ontworpen zijn vóór de eerste rol na dossiers |
| 16 | Herhalende taken, timers, herinneringen, bericht op tijdstip | Gebouwd en live |
| 17 | Emoties lezen | Niet begonnen |
| 18 | Zelflerend: "Ik kan dat nog niet Bram, wil je dat ik die skill nu onderzoek en aanleer?" | Deels: aanleren en bouwlijst wel; zelf code bouwen tijdens het gesprek niet |
| 19 | Google Maps: routes en ritafstanden | Gebouwd en getest tegen een nagebootste Google (`src/lib/zarvis/__tests__/buiten.test.ts`), niet uitgerold, sleutel nodig |
| 20 | Agenda: verwittigen als hij nog op kantoor is en niet onderweg | Niet begonnen |
| 21 | Browser: Zarvis surft zelf | Niet begonnen |
| 22 | Computer use: "over een uur de voortgang in dit programma checken en dan op voltooien klikken" | Niet begonnen |
| 23 | Zijn stem onderscheiden van muziek en van anderen | Filter gebouwd; sprekerherkenning niet |
| 24 | Weerbericht | Niet gebouwd; dienst nagekeken, zie ideeënbak |
| 25 | Familiale komische modus | Niet begonnen |
| 26 | Savage modus | Niet begonnen |
| 27 | Smartphone use | Niet begonnen; toestel onbekend |

Idee 10 tot 14 gaf Bram mee met: "Geen van bovenstaande kan je licht opnemen. Stel je voor dat deze functies 100% verantwoordelijk krijgen en als dusdanig gebouwd moeten worden." Elke rol begint dus met het lezen van de bestaande app en haar gegevens.

Ook nog open, buiten de genummerde ideeën:

- Het paneel van Zarvis ín Compass (`ZarvisPaneel.tsx`, `ZarvisKnop.tsx`) weghalen zodra het losse venster op zijn pc bevestigd werkt.
- WhatsApp-gesprekken tonen op de communicatiepagina van Compass.
- Gegevens in een dossier aanpassen met een logboek en terugdraaien (het ontwerp bestaat, de bouw niet).
- Een stem getraind op Brams eigen stem.
- Een wekwoord in plaats van de sneltoets, later ook op de gsm.
- De officiële WhatsApp-route via Meta (Coexistence), als alternatief zonder risico op blokkering.
- Het ontwerpcanvas: vijf schermen staan nog in de afgekeurde lichte stijl.

## Wat bekend is over Maildude (IDEE-10)

Gemeten door een hulpagent in het vorige gesprek, niet nagerekend:

- 14.719 mails. Van september tot november is 34% automatisch gekoppeld, 28% wacht op controle, 38% blijft ongekoppeld.
- De AI kiest elk dossier uit een lijst; er is geen enkele vaste regel.
- 103 ongekoppelde mails zitten in een draad waarin een andere mail al aan precies één dossier hangt.
- Bijna de helft van de AI-oproepen gaat naar mails die daarna genegeerd worden.
- 158 van de 300 mails in de controlelijst zijn mislukte AI-oproepen, zonder nieuwe poging.
- Een geheime sleutel staat leesbaar in een geplande taak, en de synchronisatie heeft geen eigen toegangscontrole.
- Brams idee om alleen de laatste zes maanden te laden levert weinig op: zoeken duurt al milliseconden.

Plan: eerst koppelen met vaste regels (draad, klant, ook afgesloten dossiers), daarna pas de AI, met een nieuwe poging bij een fout. Een tweede verkenning (hoe Compass vandaag met Mail-CRM praat, het schema, hoe Zarvis mails kan lezen) werd afgebroken en moet opnieuw.

## Waar te beginnen

1. `bereken_route` uitrollen en publiceren (het werk is af).
2. Weerbericht en de twee modi bouwen (IDEE-24, 25, 26): klein, geen sleutel nodig.
3. Maildude met meerdere mailboxen (IDEE-10), te beginnen met de afgebroken verkenning.
4. Daarna de volgorde van de ideeënbak, met IDEE-15 (rollen tonen) vóór de eerste rol.

Schrijf na elk werkblok het logboek in `SPRINTPLAN-ZARVIS.md` bij: wat gebouwd is, wat geverifieerd is, wat niet.

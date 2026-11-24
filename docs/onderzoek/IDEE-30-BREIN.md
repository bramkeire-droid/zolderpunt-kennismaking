# Onderzoek IDEE-30: het AI-brein, de kloon van Bram

Onderzocht op 2026-11-24, alleen gelezen. Cijfers uit artikelen komen van de makers zelf of van hun concurrenten; onafhankelijk herhaalde metingen zijn niet gevonden.

## Samenvatting

1. Vandaag heeft Zarvis geen brein: een vaste instructie, hoogstens 25 werkwijzen, en de geschiedenis van één gesprek.
2. Brams app Maildude ("Levend Bedrijfsbrein") heeft wel een geheugen. Het ontwerp is herbruikbaar (elk feit met bron, zekerheid en label; leren via voorstel, goedkeuring, terugdraaien). De techniek en de gegevens zijn dat niet.
3. Wat Bram het meest wil, ontbreekt ook daar: leren hoe hij beslist en waarom, en schrijven zoals hij.
4. Aangeraden: een klein profiel dat altijd meegaat, zoeken voor de rest, casussen voor beslissingen en echte voorbeeldmails voor stijl. Geen kennisgraaf en geen fine-tuning om te beginnen.
5. Eerste week: caching aanzetten (bespaart meer dan het brein kost), één geheugentabel, een pagina waar Bram ziet en verbetert wat Zarvis over hem weet, en een toets van dertig vragen met Brams eigen antwoorden.

## Wat er vandaag is

In Zarvis (`supabase/functions/zarvis/index.ts`, `supabase/functions/_shared/zarvis/doen.ts`):
- een vaste instructie, door de bouwer geschreven;
- `leer_vaardigheid`: hoogstens 25 werkwijzen in `zarvis_vaardigheden`, die bij elk gesprek meegaan;
- `meld_tekort`: wat niet kon;
- de geschiedenis van één gesprek, veertig beurten.

Niets wordt onthouden tussen gesprekken, en niets wordt geleerd uit wat Bram doet.

Twee gaten die los staan van het brein:
- **Geen caching.** De instructie en het gereedschap gaan bij elke ronde tegen volle prijs mee (tot zes rondes per antwoord). Een breekpunt na de instructie verlaagt dat deel met ongeveer 95%.
- **`leer_vaardigheid` heeft geen slot.** Als Zarvis in dezelfde beurt een mail of een webpagina las, kan tekst van buiten als blijvende werkwijze opgeslagen worden. De instructie verbiedt het; de code houdt het niet tegen.

## Wat Maildude al heeft

Maildude (`C:\Users\bramk\.claude\projects\Maildude`) is een ander systeem dan de Mail-CRM en hangt niet aan Compass.

| Soort geheugen | Hoe |
|---|---|
| Feiten | `memory_items`: tekst, vector, zekerheid, label (zeker, afgeleid, te bevestigen, verouderd), bron, geldig van en tot, tegenstrijdig met, ingetrokken |
| Gebeurtenissen | gesprekken, berichten en documenten, met vectoren |
| Regels en stijl | `learning_rules`: voorgesteld, actief, teruggedraaid; pas voorgesteld na drie gelijke correcties |
| Beslissingen | `decision_log`: vraag, opties, gekozen optie |

Sterk: elk feit heeft een bron; een regel wordt nooit vanzelf actief; een oordeel van Bram wordt nooit overschreven; er is een maat "concept ongewijzigd verstuurd".

Zwak, gevonden in de code:
- Feiten worden toegevoegd zonder ontdubbeling: dezelfde voorkeur staat er na een tijd tientallen keren.
- Tegenstrijdigheden worden gevonden maar nooit opgelost.
- Gewone feiten verouderen nooit.
- Zoeken is één vectorvraag met zes resultaten, zonder trefwoorden erbij.
- Stijl wordt niet geleerd uit Brams verstuurde mails.
- Bij een beslissing is er geen plaats voor Brams reden of voor de afloop.
- Geen bescherming tegen een mail die een "feit" in het geheugen probeert te zetten.

## Wat anderen doen, en wat gemeten is

- **Anthropic** raadt aan: een klein deel altijd in de instructie, de rest opzoeken wanneer het nodig is; onder ongeveer 200.000 tokens aan kennis mag alles mee, maar een groeiende context maakt het model slordiger. Trefwoorden naast vectoren geven duidelijk minder gemiste opzoekingen dan vectoren alleen. Bronnen: de documentatie van de memory tool, prompt caching en "Contextual Retrieval" op anthropic.com en platform.claude.com.
- **Mem0** (elk nieuw feit: toevoegen, bijwerken, verwijderen of niets doen) is goedkoper dan alles meesturen maar minder juist: 66,9% tegenover 72,9% in hun eigen tabel (arxiv.org/abs/2504.19413).
- **Zep/Graphiti** (kennisgraaf met geldigheid in de tijd): de cijfers worden betwist door concurrenten, en het vraagt een aparte graafdatabank. Het nuttige idee, "geldig van, geldig tot, vervangt", kan in gewone tabellen.
- **Generative Agents** (nachtelijk nadenken over wat er gebeurde): helpt, maar slaat ook verzinsels op.
- **Vergiftiging van het geheugen**: in een proefopstelling lukte het in 98% van de pogingen om via gewone vragen valse herinneringen te planten (arxiv.org/abs/2503.03704). Tekst van buiten mag dus nooit rechtstreeks een feit worden.
- **Meten of een kloon klopt**: het beste anker is een studie met 1.052 mensen waarin de kloon 85% haalde van hoe goed mensen zichzelf twee weken later herhalen (arxiv.org/abs/2411.10109). Een kloon kan niet beter zijn dan Bram zelf; meet dus eerst hoe vast Bram is.

Niet bevestigd: of een graaf of fine-tuning voor één gebruiker loont; of Voyage (de vectordienst van Maildude) in de EU verwerkt en goed is in Nederlands; of fine-tuning voor deze modellen te koop is.

## Voorstel in bouwstappen

Regels die in elke stap gelden:
- Alles wat Zarvis onthoudt, heeft een soort, een tekst, een reden, een bron, een status (voorstel, actief, ingetrokken) en een geldigheid.
- Wat uit mails, WhatsApp of het web komt, is altijd een voorstel. Het wordt nooit vanzelf actief en komt nooit vanzelf in het profiel.
- Wat Bram zelf zegt, is meteen actief.
- Harde regels (niets naar buiten zonder ja) blijven in code. Het geheugen is context, geen slot.

### Stap 1: het handboek (ongeveer 1 week, 30 tot 40 uur)

- Caching op de instructie.
- Eén tabel `zarvis_geheugen`, zoeken met de volledige-tekstzoeker van Postgres, geen vectoren.
- Gereedschap `onthoud`, `vergeet`, `zoek_geheugen`. `leer_vaardigheid` gaat dezelfde weg op en krijgt het slot.
- Een blok "wat ik over je weet" in de instructie: hoogstens 60 regels en voorkeuren, ongeveer 2.000 tokens.
- Een pagina `/zarvis/geheugen`: lijst, bewerken, wissen, voorstellen goedkeuren. Ook als vraag: "wat weet je over mij".
- Een toets van 30 vragen met Brams eigen antwoorden, en de nulmeting.
- Wat Zarvis dan kan: onthouden wat Bram hem zegt, over gesprekken heen, en tonen wat hij weet.
- Van Bram nodig: ongeveer 30 minuten voor de toets.
- Extra kost per maand: enkele euro's; de caching bespaart meer.

### Stap 2: het brein (3 tot 5 weken, 100 tot 160 uur)

- Vectoren erbij (pgvector), zoeken op trefwoorden en betekenis samen.
- `zarvis_casus`: situatie, opties, wat Bram koos, **waarom**, afloop, bron. Bij een nieuwe vraag gaan de twee of drie meest gelijkende casussen mee. Ontbreekt de reden, dan stelt Zarvis één gerichte vraag.
- `zarvis_stijlvoorbeeld`: echte verstuurde mails en WhatsApp-berichten van Bram, per soort ontvanger. Bij het schrijven gaan vier gelijkende voorbeelden mee.
- Leren uit gesprekken: een goedkoop model haalt na elk gesprek voorstellen op, met ontdubbeling.
- Leren uit beslissingen in Compass: een offerte goedgekeurd of geweigerd, een prijs aangepast, wordt een voorstel voor een casus.
- Een wekelijkse kaart van vijf minuten met alle voorstellen.
- Wat Zarvis dan kan: antwoorden en schrijven zoals Bram, en zeggen waarom hij denkt dat Bram zo zou beslissen.
- Van Bram nodig: toestemming om uit zijn verstuurde berichten te leren; een sleutel voor een vectordienst; vijf minuten per week.
- Geschatte kost per maand: 6 tot 15 dollar, bij ongeveer 600 gesprekken (aanname, niet gemeten).

### Stap 3: de kloon (2 tot 3 maanden)

- Relaties met geldigheid (klant, onderaannemer, leverancier, project) in gewone tabellen.
- Een nachtelijke bezinning die patronen in Brams beslissingen zoekt; het resultaat is alleen een voorstel.
- Stijl per ontvanger, een toets die na elke wijziging vanzelf loopt, een maandelijks overzicht "wat ik over je denk".
- Een eigenaar per rij, voor als anderen Zarvis gebruiken.
- Geschatte kost per maand: 20 tot 40 dollar, plus eenmalig het lezen van de 14.720 bestaande mails.

## Hoe je meet of het klopt

- 50 situaties: echte binnenkomende vragen met Brams werkelijke antwoord (uit de mails), feiten over het bedrijf, en een blinde stijlproef waarbij Bram raadt welke tekst van hem is.
- De mails van de toets blijven buiten het geheugen.
- Bram beantwoordt 20 vragen twee weken later opnieuw; dat is het plafond.
- Daarnaast de maat uit Maildude: hoeveel concepten ongewijzigd verstuurd worden.

## Afhankelijkheden

- IDEE-10 (mails): de verstuurde mails zijn de bron voor stijl en casussen.
- IDEE-15 (rollen tonen): de wekelijkse kaart met voorstellen hoort in dezelfde wachtrij als de andere dingen die op Brams ja wachten.
- IDEE-18 (zelf bijleren): `leer_vaardigheid` gaat op in het geheugen.

## Risico's

- Vergiftiging via tekst van buiten: opgevangen door "extern is altijd een voorstel".
- Privacy: klantgegevens in een geheugen vallen onder de AVG (bewaartermijn, inzage en wissen, geen gezondheidsgegevens). Geen juridisch advies ingewonnen.
- Een geheugen dat groeit zonder opruimen wordt slechter, niet beter: ontdubbelen en laten verouderen horen er van bij het begin in.

## Vragen voor Bram

1. Mag Zarvis leren uit je verstuurde mails en WhatsApp-berichten, ook de Gmail?
2. Wat jij zegt meteen actief en wat Zarvis afleidt als voorstel dat je wekelijks in vijf minuten beoordeelt, of wil je elke les vooraf zien?
3. Is het brein strikt van jou, of moet het ook werken als iemand anders Zarvis gebruikt?
4. Wil je 30 tot 50 echte situaties met jouw antwoord geven (ongeveer 45 minuten), en 20 ervan twee weken later opnieuw?
5. Is ongeveer 25 euro per maand voor het brein goed als plafond?

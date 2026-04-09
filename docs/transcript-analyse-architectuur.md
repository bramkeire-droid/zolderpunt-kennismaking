# Transcript-Analyse Architectuur

## Het probleem

De huidige `generate-rapport-summary` doet alles in 1 prompt: extractie, synthese en formulering. Het resultaat is generieke tekst die ook zonder transcript gegenereerd had kunnen worden.

**Voorbeeld — Kurt Van Poucke:**

| Wat het transcript zegt | Wat het rapport ervan maakt |
|---|---|
| "De droom om een gezamenlijke kamer te hebben" (emotionele kern) | "Jullie dromen van een plek die rust uitstraalt door een naadloze afwerking" (filler) |
| Budget max 50k, raming 55-75k, bewust gefaseerd (slaapkamer first) | Niet vermeld |
| Smalle draaitrap, materiaal door raam?, erfgoed-beschermd raam | 1 generiek aandachtspunt over vloer |
| 3 offertes vergelijken, via ChatGPT gevonden | Niet vermeld |

**Kernprobleem:** De AI krijgt geen instructie om EERST te luisteren en te extraheren. Het gaat direct naar schrijven, en vult gaten met template-achtige zinnen.

---

## De oplossing: Twee-fase architectuur

### Fase 1: Deep Extraction

Voordat er ook maar 1 zin geschreven wordt, extraheer je gestructureerde inzichten uit het transcript. Dit zijn niet zomaar feiten — het zijn psychologische signalen.

**Extractie-categorien:**

```typescript
interface TranscriptExtractie {
  // WAT DRIJFT DEZE KLANT?
  emotionele_drijfveer: string;
  // De echte reden achter het project. Niet "zolder renoveren" maar
  // "eindelijk een eigen slaapkamer samen met Jessica"

  specifieke_wensen: {
    wens: string;
    prioriteit: 'must-have' | 'nice-to-have';
    eigen_woorden: string; // exacte formulering van de klant
  }[];

  zorgen_en_angsten: {
    zorg: string;
    ernst: 'blokkerend' | 'belangrijk' | 'achtergrond';
    hoe_we_adresseren: string;
  }[];

  budget_realiteit: {
    budget_klant: string;
    raming_bram: string;
    spanning: string; // hoe groot is het gat
    oplossing_besproken: string;
  };

  beslisdynamiek: {
    wie_beslist: string;
    concurrentie: string; // andere offertes?
    tijdsdruk: string;
    hoe_gevonden: string;
  };

  technische_details: {
    feit: string;
    relevant_voor_klant: boolean; // sommige feiten zijn intern
    klant_begrijpt: boolean;
  }[];

  krachtige_citaten: {
    citaat: string;
    context: string;
    emotie: string;
  }[];

  onuitgesproken_behoeften: string[];
  // Wat de klant impliceert maar niet hardop zegt
  // bv. "ze willen zekerheid dat dit geen financial disaster wordt"
}
```

### Fase 2: Psychologische Synthese

Met de extractie als input, genereer je rapport-teksten die gebaseerd zijn op bewezen koopgedrag-principes:

**Principe 1: Spiegelen = Vertrouwen**
De klant moet hun eigen woorden terugzien. Niet "jullie dromen van rust" maar "jullie droom is helder: een gezamenlijke slaapkamer waar jullie eindelijk samen wakker worden."

**Principe 2: Specificiteit = Geloofwaardigheid**
Hoe specifieker het rapport, hoe meer de klant gelooft dat je geluisterd hebt. "128m2 onbenutte ruimte" is generiek. "De smalle draaitrap die nu het enige pad naar 128m2 onbenut potentieel is" is specifiek.

**Principe 3: Zorg erkennen voor je oplost**
Niet: "We maken een offerte." Maar: "Jullie gaven eerlijk aan dat het budget krap is. Daarom bespraken we samen een slimme aanpak: de slaapkamer 100% afwerken, de rest basisniveau."

**Principe 4: Prioriteit valideren**
De klant heeft al een keuze gemaakt (slaapkamer first). Bevestig die keuze als slim: "Jullie kiezen bewust en verstandig: eerst de slaapkamer perfect, de rest volgt later."

**Principe 5: Toekomstprojectie**
Help de klant het resultaat al voelen: "Over enkele maanden lopen jullie de trap op naar jullie eigen verdieping."

---

## Implementatie: Herschreven prompt-structuur

### System Prompt (Fase 1 — Extractie)

```
Je bent een gespreksanalist gespecialiseerd in klantpsychologie voor
renovatieprojecten. Je analyseert transcripten van intakegesprekken
en extraheert de diepere drijfveren, zorgen en dynamieken.

Je zoekt naar:
1. De ECHTE reden achter het project (niet "renoveren" maar het
   menselijke verlangen erachter)
2. Specifieke wensen in de EIGEN WOORDEN van de klant
3. Zorgen en angsten — expliciet EN impliciet
4. Budgetspanning: wat wil de klant vs wat kan de klant
5. Beslisdynamiek: wie beslist, concurrentie, tijdsdruk
6. Krachtige citaten die emotie tonen
7. Onuitgesproken behoeften

BELANGRIJK: Extraheer, interpreteer niet. Citeer waar mogelijk.
```

### System Prompt (Fase 2 — Synthese)

```
Je bent de persoonlijke rapportschrijver van Bram Keirsschieter
(Zolderpunt). Je schrijft rapport-teksten die de klant het gevoel
geven: "hij heeft ECHT geluisterd."

PSYCHOLOGISCHE PRINCIPES:
- SPIEGEL: Gebruik de eigen woorden/formuleringen van de klant
- SPECIFICITEIT: Elk detail dat je noemt bewijst dat je geluisterd hebt
- ERKEN VOOR JE OPLOST: Benoem zorgen expliciet voordat je de
  aanpak beschrijft
- VALIDEER KEUZES: Bevestig dat hun prioriteiten slim zijn
- TOEKOMSTPROJECTIE: Help ze het resultaat al voelen

ANTI-PATRONEN (NOOIT DOEN):
- "Jullie dromen van rust/ruimte/comfort" → te generiek
- "Een volledige transformatie" → betekenisloos
- "Naadloze afwerking" → template-taal
- Iets schrijven dat ook zonder transcript klopt → dan heb je niet
  geluisterd

TOETS: Lees elke zin die je schrijft en vraag: "Zou deze zin ook
kloppen voor een willekeurige andere klant?" Als ja → herschrijf.

SCHRIJFSTIJL:
- Tweede persoon ("jullie", "je")
- Warm maar concreet
- Korte zinnen, geen opsommingen
- Bram spreekt rechtstreeks tegen de klant
```

---

## Voorbeeld: Kurt Van Poucke (huidige vs nieuwe output)

### HUIDIG — "Jullie verhaal"
> Jullie woning in de Langestraat herbergt een indrukwekkende zolderruimte
> van maar liefst 128 vierkante meter. Hoewel deze oppervlakte op dit
> moment nog volledig onbenut is, vormt de royale omvang een fantastisch
> canvas om iets unieks te creeren.

**Probleem:** Generiek. "Fantastisch canvas" is marketing-filler. Geen enkel persoonlijk detail.

### NIEUW — "Jullie verhaal"
> Boven jullie appartement in de Langestraat ligt 128m2 die al jaren
> wacht. De ruimte is ruw, de vloer ongelijk, en de enige manier om
> er te komen is via een smalle draaitrap door de winkel beneden.
> Maar jullie zien wat het kan worden — en daar begint dit verhaal.

### HUIDIG — "Wat jullie voor ogen hebben"
> Het doel is duidelijk: van deze grote, ruwe ruimte een volwaardig en
> instapklaar deel van jullie huis maken. Jullie dromen van een plek
> die rust uitstraalt door een naadloze afwerking.

**Probleem:** "Naadloze afwerking" is nooit gezegd. De echte droom ontbreekt volledig.

### NIEUW — "Wat jullie voor ogen hebben"
> Kurt, je zei het zelf: de droom is een gezamenlijke slaapkamer.
> Een eigen plek voor jullie twee, met een raam dat het beschermde
> Brugse uitzicht behoudt maar eindelijk dubbel glas heeft. De rest
> van de zolder mag functioneel blijven — stockage, wasruimte, diepvries —
> en dat is een bewuste, slimme keuze.

### HUIDIG — "Aandachtspunten"
> We kijken tijdens het plaatsbezoek goed naar de draagkracht van de vloer,
> zodat de nieuwe chape en afwerking een solide basis vormen voor de toekomst.

**Probleem:** 1 generiek punt. De 5+ echte zorgen zijn verdwenen.

### NIEUW — "Aandachtspunten"
> Het trapgat door de betonvloer en het transport via de smalle draaitrap
> zijn de grootste technische uitdagingen. De Velux-ramen zijn twijfelachtig
> maar niet urgent — we werken de afwerking zo dat vervanging later
> moeiteloos kan. En jullie gaven eerlijk aan: het budget is maximaal
> vijftigduizend euro. De raming ligt daar net boven, maar met de
> slaapkamer-eerst aanpak landen we binnen bereik.

---

## Technische implementatie

### Optie A: Twee API-calls (aanbevolen)

```
Transcript → [Extractie-prompt] → GestructureerdeData
GestructureerdeData → [Synthese-prompt] → RapportTeksten
```

Voordeel: Extractie is verifieerbaar, synthese is reproduceerbaar.
Nadeel: 2x API-kost, iets langere wachttijd.

### Optie B: Single call met chain-of-thought

```
Transcript → [Gecombineerde prompt met stap-instructies] →
  Stap 1: Extractie (in <analysis> tags)
  Stap 2: Synthese (in tool-call output)
```

Voordeel: 1 API-call, lagere kost.
Nadeel: Minder controle over extractiekwaliteit.

### Aanbeveling

**Optie A** voor gesprekken met transcript (>500 woorden).
**Optie B** voor gesprekken zonder transcript (alleen notities).

---

## Velden herstructureren

De huidige 4 velden blijven, maar de beschrijvingen en voorbeelden
in de tool-schema worden volledig herschreven:

| Veld | Huidig | Nieuw |
|------|--------|-------|
| `situatie_tekst` | Generieke beschrijving huis + zolder | Specifiek beeld: hoe voelt de ruimte nu, wat zijn de beperkingen, wat is het potentieel — met concrete details |
| `verwachtingen_tekst` | "Jullie dromen van..." filler | De echte emotionele drijfveer + specifieke wensen in eigen woorden + bewuste prioriteiten valideren |
| `besproken_tekst` | Vage samenvatting | Concrete afspraken, keuzes die gemaakt zijn, opties die besproken zijn — met de redenering erachter |
| `aandachtspunten_tekst` | 1 generiek punt | Alle echte zorgen + hoe we ze aanpakken + budgetrealiteit eerlijk benoemen |

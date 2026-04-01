

# Labelmaker: genummerde labels op foto's met gekoppelde post-its

## Overzicht

Een nieuwe "Labelmaker" modus op Slide4 waarmee je op een foto klikt om genummerde labels (1, 2, 3...) te plaatsen. Elk label is gekoppeld aan een post-it invulveld rechts. Labels en teksten worden opgeslagen in de lead data en weergegeven in de PDF.

## Wat verandert

### 1. Data model uitbreiden

**`FeitjeItem` interface** (in `SessionContext.tsx` en `reportTypes.ts`):
Twee nieuwe optionele velden toevoegen:
- `label_nummer: number | null` — het nummer op de foto (1, 2, 3...)
- `label_positie: { x: number; y: number } | null` — relatieve positie op de foto (0-100% van breedte/hoogte)

### 2. Slide4.tsx — Labelmaker modus

**Nieuwe state:**
- `labelMode: boolean` — toggle via een nieuwe knop (bv. `MapPin` icon, "Labelmaker")
- Wanneer `labelMode` actief is en er een foto geselecteerd is:
  - Cursor verandert naar crosshair
  - Klik op de foto berekent relatieve x/y positie (% van image container)
  - Automatisch wordt het volgende nummer toegekend (max bestaande + 1)
  - Een genummerd cirkel-label wordt getoond op die positie (overlay op de foto)
  - Rechts verschijnt een nieuw invoerveld met dat nummer, waar de gebruiker tekst kan invullen

**Foto overlay:**
- Labels worden als absolute-positioned divs over de foto gerenderd
- Alleen labels van de actieve foto worden getoond (gefilterd op `foto_path`)
- Elk label: een cirkeltje (24x24px) met het nummer, witte achtergrond, blauwe rand

**Rechter paneel aanpassing:**
- Boven de bestaande 3 textarea's komt een sectie "Labels" met de genummerde invoervelden
- Elk label-invoerveld toont het nummer + een textarea + opslaan/verwijder knop
- Na opslaan wordt het een post-it kaartje met het nummer prominent zichtbaar
- Verwijderen verwijdert zowel het label op de foto als de post-it

**Bestaande feitjes-flow blijft intact** — de 3 losse textarea's werken nog steeds voor ongekoppelde feitjes.

### 3. PDF rendering aanpassen

**`FeitjeInPdf` component** en **`FotoGroepBlock`** in `ReportDocument.tsx`:
- Feitjes met een `label_nummer` worden weergegeven met hun nummer als prefix: "**1.** tekst..."
- Op de foto in de PDF worden de labels ook gerenderd als genummerde cirkels (absolute positioned `View` + `Text` over de `Image`)
- Feitjes zonder label_nummer behouden huidige bullet-weergave

### 4. Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `src/contexts/SessionContext.tsx` | `FeitjeItem` + 2 velden |
| `src/components/report/reportTypes.ts` | `FeitjeItem` + 2 velden |
| `src/slides/Slide4.tsx` | Labelmaker modus, foto-overlay, label invoervelden |
| `src/components/report/ReportDocument.tsx` | Genummerde feitjes + labels op foto's in PDF |

### Technische details

**Positie-berekening bij klik op foto:**
```text
const rect = imageRef.current.getBoundingClientRect();
const x = ((e.clientX - rect.left) / rect.width) * 100;
const y = ((e.clientY - rect.top) / rect.height) * 100;
```

**Automatische nummering:**
Het volgende nummer wordt bepaald door `Math.max(0, ...feitjes.filter(f => f.label_nummer).map(f => f.label_nummer!)) + 1`. Nummers zijn globaal per lead (niet per foto), zodat de nummering consistent is in de PDF.

**PDF labels op foto's:**
In `FotoGroepBlock`, worden labels als `View` elementen met `position: 'absolute'` over de `Image` geplaatst, met `left` en `top` als percentage van de foto-afmetingen. React-pdf ondersteunt percentages in absolute positioning.


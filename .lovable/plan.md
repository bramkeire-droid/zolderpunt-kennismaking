

# Plan: PDF Rapport — Volledige correctieronde

## Samenvatting

Dit is een grote correctieronde van het PDF-rapport met 4 bestanden die aangepast worden. De kern: iconen werken al via SVG (PdfIcon component bestaat), maar de **data-mapping**, **aandachtspunten-prompt**, **werkwijze-teksten**, en **visuele layout** moeten verbeterd worden.

## Wat verandert er

### 1. Data-mapping fixes (`src/slides/Slide10.tsx`)
- **Situatie**: verwijder adres uit het veld, gebruik enkel inhoudelijke beschrijving (`Zolder van ±Xm² — [gewenst resultaat]`)
- **Aandachtspunten**: vervang ruwe `gesprek_notities.substring(300)` door een AI-samenvatting via de edge function (nieuw type `extract_highlights`)
- **waarde_tekst_ai**: wordt nu correct uit `lead.rapport_tekst` gehaald (al bestaand)

### 2. Edge function: nieuw `extract_highlights` type (`supabase/functions/generate-value-text/index.ts`)
- Nieuwe prompt: max 60 woorden, 3 zinnen, tweede persoon, warm en persoonlijk
- Harde 300-karakter truncatie na AI-output
- Fallback: lege string als er geen notities zijn

### 3. Slide 9: genereer en bewaar highlights (`src/slides/Slide9.tsx`)
- Parallel met bestaande AI-calls, fire een derde call met type `extract_highlights`
- Bewaar resultaat als `rapport_highlights` op de lead
- Slide 10 leest `lead.rapport_highlights` voor aandachtspunten

### 4. Werkwijze-teksten depersonaliseren (`src/components/report/reportConstants.ts`)
- Stap 3 (Plaatsbezoek): "Een Zolderpunt-adviseur komt bij jou thuis om de ruimte te bekijken, te meten en eventuele technische aandachtspunten in kaart te brengen."
- Stap 5 (Uitvoering): "Ons team voert de renovatie uit volgens het goedgekeurde ontwerp. Je hebt een vaste contactpersoon van begin tot einde."
- NB: Reviews bevatten "Bram" — dat is authentieke klantentaal en wordt NIET gewijzigd.

### 5. PDF layout + visuele verbeteringen (`src/components/report/ReportDocument.tsx` + `reportStyles.ts`)

**Samenvatting-pagina:**
- Aandachtspunten-blok: maxHeight 60pt + overflow hidden → nooit meer page overflow
- `break: 'avoid'` op kaarten (wrap: false)

**Waarde-pagina (Sectie 4):**
- De `waarde_tekst_ai` kaart (kader 2) toont nu de hele `rapport_tekst` (fout). Fix: gebruik enkel de AI value text, niet het hele rapport
- Kader 2 titel: max 2 regels met fontSize aanpassing voor lange teksten

**Werkwijze-pagina (Sectie 6):**
- Werkwijze reduceren naar 6 stappen (al 6 in constants, correct)
- Emoji's zijn er al niet meer (PdfIcon wordt gebruikt) — dit is al opgelost

**Garanties-pagina (Sectie 7):**
- Grid layout: 2+2+1 met correcte width constraints
- Laatste garantie ("Kwaliteit als ons visitekaartje") is verdwenen uit PDF → was al 5 garanties, maar de 4e ("Star") valt weg. Fix: forceer 5 items in de grid

**Reviews-pagina:**
- Google badge: sterren renderen al via PdfIcon SVG — als ze kapot zijn in de PDF, is het een rendering issue. Verificatie nodig.

### 6. SessionContext uitbreiding
- Voeg `rapport_highlights` toe als optioneel veld op het Lead type

## Technisch detail

| Bestand | Wijziging |
|---|---|
| `supabase/functions/generate-value-text/index.ts` | Nieuw type `extract_highlights` met strikte prompt |
| `src/contexts/SessionContext.tsx` | Veld `rapport_highlights` toevoegen aan Lead |
| `src/slides/Slide9.tsx` | Derde parallelle AI-call voor highlights |
| `src/slides/Slide10.tsx` | Fix data-mapping: situatie zonder adres, aandachtspunten uit highlights, waarde_tekst fix |
| `src/components/report/reportConstants.ts` | Werkwijze-stapteksten depersonaliseren |
| `src/components/report/ReportDocument.tsx` | Aandachtspunten maxHeight, waarde kader fix, garantie grid 2+2+1 |
| `src/components/report/reportStyles.ts` | Aandachtspunten overflow style |

## Wat NIET verandert (al correct)
- PdfIcon SVG component werkt correct — iconen renderen als SVG paths
- Datumformaat is al correct (`10 maart 2026` via `formatDatum`)
- Cover heeft al hero-image, logo, titel, datum, tagline
- Footer is al consistent op alle pagina's
- Sectielabels zijn al correct
- Schuine 40°-decoratieve elementen zijn al aanwezig

## Na implementatie
Selfcheck via browser: PDF downloaden en console logs controleren op errors.


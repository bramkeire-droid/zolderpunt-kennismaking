## Zolderpunt PDF Rapportgenerator

### Wat we bouwen

Een complete PDF-rapportgenerator met 8 secties, aangestuurd door `@react-pdf/renderer`. De PDF wordt gegenereerd op basis van de `sessionData` (lead) en calculator data. Sectie 3 Kader 2 gebruikt Lovable AI (edge function) voor dynamische tekst.

### Architectuur

```text
┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│  Slide 10    │────▶│ ReportDocument.tsx │────▶│   PDF blob   │
│ (trigger)    │     │ (@react-pdf)      │     │  (download)  │
└──────────────┘     └───────────────────┘     └──────────────┘
                              │
                     ┌────────┴────────┐
                     │ Edge Function   │
                     │ generate-value  │
                     │ (Lovable AI)    │
                     └─────────────────┘
```

### Bestanden

**Nieuw:**

1. `src/components/report/ReportDocument.tsx` — Volledige `@react-pdf/renderer` Document met 8 secties (cover, samenvatting, prijs+waarde, foto's, werkwijze, garanties, reviews, CTA)
2. `src/components/report/reportStyles.ts` — Gedeelde StyleSheet met Zolderpunt huisstijl
3. `src/components/report/reportConstants.ts` — Hardcoded constanten (reviews, garanties, contact, Google score)
4. `src/components/report/reportTypes.ts` — TypeScript types voor rapport-data
5. `supabase/functions/generate-value-text/index.ts` — Edge function die Lovable AI aanroept voor Kader 2 dynamische tekst

**Gewijzigd:**
6. `src/slides/Slide10.tsx` — "PDF downloaden" knop activeert generatie + download
7. `src/slides/Slide9.tsx` — Preview toont rapport status + trigger naar Slide10

**Assets (kopieren van uploads):**
8. `src/assets/foto-bram.png` — Foto Bram (CTA sectie)
9. `src/assets/review-foto-brandon.jpg` — Review foto Brandon
10. `src/assets/review-foto-tom.png` — Review foto Tom
11. `src/assets/review-foto-cecilia.png` — Review foto Cecilia
12. `src/assets/logo-zolderpunt-primary.svg` — Logo (al aanwezig als logo-blauw.svg, hernoemen niet nodig — zelfde bestand)

**Dependency:**

- `@react-pdf/renderer` toevoegen

### Technische details

**@react-pdf/renderer approach:**

- Hele rapport is één `<Document>` met `<Page>` per sectie
- Fonts geregistreerd: Space Grotesk (headlines) + Rethink Sans (body) via Google Fonts URLs
- Kleurconstanten: `#008CFF`, `#2B6CA0`, `#F8F3EB`, `#1A1A1A`
- A4 staand formaat, elke sectie op nieuwe pagina
- Decoratieve 40°-hoek elementen via `<View>` met `transform: rotate(-40deg)`

**Data mapping (lead → rapport):**

- `voornaam` → cover titel + samenvatting aanhef + CTA
- `gesprek_datum` → cover datum + samenvatting
- `adres`, `oppervlakte_m2`, `project_type` → samenvatting "situatie"
- `gezocht_naar` → samenvatting "gewenst resultaat"
- `inbegrepen_posten` → samenvatting "besproken opties" + checklist sectie 3
- `gesprek_notities` → samenvatting "aandachtspunten"
- `budget_min`, `budget_max`, `budget_incl6` → prijsindicatie range
- `fotos[]` → sectie 4 (foto's van de zolder, uit storage URLs)
- `technisch.*` → opties checklist

**Waardemodule Kader 2 (AI):**

- Edge function `generate-value-text` ontvangt `gewenst_resultaat` en `oppervlakte_m2`
- Roept Lovable AI aan met `google/gemini-3-flash-preview`
- Retourneert één compacte zin
- Fallback bij fout: "Extra leefruimte gecreëerd uit ruimte die er al was."

**PDF generatie flow in Slide10:**

1. Klik "PDF downloaden"
2. Call edge function voor Kader 2 tekst (async)
3. Render `<ReportDocument>` met `pdf()` van @react-pdf/renderer
4. `blob()` → `URL.createObjectURL` → download link click
5. Loading state met Zolderpunt beeldmerk animatie

**Foto's in PDF:**

- `lead.fotos` bevat storage URLs — deze worden direct als `src` in `<Image>` gebruikt
- Review/Bram foto's: geconverteerd naar base64 data URLs bij build (react-pdf vereist dit voor bundled assets) of via public folder URLs

**Hardcoded constanten (makkelijk aanpasbaar):**

```typescript
const GOOGLE_REVIEW_SCORE = "5";
const GOOGLE_REVIEW_COUNT = "4";
const CONTACT_TELEFOON = "+32 492 40 09 54";
const CONTACT_EMAIL = "hello@zolderpunt.be";
const CONTACT_WEBSITE = "www.zolderpunt.be";
```

**Fallbacks:**

- Geen foto's → placeholder tekst "Foto's worden toegevoegd na het plaatsbezoek"
- Geen aandachtspunten → veld verborgen
- Airco niet geselecteerd → ❌ in checklist
- Schilderwerk altijd ❌
- AI call mislukt → generieke fallback tekst

### Secties samengevat


| #   | Sectie         | Dynamisch                    | Hardcoded                 |
| --- | -------------- | ---------------------------- | ------------------------- |
| 1   | Cover          | voornaam, datum              | Logo, tagline, hero       |
| 2   | Samenvatting   | 4 velden uit lead            | Aanhef/afsluiter          |
| 3   | Prijs + Waarde | Range, checklist, AI kader 2 | Kader 1 template, Kader 3 |
| 4   | Foto's         | lead.fotos[]                 | Placeholder               |
| 5   | Werkwijze      | Geen                         | 7 stappen tijdlijn        |
| 6   | Garanties      | Geen                         | 5 garantiekaarten         |
| 7   | Reviews        | Geen                         | 4 hardcoded reviews       |
| 8   | CTA            | voornaam                     | Contact, foto Bram        |


### Implementatievolgorde

1. Assets kopieren + constanten bestand
2. Edge function voor AI tekst
3. ReportDocument component (alle 8 secties)
4. Slide10 integratie met download flow
5. Slide9 aanpassen (rapport status)  
  
___  
  
Belangrijke feedback:  
  
**1. Fonts** — Space Grotesk vervangen door Brockmann Bold + Rethink Sans, met exacte registratie-code voor `@react-pdf/renderer`
  **2. AI model** — Gemini vervangen door Anthropic `claude-sonnet-4-20250514`, met de volledige fetch-code zodat Lovable geen ruimte heeft voor interpretatie
  **3. Data mapping** — Alle veldnamen exact gespecifieerd inclusief de geneste `opties.*` structuur en de opmerking dat `schilderwerk` altijd hardcoded `❌` is
  **4. Bestandsnamen** — Expliciete vermelding dat `logo-blauw.svg` het bestaande bestand is dat hergebruikt mag worden
  Deze sectie staat bewust **vóór Stap 1** zodat Lovable ze leest voordat het ook maar één lijn code schrijft.
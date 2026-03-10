# Plan: PDF Rapport — Resterende fixes

## Gevonden issues in de PDF

### 1. Woordafbreking in titels (KRITIEK)

- Cover: "poten-tieel" wordt afgebroken
- Waarde: "won-ing?" wordt afgebroken
- Garantie kaarten: diverse afbrekingen

**Oorzaak:** `@react-pdf/renderer` heeft standaard hyphenation ingeschakeld. `hyphens: 'none'` is geen geldige react-pdf property.

**Fix:** Gebruik `Font.registerHyphenationCallback` om hyphenation globaal uit te schakelen:

```typescript
Font.registerHyphenationCallback(word => [word]);
```

Toevoegen in `reportStyles.ts` na de font registraties.

### 2. Aandachtspunten ontbreekt op samenvatting-pagina

De 4e kaart "Aandachtspunten" verschijnt niet omdat `data.aandachtspunten` leeg is. Dit is een **data-issue**: de edge function `extract_highlights` moet aangeroepen worden vóór PDF-generatie.

**Fix in `Slide10.tsx`:** Als `lead.rapport_highlights` leeg is, genereer highlights on-the-fly vóór PDF-generatie, of toon een fallback tekst.



## Bestanden


| Bestand           | Wijziging                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------- |
| `reportStyles.ts` | `Font.registerHyphenationCallback`,                                                         |
| `Slide10.tsx`     | Fallback voor lege `rapport_highlights` — genereer on-the-fly of gebruik statische fallback |


## Wat al correct is

- Cover: hero-image, logo, datum (10 maart 2026), tagline
- Samenvatting: 3 kaarten met SVG-iconen correct
- Prijsindicatie: range-balk, CheckCircle/XCircle iconen, schilderwerk label
- Waarde: 3 kaders met Maximize2/Home/TrendingUp iconen, blauw samenvattingsblok
- Foto's: klantfoto's correct geladen
- Werkwijze: 7 stappen, correcte statussen (done/current/upcoming), gedepersonaliseerde teksten
- Garanties: 2+2+1 grid, 5 garanties met SVG-iconen
- Reviews: 5 gouden sterren, Google badge, foto's + initialen avatar, tekst getrunceerd
- CTA: foto Bram, contact-iconen (Phone/Mail/Globe), blauw CTA-banner, gecentreerde footer


# Plan: AI-notities en huisstijl doorvoeren in het PDF-rapport

## Probleem 1: AI-notities niet in de PDF
Slide 9 genereert een `rapport_tekst` met een AI-samenvatting van de gespreksnotities. Maar `mapLeadToReportData` in Slide 10 negeert die volledig en stuurt de **ruwe** `gesprek_notities` naar het veld `aandachtspunten`. De AI-samenvatting komt dus nergens in de PDF terecht.

**Fix:**
- In `Slide10.tsx`: gebruik `lead.rapport_tekst` als `aandachtspunten` (met fallback naar `lead.gesprek_notities`)
- Verwijder de dubbele AI-call voor value text — Slide 9 heeft die al gedaan, hergebruik `lead.rapport_tekst`

## Probleem 2: Huisstijl website niet in PDF

De website gebruikt `border-radius: 12px` op cards, maar de PDF heeft nergens afgeronde hoeken. Daarnaast wijken de werkwijze-stappen en hun copy af van de website.

**Fix in `reportStyles.ts`:**
- Voeg `borderRadius: 8` toe aan cards, reviewCards, garantieCards, googleBadge, badge, priceBar (kleiner dan web omdat het print is, maar visueel consistent)

**Fix in `reportConstants.ts`:**
- Synchroniseer de WERKWIJZE_STAPPEN titels en copy met de 6 stappen uit Slide2A (website heeft 6 stappen, PDF heeft er nu 7 met afwijkende teksten)

---

| Bestand | Wijziging |
|---|---|
| `src/slides/Slide10.tsx` | Gebruik `rapport_tekst` als `aandachtspunten`, verwijder dubbele AI-call |
| `src/components/report/reportStyles.ts` | Voeg `borderRadius: 8` toe aan card-achtige styles |
| `src/components/report/reportConstants.ts` | Synchroniseer werkwijze-stappen met website (Slide2A) |


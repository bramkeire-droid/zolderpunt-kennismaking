

# Plan: PDF Rapport Correctieronde v2

Alle correcties uit het uploaddocument in één keer uitvoeren.

## Wijzigingen per bestand

### 1. `src/components/report/reportStyles.ts` — Rechthoekige hoeken + cover + CTA + reviews

- **Alle `borderTopLeftRadius`/etc. → 0** op: `card`, `cardThird`, `priceBar`, `reviewCard`, `reviewPhoto`, `reviewAvatar`, `garantieCard`, `googleBadge`, `badge`. Foto's behouden radius per uitzondering.
- **Cover**: `coverTitle` krijgt `hyphens: 'none'` (react-pdf: geen hyphenation). Hero 55% → `height: 460`. `coverContent` padding herverdelen zodat onderste 45% gevuld aanvoelt.
- **Review cards**: Toevoegen `maxHeight: 120, overflow: 'hidden'` op `reviewCard`.
- **CTA page**: Nieuw `ctaBanner` style (full-width blauw blok, witte tekst 18pt). `ctaPhoto` verkleinen naar 80×80. Nieuwe `ctaPersonInfo` style.

### 2. `src/components/report/reportConstants.ts` — 7 werkwijze-stappen

Vervang de huidige 6 stappen door exact de 7 stappen uit de correctieprompt:
1. Kennismakingsgesprek (done)
2. Plaatsbezoek (current)
3. Gedetailleerde offerte (upcoming)
4. Akkoord & planning (upcoming)
5. Uitvoering (upcoming)
6. Oplevering (upcoming)
7. Jouw nieuwe ruimte (upcoming)

### 3. `src/components/report/ReportDocument.tsx` — Meerdere secties

**Samenvatting**: Situatie-veld moet enkel beschrijving tonen, niet het gewenste resultaat erin. Data-mapping wordt al correct gedaan in Slide10, maar de kaart-border toevoegen (`border: '1px solid #E2E8F0'`).

**Prijsindicatie**: Price bar fill positie berekenen op basis van `prijs_incl6` t.o.v. `prijs_min`/`prijs_max`. Tekst "Meest waarschijnlijk: [bedrag] – [bedrag]" toevoegen met BTW-label.

**Waarde**: Border `1px solid #E2E8F0` toevoegen op `cardThird` views. Kader 2 titel max 2 regels.

**Reviews**: 
- `GoldStars` hardcoded op 5 sterren — controleer dat `[0,1,2,3,4]` correct 5 items geeft (het is correct, maar de document zegt 4 sterren verschijnen → dubbel-check array length). Probleem is waarschijnlijk dat `gap: 2` in `GoldStars` de 5e ster buiten beeld duwt → fix met `flexWrap: 'nowrap'`.
- Review tekst trunceren op 220 chars vóór rendering.

**Garanties**: Border toevoegen op cards.

**CTA page**: Herstructureren naar 4 blokken: intro, persoon+contact (2 kolommen, foto 80×80), blauw CTA-banner, footer.

### 4. `src/slides/Slide10.tsx` — Situatie data-mapping

Situatie: `Onafgewerkte zolder van ±${m2}m²` — zonder het gewenste resultaat erin te mengen.

### 5. `supabase/functions/generate-value-text/index.ts` — Geen wijziging nodig

De `extract_highlights` prompt is al correct geïmplementeerd in de vorige ronde.

---

## Samenvatting bestanden

| Bestand | Wijziging |
|---|---|
| `reportStyles.ts` | Alle border-radius → 0, cover layout, CTA styles, review maxHeight |
| `reportConstants.ts` | 7 werkwijze-stappen (was 6) |
| `ReportDocument.tsx` | Card borders, price bar berekening, review truncatie, CTA herstructurering, GoldStars fix |
| `Slide10.tsx` | Situatie mapping fix |


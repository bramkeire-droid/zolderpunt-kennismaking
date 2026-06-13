
## Doel

Aanpassingen aan `src/components/dossier/OffertebijlagePdf.tsx`:

1. **Pagina 1 — Facturatie & Planning samen op één A4** (geen page break meer tussen).
2. **Pagina 2 — Reviews** herontwerpen: dichter, herkenbaarder als Google reviews, met Zolderpunt-huisstijl.

---

## 1. Facturatie & Planning compacteren

Doel: alles past op één A4 zonder visuele rommel.

- `page.padding` 40 → 32, `section.marginBottom` 26 → 14.
- Header: `marginBottom` 24 → 14, `paddingBottom` 16 → 10, titel 22 → 18.
- Meta-row: `marginBottom` 18 → 10, `metaValue` fontSize 11 → 10.
- `sectionTitle` 16 → 13, `marginBottom` 14 → 8; `sectionLabel.marginBottom` 10 → 5.
- Faserows: `padding` 12 → 8, `marginBottom` 8 → 5, faseNr 28×28 → 22×22, faseBedrag 14 → 12.
- `totalRow` padding verkleind (Vert 10 → 7).
- `weeklyCallout`: `padding` 14 → 9, `marginTop` 14 → 8, badge en bedrag iets kleiner (weeklyAmount 18 → 14).
- `btwNote.marginTop` 8 → 4.
- Tijdlijn: `timelineWrap.padding` 16 → 10, `tlBlock.minHeight` 50 → 38, `padding` 6 → 4, legendRow `marginTop` 14 → 8.
- Sectie-titel "Planning" en "Facturatie" blijven gescheiden, alleen marges krimpen.

Resultaat: één compacte A4 — geen page break meer tussen facturatie en planning.

---

## 2. Reviews-pagina herontwerpen

### Visuele richting

Combinatie Zolderpunt-blauw (`COLORS.primary`) + herkenbare Google-review codes:
- **Gele 5-sterren** (Google-stijl) prominent in hero en in elke kaart.
- **"G"-cirkel-badge** (multicolor onmogelijk in PDF zonder svg → eenvoudige blauwe cirkel met witte "G" volstaat) naast titel.
- Semi-transparante overlay-blokken op de blauwe hero (witte boxes met opacity ~0.10/0.15) voor diepte zonder huisstijl te verliezen.
- Minder witruimte: kaarten dichter op elkaar (gap 6pt), 2 kolommen, dichter padding.
- Subtiele blauwe accent-strook links van elke kaart (3pt) — "ervaringen-bar".

### Hero (compacter, rijker)

- Blauwe band krimpt: `paddingVertical` 22 → 16, `marginBottom` 22 → 14.
- Layout: links titel/score, rechts een semi-transparante kaart met "Google" badge + grote 5.0 + 5 gele sterren + "9 reviews".
- Kicker met sterretjes-icoontjes ipv enkel tekst: "★ ERVARINGEN · GOOGLE REVIEWS ★".
- Score-blok rechts: witte half-transparante achtergrond (`rgba(255,255,255,0.12)`), border `rgba(255,255,255,0.25)`, padding 10, met:
  - "G" badge (cirkel, wit op blauw of multicolor benadering)
  - "5.0" groot (28pt)
  - 5 gele sterren onder elkaar
  - "op basis van 9 Google reviews" klein wit/85% opacity

### Review-kaarten

- 2 kolommen, `gap` ipv `marginRight` voor strakkere rasters.
- `reviewCard`: `padding` 12 → 10, `marginBottom` 12 → 8.
- Linkse 3pt blauwe accent-strook (`borderLeftWidth: 3, borderLeftColor: COLORS.primary`).
- `reviewTop`: avatar-cirkel (initialen op blauw) links + author + datum stacked rechts.
- Sterren in **goud** (al gebeurt), iets groter (11 → 12) en eronder de tekst.
- Subtiele blauwe achtergrond-tint (`#F4F8FF` of `COLORS.primary` met opacity via `rgba`) op `reviewTop` voor contrast.
- Citaat: behoud quote, fontSize 9 → 9.5.

### Footer/source

- `reviewSource` blijft, maar voeg ernaast een mini "Powered by Google" tekst toe.

---

## Bestanden

- `src/components/dossier/OffertebijlagePdf.tsx` — enige wijziging.

Geen wijzigingen aan data-fetch, edge function of dialog. Geen nieuwe dependencies.

---

## QA

Na implementatie: PDF genereren via Dossiers → Offertebijlage downloaden, beide pagina's visueel controleren (geen overlap, geen overflow, kaarten symmetrisch, sterren goud zichtbaar).

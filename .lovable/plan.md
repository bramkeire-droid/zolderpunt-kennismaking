
# Herontwerp Notitieblok — LiveCalling

Doel: pagina in één oogopslag leesbaar tijdens een telefoongesprek. Duidelijk afgebakende secties, consistente knopmaten, consistente typografie-hiërarchie, sterke visuele accenten.

## Sectiestructuur (top → bottom)

```text
┌─────────────────────────────────────────────┐
│  📝 Notitieblok — Wat onthou ik?            │  ← header
├─────────────────────────────────────────────┤
│  ① KLANTGEGEVENS       (card, licht kader) │
├─────────────────────────────────────────────┤
│  ② PLANNING            (card, blauw accent)│
├─────────────────────────────────────────────┤
│  ③ WAT KWAM AAN BOD?   (card, chips)       │
├─────────────────────────────────────────────┤
│  ④ VIER VRAAGKADERS    (2×2 grid)          │
└─────────────────────────────────────────────┘
```

Elke sectie krijgt:
- Eigen `<section>` met witte achtergrond, dikke bovenrand-accent in `#008CFF` (2px top) + subtiel border op andere kanten.
- Sectiekop links: nummer (blauw, extrabold) + titel (uppercase, tracking, zwart).
- Interne padding `p-4`, sectie-marge `gap-3` in parent.

## Typografie-schaal (symmetrisch, 3 niveaus)

Alle willekeurige `clamp()`-waarden vervangen door één vaste schaal:

- **H1 / Notitieblok**: `text-2xl font-bold` (Space Grotesk/DM)
- **Sectie-eyebrow** (KLANTGEGEVENS, PLANNING, WAT KWAM AAN BOD, kader-labels WAT/AANNEMER/WAAROM/BUDGET): `text-xs font-extrabold uppercase tracking-[0.14em] text-[#5B6470]`
- **Grote kadernummer (1–4)**: `text-3xl font-extrabold text-[#008CFF] tabular-nums`
- **Input/textarea tekst**: `text-base font-medium text-[#0F1419]` (placeholder `text-[#B0A898]`)
- **Hint/italic subtekst**: `text-xs italic text-[#5B6470]`
- **Knoplabel primair (Videocall/Plaatsbezoek plannen)**: `text-sm font-extrabold uppercase tracking-wide`
- **Knoplabel secundair (chips, ingepland-checks, WAT-tags)**: `text-sm font-semibold`

Geen `clamp()` meer — één oog moet niet met viewport-verschuiving vechten.

## Knop-symmetrie

Drie knopgroottes, allemaal `w-full`, gecentreerde inhoud:

- **Primair (Plannen)**: `h-14` — Videocall & Plaatsbezoek, 2-koloms grid.
- **Secundair (Ingepland-check + Wat-kwam-aan-bod chips)**: `h-11` — beide op één rij hoogte-consistent.
- **Tag (WAT-opties in kader 1)**: `h-11` — `grid-cols-4` (2 rijen × 4).

Beide "ingepland"-checks krijgen hetzelfde raster als de plannen-knoppen (`grid-cols-2 gap-2`) direct eronder → visuele koppeling.

De 8 "Wat kwam aan bod" chips worden een `grid-cols-4 gap-2` (2 rijen × 4) i.p.v. `flex-wrap` → symmetrisch blok.

## Kleurgebruik & nadruk

- Actieve chip/tag/check: `bg-[#008CFF] text-white border-[#008CFF]`.
- Inactief: `bg-white text-[#0F1419] border-[#DDD5C5]`.
- Focus overal: `border-[#008CFF]` (2px).
- Sectie-accent bovenlijn: `border-t-2 border-t-[#008CFF]`.
- **Vet** voor call-to-action woorden in hints (bv. "**Hier ligt je focus tijdens het gesprek.**").
- *Cursief* uitsluitend voor hulptekst onder sectiekoppen.

## Leesbaarheid één-oog

- Inputs krijgen `h-12` (uniform, ruim genoeg om zonder scherpstellen te herkennen).
- Textareas in de 4 kaders: `text-base leading-relaxed`.
- Kadernummer 1–4 groot en blauw → oriëntatiepunt.
- Sectiekoppen altijd links-boven, altijd zelfde stijl → voorspelbaar patroon.
- Verwijder overbodige italic-subtitel naast "Notitieblok" (te druk); behoud alleen de dikke intro-regel.

## Wijzigingen in code

Bestand: `src/pages/LiveCalling.tsx` (regels ~445–575 en helpers ~600–675)

1. **Header** (~449–454): compacter, 1 regel titel + 1 regel intro (vet accent behouden).
2. **Section-wrapper**: nieuwe helper `<Section title="..." >` met top-accent + padding.
3. **Klantgegevens** (~458–474): wrap in `<Section>`. Inputs → vaste `h-12 text-base`.
4. **Planning** (~476–518): wrap in `<Section title="Planning">`. Twee plan-knoppen `h-14`; twee `PlanCheck` `h-11`; beide grids `grid-cols-2 gap-2`.
5. **Wat kwam aan bod** (~520–544): wrap in `<Section>`. Chips → `grid grid-cols-4 gap-2 h-11`.
6. **Vier kaders** (~547–568): behouden `grid-cols-2 grid-rows-2 gap-3`; `BigQuestionBox`-header krijgt uniforme typografie (nummer `text-3xl`, label `text-sm uppercase tracking-[0.06em]`).
7. **`WatTagsChips`** (~657): al `grid-cols-4`, alleen typografie uniformeren met chips hierboven.
8. **`PlanCheck`** (~642): `h-11`, `text-sm font-semibold`, checkbox `w-5 h-5`.
9. **`FieldBlock`** verwijderen / vervangen door `<Section>` (label + hint komen uit sectiekop).

## Verificatie

Playwright-screenshot op 1280×1800, controleren:
- Alle knoprijen dezelfde hoogte per groep.
- Sectiekoppen visueel uitgelijnd.
- Geen `clamp()` meer in de vier secties.
- Geen backend-wijzigingen.

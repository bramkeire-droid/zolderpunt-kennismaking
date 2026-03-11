

# Cover: volledige afbeelding + overlay tekst

## Overflowcheck

Het goedgekeurde plan is **veilig** — geen overflow mogelijk. Hier is waarom:

- Alle elementen gebruiken `position: 'absolute'` — ze nemen **geen ruimte in** in de flow van de pagina
- De `Image` is absolute met `top:0, left:0, right:0, bottom:0` — vult exact de A4 zonder overflow
- Het tekst-overlay blok wordt ook absolute positioned met vaste `top/left` en padding — het kan niet groeien voorbij de pagina
- Er zijn **geen flow-children** die de pagina kunnen pushen naar een tweede pagina

Het enige risico bij de vorige versie was het witte vlak van 280pt dat als absolute element de foto maskeerde. Dat wordt nu vervangen door een compact overlay-blok.

## Wijzigingen

### `src/components/report/reportStyles.ts`
- `pageCover.backgroundColor` → `'white'` (geen warmWhite zichtbaar als fallback)

### `src/components/report/ReportDocument.tsx` — CoverPage
- **Verwijder** het witte vlak (`height: 280, backgroundColor: white`) dat de bovenkant van de foto afsnijdt
- **Behoud** de achtergrondafbeelding exact zoals nu (absolute, vult hele pagina)
- **Voeg toe**: één compact overlay-blok, absolute positioned:
  - `position: absolute, top: 50, left: 50`
  - `backgroundColor: 'rgba(255,255,255,0.85)'`, `padding: 20`
  - Bevat: LogoPdf (width 120), naam, adres, datum
  - Alle tekst met vaste fontSize — geen dynamische groei mogelijk

Totaal: 2 absolute children op de Page. Nul flow content. Overflow is onmogelijk.


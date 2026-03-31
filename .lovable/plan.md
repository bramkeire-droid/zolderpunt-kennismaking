

# Afbeeldingen: origineel formaat + inzoomen

## Wat verandert

### 1. Overal `aspect-square` + `object-cover` verwijderen

Afbeeldingen worden nu in hun origineel formaat getoond met `object-contain` in plaats van gecropte vierkanten.

**Bestanden:**
- `src/slides/Slide0B.tsx` — foto grid: `aspect-square` → `aspect-auto`, `object-cover` → `object-contain`
- `src/slides/Slide3.tsx` — foto grid: idem
- `src/slides/Slide4.tsx` — grote foto: `object-cover` → `object-contain`; thumbnails blijven `object-cover` (thumbnails mogen gecropte previews zijn)

### 2. Lightbox / zoom functionaliteit

Een nieuw herbruikbaar `ImageLightbox` component (`src/components/ImageLightbox.tsx`) dat:
- Een overlay toont met de afbeelding op volledige grootte
- Pinch-to-zoom en scroll-to-zoom ondersteunt (via CSS `transform: scale()` + wheel event)
- Sluit met X-knop, Escape, of klik op achtergrond
- Pan (slepen) wanneer ingezoomd

**Integratie:**
- `Slide0B.tsx` — klik op thumbnail opent lightbox
- `Slide3.tsx` — klik op foto opent lightbox
- `Slide4.tsx` — klik op grote foto opent lightbox

### Technische aanpak

Het `ImageLightbox` component gebruikt:
- `useState` voor `scale` en `position` (pan offset)
- `onWheel` handler: `scale = Math.min(5, Math.max(1, scale + delta))`
- `onMouseDown/Move/Up` voor panning bij `scale > 1`
- Touch events voor pinch-to-zoom op mobiel
- `createPortal` naar document.body voor overlay
- Geen externe dependencies


# Foto's & video's in dossier

## Doel
1. De dossier-actie "Foto's uploaden" hernoemen naar **Foto's** en de dialog zowel upload-zone als bestaande media laten tonen (het "ik zie niets"-gevoel wegnemen).
2. Video's ondersteunen: uploaden (met name `.mp4` van WhatsApp), afspelen in de dialog en in de klantportaal-galerij, en in het PDF-rapport tonen als thumbnail met play-icoon.

## Aanpassingen

### 1. Dossier-actie hernoemen
- `src/pages/Dossiers.tsx`: menu-item label `Foto's uploaden` → `Foto's`.

### 2. Media-dialog uitbreiden (`PhotoUploadDialog.tsx`, hernoemen naar `MediaDialog.tsx`)
- Bovenaan een duidelijke titel "Foto's & video's" met telling van bestaande items.
- Grote upload-knop (accepteert `image/*,video/*`) + drag-and-drop zone.
- Grid met bestaande media:
  - Foto: huidige thumbnail (blijft `object-cover`).
  - Video: thumbnail (poster) met play-overlay; klik = inline player (`<video controls>`) in een lightbox.
- Verwijder-knop per item ruimt storage én DB-array op (inclusief thumbnail).
- Als de dialog leeg is: lege-staat tekst "Nog geen foto's of video's — sleep bestanden hierheen".

### 3. Video-uploadflow
- Client comprimeert alleen images (huidige `compressImageFile`); video's gaan as-is naar `lead-fotos` bucket.
- Voor elke video: genereer client-side een JPEG-thumbnail door het bestand in een `<video>` element te laden, naar frame ~1s te seeken en op een `<canvas>` te tekenen. Upload de thumbnail als apart object (`<pad>.jpg`) naar dezelfde bucket.
- Item-shape in `lead.fotos` uitgebreid (backwards compatible):
  ```ts
  {
    bestandsnaam: string,
    storage_path: string,
    url?: string,
    type?: 'image' | 'video',        // afwezig = image
    thumbnail_path?: string,          // alleen bij video
    thumbnail_url?: string
  }
  ```
- Grootte-limiet client-side (bv. 50 MB) met duidelijke toast bij overschrijding.

### 4. Consumers bijwerken (video renderen als thumbnail met play-badge, klik = play)
- `src/components/portal/PortalFotos.tsx` (klantportaal-galerij): video's tonen met thumbnail + play-overlay; lightbox schakelt tussen `<img>` en `<video controls autoplay>`.
- `src/components/ImageLightbox.tsx`: uitbreiden zodat het ook `<video>` kan renderen, of aparte `MediaLightbox` wrapper.
- `src/components/report/ReportDocument.tsx` (PDF): render altijd de `thumbnail_url` (met een klein play-driehoekje overlay) voor video-items; foto's ongewijzigd.
- `src/slides/Slide0B.tsx` en `Slide4.tsx` (labelmaker): video's tonen thumbnail; labelmaker-markers blijven alleen voor foto's mogelijk (video's krijgen geen numerieke markers).
- `src/hooks/usePortal.ts` / `getPortalData` edge function: doorgeven van `type` en `thumbnail_url`.

### 5. WhatsApp inbound (later opvolgen — buiten scope tenzij gevraagd)
- `_shared/ingestMedia.ts` schrijft momenteel enkel `image/*`. Uitbreiden naar `video/*` valt hier logisch bij, maar houdt ook thumbnail-generatie server-side in (ffmpeg / edge runtime beperking). Ik markeer dit als vervolgstap tenzij je wil dat het meteen mee gaat.

## Technisch (details)

- Geen database-migratie nodig: `leads.fotos` is `jsonb`, extra keys per item passen erin.
- Storage: bestaande public bucket `lead-fotos` wordt hergebruikt voor zowel video's als thumbnails.
- Bestandsnaamconventie: `<lead_id>/<timestamp>-<naam>.mp4` en `<lead_id>/<timestamp>-<naam>.thumb.jpg`.
- Type-detectie via `file.type.startsWith('video/')`.
- Thumbnail-extractie: gebruik `URL.createObjectURL(file)`, `video.currentTime = Math.min(1, duration/2)`, teken op canvas → `toBlob('image/jpeg', 0.8)`.

## Openstaande vraag
Wil je dat we in dezelfde slag ook de inbound WhatsApp/e-mail pipeline uitbreiden zodat binnenkomende video's automatisch in het dossier landen? Of eerst enkel de manuele upload + weergave, en inbound video's in een aparte ronde?

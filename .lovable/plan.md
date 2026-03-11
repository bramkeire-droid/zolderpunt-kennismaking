

## Diagnosis

### Problem 1 — Hero image not loading
- **Line 17:** `import heroSrcRaw from '@/assets/hero-cover-new.webp'` — **WebP format**
- `@react-pdf/renderer` only supports **JPG and PNG**. WebP is not rendered.
- There IS a `hero-cover.jpg` in `src/assets/` — correct format, ready to use.
- **Fix:** Change the import from `hero-cover-new.webp` to `hero-cover.jpg`. Remove the `toAbsoluteUrl` wrapper (ES module import already provides a valid URL via Vite).

### Problem 2 — Mathieu photo not showing
- `reportConstants.ts` line 58: `hasPhoto: false` — so `ReviewsPage` never renders his photo.
- The file `review-foto-mathieu.png` exists in `src/assets/`.
- BUT the current `ReviewsPage` code (lines 426-437) has NO photo rendering logic at all — it always shows initials. The `hasPhoto` flag is never checked.
- **Fix:** 
  1. Set `hasPhoto: true` for Mathieu in `reportConstants.ts`
  2. Import `review-foto-mathieu.png` in `ReportDocument.tsx`
  3. Build a photo map (`{ mathieu: importedSrc }`) and update the review rendering to show `<Image>` when `hasPhoto && photoMap[photoKey]` exists, otherwise show initials

## Changes

### File 1: `src/components/report/ReportDocument.tsx`
1. **Line 17:** Change `hero-cover-new.webp` → `hero-cover.jpg`
2. **Lines 20-24:** Remove `toAbsoluteUrl` for hero (keep for bram which is already PNG). Actually simplify: just use the raw import directly — Vite provides a valid URL string.
3. **Add import** for `review-foto-mathieu.png`
4. **ReviewsPage (lines 426-437):** Add conditional: if `review.hasPhoto && REVIEW_PHOTO_MAP[review.photoKey]`, render an `<Image>` inside the avatar circle instead of initials text.

### File 2: `src/components/report/reportConstants.ts`
1. **Line 58:** Change `hasPhoto: false` → `hasPhoto: true` for Mathieu only (the other three review photos are attic/project photos, not portraits).

### Scope
- Only these two files touched
- No changes to styles, cover structure, or any other pages


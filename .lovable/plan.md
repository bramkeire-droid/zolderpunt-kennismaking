

## Diagnosis (verified from PDF)

**Cover (3 pages instead of 1):** The `View` wrapper with `position: relative` + absolute children does NOT work in `@react-pdf/renderer`. The renderer still overflows each absolute child (Image 842pt + SVG 842pt + content View) to separate pages. The fundamental issue: `@react-pdf/renderer` does not support CSS-like stacking of absolute elements within a relative container.

**Page 5 empty:** SamenvattingPage's last card ("Aandachtspunten") + closing italic text overflow to a second page due to card padding/margins.

**Review photos:** ALL four review photo files (`review-foto-brandon.jpg`, `review-foto-tom.png`, `review-foto-cecilia.png`, `review-foto-mathieu.png`) contain attic/project photos, not portraits. The mapping is technically correct but the source files are wrong.

---

## Plan

### Fix 1 -- Cover: Single-page with NO absolute positioning

The only reliable approach in `@react-pdf/renderer` is **flow-based layout with a clipped SVG background**. No absolute positioning at all.

**Strategy:** Remove the hero image from the cover entirely. Use a simple flow layout:
- Top section: full-width warm-white background with the 40° blue diagonal drawn via SVG as a decorative element
- Bottom section: content (logo, title, date, tagline)

Actually, the user's own pseudocode specifies an all-absolute approach. The issue is that `@react-pdf/renderer` v4 DOES support absolute positioning within a fixed-size View, but the `pageCover` style has `padding: 0` which may be interfering, and the View wrapper may not be constraining correctly.

**Root cause research:** In `@react-pdf/renderer`, a `Page` already has fixed dimensions (A4 = 595x842). Adding a child `View` with `width: 595, height: 842` creates a second box that exceeds the page. The absolute children then overflow.

**Correct approach:** Place absolute children directly on the `Page` with NO wrapper View. Set `Page` style to `position: 'relative'`. The `Page` IS the 595x842 container. No padding, no flow content.

```
<Page size="A4" style={{ padding: 0, position: 'relative' }}>
  <Image ... style={{ position: 'absolute', ... }} />
  <Svg ... style={{ position: 'absolute', ... }} />
  <View ... style={{ position: 'absolute', bottom: 60, left: 40 }}>
    {/* text content */}
  </View>
</Page>
```

Key: `wrap={false}` on the Page to prevent any page-break behavior. Remove the wrapper `View` entirely.

### Fix 2 -- SamenvattingPage: eliminate overflow

- Reduce `marginBottom` on cards from 12 to 8
- Wrap the last card + closing italic paragraph in a single `<View wrap={false}>` so they stay together
- Reduce the closing italic `marginTop` from 12 to 6
- Reduce intro text `marginBottom` from 14 to 10

### Fix 3 -- Review photos: use initials fallback

All four `.jpg/.png` files are attic photos, not portraits. Until the user provides actual portrait photos:
- Set `hasPhoto: false` for Brandon, Tom, and Cecilia in `reportConstants.ts`
- Set `hasPhoto: false` for Mathieu as well (the uploaded file is also an attic photo)
- This triggers the existing initials-based avatar fallback (colored circle with letters)
- Remove the broken photo imports from `ReportDocument.tsx` to reduce bundle size

### Files to modify

1. **`src/components/report/ReportDocument.tsx`** -- Rewrite `CoverPage` with direct absolute children on `Page` (no wrapper View), add `wrap={false}`. Fix `SamenvattingPage` margins and grouping. Remove review photo imports and mapping.

2. **`src/components/report/reportStyles.ts`** -- Update `pageCover` to include `position: 'relative'`. Reduce card margins.

3. **`src/components/report/reportConstants.ts`** -- Set `hasPhoto: false` for all four reviewers.

### Self-check criteria

After implementation, I will parse the generated PDF and verify:
- Cover = exactly 1 page (total PDF pages = 9)
- No empty pages
- Review cards show colored circles with initials, no attic photos


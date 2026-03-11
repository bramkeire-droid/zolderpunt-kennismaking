

# Fix: Naam en datum op de cover — overflow naar pagina 2

## Probleem
De naam ("Bram Keirsschieter") en datum staan op **pagina 2** in plaats van op de coverpagina. Dit komt doordat `@react-pdf/renderer` de absolute-positioned View toch meetelt voor de content height van de Page, waardoor er overflow ontstaat.

## Oplossing
De `pageCover` style mist `position: 'relative'` en `overflow: 'hidden'` op de Page, en de hoogte van het Image-element (842pt) samen met de absolute View veroorzaakt overflow.

**Fix:** Zet de hele cover-inhoud in één `View` wrapper met `position: relative`, `width: 595`, `height: 842` zodat alles binnen de pagina-bounds blijft. De `Page` zelf krijgt `overflow: 'hidden'`.

### Bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/report/ReportDocument.tsx` | Cover: wrap Image + naam/datum View in een container View met vaste afmetingen (595×842) en `position: relative`. Alle children absoluut gepositioneerd binnen deze container. |
| `src/components/report/reportStyles.ts` | `pageCover`: voeg `overflow: 'hidden'`, `position: 'relative'`, `width: 595`, `height: 842` toe |


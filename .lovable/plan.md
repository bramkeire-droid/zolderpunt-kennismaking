

# Fix Cover: Logo verwijderen + afbeelding groter

## Wat er verandert

**`src/components/report/ReportDocument.tsx` — CoverPage:**

1. **Verwijder `<LogoPdf width={160} />`** uit de top sectie — het logo zit al in de cover-afbeelding zelf (zichtbaar in de screenshot).

2. **Vergroot de afbeelding van 480pt naar 560pt.** Zonder het logo is de tekstsectie ~150pt hoog. Met een image van 560pt start die op 842-560=282pt — ruim 130pt vrije ruimte tussen tekst en afbeelding. Dit geeft meer van de foto weer zonder overlap of overflow.

| Element | Oud | Nieuw |
|---|---|---|
| LogoPdf in top sectie | aanwezig | verwijderd |
| Image height | 480 | 560 |


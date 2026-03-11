

# Fix: Cover afbeelding overflow naar pagina 2

## Probleem
De top View is 420pt + de Image is 422pt = 842pt. Dat is precies A4, maar `@react-pdf/renderer` splitst het toch over 2 pagina's door interne margins/rounding. De `overflow: hidden` op de Page voorkomt dit niet omdat Page-elementen in react-pdf altijd pagineren.

## Oplossing
Maak de top section kleiner (bijv. 340pt) en gebruik `flex: 1` op de Image zodat die de resterende ruimte vult zonder een harde hoogte. Dit voorkomt overflow.

### Wijzigingen

| Bestand | Wat |
|---|---|
| `src/components/report/ReportDocument.tsx` | CoverPage: top View `height: 340` (ipv 420), Image style: verwijder vaste `height: 422`, gebruik `flex: 1, width: '100%', objectFit: 'cover'`. Wrap beide in een outer View met `flex: 1, flexDirection: 'column'` zodat de image de resterende ruimte opvult zonder overflow. |

Dit is de simpelste fix: geen absolute positioning, geen harde hoogte op de image, flex layout laat react-pdf zelf de beschikbare ruimte verdelen binnen één pagina.


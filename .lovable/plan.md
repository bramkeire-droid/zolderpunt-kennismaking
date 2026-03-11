

# Cover herstellen: afbeelding onderaan, klantdata bovenaan

## Aanpak

De huidige cover gebruikt de oude Canva-afbeelding full-page (595x842). Het nieuwe ontwerp:

```text
┌─────────────────────────┐
│  Logo (beeldmerk)       │
│                         │
│  Naam klant             │
│  Projectadres           │
│  Datum gesprek          │
│                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  ← ~halverwege de pagina
│                         │
│  ┌───────────────────┐  │
│  │   Nieuwe 1:1      │  │
│  │   afbeelding      │  │
│  │                   │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

## Wijzigingen

| Bestand | Wat |
|---|---|
| `src/assets/cover-pdf.png` | Vervangen door de nieuwe 1:1 afbeelding (upload) |
| `src/components/report/ReportDocument.tsx` | CoverPage herschrijven: bovenste helft = warm-white achtergrond met logo, naam, adres, datum. Onderste helft = de 1:1 afbeelding die de volle breedte vult. Geen absolute positioning meer — gewoon twee Views in een column layout. |

### CoverPage layout detail

- **Bovenste View** (~420pt): padding 50pt, bevat:
  - LogoPdf component (160px breed)
  - Klantnaam in SpaceGrotesk Bold 28pt
  - Projectadres in RethinkSans 12pt
  - Datum gesprek in RethinkSans 12pt, midGray
- **Onderste View** (~422pt): de nieuwe 1:1 afbeelding, `width: 595`, `height: 422`, `objectFit: cover`
- Achtergrond pagina: warmWhite (bestaande pageCover style)
- Geen absolute positioning nodig — simpele flex column


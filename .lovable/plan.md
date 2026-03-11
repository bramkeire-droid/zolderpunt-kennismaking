

# PDF Rapport verbeteringen

## Samenvatting van de 7 wijzigingen

### 1. Hero-afbeelding van zolderpunt.be op de cover
De huidige `hero-cover.jpg` (afgewerkte zolderkamer) wordt vervangen door de hero van zolderpunt.be (werkers in blauw shirt). Ik download de afbeelding van de website en sla die op als nieuw asset.

### 2. Diagonale lijn op cover — 40° huisstijl
De huidige `coverAngle` gebruikt `rotate(-3deg)` wat niet overeenkomt met de huisstijl van 40°. Oplossing: de hero-afbeelding zelf krijgt een diagonale onderkant via een blauw SVG-overlay die de hoek afsnijdt op 40°, in plaats van een apart `View` element. Dit is visueel sterker en makkelijker te implementeren.

### 3. Lege pagina 3 elimineren
De samenvatting loopt over naar pagina 3 met slechts de afsluitende tekst ("Op basis van dit gesprek..."). Dit wordt opgelost door:
- De afsluitende tekst samen met de cards op dezelfde pagina te houden (geen `divider` + tekst die overflow veroorzaakt)
- `wrap={false}` op de afsluitende blok verwijderen zodat het beter mee vloeit
- Kleinere margins/padding waar nodig

### 4. Waarde-pagina: kader 3 — terugverdien-argument
Bij het derde kader ("8 a 15% meer waard") wordt de tekst uitgebreid met een zin over terugverdienen:
```
"Een afgewerkte zolder verhoogt de verkoopwaarde van je woning gemiddeld 
met 8 a 15%. Jouw investering verdient zichzelf dus makkelijk terug."
```

### 5. Reviews: "4 reviews" verwijderen
`GOOGLE_REVIEW_COUNT` staat op "4" en wordt getoond als "4 reviews op Google". Dit geeft een verkeerde indruk. De tekst `— {GOOGLE_REVIEW_COUNT} reviews op Google` wordt verwijderd uit de Google badge. Alleen de score "5/5" en sterren blijven staan, met "op Google" ernaast.

### 6. Review foto Mathieu Ackerman
Ik vraag je straks de foto op te laden.

### 7. (leeg punt — geen actie)

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/assets/hero-cover.jpg` | Vervangen door zolderpunt.be hero |
| `src/components/report/reportStyles.ts` | Cover angle 40°, margins aanpassen |
| `src/components/report/ReportDocument.tsx` | Diagonale cover, waarde-tekst, samenvatting overflow fix |
| `src/components/report/reportConstants.ts` | Review count verwijderen uit badge-tekst |


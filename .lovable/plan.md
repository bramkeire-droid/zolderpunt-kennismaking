

# Cover herwerken met nieuwe afbeelding (zonder logo/tekst)

## Aanpak

De gebruiker levert een nieuwe cover-afbeelding **zonder** logo en tekst. Wij plaatsen logo + klanttekst er zelf overheen via absolute positioning in `@react-pdf/renderer`.

**Belangrijk:** Alles blijft simpel — één `Page`, alle elementen absolute positioned, geen flex/flow die overflow kan veroorzaken.

## Wijzigingen

### 1. Nieuwe afbeelding kopiëren
- Kopieer `user-uploads://Kopie_van_Zoveel_Zolder_Zoveel_ruimte.png` → `src/assets/cover-pdf-clean.png`

### 2. `src/components/report/ReportDocument.tsx` — CoverPage

De hele pagina wordt opgebouwd met absolute positioning:

- **Achtergrondafbeelding**: `position: absolute`, `top: 0, left: 0, right: 0, bottom: 0` — vult de hele A4. `objectFit: 'cover'`. Geen vaste hoogte, gewoon de hele pagina vullen.
- **Logo (beeldmerk)**: Absolute positioned linksboven of rechtsboven via `LogoPdf` component, wit gekleurd.
- **Tagline "zolderpunt."**: Absolute positioned naast/onder het beeldmerk.
- **Klantnaam + adres + datum**: Absolute positioned in de linkerbovenhoek, met witte of donkere tekstkleur (afhankelijk van contrast met de foto).

Concreet:
```
<Page size="A4" style={s.pageCover}>
  {/* Foto vult hele pagina */}
  <Image src={coverCleanSrc} style={{ position:'absolute', top:0, left:0, right:0, bottom:0, objectFit:'cover' }} />
  
  {/* Wit vlak bovenaan voor tekst (semi-transparant of wit) */}
  <View style={{ position:'absolute', top:0, left:0, right:0, height:280, backgroundColor:'white' }}>
    <View style={{ paddingTop:60, paddingHorizontal:50 }}>
      <LogoPdf width={120} />
      <Text>Voornaam Achternaam</Text>
      <Text>Adres</Text>
      <Text>Datum gesprek: ...</Text>
    </View>
  </View>
</Page>
```

Dit vermijdt elk overflow-risico: alles is absolute, niets pusht content naar een tweede pagina. De witte band bovenaan zorgt voor leesbare tekst, de foto eronder vult de rest.

### 3. Import aanpassen
- Vervang `cover-pdf.png` import door `cover-pdf-clean.png`


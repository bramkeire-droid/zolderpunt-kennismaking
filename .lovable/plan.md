

# Plan: PDF Rapport Correcties

Dit plan lost alle issues op die je in de correctieprompt beschrijft. De wijzigingen worden in één keer doorgevoerd.

---

## Overzicht correcties

### 1. PdfIcon component (nieuw bestand)
Maak `src/components/report/PdfIcon.tsx` — een herbruikbaar component dat Lucide-achtige SVG paths rendert via `@react-pdf/renderer`'s `<Svg>/<Path>`. Bevat alle benodigde iconen: MapPin, Target, Wrench, MessageCircle, CheckCircle, XCircle, Maximize2, Home, TrendingUp, Calendar, Shield, Star, StarFilled, Phone, Mail, Globe, Circle, CircleFilled, CheckCircle (grijs).

### 2. Datumformattering
Voeg `formatDatum()` helper toe die ISO-datums omzet naar leesbaar Nederlands (`"10 maart 2026"`). Toepassen op cover + samenvatting.

### 3. Naam "Bram" verwijderen uit vaste teksten
In `reportConstants.ts`:
- Stap 2: "Een Zolderpunt-adviseur komt bij jou thuis..."
- Stap 5: "Je hebt één vaste contactpersoon..."
- Stap 7: emoji verwijderen uit titel

### 4. Sectie 1 — Cover
- Hero-afbeelding genereren met AI (zolder sfeerbeeld) en toevoegen bovenaan de cover
- Logo tonen via bestaand `LogoPdf` component
- Gepersonaliseerde titel + datum in leesbaar formaat
- Schuine 40°-overgang als decoratief element

### 5. Sectie 2 — Samenvatting
- Emoji's vervangen door `PdfIcon` componenten (MapPin, Target, Wrench, MessageCircle)
- Elk veld als visueel blok met witte achtergrond + icoon links
- Adres uit situatieveld halen (data-mapping fix in Slide10)

### 6. Sectie 3 — Prijsindicatie
- Checklist emoji's (✅/❌) vervangen door PdfIcon CheckCircle/XCircle
- Schilderwerk-label correct formatteren
- Prijsbalk visueel verbeteren

### 7. Sectie 4 — Waarde
- Emoji's (📐/🏠/📈) vervangen door PdfIcon (Maximize2, Home, TrendingUp)
- Kader 2 titel flexWrap toevoegen

### 8. Sectie 5 — Werkwijze
- Tijdlijn checkmark "✓" vervangen door PdfIcon CheckCircle
- Actieve stap: gevulde cirkel icoon
- Emoji stap 7 verwijderd (zie punt 3)

### 9. Sectie 6 — Garanties
- Emoji's vervangen door PdfIcon (Calendar, MessageCircle, Shield, Star, CheckCircle)
- Grid layout 2+2+1

### 10. Sectie 7 — Reviews
- Sterren emoji's vervangen door 5x PdfIcon StarFilled in goud
- Google-badge sterren ook als SVG

### 11. Sectie 8 — CTA
- Contact-iconen (📞/✉️/🌐) vervangen door PdfIcon (Phone, Mail, Globe)

### 12. Slide10 data-mapping fix
- `situatie` veld: adres niet meer mengen met inhoudelijke beschrijving

---

## Bestanden die wijzigen

| Bestand | Actie |
|---|---|
| `src/components/report/PdfIcon.tsx` | **Nieuw** — herbruikbaar SVG icoon component |
| `src/components/report/ReportDocument.tsx` | Alle emoji's vervangen, datumformat, cover hero, layout fixes |
| `src/components/report/reportConstants.ts` | "Bram" verwijderen, emoji stap 7, garantie iconen als keys i.p.v. emoji |
| `src/components/report/reportStyles.ts` | Eventuele style toevoegingen voor hero cover, garantie grid |
| `src/slides/Slide10.tsx` | Data-mapping fix voor situatie-veld |
| `src/assets/hero-cover.jpg` | **Nieuw** — AI-gegenereerd sfeerbeeld voor cover |


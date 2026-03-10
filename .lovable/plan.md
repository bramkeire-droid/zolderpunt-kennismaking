

## Analyse: leesbaarheid tijdens videocall

### Het probleem
Wanneer jij je scherm deelt in een videocall (Zoom/Teams/Google Meet), zien deelnemers jouw 16:9 laptopscherm op **50-70% van de werkelijke grootte**. Op een mobiel scherm van deelnemers wordt dit nog kleiner — het 16:9 beeld wordt letterboxed (met zwarte balken boven/onder). Er is **geen manier** om dit als 9:16 te presenteren via standaard videocall-software. De enige oplossing is: **grotere tekst en elementen** zodat alles leesbaar blijft, ook verkleind.

### Huidige knelpunten
- **Labels**: `10.5px` — onleesbaar bij screen share
- **Body text**: `14px` (text-sm) — te klein
- **Slide headings**: `text-3xl` (30px) — net ok, maar kan groter
- **Calculator (Slide 5B)**: zeer kleine tekst (`text-xs`, `text-[10px]`, `text-[11px]`)
- **Slide 0A2**: 3x3 grid met kleine kaartjes
- **Slide 3**: kleine input velden en labels
- **Slide 7**: drie kolommen met kleine tekst
- **NavigationBar**: prima op 72px

### Aanpassingen per onderdeel

**1. Globale CSS (index.css)**
- `.label-style`: van `10.5px` naar `12px`
- Minimum body text: basis naar `16px` (text-base ipv text-sm)

**2. SlideLayout**
- Padding verhogen van `p-8 lg:p-12` naar `p-10 lg:p-16` voor meer ademruimte

**3. SlideLabel**
- Font size meeschalen met globale label-style fix

**4. Alle slides — systematische aanpassingen:**

| Slide | Wijziging |
|-------|-----------|
| 0A | Labels + inputs groter, heading naar `text-4xl` |
| 0A2 | Grid van `grid-cols-3` → `grid-cols-3` maar grotere kaartjes, iconen `h-8 w-8`, tekst `text-base` |
| 0B | Inputs en labels groter |
| 0C | Tech kaartjes: iconen `h-10 w-10`, tekst `text-base` |
| 1 (welkom) | Heading `text-5xl` → `text-6xl`, body `text-xl` → `text-2xl` |
| 2A | Timeline labels groter, beschrijving `text-lg` |
| 2B | Agenda items `text-lg` → `text-xl`, nummers groter |
| 3 | Input velden breder, labels `text-base` |
| 4 | Prompts en notitieveld groter |
| 5 | Zelfde als 0C |
| 5B | Calculator: alle `text-xs`/`text-[10px]` → `text-sm`/`text-xs`, input text groter |
| 6 (budget) | Prijzen al groot, chips tekst groter |
| 7 | Optie-kaarten: tekst `text-base`, beschrijving `text-sm` → `text-base` |
| 8 | Upload zone en tekst groter |
| 9 | Rapport tekst al `text-base`, ok |
| 10 | Summary labels groter |

**5. SlideNavButtons**
- Knoppen iets groter: `py-3 px-6 text-base`

### Over mobiele kijkers in videocalls
Kort antwoord: nee, er is geen standaard manier om jouw gedeelde 16:9 scherm als 9:16 te tonen aan mobiele deelnemers. Videocall-platforms tonen het gedeelde scherm altijd in de oorspronkelijke verhouding. De oplossing is puur: **tekst groot genoeg maken dat het ook op een klein 16:9 venster leesbaar is**. Dat is precies wat dit plan doet.

### Technisch
- ~15 bestanden aanpassen (alle slides + SlideLayout + index.css + SlideNavButtons)
- Geen structurele wijzigingen, alleen font sizes, padding, en spacing opschalen
- Geen database wijzigingen nodig


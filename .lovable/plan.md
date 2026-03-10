

# Plan: Procesgevoel versterken op Slide 2A

## Probleem

De 6 stappen staan nu als losse blokken naast elkaar — visueel een opsomming, geen flow. Er is geen visuele verbinding tussen de stappen.

## Oplossing: Horizontale progress-lijn met knooppunten

Vervang de rij knoppen door een echte **timeline met verbindingslijn**:

```text
  ●━━━━━━━●━━━━━━━●━━━━━━━○━━━━━━━○━━━━━━━○
  01       02       03       04       05       06
Eerste   Intake-  Plaats-   3D-     Uitvoe-  Opleve-
contact  gesprek  bezoek   ontwerp  ring     ring
         ▲ (JE BENT HIER)
```

### Visuele kenmerken:
- **Doorlopende lijn** die alle stappen verbindt (de "flow")
- **Cirkels/vierkanten** als knooppunten op de lijn
- Voltooide stappen (vóór active): **gevulde blauwe** lijn + punt
- Actieve stap: **groot blauw vierkant** (past bij Zolderpunt's hoekige stijl)
- Toekomstige stappen: **grijze lijn + open punt**
- Labels staan **onder** de lijn, niet in blokken
- Klikbaar: selectie toont detail eronder (zoals nu)

### Detail:
- De lijn is een `div` met `h-[3px]` achter de knooppunten (absolute positioned)
- Twee lagen: grijze basislijn + blauwe overlay tot aan de actieve stap
- Knooppunten zijn `w-5 h-5` vierkanten (border-radius 0, past bij brand)
- Geselecteerde stap krijgt een grotere marker (`w-7 h-7`) + label in bold

---

| Bestand | Actie |
|---|---|
| `src/slides/Slide2A.tsx` | Timeline-blokken vervangen door progress-lijn met knooppunten en labels |


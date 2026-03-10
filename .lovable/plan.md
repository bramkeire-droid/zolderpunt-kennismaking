

# Wijzigingen: Slide 2A groter/visueler + Slide 7 tekst verwijderen

## 1. Slide 2A — Groter en visueler met duidelijke foto-weergave

**Huidige situatie**: Kleine horizontale blokjes met een apart modal voor foto's. Te klein, onduidelijk hoe foto's getoond worden.

**Nieuwe aanpak**: 
- De tijdlijn-stappen worden groter weergegeven, meer visuele impact
- Bij klik op een stap: het onderste deel van de slide toont direct de beschrijving + foto's **inline onder de tijdlijn** (geen modal/overlay). Een groot beeldvlak verschijnt met een fade-in, de geselecteerde stap krijgt een blauw accent
- De foto's vullen een groot `aspect-video` vlak (ca. 60% van de beschikbare hoogte) met de beschrijvingstekst ernaast
- Dit maakt het visueel helder: klik op stap → foto's verschijnen direct zichtbaar op de slide, niet verstopt in een popup
- Standaard staat stap 2 (Intakegesprek) open zodat er altijd content zichtbaar is

**Layout**:
```text
┌─────────────────────────────────────────────┐
│  HOE WE SAMENWERKEN                         │
│  Van eerste contact tot oplevering          │
│                                             │
│  [01] [02■] [03] [04] [05] [06]  ← tijdlijn│
│                                             │
│  ┌──────────────────┐  Intakegesprek        │
│  │                  │  Een persoonlijk      │
│  │   FOTO/BEELD     │  videogesprek om...   │
│  │                  │                       │
│  └──────────────────┘                       │
│                                             │
│  Vandaag zijn we bij stap 2.                │
└─────────────────────────────────────────────┘
```

## 2. Slide 7 — Verwijder tekst optie 3

Verwijder de `label` regel `'→ Bram stuurt een mail met 3 keuzevragen'` van de derde optie ("Nog even nadenken").

## Bestanden

| Bestand | Wijziging |
|---|---|
| `Slide2A.tsx` | Volledig herschrijven: grotere stappen, inline foto-weergave onder tijdlijn i.p.v. modal |
| `Slide7.tsx` | Verwijder label van optie 3 |


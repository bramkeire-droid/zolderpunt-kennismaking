# Transcript-Analyse Architectuur

## Flow

```
TRANSCRIPT (Leexi / .md upload)
       │
       ▼
┌──────────────────────────────────────┐
│  FASE 1: EXTRACTIE                   │
│  12 vragen aan het transcript        │
│                                      │
│  Resultaat:                          │
│  - Wensen (must-have / nice-to-have) │
│  - Zorgen (blokkerend / belangrijk)  │
│  - Budget-spanning                   │
│  - Beslisdynamiek                    │
│  - Citaten met emotie                │
│  - Eigen keuzes van de klant         │
└───────────────┬──────────────────────┘
                │
                ▼
┌──────────────────────────────────────┐
│  FASE 2: CONVERSIE + VLECHTEN       │
│                                      │
│  Elke wens/zorg → 4-stap formule:   │
│  SPIEGEL → ERKEN → TOON HOE →      │
│  BEVESTIG                            │
│                                      │
│  Verweven tot 4 lopende tekstvelden  │
└───────────────┬──────────────────────┘
                │
                ▼
         ┌──────────────┐
         │  PDF RAPPORT  │
         └──────────────┘
```

Fallback: als er geen transcript is (< 200 tekens), single-pass op basis van notities en formulierdata.

---

## Fase 1: De 12 vragen

| # | Vraag | Wat het oplevert |
|---|-------|-----------------|
| 1 | Wat is de ECHTE reden — niet het project maar het verlangen? | Emotionele drijfveer |
| 2 | Wat moet absoluut (must-have) en wat is leuk (nice-to-have)? | Geprioriteerde wensen met eigen woorden |
| 3 | Waar maakt de klant zich zorgen over — uitgesproken en impliciet? | Zorgen met ernst-niveau |
| 4 | Hoe zit het budget? Spanning? Besproken oplossing? | Budget-realiteit |
| 5 | Wie beslist? Concurrentie? Hoe gevonden? Tijdsdruk? | Beslisdynamiek |
| 6 | Welke technische punten raken de klant direct? | Klant-relevante techniek |
| 7 | Welke uitspraken tonen emotie of overtuiging? | Citaten met emotie-label |
| 8 | Wat zegt de klant niet maar bedoelt wel? | Onuitgesproken behoeften |
| 9 | Welke keuze heeft de klant zelf al gemaakt? | Te valideren prioriteit |
| 10 | Wat is de concrete volgende stap? | Afgesproken actie |
| 11 | Waarin onderscheiden wij ons al t.o.v. concurrentie? | Eigen sterkte |
| 12 | Wat zou de klant doen twijfelen? | Risico-factoren |

---

## Fase 2: De conversieformule

### Per wens:

| Stap | Wat | Psychologisch effect |
|------|-----|---------------------|
| SPIEGEL | Herhaal in hun eigen woorden | "Hij heeft geluisterd" |
| ERKEN | Bevestig dat hun keuze logisch is | "Mijn gevoel klopt" |
| TOON HOE | 1 concreet detail van de aanpak | "Er is al een plan" |
| BEVESTIG | Kort: dit is haalbaar | "Ik hoef niet bang te zijn" |

### Per zorg:

| Stap | Wat | Psychologisch effect |
|------|-----|---------------------|
| SPIEGEL | Benoem de zorg expliciet | "Hij verzwijgt niets" |
| ERKEN | Zeg dat het logisch is | "Mijn zorgen zijn normaal" |
| TOON HOE | Hoe we het aanpakken | "Er is een antwoord" |
| BEVESTIG | Geef zekerheid | "Ik kan hierop vertrouwen" |

### Vlechten tot rapport-velden:

| Rapport-veld | Samengesteld uit |
|-------------|-----------------|
| Jullie verhaal (situatie) | Situatie-spiegels verweven |
| Wat jullie voor ogen hebben (verwachtingen) | Wens: spiegel + erken + bevestig |
| Wat we samen vaststelden (besproken) | Wens: toon hoe + Zorg: toon hoe |
| Aandachtspunten | Zorg: spiegel + erken + toon hoe + bevestig |

---

## Taalregister

**De toon:** een vakman die het snapt. Warm, direct, begripvol. Niet koud/technisch, niet wollig/salesy.

| Niet (wollig) | Wel (begripvol) |
|--------------|-----------------|
| "Jullie dromen van een gezamenlijke slaapkamer" | "Jullie willen een eigen slaapkamer. Samen." |
| "Een fantastisch canvas om iets unieks te creeren" | "128m2 die er al is — het moet alleen nog gebeuren." |
| "Naadloze afwerking die rust uitstraalt" | "Strak afgewerkt, zoals de rest van jullie huis." |
| "Een volledige transformatie" | "Van ruwbouw naar leefruimte." |

**Verboden woorden:** dromen, oase, canvas, transformatie, uniek, naadloos, uitstralen, ontdekken, beleven

**Toets:** "Zou deze zin ook kloppen voor een willekeurige andere klant?" Als ja → herschrijf met specifiek detail.

---

## Technische implementatie

- Edge function: `supabase/functions/generate-rapport-summary/index.ts`
- Fase 1: Aparte API-call met extractie-tool (12 vragen)
- Fase 2: Aparte API-call met synthese-tool (conversieformule)
- Fallback: Single-pass met verbeterd taalregister als er geen transcript is
- Model: Gemini 3 Flash Preview via Lovable Gateway

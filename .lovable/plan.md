

# Fix: Transcript niet verwerkt in rapport

## Root cause

Slide9's `useEffect` checkt `hasRapport` (`!!lead.rapport_tekst`). Als er al eerder een rapport gegenereerd is (zonder transcript), wordt de AI niet opnieuw aangeroepen — zelfs als er nu wél een transcript is geüpload.

Slide8 slaat het transcript op via `updateLead({ transcript })` maar wist niet het oude rapport, waardoor Slide9 denkt dat alles al klaar is.

## Fix

### 1. `Slide8.tsx` — Wis oud rapport bij "Rapport genereren"
Bij klik op de knop, wis `rapport_tekst`, `rapport_highlights` en `waarde_tekst_ai` zodat Slide9 opnieuw genereert:
```typescript
updateLead({ 
  transcript: combined,
  rapport_tekst: '',
  rapport_highlights: '',
  waarde_tekst_ai: '',
});
```

### 2. `Slide9.tsx` — Hergenerate-knop toevoegen
Voeg een "Opnieuw genereren" knop toe zodat de gebruiker het rapport kan hergenereren als het resultaat niet goed is. Dit reset `rapport_tekst` en triggert de `useEffect` opnieuw.

Daarnaast: verander de `useEffect` dependency om te reageren op wijzigingen in `lead.transcript`:
```typescript
useEffect(() => {
  if (hasRapport || isGenerating) return;
  // ... generate
}, [lead.transcript]);
```

## Bestanden

| Bestand | Wijziging |
|---|---|
| `Slide8.tsx` | Wis rapport-velden bij navigatie naar slide 9 |
| `Slide9.tsx` | Dependency op `lead.transcript`, hergenerate-knop |


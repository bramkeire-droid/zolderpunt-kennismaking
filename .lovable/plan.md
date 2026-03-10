

# Plan: Transcript doorvoeren naar rapport-generatie

## Probleem
Slide 8 slaat het transcript en aanvullingen op in lokale React state. Bij navigatie naar Slide 9 is alles weg. Slide 9 gebruikt `lead.gesprek_notities` voor AI-generatie, maar dat bevat alleen handmatige notities uit de gespreksfase — niet het geüploade transcript.

## Oplossing

### 1. `SessionContext.tsx` — Nieuw veld `transcript`
Voeg `transcript` (string) toe aan `LeadData` en `defaultLeadData`. Dit slaat het geüploade transcript + aanvullingen op.

### 2. `Slide8.tsx` — Opslaan in sessie bij "Rapport genereren"
Bij klik op de knop: combineer transcript + aanvullingen, sla op via `updateLead({ transcript: combined })`, en navigeer dan pas naar slide 9.

### 3. `Slide9.tsx` — Gebruik transcript voor AI-generatie
Pas de `generate` functie aan:
- Stuur `lead.transcript` mee naar de edge function als er een transcript beschikbaar is
- Het transcript is de primaire bron; `gesprek_notities` is fallback
- De `extract_highlights` en `summarize_notes` calls gebruiken het transcript als input

### 4. `generate-value-text/index.ts` — Accepteer transcript parameter
- Accepteer optioneel `transcript` veld in de request body
- Als `transcript` aanwezig is, gebruik dat als primaire bron voor `summarize_notes` en `extract_highlights` (in plaats van alleen `gesprek_notities`)
- Combineer transcript + gesprek_notities wanneer beide beschikbaar

### 5. `Slide10.tsx` — Rapport highlights uit transcript
De `rapport_highlights` worden nu al gegenereerd op Slide 9 vanuit het transcript → geen extra wijziging nodig.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `SessionContext.tsx` | `transcript` veld toevoegen aan LeadData |
| `Slide8.tsx` | Transcript + aanvullingen opslaan in sessie bij navigatie |
| `Slide9.tsx` | Transcript meesturen naar AI calls |
| `generate-value-text/index.ts` | Transcript parameter accepteren en gebruiken |


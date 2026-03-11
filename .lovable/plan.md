

# Plan: AI-gedreven verhalend rapport in plaats van data-mapping

## Het probleem

De PDF "Samenvatting gesprek" pagina doet nu een 1-op-1 mapping van ruwe inputvelden:
- **Situatie** → `"Onafgewerkte zolder van ±35m²."`  (hardcoded template)
- **Wat jij voor ogen hebt** → `"Bergingruimte + master bedroom"` (letterlijk uit formulier)
- **Besproken onderdelen** → bullet list van technische termen
- **Aandachtspunten** → zelfde lijst nog een keer

Geen enkel stuk tekst komt uit het transcript of is door AI verwerkt tot iets menselijks. De klant herkent hier niets van het echte gesprek in.

## De oplossing

Eén nieuwe AI-call die ALLE beschikbare data combineert (formuliervelden + gespreksnotities + transcript) en daar gestructureerde, verhalende tekst van maakt voor de PDF.

### 1. Nieuwe edge function: `generate-rapport-summary`

Ontvangt het volledige dossier als input en retourneert via tool calling een gestructureerd object:

```text
{
  situatie_tekst:     "Jullie woning in [adres] heeft een onafgewerkte zolder van ±35m² 
                       die momenteel als opslagruimte dient..."
  
  verwachtingen_tekst: "Jullie dromen van een combinatie van bergingruimte en een 
                        ruime master bedroom waar jullie 's ochtends..."
  
  besproken_tekst:     "Tijdens ons gesprek bespraken we de mogelijkheden voor isolatie, 
                        binnenafwerking met gyproc, een nieuwe vloer..."
  
  aandachtspunten_tekst: "Een belangrijk punt is de huidige staat van de dakconstructie. 
                          We bekijken dit tijdens het plaatsbezoek..."
}
```

De AI-prompt instrueert:
- Schrijf in de tweede persoon ("jullie", "je")
- Warm, persoonlijk, maar professioneel
- Gebruik concrete details uit het transcript (namen, specifieke wensen, zorgen)
- Geen technisch jargon — vertaal naar begrijpelijke taal
- Elke sectie max 3-4 zinnen
- De klant moet het gevoel krijgen: "ze hebben geluisterd, ze begrijpen wat ik wil"

### 2. SessionContext — nieuwe velden

Vier nieuwe string-velden op `LeadData`:
- `rapport_situatie_ai`
- `rapport_verwachtingen_ai`  
- `rapport_besproken_ai`
- `rapport_aandachtspunten_ai`

### 3. Slide9 — roept de nieuwe functie aan

Vervangt de huidige 3 losse AI-calls door 1 call naar `generate-rapport-summary` die het volledige dossier meestuurt. Slaat de 4 velden + `waarde_tekst_ai` op in de sessie.

### 4. ReportDocument & Slide10 — gebruikt AI-teksten

`mapLeadToReportData` mapt de nieuwe AI-velden naar `ReportData`. De `SamenvattingPage` toont nu de verhalende teksten in plaats van ruwe data.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/generate-rapport-summary/index.ts` | Nieuwe edge function met tool calling |
| `src/contexts/SessionContext.tsx` | 4 nieuwe velden |
| `src/slides/Slide9.tsx` | Eén AI-call i.p.v. drie, slaat verhalende velden op |
| `src/components/report/reportTypes.ts` | Velden aanpassen naar verhalende teksten |
| `src/components/report/ReportDocument.tsx` | SamenvattingPage toont narratieve tekst |
| `src/slides/Slide10.tsx` | mapLeadToReportData gebruikt AI-velden |
| `src/pages/Dossiers.tsx` | Nieuwe velden meeladen |


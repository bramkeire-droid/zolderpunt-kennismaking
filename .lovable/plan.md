

# Sales Analyse Feature + Homepage Grid Redesign

## Overzicht

Drie onderdelen:
1. **Homepage coaching tips** herdesignen naar grid met rechthoekige kaarten
2. **Nieuw tabblad "Sales Analyse"** toevoegen in Dossiers met gedetailleerde salesanalyse
3. **Nieuwe edge function** `generate-sales-analysis` met de aangeleverde salespsycholoog-prompt

## Wat verandert

### 1. Homepage Grid (CoachingSuggestions.tsx)

De huidige verticale lijst wordt een horizontaal grid met 3 kolommen:
- **Dossier-tips**: blauwe kaart met Lightbulb icon
- **Patroonanalyse**: donkere kaart met TrendingUp icon
- **Algemene tips**: lichte kaart met Sparkles icon

Elke categorie krijgt een eigen rechthoekige kaart. `max-w-md` wordt `max-w-4xl` met `grid grid-cols-1 md:grid-cols-3 gap-4`.

### 2. Edge function: `generate-sales-analysis`

Nieuw bestand `supabase/functions/generate-sales-analysis/index.ts`:
- Haalt `gesprek_notities` + AI-samenvattingen op uit de meegegeven leads als "transcripts"
- Past de volledige aangeleverde salespsycholoog-prompt toe (de 3-lagen analyse: Micro, Meso, Macro)
- Output via tool-calling in gestructureerd JSON:
  - `diagnose` (profielschets, emotionele shift, bottleneck)
  - `prestatie_dashboard` (array van dimensie/score/bewijs)
  - `actiepunten` (top 10 met categorie, observatie, impact, fix)
  - `one_thing` (de belangrijkste gedragsverandering)
- Registratie in `supabase/config.toml` met `verify_jwt = false`

### 3. Tabblad "Sales Analyse" in Dossiers (nieuw component)

Nieuw component `src/components/SalesAnalysis.tsx`:
- Wordt als 3e tab toegevoegd in `Dossiers.tsx` naast "Overzicht" en "Statistieken"
- Bevat een "Analyse genereren" / refresh knop
- Toont de volledige output:
  - Diagnose-kaart bovenaan
  - Prestatie Dashboard als tabel (dimensie, score /10, bewijs)
  - Top 10 actiepunten als uitklapbare accordion items
  - "One Thing" highlight kaart onderaan
- Cache in localStorage (apart van coaching tips)

### 4. Aanpassingen bestaande bestanden

| Bestand | Wijziging |
|---|---|
| `src/components/CoachingSuggestions.tsx` | Grid layout, 3 kaarten naast elkaar, breder max-width |
| `src/pages/Dossiers.tsx` | 3e tab "Sales Analyse" toevoegen |
| `src/components/SalesAnalysis.tsx` | Nieuw component |
| `supabase/functions/generate-sales-analysis/index.ts` | Nieuwe edge function met salespsycholoog-prompt |
| `supabase/config.toml` | Function registratie toevoegen |
| `src/App.tsx` | max-width aanpassing homepage container |

### Technische details

**Edge function prompt**: De volledige prompt uit `Prompt_sales_analyse.txt` wordt als system prompt in de edge function ingebakken. De user message stuurt alle leads met `gesprek_notities`, `rapport_*_ai` velden als "transcripts". Bij meerdere leads wordt Macro-laag geactiveerd (conditionele logica zit al in de prompt).

**Structured output schema** voor de sales-analyse:
```text
diagnose: { profielschets, emotionele_shift, bottleneck }
prestatie_dashboard: [{ dimensie, score, bewijs }]
actiepunten: [{ nummer, titel, categorie, observatie, impact, fix }]
one_thing: string
```

**Homepage samenvatting**: De bestaande coaching tips edge function blijft ongewijzigd. De homepage toont alleen de coaching tips (korte grid), niet de volledige sales-analyse. De gedetailleerde analyse is exclusief voor het Sales Analyse tabblad.


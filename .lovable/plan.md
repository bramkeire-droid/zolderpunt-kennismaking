
## Doel
Het dossier-overzicht (`src/pages/Dossiers.tsx`) opsplitsen in 6 verticaal gestapelde categorieën, met automatische classificatie én manuele overrides (drag-and-drop + acties-menu).

## Categorieën (in deze volgorde)
1. Nieuwe lead
2. Telefoongesprek gehad
3. Video intake gehad
4. Plaatsbezoek gehad
5. Project afgewezen
6. Project goedgekeurd

## Automatische detectie
Bepaald per lead in deze prioriteitsvolgorde (eerste die matcht wint), tenzij er een manuele override staat:

| Categorie | Detectieregel |
|---|---|
| Project goedgekeurd | `leads.status` ∈ {`afgesloten`, `uitvoering`} |
| Project afgewezen | `leads.status` = `verloren` |
| Plaatsbezoek gehad | `pre_intake.plaatsbezoek_scheduled_at` in het verleden **of** `leads.status` = `plaatsbezoek` |
| Video intake gehad | `pre_intake.videocall_scheduled_at` in het verleden, of `pre_intake.locked_at` gezet, of transcript-analyse bestaat (`analysisMap[lead.id]`), of `leads.status` ∈ {`intake`} |
| Telefoongesprek gehad | `pre_intake` bestaat voor deze lead, of `leads.gesprek_datum` gezet, of `leads.status` ∈ {`telefoongesprek`, `intake_gepland`} |
| Nieuwe lead | fallback |

Detectie gebeurt client-side in `Dossiers.tsx` op basis van bestaande `leads` + `preIntakeMap` + `analysisMap` — geen extra queries.

## Manuele override
Nieuwe kolom `leads.category_override text NULL`. Als gezet, overschrijft die de auto-detectie. Waardes: `nieuw` | `telefoon` | `video` | `plaatsbezoek` | `afgewezen` | `goedgekeurd` | `null` (= auto).

Twee manieren om te wijzigen:
- **Drag-and-drop**: sleep een rij naar een andere sectie → schrijft `category_override` weg via `supabase.from('leads').update({ category_override: <key> })`. Implementatie met native HTML5 drag-and-drop (geen extra dependency).
- **Acties-menu** (bestaande `DropdownMenu` per rij): submenu "Verplaatsen naar…" met de 6 categorieën + "Automatisch bepalen" (zet override op `null`).

## UI-structuur
Vervang de huidige enkele `<Table>` door 6 collapsible secties onder elkaar. Elke sectie:
- Header met categorienaam, count-badge, chevron (open/dicht, standaard open).
- Zelfde `<Table>`-layout als nu (kolommen, sortering, acties, portal, PDF, etc. blijven identiek).
- Lege secties tonen een dun grijs "leeg"-rijtje maar blijven zichtbaar als drop-target.
- Drop-target visuele highlight bij dragover.

Zoekbalk en sortering blijven globaal en werken binnen elke sectie.

## Technische wijzigingen

**Migratie** (schema):
```sql
ALTER TABLE public.leads ADD COLUMN category_override text NULL;
```
(Geen GRANT/policy-wijziging nodig — bestaande policies dekken de kolom.)

**Bestanden**:
- `src/pages/Dossiers.tsx`:
  - Helper `resolveCategory(lead, preIntake, hasAnalysis)` die override respecteert, anders auto-detecteert.
  - `groupedByCategory` memo (`filtered` → `Record<CategoryKey, Lead[]>`).
  - Nieuwe render: sectielijst i.p.v. één tabel. Elke sectie hergebruikt bestaande rij-render (extractie naar interne `renderRow` functie).
  - Drag-and-drop handlers (`onDragStart` op `<TableRow>`, `onDragOver`/`onDrop` op sectiecontainer) + `updateCategory(leadId, key)` helper met toast.
  - Acties-dropdown: extra `DropdownMenuSub` "Verplaatsen naar…".
- `src/integrations/supabase/types.ts`: wordt automatisch geregenereerd na migratie.

**Niet aangeraakt**: statistieken- en sales-analyse-tabs, portal, PDF-download, bestaande STATUS_CONFIG (blijft voor de status-badge in de rij).

## Out of scope
- Kanban-weergave (blijft tabelrijen per sectie).
- Wijzigen van `leads.status`-waardes bij versleep (override is een aparte kolom, laat status ongemoeid).



# Plan: 4 Correcties

## 1. Adres coördinaten — database kolommen toevoegen

**Probleem**: `adres_lat` en `adres_lng` bestaan in de frontend LeadData type maar ontbreken in de database. Ze worden dus nooit opgeslagen en bij het heropenen van een dossier is de kaart altijd leeg.

**Oplossing**:
- Database migratie: `ALTER TABLE leads ADD COLUMN adres_lat numeric, ADD COLUMN adres_lng numeric`
- `useLeadSave.ts` → `leadToRow()`: velden `adres_lat` en `adres_lng` toevoegen
- `Dossiers.tsx` → `rowToLead()`: `adres_lat` en `adres_lng` uit DB row lezen i.p.v. hardcoded `null`

## 2. Slide 6 "Schilderwerk" layout fix

**Probleem**: Het "Schilderwerk niet inbegrepen" blok gebruikt `flex` layout met `flex-1` waardoor het vreemd uitrekt als airco niet actief is (neemt dan de volle breedte in maar is links uitgelijnd).

**Oplossing**: Vervang de `flex` container door een `w-full max-w-lg` container. Maak het schilderwerk-blok full-width en het airco-blok eronder (stack i.p.v. side-by-side), zodat het er altijd netjes uitziet.

## 3. Slide 4 — titel wijzigen + AI-samenvatting van notities

**Probleem**: 
- Titel moet "Klant aan het woord" worden i.p.v. "Vertel ons over jullie project"
- Gesprek_notities worden nu 1-op-1 overgenomen in het rapport. Bij lange notities past dit niet op één pagina en is het niet professioneel.

**Oplossing**:
- `Slide4.tsx`: Titel wijzigen naar "Klant aan het woord"
- `Slide9.tsx`: De rapport-generatie uitbreiden. In plaats van `Notities: ${lead.gesprek_notities}`, de notities meesturen naar de AI edge function om een verhalende samenvatting te maken.
- Edge function `generate-value-text/index.ts` uitbreiden (of een tweede endpoint) die ook de gesprek_notities kan samenvatten tot een beknopt, verhalend rapport-stuk dat op één pagina past.

## 4. Slide5B infinite loop fix (bonus)

**Probleem**: Console toont "Maximum update depth exceeded" in Slide5B. De `useEffect` op regel 83 schrijft naar `updateLead` → dit wijzigt `lead` → het effect op regel 45 herstelt lokale state → `calc()` herberekent → loop.

**Oplossing**: In de auto-save `useEffect` (regel 83): vergelijk resultaat met vorige waarden voordat `updateLead` wordt aangeroepen. Gebruik een `useRef` om het vorige result op te slaan en alleen te updaten als de waarden echt veranderd zijn.

---

| Bestand | Actie |
|---|---|
| Database migratie | `adres_lat` + `adres_lng` kolommen toevoegen |
| `src/hooks/useLeadSave.ts` | `adres_lat`, `adres_lng` in `leadToRow` |
| `src/pages/Dossiers.tsx` | Coördinaten uit DB lezen in `rowToLead` |
| `src/slides/Slide4.tsx` | Titel → "Klant aan het woord" |
| `src/slides/Slide6.tsx` | Notes layout fixen (stack) |
| `src/slides/Slide5B.tsx` | Infinite loop fixen |
| `src/slides/Slide9.tsx` | AI-samenvatting van notities |
| `supabase/functions/generate-value-text/index.ts` | Notities-samenvatting endpoint toevoegen |


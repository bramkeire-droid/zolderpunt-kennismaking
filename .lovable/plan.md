## Doel

De linkerkolom van het live-belscherm (`LiveCalling.tsx`, step `calling`) vereenvoudigen tot: klantgegevens + 2 planningsknoppen + 4 grote genummerde vraagblokken die autosaven en 1-op-1 gelinkt zijn aan bestaande `pre_intake`-kolommen. Rechterkolom (zwarte spiekkaart) en topbar blijven ongewijzigd. Wrap-up scherm blijft ongewijzigd.

## Wijzigingen

### 1. Klantgegevens-blok (behouden)
Blijft exact zoals nu: voornaam, achternaam, e-mail, telefoon, partner, adres. Autosave zoals vandaag (via `usePreIntakeSave` + `ensureLeadRow` bij afwerken).

### 2. Twee planningsknoppen naast elkaar
Vervangt de huidige volle-breedte "Videocall inplannen agenda"-knop door een grid van 2 gelijke knoppen:

- **Videocall — Plannen** → bestaande Calendly-URL (`belhouse/zolderpunt-kennismaking-met-jouw-project`), incl. huidige prefill van `name` en `email`.
- **Plaatsbezoek — Plannen** → `https://calendly.com/belhouse/plaatsbezoek-zolderpunt`, zelfde prefill.

Zelfde stijl als huidige blauwe knop (`bg-[#008CFF]`, uppercase, scherpe hoeken).

### 3. Vier grote vraagkaders (vervangt trigger, citaten, twijfels, buying committee, algemene indruk)
Elk kader = grote label met nummer + `textarea` die autosavet naar een bestaand `pre_intake`-veld (hergebruik zoals gekozen):

| # | Label            | pre_intake kolom     |
|---|------------------|----------------------|
| 1 | WAT?             | `general_impression` |
| 2 | WELKE AANNEMER?  | `buying_committee`   |
| 3 | WAAROM NU?       | `trigger_text`       |
| 4 | WELK BUDGET?     | `quick_notes`        |

**Autosave-gedrag:** typen updatet React state (via `update({...})`) → bestaande 5s-debounce in `usePreIntakeSave` schrijft naar DB. Extra: **Enter → onmiddellijke `flushSave()`** (Shift+Enter = nieuwe regel). Zo voelt Enter als "bevestigd/opgeslagen".

Kaders vullen samen de resterende hoogte, gelijk verdeeld in een `grid-rows-4` binnen `flex-1`. Groot font voor labels (Space Grotesk, uppercase, blauw nummer ervoor), body font in de textarea (Rethink Sans). Scherpe hoeken, `border-2 border-[#DDD5C5]`, focus `#008CFF`.

### 4. Verwijderd uit linkerkolom
- Trigger-input (los)
- ChipInput voor citaten (`emotional_keywords`)
- ChipInput voor twijfels (`fomu_concerns`)
- Buying-committee textarea (los)
- Algemene-indruk textarea (los)

Data in `emotional_keywords` / `fomu_concerns` blijft in het datamodel bestaan (wrap-up en AI-analyse gebruiken ze) — enkel niet meer bewerkbaar op dit scherm. Bestaande waarden gaan niet verloren.

### 5. Wat NIET verandert
- Topbar (zolderpunt-logo, timer, Naar dossiers, Afwerken, uitloggen).
- Rechterkolom met 5-fases spiekkaart.
- `wrap-up` scherm en alle wrap-up velden.
- `select-lead` scherm.
- Datamodel `PreIntakeData`, edge functions, DB-schema.
- Autosave-mechaniek in `usePreIntakeSave` (5s debounce blijft; we roepen extra `flushSave` op Enter).

## Technisch (1 bestand)

Enkel `src/pages/LiveCalling.tsx` bewerken. Nieuwe kleine helper-component `BigQuestionBox` binnen hetzelfde bestand met props `n`, `label`, `value`, `onChange`, `onEnterFlush`, `placeholder`. `flushSave` uit `usePreIntakeSave` wordt aangeroepen bij Enter (zonder Shift). Geen nieuwe dependencies, geen nieuwe files, geen migratie.

## Validatie
- Typecheck via automatische build.
- Manueel: openen live-belscherm, controleren dat 2 knoppen tonen, 4 kaders zichtbaar, Enter in een kader → toast/opslag, waarde zichtbaar bij herladen dossier.

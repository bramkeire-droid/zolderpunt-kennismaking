# Plan: Dossierbeheer + statusflow + autosave-discipline

Zes samenhangende fixes rond de dossierlijst, de telefoongesprek-flow en de autosave.

## 1. Correcte statusflow (Nieuw → Telefonisch → Intake)

**Regels:**
- Nieuwe lead (insert): `status='nieuw'`. Pas wanneer telefoongesprek volledig is afgesloten (wrap-up bevestigd) → `telefoongesprek`.
- Intake-videocall: status `intake` wordt enkel gezet wanneer in slide 10 (rapport) op "Rapport definitief / klaar" geklikt wordt (rapport_gegenereerd_op gevuld).
- Autosave promoot NIETS meer (regel uit `useLeadSave.ts` weghalen). Status wordt enkel expliciet gezet op duidelijke momenten.

**Backfill:** `UPDATE leads SET status='nieuw' WHERE status='telefoongesprek' AND (voornaam='' AND achternaam='' AND email='' AND telefoon='')` (alleen lege dossiers terugzetten — ingevulde blijven 'telefoongesprek').

## 2. Geen lege en geen dubbele dossiers

**Lege blokkeren:**
- `useLeadSave.hasAnyData()` strenger maken: minimaal `voornaam` of `achternaam` of `email` of `telefoon` vereist vóór INSERT. Updates op bestaande id blijven gewoon werken (zodat autosave een al aangemaakt dossier wel blijft bijwerken).
- `handleNewLead` in `LiveCalling.tsx`: niet meer direct een lege row inserten. In plaats daarvan een tijdelijk lokaal lead-object (geen id) gebruiken; de eerste echte save (autosave/flushSave) maakt pas de row aan zodra naam/email/telefoon ingevuld is.

**Dubbel detecteren:**
- Vóór INSERT in `persistLead`: lookup op `email` (case-insensitive, niet-leeg) OR (`voornaam`+`achternaam` exact match niet-leeg) OR `telefoon` genormaliseerd.
- Indien match: dialog `MergeDuplicateDialog` met "Overschrijven & samenvoegen" of "Toch nieuw aanmaken". Bij overschrijven → UPDATE op gevonden id; lokale lead krijgt die id, niet-lege velden uit huidige sessie winnen, lege velden vallen terug op bestaande waarden.

## 3. Wrap-up: twee scenario's i.p.v. altijd videocall-blok

In `LiveCalling.tsx` wrap-up sectie "Videocall plannen":
- Twee grote keuzeknoppen bovenaan: **"Videocall ingepland"** en **"Klant neemt zelf terug contact op"**.
- Keuze opgeslagen in `pre_intake.scenario_chosen` of nieuw veld `followup_type` ('videocall' | 'klant_terug').
- Bij 'videocall': huidige date/time/meet-link/mail-blok opent.
- Bij 'klant_terug': blok blijft dicht, korte notitie-input "Wanneer + context".
- `CloseCallDialog`: check `videocall_scheduled_at` enkel als scenario='videocall'.

## 4. Telefoongesprek vanuit dossierlijst openen

**Nieuwe knop in `Dossiers.tsx` actie-kolom:** telefoon-icoon (📞) naast 📁 Open. Klik → opent `LiveCalling` direct in wrap-up modus voor dit dossier (data uit `pre_intake` + lead vooraf geladen). Indien geen `pre_intake` bestaat: open in `calling`-step met bestaande lead, zodat er alsnog ingevuld kan worden.

**Implementatie:**
- Nieuwe prop `onOpenCall(lead)` op `Dossiers`.
- In `App.tsx`: nieuwe handler die `setView('calling')` doet met een prefilled lead-id; `LiveCalling` krijgt optionele prop `initialLeadId` + `initialStep` ('calling' | 'wrap-up') om voorbij select-lead te springen.

## 5. PDF-downloadknop in dossierlijst (indien rapport bestaat)

In actie-kolom van `Dossiers.tsx`: extra knop met download-icoon, alleen zichtbaar als `lead.rapport_gegenereerd_op` gevuld is.

Klik → gebruikt dezelfde `@react-pdf/renderer` flow als in `Slide10`: render `ReportDocument` met `lead` data via `pdf().toBlob()` en triggert download (`saveAs` of blob link). Geen UI-navigatie nodig.

## 6. "Terug naar dossiers" vanuit telefoongesprek zonder dataverlies

In `LiveCalling.tsx` header (calling + wrap-up): knop **"Naar dossiers"** links bovenin.
- Indien `voornaam` + `email` ingevuld: confirm dialog "Dossier opslaan vóór je terug gaat?" → bij ja: `flushSave()` + `pre_intake` save + status='telefoongesprek' indien wrap-up al gedaan, anders blijft 'nieuw' → terug.
- Indien geen naam/email: gewoon weg zonder save (geen lege row).
- Bij later opnieuw openen uit dossierlijst (zie #4): alle ingevulde data is er nog.

## 7. Bulkacties — "Lege dossiers wissen"

**Knop "Bulkacties" rechts boven in `Dossiers.tsx`** (naast Vernieuwen) → DropdownMenu.

Eerste actie: **"Lege dossiers wissen"**.
- Selecteert leads waar ALLES leeg is: `voornaam='' AND achternaam='' AND email='' AND telefoon='' AND adres='' AND oppervlakte_m2 IS NULL AND gezocht_naar='' AND gesprek_notities='' AND notities_vooraf='' AND budget_min IS NULL AND budget_excl IS NULL AND project_feiten='[]' AND fotos='[]' AND rapport_situatie_ai='' AND rapport_tekst=''`.
- Modal toont lijst (id + created_at) met aantal → "Definitief verwijderen" knop.
- DELETE per id (RLS staat admin delete toe; gebruikers met admin-rol kunnen wissen).

## Technische details

**Files te wijzigen:**
- `src/hooks/useLeadSave.ts` — strengere `hasAnyData`, geen auto-status-promotie, dubbel-check vóór insert
- `src/pages/LiveCalling.tsx` — geen lege insert in `handleNewLead`, scenario-keuze, "Naar dossiers" knop, optionele `initialLeadId`/`initialStep` props
- `src/components/calling/CloseCallDialog.tsx` — videocall-check conditioneel
- `src/pages/Dossiers.tsx` — telefoongesprek-knop, PDF-download-knop, Bulkacties dropdown + modal
- `src/App.tsx` — nieuwe handler voor "open call from dossier"
- Nieuwe component: `src/components/MergeDuplicateDialog.tsx`
- Nieuwe component: `src/components/dossiers/BulkActionsMenu.tsx` + `CleanEmptyDossiersDialog.tsx`

**Database:**
- Geen schemawijziging strikt nodig. Optioneel: `pre_intake.followup_type text` toevoegen om scenario-keuze los van `scenario_chosen` op te slaan.
- Backfill SQL voor status (zie #1).

**Bestaande PDF-render:** hergebruik `pdf(<ReportDocument lead={...} />).toBlob()` uit `@react-pdf/renderer` (al gebruikt in Slide10).

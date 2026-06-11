## Doel
Drie samenhangende uitbreidingen in de Dossiers-omgeving:
1. **Offerte-module** in het dossieroverzicht: offertebedrag (excl. BTW) invullen en vergelijken met intake-range.
2. **A4 facturatie- & planning-bijlage** als losse PDF-download, met instelbaar bedrag, aantal weken en optioneel trapgat in de tijdlijn.
3. **Acties-dropdown** per dossier-rij i.p.v. losse iconen, zodat nieuwe functies netjes onderbracht worden.

---

## 1. Offerte-module in het dossier

**Waar:** nieuwe sectie binnen het bestaande dossier-detail (intake/dossier-view) én een korte indicator in de dossier-overzichtstabel.

**Invoer:**
- `offerte_bedrag_excl` (€, getal) — invulbaar zodra status ≥ `offerte`.
- `offerte_datum` (auto bij eerste invulling, manueel bij te passen).

**Vergelijking met intake-range (`budget_min` – `budget_max`, excl. BTW):**
- **Binnen range** → groene badge "Binnen intake".
- **Onder min** → blauwe badge met "−X% t.o.v. min".
- **Boven max** → rode badge met "+X% t.o.v. max".
- Toon ook absolute delta in €, plus de gecommuniceerde intake-range ter referentie.
- Korte interpretatieregel (bv. *"Offerte ligt 8% boven de bovenkant van de intake — bespreek meerwerk of scope-uitbreiding."*).

**In het overzicht:** extra (smalle) kolom of inline-badge bij **Status** die toont dat een offerte bedrag ingevuld is + kleur volgens vergelijking.

---

## 2. A4 facturatie- & planningsbijlage

**Aanroep:** vanuit nieuwe acties-dropdown (zie punt 3) → "Offerte-bijlage genereren". Opent een dialoog/instelscherm.

**Instellingen (in dialoog):**
- Totaalbedrag excl. BTW (pre-filled met `offerte_bedrag_excl`, plus/min in stappen van €5.000, ook vrij in te tikken).
- Aantal weken project (plus/min, 1–12).
- Checkbox **"Trapgat voorafgaand uitvoeren"** (geen aparte duur, gewoon een stap vóór het project op de tijdlijn).
- BTW-tarief (6% / 21%, default uit lead).

**Facturatieverdeling (zelfde logica als `FacturatieTimeline.tsx`):**
- Fase 1 – Voorschot 30%
- Fase 2 – Uitvoering 60%, verdeeld over N weken (gelijk per week, op vrijdag)
- Fase 3 – Oplevering 10%
- Toon zowel % als bedragen excl. en incl. BTW.

**Planning-tijdlijn op A4:**
- Horizontale tijdlijn met genummerde weken.
- Indien trapgat aangevinkt: aparte markering **vóór** week 1 met label "Trapgat" (geen weeknummering).
- Vervolgens "Week 1 … Week N" met visuele balk voor uitvoeringsperiode.
- Eindmarker "Oplevering".

**Output:** losse A4-PDF (`react-pdf`), in huisstijl (Space Grotesk / Rethink Sans, primary `#008CFF`), bestandsnaam `Zolderpunt_Offertebijlage_<Achternaam>.pdf`. Download via browser; niet automatisch toegevoegd aan het bestaande rapport.

---

## 3. Acties-dropdown per dossier

Vervang de rij iconen (FolderOpen, Phone, FileDown, Globe, CheckCircle, Trash2) door één **"Acties"-knop** met `DropdownMenu`:

Menu-items (met icoontje + label, conditioneel zoals nu):
- Dossier openen
- Telefoongesprek
- PDF rapport downloaden *(indien `rapport_gegenereerd_op`)*
- **Offerte-bijlage genereren** *(nieuw)*
- Portaal beheren
- Markeer afgesloten *(indien status ≠ afgesloten)*
- ─── separator ───
- Verwijder portaal *(indien portaal bestaat)*
- Dossier verwijderen (destructief, rood)

Smalle "Acties"-kolom met enkel een `MoreVertical`-knop per rij.

---

## Technische details

**Database (migratie):**
- `leads.offerte_bedrag_excl` `numeric`
- `leads.offerte_datum` `date`
- (Optioneel) `leads.offerte_bijlage_settings` `jsonb` om laatst gebruikte weken/trapgat te onthouden per dossier.

**Nieuwe / aangepaste bestanden:**
- `supabase/migrations/<timestamp>_offerte_velden.sql`
- `src/components/dossier/OfferteVergelijking.tsx` — invoer + vergelijking-badge (binnen detail).
- `src/components/dossier/OffertebijlageDialog.tsx` — instellingen + preview + downloadknop.
- `src/components/dossier/OffertebijlagePdf.tsx` — `@react-pdf/renderer` document (A4, facturatie + tijdlijn).
- `src/components/dossier/DossierActionsMenu.tsx` — `DropdownMenu` per rij.
- `src/pages/Dossiers.tsx` — kolom "Acties" vervangen door de nieuwe menu-component; offerte-badge toevoegen aan Status-kolom.
- Slide- of detailview waar offerte wordt ingevuld (in te passen op bestaande dossier-flow; concreet bestand bepalen tijdens implementatie a.d.h.v. waar `budget_min/max` wordt getoond).

**PDF-design (huisstijl):**
- Header met logo + "Offertebijlage – Facturatie & Planning".
- Block 1: Facturatieverdeling (3 fases, bedragen, btw-regel).
- Block 2: Tijdlijn (trapgat-marker optioneel + weekbalken + oplevering).
- Footer: klantgegevens + offertedatum + offertenr/lead-id.

**Vergelijkingslogica (samengevat):**
```
range = [budget_min, budget_max]
if offerte ∈ range          → status = "binnen"
elif offerte < budget_min   → status = "onder",  delta% = (budget_min - offerte) / budget_min
elif offerte > budget_max   → status = "boven",  delta% = (offerte - budget_max) / budget_max
```
Kleuren resp. groen / blauw / rood; tekstuele interpretatie automatisch.

---

## Uit scope
- Automatische opname in het bestaande rapport-PDF (expliciet gekozen voor losse download).
- Aparte instelbare trapgat-duur (trapgat is enkel een tijdlijn-stap, geen weken).

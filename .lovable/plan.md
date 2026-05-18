
## Antwoord op je vragen

**1. Waar staat de gemapte data van het telefoongesprek?**
Die data zit in twee tabellen:
- `pre_intake` — alles wat tijdens het korte telefoongesprek wordt ingevuld (trigger, emotionele keywords, FOMU-zorgen, kwalificatie, scenario, beloofde foto's/metingen, quick notes, ...).
- `transcript_analyses` — de AI-analyse van het opgenomen transcript (ai_analysis, coaching, match_scores).

Op dit moment wordt die data nergens getoond als je een dossier opent voor het intakegesprek. Je ziet enkel de iconen (📞 / 🤖) in de Dossier-tabel, maar je springt direct naar Slide0A met lege velden. Er is dus **geen briefing-laag** tussen "dossier openen" en "intake starten".

**2. Status "intake" klopt niet**
De `status` kolom op `leads` heeft één lineaire enum (`intake → plaatsbezoek → offerte → uitvoering → afgesloten → verloren`). Er is geen onderscheid tussen *"heeft enkel telefoongesprek gehad"* en *"intakegesprek is doorlopen"*. Default is altijd `intake`, ook voor een lead die alleen de telefoon-fase deed.

---

## Plan

### A. Briefing-scherm vóór intake

Nieuw scherm `IntakeBriefing` dat verschijnt wanneer je een dossier opent via de Dossier-tabel **als er een `pre_intake` bestaat**. Eén compact overzicht, gegroepeerd:

- **Klant** — naam, telefoon, e-mail, adres, regio
- **Trigger & emoties** — `trigger_text`, `emotional_keywords` (chips), `impression_tags`
- **FOMU-zorgen** — lijst chips uit `fomu_concerns`
- **Vragen die de klant stelde** — alle `questions_raised` waar `raised=true` met de notitie
- **Kwalificatie** — 4 booleans (in regio / echte zolder / eigenaar / beslisser) als groen/rood badges
- **Beloofd door klant** — foto's beloofd, meting beloofd, deadline
- **Scenario & afspraak** — gekozen scenario, videocall datum, meet link
- **AI-analyse (indien aanwezig)** — samenvatting uit `transcript_analyses.ai_analysis` + coaching feedback in collapsible
- **Quick notes** — vrije tekst onderaan

Twee knoppen onderaan: **"Start intakegesprek"** (→ Slide0A) en **"Terug naar dossiers"**.

Als er géén `pre_intake` bestaat → briefing overslaan, direct naar Slide0A (huidig gedrag).

### B. Statusmodel opsplitsen

Nieuwe enum-waarden voor `leads.status`:

```text
nieuw            → lead aangemaakt, nog niets gebeurd
telefoongesprek  → pre_intake afgerond
intake_gepland   → afspraak intake staat
intake           → intakegesprek doorlopen (slides ingevuld)
plaatsbezoek
offerte
uitvoering
afgesloten
verloren
```

- Default voor nieuwe leads wordt `nieuw` i.p.v. `intake`.
- Auto-promotion via app-logica (geen DB triggers):
  - bij opslaan van `pre_intake` → status naar `telefoongesprek` (als nog `nieuw`)
  - bij eerste save van een intake-slide (Slide0A+) → status naar `intake`
- Dossier-tabel: status-label krijgt eigen kleur per fase (telefoongesprek = grijs/blauw, intake = primair blauw, etc.) zodat je in één oogopslag ziet wie waar zit.
- Filter-chips bovenaan Overzicht-tab: *Alle / Telefoon / Intake / Lopend / Afgesloten*.

### C. UI-cleanup Dossier-tabel

- Iconen 📞 (Phone) en 🤖 (Bot) blijven, maar krijgen tooltip met datum laatste call/analyse.
- Status-kolom wordt prominenter (badge i.p.v. tekst-uppercase).

---

## Technische details

**DB-migratie**
- `leads.status` is `text` — geen enum-wijziging nodig, alleen `STATUS_LABELS` map en default uitbreiden. Migratie alleen voor de default-wijziging op de kolom.

**Nieuwe files**
- `src/components/IntakeBriefing.tsx` — read-only briefing view, krijgt `leadId` als prop, laadt `pre_intake` + `transcript_analyses` zelf.
- Hook in `App.tsx`: bij `onOpenLead` eerst checken of pre_intake bestaat → state `briefingLeadId` → briefing rendert i.p.v. slides; "Start intake" verwijdert briefing-state.

**Aangepaste files**
- `src/pages/Dossiers.tsx` — `STATUS_LABELS` uitbreiden, badge-styling per status, filter-chips, default status verwijderen uit `rowToLead` (gewoon `row.status`).
- `src/hooks/usePreIntakeSave.ts` — na succesvolle save → indien `lead.status === 'nieuw'`, update naar `'telefoongesprek'`.
- `src/hooks/useLeadSave.ts` — bij eerste save vanuit intake-slides → indien status `nieuw` of `telefoongesprek`, update naar `'intake'`.

**Geen wijzigingen aan** edge functions, portal, of rapport-flow.

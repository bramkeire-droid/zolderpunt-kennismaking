## Doel

Drie nieuwe slides toevoegen aan de gesprek-flow rond een centraal "vragencluster"-concept: de klant kiest aan het begin welke vragen relevant zijn, die selectie bepaalt wat verderop in het gesprek wordt herhaald.

## Nieuwe slides

### Slide 2D — Vragenkiezer (interactief)
Komt **tussen huidige slide 2 (`2B` De agenda) en huidige slide 3 (`0A2`)**.

- Grote titel bovenaan: **"Wat willen wij vandaag te weten komen?"**
- 3 kolommen naast elkaar, elk met een clustertitel en 3 of 4 klikbare vragen-kaarten:
  - **Cluster 1 — Wat kan er bij ons?** (3 vragen: haalbaarheid, risico's, materialen)
  - **Cluster 2 — Wat gaat dit ons kosten?** (3 vragen: budget, timing, betaling)
  - **Cluster 3 — Hoe gaan jullie te werk?** (4 vragen: wie zijn jullie, verloop, garanties, aanspreekpunt)
- Kaders zijn aan-/uitklikbaar (multi-select). Geselecteerde kaders krijgen een visuele "opgelicht" stijl: primary-blauwe rand, lichte achtergrond, subtiele schaduw.
- Stijl: lichte achtergrond (default `SlideLayout`), grote leesbare typografie geschikt voor videogesprek, chip/badge per kaart met het vraagnummer.

### Slide 2E — Onderzoeksagenda (read-only)
Komt direct **na 2D**.

- Titel bovenaan: **"Dit gaan we vandaag onderzoeken."**
- Toont enkel de op 2D geselecteerde vragenkaders, in dezelfde visuele stijl maar zonder klik-interactie.
- Layout schaalt automatisch:
  - 1–2 selecties → grote kaders, gecentreerd
  - 3–4 selecties → 2 kolommen
  - 5+ selecties → 3 kolommen (zoals op 2D)
- Als er niets geselecteerd is: toon vriendelijke leeg-staat ("Geen specifieke vragen geselecteerd — we doorlopen het standaard gesprek.").

### Slide 5C — Vragenrecap "Is alles duidelijk?"
Komt **na het calculator-resultaat (`5B`) en voor het stappenplan (`2A`)**.

- Titel bovenaan: **"Is alles duidelijk?"**
- Toont opnieuw dezelfde geselecteerde kaders als op 2E.
- Per kaart een klein toggle/checkbox-icoon waarmee de verkoper kan markeren of de vraag effectief beantwoord is tijdens het gesprek (visuele check, alleen voor de verkoper).
- Korte ondertitel: "Vink aan wat we al besproken hebben. Niet aangevinkt? Dan pakken we het nu nog even op."

## Statebeheer

De selectie + beantwoord-status wordt opgeslagen op het lead-object zodat het over slides heen consistent blijft en bij heropenen van een dossier behouden blijft.

Nieuw veld op `LeadData`:

```ts
gespreksvragen: {
  selected: string[];          // ids van gekozen vragen, bv. ['c1-1','c2-3']
  beantwoord: string[];        // ids die als beantwoord zijn aangevinkt op 5C
}
```

Default: `{ selected: [], beantwoord: [] }`.

## Technische wijzigingen

1. **`src/contexts/SessionContext.tsx`**
   - `SlideId` uitbreiden met `'2D' | '2E' | '5C'`.
   - `SLIDE_ORDER` wordt:
     `['0A','0B','1','2B','2D','2E','0A2','2C','3','4','5','5B','5C','6','2A','7','8','9','10']`
   - `SLIDE_MODES`: `2D`, `2E`, `5C` → `'gesprek'`.
   - `LeadData` + `defaultLeadData` uitbreiden met `gespreksvragen`.

2. **Centrale data: `src/data/gespreksvragen.ts`** (nieuw)
   - Eén array met de 3 clusters en 10 vragen (id, nummer, korte titel, sub-tekst, cluster-meta) zodat 2D/2E/5C dezelfde bron gebruiken.

3. **Nieuwe slides**
   - `src/slides/Slide2D.tsx` — interactieve kiezer.
   - `src/slides/Slide2E.tsx` — read-only overzicht van selectie.
   - `src/slides/Slide5C.tsx` — recap met "beantwoord" toggle.

4. **`src/App.tsx`**
   - Imports + `SLIDE_COMPONENTS` mapping uitbreiden met `2D`, `2E`, `5C`.

5. **`src/hooks/useLeadSave.ts`**
   - `leadToRow` aanvullen met `gespreksvragen` zodat het wordt meegestuurd richting de database.

6. **Database (Lovable Cloud)**
   - Migratie: kolom `gespreksvragen jsonb default '{"selected":[],"beantwoord":[]}'::jsonb` toevoegen aan tabel `leads`.

## Visuele stijl

- Default `SlideLayout` (witte achtergrond) — past bij de "werk"-slides 3/4/5.
- Kaart-stijl: `bg-card`, `border border-border`, ruime padding, `text-2xl` titel + `text-lg` ondertekst (binnen de 1920×1080 schaal goed leesbaar in videogesprek).
- Geselecteerde kaart: `border-primary border-2`, `bg-primary/5`, lichte schadow + nummerbadge in `bg-primary text-primary-foreground`.
- Clustertitel: `text-xl font-bold` boven de kolom + dunne accentlijn in primary.
- Hover-state op klikbare kaarten op 2D voor duidelijke feedback.

## Verwacht eindresultaat

De gesprek-modus toont 14 slides in de navigatiebalk in plaats van 11. De verkoper kan vooraan dynamisch sturen welke onderwerpen vandaag aandacht krijgen, en op het einde van het commerciële gedeelte controleren of elke gekozen vraag effectief beantwoord is.

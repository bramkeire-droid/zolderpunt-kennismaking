## Probleem

Op het live-belscherm domineren de 4 fase-kolommen (script, vragen, tips) + de oranje anticipatie-strook visueel het scherm. Het notitieblok onderaan — net dát wat tijdens het gesprek ingevuld móét worden — is een dun strookje van ~140 px hoog met 5 mini-velden. De gebruiker kijkt naar de tekst i.p.v. te schrijven.

## Doelstelling

Visuele hiërarchie omdraaien: **invulvelden zijn het hoofdgerecht, script is referentie.**

## Aanpak

### 1. Layout omkeren — notitieblok als hoofdkolom

Nieuw grid op `step === 'calling'`:

```text
┌─────────────────────────────────────────────────────────────┐
│  Topbar (timer, lead, klantgegevens-inline, sluit-knop)      │
├──────────────────────────────────────┬──────────────────────┤
│                                       │                      │
│   NOTITIEBLOK (links, ~65% breed)     │  SCRIPT RAIL        │
│   ───────────────                     │  (rechts, 35%)      │
│   • De trigger          [groot input] │  Fase 1 ▾           │
│   • Letterlijke citaten [chip area]   │  Fase 2 ▾           │
│   • Twijfels/zorgen     [chip area]   │  Fase 3 ▾           │
│   • Wie beslist mee     [textarea]    │  Fase 4 ▾           │
│   • Algemene indruk     [chips+text]  │  ⚠ Anticipatie ▾    │
│                                       │                      │
└──────────────────────────────────────┴──────────────────────┘
```

- **Notitieblok-velden** krijgen `text-[15px]`, `min-h-[80-110px]`, witte achtergrond met dikke `border-2 border-[#DDD5C5]` die op focus naar `#008CFF` springt — zelfde stijl als de wrap-up inputs.
- Labels in donker zwart, niet de huidige micro-tracking grijs.
- Chip-inputs (citaten, zorgen) groter: chip-pillen `text-sm` i.p.v. `text-[10.5px]`.
- Sectie krijgt een eigen lichtgele/beige zone-kleur zodat ze visueel "het werkvlak" is.

### 2. Script wordt rustige rechter-rail

- 4 fase-blokken stapelen verticaal in 1 kolom (i.p.v. 4 naast elkaar).
- Elke fase is collapsible — alleen titel + 1 regel doel zichtbaar; klik om te expanden.
- Standaard: Fase 1 open, rest dicht. Manueel open/dicht.
- Kleinere typografie (`text-[11px]`), gedempte kleuren — geen felle blauwe headers meer, eerder een lichte rand met blauwe accent-streep links.
- Anticipatie-strook wordt 6e collapsible item onderaan, niet meer fullwidth oranje.
- Tips en deliverable-cards blijven in z'n fase maar krijgen rustigere kleuren (geen volle blauwe/groene vlakken).

### 3. Klantgegevens-mini bovenin

Mini-inline strook bovenaan (voornaam, achternaam, telefoon, adres, partner) blijft op dezelfde plek maar wordt iets compacter zodat de notitieblok-kolom hoger kan starten.

### 4. Sticky scroll-gedrag

- Topbar + klantgegevens sticky bovenaan.
- Notitieblok-kolom scrollt onafhankelijk van script-rail (twee `overflow-y-auto` kolommen) → altijd zowel input als referentie zichtbaar.

## Technische details

**Eén bestand wijzigen:** `src/pages/LiveCalling.tsx`

- Nieuwe state `expandedPhase: 'fase1' | 'fase2' | 'fase3' | 'fase4' | 'anticipatie' | null` voor de collapsibles.
- Bestaande `QCard`, `TipCard`, `DeliverableCard`, `AnticipateCard` componenten blijven, krijgen een `compact` styling-variant (kleinere padding, gedempte achtergronden).
- Notitieblok-velden hergebruiken bestaande `ChipInput` en `update()` calls — geen wijziging aan state/save-logica.
- Geen wijzigingen aan `usePreIntakeSave`, `PreIntakeContext`, of DB.

Resultaat: tijdens een gesprek zie je 5 grote invulvelden links, met rechts een rustige collapsable script-rail. Eén oogopslag = "hier moet ik typen".

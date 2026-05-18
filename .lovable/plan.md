## Probleem

Op het bel-scherm (`step === 'calling'` in `src/pages/LiveCalling.tsx`):

1. **Linker werkvlak vult zijn kolom niet** — `max-w-3xl` (768px) op een kolom van ~1300px laat ~50% witruimte rechts in de notitieblok-kolom (zichtbaar in screenshot).
2. **Onderkant blijft leeg** — velden hebben vaste `min-h-[80px]`, dus na "Algemene indruk" volgt grote leegte tot aan de viewport-bodem.
3. **Topbar-inputs (voornaam, achternaam, telefoon, adres, partner) zijn miniatuurklein** — `h-[5px] py-`, `text-[12px]`, breedtes 100–180px. Visueel niet uit te lezen of vlot in te vullen.

## Oplossing — alleen `src/pages/LiveCalling.tsx`

### 1. Topbar prominenter (regel 356–380)
- Topbar-hoogte iets groter: `py-2` → `py-3`.
- Input-styling uniform met de werkvlak-velden:
  - `h-10` i.p.v. `py-[5px]`
  - `text-[14px] font-medium`
  - `bg-white border-2 border-[#DDD5C5]` (i.p.v. lichte beige + dunne border)
  - Bredere velden: voornaam/achternaam `w-[140px]`, telefoon `w-[140px]`, adres `w-[260px]`, partner `w-[140px]`
  - Focus-state behouden (`focus:border-[#008CFF]`)
- Timer + "Sluit gesprek af" knop: knop ook iets groter (`h-10 px-5 text-[13px]`) zodat hij in balans is.

### 2. Notitieblok vult de volledige kolom (regel 386–438)
- `max-w-3xl` weghalen → vervangen door `max-w-[1100px] mx-auto` (of gewoon volledige breedte met `px-10`). Hierdoor verdwijnt de witte band rechts.
- Sectie-padding `p-6` → `p-8` voor ademruimte.

### 3. Invulvelden visueel prominenter
- Inputs (`trigger_text`): `h-12` → `h-14`, `text-[15px]` → `text-[16px]`.
- Textareas (`buying_committee`, `general_impression`): `min-h-[80px]` → `min-h-[120px]`, `text-[15px]` → `text-[16px]`.
- ChipInput containers (citaten, twijfels): `p-3` → `p-4`, `min-h-[80px]` toevoegen zodat lege chip-velden ook visueel ruimte innemen.
- Veld-labels (`FieldBlock`): label `text-[13px]` → `text-[14px] font-semibold`, hint blijft klein.

### 4. Laatste veld vult resterende ruimte
- "Algemene indruk" textarea: `min-h-[120px]` + `flex-1` op de wrapper-`<div className="space-y-5">` veranderen naar `flex flex-col gap-5` zodat het laatste veld kan groeien (`flex-1` op de laatste FieldBlock).
- Alternatief: gewoon hogere min-heights — eenvoudiger en voorspelbaarder. Ik kies voor de tweede aanpak (geen flex-grow), tenzij je expliciet wil dat het laatste veld altijd helemaal naar beneden uitloopt.

### 5. Kolomverhouding (regel 383)
- Huidige `grid-cols-[1.85fr_1fr]` blijft (~65/35). Met de bredere inputs en gevulde kolom wordt de focus vanzelf duidelijker.

## Scope

- 1 bestand: `src/pages/LiveCalling.tsx`
- Alleen Tailwind-classes en kleine layout-wijzigingen
- Geen wijziging aan state, autosave, of business logic
- Andere schermen (`step === 'idle'`, `step === 'wrap-up'`) blijven ongemoeid
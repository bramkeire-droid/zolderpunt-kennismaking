## Doel

Live-belscherm (`src/pages/LiveCalling.tsx`) overzichtelijker maken: gespreksgids rechts wordt in één oogopslag leesbaar, klantgegevens krijgen een e-mailveld, en onderaan komt een grote knop die rechtstreeks naar de Calendly-pagina linkt met de klantgegevens vooraf ingevuld.

## Wijzigingen

### 1. Rechterkolom — Gespreksgids als open blokken

In de rechter "Script rail" (regel 605–690) vervang ik het inklapbare `ScriptPhase` patroon (`<details>/<summary>`) door **altijd-zichtbare blokken**: 

- Per fase één kaart met een gekleurde header (fase-label + tijd), een grote duidelijke titel en één korte uitleg-zin (de huidige `doel`). 
- Daaronder de bestaande inhoud (QCard / TipCard / DeliverableCard / AnticipateCard) zonder klik-interactie.
- Behoud de blauwe / oranje accenten (oranje voor Anticipatie). 
- De `ScriptPhase` helper-component wordt vervangen door een nieuwe `ScriptBlock` component (geen `<details>` meer).
- Klein intro-regeltje "klik om te openen" rechts bovenaan wordt verwijderd (niet meer van toepassing).

### 2. Klantgegevens — e-mailveld toevoegen

In het `FieldBlock "Klantgegevens"` van het live-scherm (regel 544–557) ontbreekt het e-mailveld. Ik voeg een `<input type="email">` toe, gebonden aan `leadEmail` / `setLeadEmail`, met dezelfde styling als de andere velden. Layout wordt aangepast zodat het netjes in het 2-koloms grid past (telefoon + e-mail naast elkaar, partner + adres eronder, of vergelijkbaar).

### 3. Calendly-knop rechtsonder

Onder de notitieblok-kolom (linker werkblad) komt onderaan een grote **"VIDEOCALL INPLANNEN AGENDA"** knop (full-width binnen de linker kolom, prominent blauw, hoog). 

- Link: `https://calendly.com/belhouse/zolderpunt-kennismaking-met-jouw-project`
- Prefill via querystring: `?name={voornaam achternaam}&email={email}` — Calendly accepteert `name` en `email` als prefill-parameters. Lege velden worden weggelaten.
- Opent in nieuw tabblad (`target="_blank" rel="noopener noreferrer"`).
- Knop is altijd zichtbaar onderaan de linker kolom, los van het scroll-gedrag van de velden boven.

## Technische details

- Alleen `src/pages/LiveCalling.tsx` wordt aangepast.
- `ScriptPhase` helper wordt vervangen door `ScriptBlock` (geen state, geen `<details>`).
- Calendly prefill URL wordt opgebouwd met `URLSearchParams` zodat speciale karakters correct geëncodeerd worden.
- Geen wijzigingen aan database, hooks of context.

## Doel

Rechterkolom van het live-belscherm wordt een **statische "spiekkaart"**: 5 fases, elk met een titel en één korte zin als richtlijn. Geen interactieve onderdelen, geen scrollen, leesbaar met één oog tijdens het bellen.

## Wijzigingen — alleen in `src/pages/LiveCalling.tsx`

### Vervangen
De volledige rechterkolom (huidige "Script rail", regels ±624–710 met `ScriptPhase` blokken, `QCard`, `TipCard`, `DeliverableCard`, `AnticipateCard`, scenario-knoppen) wordt vervangen door **vijf grote statische fase-blokken** onder elkaar in een flex-kolom die de volledige hoogte vult (`h-full flex flex-col`), zonder scroll.

### De 5 fases (titel + één-zin richtlijn)

1. **Motivatie blootleggen** — *Laat de klant zelf vertellen wat hem vandaag doet bellen.*
2. **Doorvragen op de pijn** — *Laat de klant de urgentie van zijn eigen probleem voelen.*
3. **Videocall framen** — *Positioneer Bram als expert, vraag foto's en oppervlakte.*
4. **Inplannen + afsluiten** — *Zet de afspraak in de agenda en stel daarna de guard-down vraag.*
5. **Bij weerstand** — *Verwijs alles wat met prijs, timing of haalbaarheid te maken heeft naar de videocall.*

### Visueel — leesbaar met één oog

- Elke fase = blok dat gelijk verdeeld is over de beschikbare hoogte (`flex-1`), zodat alle 5 samen exact de viewport vullen, geen scroll.
- Donkere achtergrond (`bg-[#0F1419]` of donker variant) met witte tekst voor **maximaal contrast** in een drukke gesprek-context.
- Grote nummering (1–5) links in fel blauw (`#008CFF`) — `text-[clamp(40px,6vh,72px)]` zodat het meteen leesbaar is.
- Titel groot en vet: `font-dm font-extrabold text-[clamp(20px,2.6vh,32px)]`.
- Beschrijving licht en duidelijk: `text-[clamp(14px,1.7vh,20px)] text-white/85 leading-snug`.
- Dunne scheidingslijn tussen blokken.
- Fase 5 (weerstand) krijgt amber accent (`#E89F3D`) voor visuele waarschuwing.

### Behoud

Links (notitieblok + Calendly-knop + klantgegevens met e-mail) blijft ongewijzigd.

### Opruimen

De helper-componenten `QCard`, `TipCard`, `DeliverableCard`, `AnticipateCard`, `ScriptPhase` en de `SCENARIOS` constante worden verwijderd (niet meer gebruikt). Wrap-up en lead-select blijven intact.

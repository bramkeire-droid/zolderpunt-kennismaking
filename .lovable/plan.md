## Doel
"Volgende stap" in het dossier-overzicht wordt een **inline dropdown** met vaste opties + vrije invoer, met automatische detectie voor videocall/plaatsbezoek.

## Opties in de dropdown
1. Telefoongesprek inplannen
2. Videocall
3. Plaatsbezoek
4. Offerte opmaken
5. Project uitvoeren
6. Andere… (opent klein tekstveld voor vrije invoer)

## Automatische detectie
Wanneer `pre_intake` van de lead een toekomstige `videocall_scheduled_at` of `plaatsbezoek_scheduled_at` heeft:
- De juiste optie ("Videocall" of "Plaatsbezoek") wordt automatisch als geselecteerde waarde getoond, ook als `volgende_stap` in de database leeg is.
- Naast de label blijft de datum/tijd-badge staan (zoals nu al gerenderd wordt).
- Handmatig kiezen blijft mogelijk en overschrijft de auto-detectie (opgeslagen in `leads.volgende_stap`).

Prioriteit auto-detectie (als `volgende_stap` leeg is): plaatsbezoek in toekomst > videocall in toekomst > niets.

## UI-gedrag
- In de kolom "Volgende stap" komt een compacte `Select`-trigger (shadcn) in plaats van de huidige platte tekst.
- Bij keuze "Andere…" verschijnt een inline input; op Enter/blur wordt de vrije tekst opgeslagen.
- Klik op de trigger stopt event-propagation zodat het dossier niet opent.
- Bewaring: optimistische update op `leads[]` + `supabase.from('leads').update({ volgende_stap })`, met rollback + toast bij fout (zelfde patroon als `updateCategory`).
- Wanneer de opgeslagen `volgende_stap` niet in de vaste lijst staat, wordt hij als "Andere: <tekst>" getoond en blijft bewerkbaar.

## Scope
- Alleen `src/pages/Dossiers.tsx` wijzigen.
- Geen database-migratie nodig (`leads.volgende_stap` bestaat al als `text`).
- Bestaande scheduled-at badges onder de dropdown blijven behouden.

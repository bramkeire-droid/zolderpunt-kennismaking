# Planning-sectie herstellen (videocall, datum/uur, bevestigingsmail)

## Wat er echt gebroken is (nagekeken, niet gegokt)

**1. De Calendly-afspraak wordt niet gevonden → geen Meet-link in de mail**
Bij Natasha Degroote staat in het dossier `natasha.degroote@gmail.com`, maar de klant heeft vanmorgen geboekt met `natasha.degroote@telentgroup.be`. De koppeling zoekt uitsluitend op het e-mailadres uit het dossier, dus de zoekopdracht komt leeg terug. Gevolg: geen datum, geen uur, geen Google Meet-link — terwijl de afspraak (28/09 11:30, Meet-link aanwezig) wél in Calendly staat.

**2. Het rare jaartal 1906**
Omdat de koppeling niets vond, is de datum handmatig getypt. De omzetting van het datumveld naar een tijdstip rekent een getypt jaar "06" om naar 1906 (oud gedrag van datumverwerking voor jaartallen onder 100). In de database staat nu letterlijk `1906-09-28 11:30`.

**3. "Ik kan het niet aanpassen"**
Het datumveld schrijft bij élke toetsaanslag meteen weg en leest zijn waarde daarna terug uit de opgeslagen waarde. Tijdens het typen van een jaartal wordt het veld dus halverwege overschreven met een onzinnige datum, waardoor corrigeren onmogelijk voelt.

**4. Uur-weergave**
Dezelfde oorzaak: zolang het opgeslagen moment fout is (jaar 1906), zijn ook de weergave in de mail en elders verwarrend. De tijdzone-omzetting zelf is in orde.

## Herstelplan

**A. Koppeling met Calendly slimmer maken**
- Naast het dossier-e-mailadres ook zoeken op de recente afspraken van de Zolderpunt-agenda en de deelnemers daarvan vergelijken op naam, telefoonnummer en e-mail.
- Vindt de koppeling precies één passende afspraak → automatisch datum, uur en Google Meet-link opslaan.
- Vindt ze meerdere mogelijkheden → een kort keuzelijstje tonen ("Videocall Intake — 28/09 11:30 — Natasha Degroote") zodat Bram in één klik de juiste kiest.
- Vindt ze niets → duidelijke melding met het gezochte e-mailadres, zodat direct zichtbaar is dat de klant met een ander adres boekte.
- Bij het koppelen ook het e-mailadres uit de Calendly-boeking voorstellen als dossier-e-mail wanneer dat afwijkt (met bevestiging, nooit stil overschrijven).

**B. Datum en uur weer betrouwbaar maken**
- Jaartallen onder 1000 worden geweigerd in plaats van naar 1906 omgezet.
- Datum en uur worden pas opgeslagen wanneer de invoer volledig en geldig is (niet bij elke toetsaanslag), zodat corrigeren normaal werkt.
- Eenmalige opruiming: het bestaande dossier van Natasha Degroote krijgt de juiste afspraak (28/09/2026 11:30 + Meet-link) uit Calendly.

**C. Bevestigingsmail**
- De Google Meet-link komt altijd in de videocall-mail zodra die bekend is.
- Staat er geen link, dan blijft de knop bruikbaar maar toont de sectie een waarschuwing "Meet-link ontbreekt — ververs Calendly", zodat je nooit ongemerkt een mail zonder link verstuurt.
- Datum en uur in de mail in leesbaar Nederlands ("maandag 28 september om 11:30").

## Technisch

- `supabase/functions/sync-calendly-event/index.ts`: naast `invitee_email` een tweede zoekpad (recente actieve events → `/scheduled_events/{uuid}/invitees`) met scoring op e-mail, naam en telefoon; teruggeven van kandidaten incl. `inviteeEmail`, `name`, `startTime`, `joinUrl`. Cancelled/rescheduled events uitfilteren op `status: active`.
- `src/lib/localDateTime.ts`: `lokaalNaarIso` via `setFullYear` en `null` bij jaar < 1000.
- `src/pages/LiveCalling.tsx` (`ConfirmMailBlock`): lokale draft-state voor datum/tijd, commit op `blur`/geldige waarde; kandidaat-keuzelijst na manuele sync; waarschuwing bij ontbrekende `google_meet_link`; mailbody blijft ongewijzigd behalve de gegarandeerde Meet-regel.
- Datacorrectie voor het ene dossier met `1906-09-28` gebeurt via de nieuwe sync (knop "Calendly verversen"), geen migratie nodig.
- Geen wijzigingen aan andere pagina's of aan de opslaglogica buiten bovenstaande.

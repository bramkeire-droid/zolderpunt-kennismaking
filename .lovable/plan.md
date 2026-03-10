

# Plan: Kaart repareren op Slide 3

## Probleem 1: `lang=default` is ongeldig
De Photon geocoding API accepteert geen `lang=default`. Geldige waarden zijn taalcodes als `en`, `de`, `fr`, `nl`. De vorige fix van `lang=fr` → `lang=default` heeft het erger gemaakt — de API retourneert nu waarschijnlijk een fout, waardoor er nooit coördinaten worden opgeslagen.

**Fix:** Verwijder de `lang` parameter volledig. Photon geeft dan de inheemse namen terug (wat we willen voor België).

## Probleem 2: Bestaande dossiers zonder coördinaten
Wanneer een dossier uit de database wordt geladen, staat het adres erin maar zijn `adres_lat`/`adres_lng` null (omdat ze eerder nooit zijn opgeslagen).

**Fix:** Voeg een `useEffect` toe in `Slide3.tsx` dat bij laden controleert of er een adres is zonder coördinaten. Zo ja, doe een enkele Photon geocode-request om de coördinaten op te halen en sla ze op via `updateLead`.

---

| Bestand | Actie |
|---|---|
| `src/components/AddressAutocomplete.tsx` | Verwijder `&lang=default` uit de API URL |
| `src/slides/Slide3.tsx` | Voeg geocoding-fallback useEffect toe voor adressen zonder coördinaten |


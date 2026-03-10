

# Plan: 3 fixes — Kaart, Airco-tekst, Knoppen

## 1. Slide 3: Echte kaart bij adresveld

Het adresblok toont nu alleen een MapPin icoon. Oplossing: embed een OpenStreetMap kaart via `iframe` wanneer een adres is ingevuld. Gebruik de Photon geocoder (al in `AddressAutocomplete.tsx`) om lat/lng op te halen bij adresselectie, en sla die op in de lead data. De kaart toont dan de locatie.

**Wijzigingen:**
- `SessionContext.tsx`: voeg `adres_lat` en `adres_lng` (number | null) toe aan `LeadData`
- `AddressAutocomplete.tsx`: geef ook lat/lng door bij selectie (Photon features bevatten geometry.coordinates)
- `Slide3.tsx`:
  - Gebruik `AddressAutocomplete` i.p.v. gewone `Input` voor het adresveld
  - Toon een OpenStreetMap iframe embed wanneer lat/lng beschikbaar zijn
  - Fallback naar huidige MapPin placeholder wanneer er geen coördinaten zijn

## 2. Airco-tekst verduidelijken

Het probleem: "Airco apart vermeld" is verwarrend omdat de prijs wél in het totaal zit. De bedoeling is dat airco een optioneel onderdeel is dat apart wordt vermeld (niet standaard inbegrepen bij elke renovatie).

**Wijzigingen:**
- `Slide6.tsx` (regel 51-53): Vervang "ℹ Airco apart vermeld" door duidelijkere tekst: "ℹ Airco is optioneel en apart geoffreerd" — en toon dit blokje alleen als airco daadwerkelijk is geselecteerd in de calculator
- `reportConstants.ts` / `ReportDocument.tsx`: In de PDF checklist staat airco al als optie. Voeg een annotatie toe bij de airco-regel in de PDF als die is inbegrepen: "(optioneel — apart geoffreerd)"

## 3. Knoppen buiten beeld op Slide 6

Slide 6 gebruikt `variant="blue"` layout. Het content-gedeelte heeft `flex-1 flex flex-col justify-center items-center` maar als de content te lang is (met inbegrepen posten chips), duwt het de navigatieknoppen uit beeld. De `flex-1` content area heeft geen overflow-scroll.

**Wijzigingen:**
- `SlideLayout.tsx` (variant blue, regel 20): Voeg `overflow-y-auto` toe aan de content area zodat bij langere content gescrolld kan worden en de knoppen altijd zichtbaar blijven. Verander `flex-1 flex flex-col justify-center` naar `flex-1 overflow-y-auto flex flex-col justify-center`.

---

## Bestanden die wijzigen

| Bestand | Actie |
|---|---|
| `src/contexts/SessionContext.tsx` | `adres_lat`, `adres_lng` toevoegen aan LeadData |
| `src/components/AddressAutocomplete.tsx` | Lat/lng doorgeven bij selectie |
| `src/slides/Slide3.tsx` | Kaart-embed + AddressAutocomplete gebruiken |
| `src/slides/Slide6.tsx` | Airco-tekst verduidelijken, conditioneel tonen |
| `src/components/SlideLayout.tsx` | overflow-y-auto op blue variant content |
| `src/components/report/ReportDocument.tsx` | Airco-annotatie in PDF checklist |


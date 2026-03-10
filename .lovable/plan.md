

# Plan: Adres Taal Fix + PDF Productie Fix

## 1. Adres Autocomplete — Taalfout

**Probleem**: `lang=fr` geeft Franse plaatsnamen terug ("Aeltre" i.p.v. "Aalter"). Vlaamse gebruikers herkennen hun adres niet.

**Fix**: Wijzig `lang=fr` naar `lang=default` in `AddressAutocomplete.tsx`. Dit geeft de originele (inheemse) namen terug — dus "Aalter" voor Vlaanderen, "Bruxelles" voor Brusselse straten, etc.

**Selfcheck**: Console logging is al aanwezig. Toevoegen van een extra log die de eerste suggestie-naam toont zodat je direct kunt zien of het Nederlands/juist is.

## 2. PDF Generator op gepubliceerde versie

**Mogelijke oorzaken**:
- De `@react-pdf/renderer` library gebruikt een web worker die font-bestanden moet ophalen van `cdn.jsdelivr.net`. Als die CDN-call faalt of te lang duurt, crasht de PDF-generatie stilzwijgend.
- De `heroSrc` (hero-cover.jpg) wordt als Vite asset-import geladen. In productie wordt dit een relatief pad (`/assets/hero-cover-xxx.jpg`). `@react-pdf/renderer` Image component moet dit als absolute URL fetchen — op de gepubliceerde versie kan dit mislukken als het pad niet correct resolved.

**Fix**:
1. In `Slide10.tsx`: betere error logging zodat we weten WAT faalt — wrap de `pdf().toBlob()` in een try/catch met specifieke foutmelding in de console en toast.
2. In `ReportDocument.tsx`: Converteer de `heroSrc` import naar een absolute URL via `new URL(heroSrc, window.location.origin).href` zodat `@react-pdf/renderer` het correct kan fetchen.
3. Voeg een `Font.register` hyphenation callback toe om font-laadfouten gracefully af te handelen.

---

| Bestand | Actie |
|---|---|
| `src/components/AddressAutocomplete.tsx` | `lang=fr` → `lang=default` + log eerste suggestienaam |
| `src/slides/Slide10.tsx` | Betere error logging bij PDF generatie |
| `src/components/report/ReportDocument.tsx` | Absolute URL voor hero image |


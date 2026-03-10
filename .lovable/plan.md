

# Plan: Adres Autocomplete Fix + Intakegesprek Foto

## 1. Adres Autocomplete — Root Cause gevonden

De Photon API geeft **400 Bad Request** terug omdat `lang=nl` niet ondersteund wordt. Uit de network logs:

```
Status: 400 (Bad Request)
Response: {"lang":[{"message":"Language is not supported. Supported are: default, de, en, fr"}]}
```

**Fix**: In `src/components/AddressAutocomplete.tsx`, wijzig `lang=nl` naar `lang=fr` (Frans — beste match voor Belgische adressen, geeft straatnamen in de juiste taal voor Vlaanderen/Wallonië).

**Selfcheck**: Na de fix voeg ik een `console.log` toe die het API-antwoord logt bij succes EN bij fout, zodat je in de console direct kunt zien of suggesties binnenkomen. Ook voeg ik een visuele indicator toe: als de API faalt, toon een klein foutmelding-icoontje naast het invoerveld.

## 2. Intakegesprek Foto

De huidige `stap-intakegesprek.jpg` voelt AI-gegenereerd aan. 

**Aanpak**: Genereer een nieuwe afbeelding via Lovable AI (Gemini image model) die een realistisch videogesprek toont met Zolderpunt-specifieke elementen:
- Laptop/tablet scherm met een videocall
- Zichtbare dakconstructie/zolderruimte als context
- Warme, professionele sfeer passend bij het merk

Alternatief: als de user een eigen foto heeft, kan die gebruikt worden. Ik stel voor om de afbeelding te genereren met het beschikbare AI model.

---

| Bestand | Actie |
|---|---|
| `src/components/AddressAutocomplete.tsx` | `lang=nl` → `lang=fr` + error handling + selfcheck logging |
| `src/assets/stap-intakegesprek.jpg` | Nieuwe afbeelding genereren of placeholder verbeteren |


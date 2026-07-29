# Foto-actie: hernoemen naar "Foto's" + werkende galerij

## Probleem
De actie "Foto's uploaden" opent een dialog met upload-knop en, in theorie, een galerij van bestaande foto's. In de praktijk blijft die galerij leeg omdat inbound foto's (WhatsApp/e-mail) in `leads.fotos` een ander JSON-schema hebben dan de handmatig geüploade foto's:

- Handmatig geüpload: `{ bestandsnaam, storage_path, url }`
- Inbound (WhatsApp/e-mail): `{ path, bucket, source, uploaded_at }`

`PhotoUploadDialog` leest alleen `storage_path`, dus alle WhatsApp-foto's die via de nieuwe pipeline binnenkomen tonen niet — waardoor het lijkt of "er niks gebeurt".

## Wijzigingen (alleen frontend)

### 1. `src/components/dossier/PhotoUploadDialog.tsx`
- Titel: "Foto's" (i.p.v. "Foto's uploaden").
- Subtitel korter: "{naam} · {n} foto's in dossier".
- Nieuwe helper `normalizePhoto(f)` die zowel `storage_path` als `path` accepteert en via `lead-fotos` bucket een publieke URL berekent. Gebruikt voor render én verwijderen.
- Galerij: klikbaar → opent `ImageLightbox` (bestaand component) voor volledige weergave + navigatie.
- Upload-knop blijft, maar wordt secundair (compacter) bovenaan de galerij zodat de galerij het hoofdelement is.
- Lege staat: "Nog geen foto's — upload of stuur ze via WhatsApp/e-mail."

### 2. `src/pages/Dossiers.tsx`
- Menu-item label "Foto's uploaden" → "Foto's".

## Buiten scope
- Geen schema-migratie: we normaliseren in de UI omdat inbound-foto's al werken in de rest van de app en het schema achteraf uniformiseren risicovol is voor bestaande PDF/portal-code.
- Geen video-ondersteuning (dat komt in een aparte iteratie).

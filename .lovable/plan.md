# Google Reviews-blad achteraan offertebijlage

## Wat we bouwen
Een extra A4-pagina achteraan de offertebijlage PDF met de 8 meest recente Google reviews van Zolderpunt, in dezelfde huisstijl (Space Grotesk / Rethink Sans, primary blauw, kicker-labels).

## Aanpak

**1. Google Maps Platform connector koppelen**
- Connector linken (Lovable-managed key werkt op `*.lovable.app` voor preview/staging; custom domain vereist later eigen key).
- Geeft toegang tot Places API (New) via de gateway.

**2. Place ID opzoeken (eenmalig)**
- Via `places:searchText` met query "Zolderpunt zolderrenovatie" haal ik het juiste Place ID op.
- Place ID hardcoded als constante in een gedeelde config (verandert nooit).

**3. Edge function `fetch-google-reviews`**
- Roept Places API (New) `places/{placeId}` aan via de connector-gateway (server-side, want browser key mag dit endpoint niet).
- FieldMask: `reviews,rating,userRatingCount`.
- Cached resultaat ~24u in een nieuwe tabel `google_reviews_cache` (1 rij, met `payload jsonb` + `fetched_at`) — Google's ToS staat tijdelijke cache toe en bespaart calls.
- Returnt sortering nieuw → oud, top 8.

**4. PDF-uitbreiding (`OffertebijlagePdf.tsx`)**
- Optionele 2e `<Page>` toegevoegd aan het bestaande Document met de reviews.
- Header: kicker "ERVARINGEN · GOOGLE", H1 "Wat klanten zeggen", totaal-rating + aantal reviews als subkop.
- 8 reviews in een 2-koloms grid (4×2), elk met: ster-rating, korte datum, naam, quote (afgekapt op ~280 tekens met "…").
- Footer: kleine bron-vermelding "Bron: Google Reviews · {datum}" + de slogan-band onderaan zoals het voorblad.

**5. Dialog-flow (`OffertebijlageDialog.tsx`)**
- Bij openen: reviews op de achtergrond ophalen via de edge function (niet-blokkerend).
- Checkbox "Google reviews bijvoegen" (default aan zodra reviews binnen zijn).
- Bij download worden reviews als 2e pagina meegegeven aan `OffertebijlagePdf`. Failt het ophalen: stilletjes weglaten en toast met waarschuwing.

## Technische details

**Nieuwe bestanden**
- `supabase/functions/fetch-google-reviews/index.ts` — gateway-call + cache (`verify_jwt = false` niet nodig, mag standaard).
- `src/lib/googleReviews.ts` — client-helper die de function aanroept en types definieert (`{ author, rating, text, relativeTime, time }`).

**Aangepast**
- `src/components/dossier/OffertebijlagePdf.tsx` — extra Page-component + `reviews?: Review[]` prop.
- `src/components/dossier/OffertebijlageDialog.tsx` — fetch + checkbox + prop doorgeven.

**Database**
```text
google_reviews_cache (singleton)
  id           int primary key default 1 check (id = 1)
  payload      jsonb           — { reviews, rating, total }
  fetched_at   timestamptz
```
RLS: alleen service_role schrijft, authenticated mag lezen.

**Gateway call**
```text
POST https://connector-gateway.lovable.dev/google_maps/places/v1/places/{PLACE_ID}
Headers: Authorization, X-Connection-Api-Key, X-Goog-FieldMask: reviews,rating,userRatingCount
```

**Vorm reviewkaart (PDF)**
```text
★★★★★   3 weken geleden
Brandon Van Moorleghem
"Wat Bram echt onderscheidt is zijn communicatie en
 oog voor detail. We krijgen elke dag een update…"
```

## Wat de gebruiker straks doet
1. Klikken "Connect" wanneer ik de connector-prompt toon.
2. Daarna werkt het automatisch — reviews verschijnen als 2e PDF-pagina bij elke offertebijlage download.

## Out-of-scope (voor nu)
- Custom domain key (komt aan bod als jullie naar eigen domein gaan).
- Foto's van reviewers (niet beschikbaar in alle gevallen + privacy).
- Generieke voorblad-tool reviews (apart verzoek indien gewenst).
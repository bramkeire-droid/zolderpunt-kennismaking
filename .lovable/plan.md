## Mail-tekst aanpassen (wrap-up bevestigingsmail)

**Locatie:** `src/pages/LiveCalling.tsx` regels 414-428 — de `body` string die in de `mailto:` link gestopt wordt.

### Mapping uit telefoongesprek

| Geel gearceerd in mockup | Bron-veld |
|---|---|
| "Antonio en Koen" | `lead.voornaam` + (indien `lead.partner_naam` ingevuld) ` en ${partner_naam}` |
| "woensdag 3 juni om 16:30" | `data.videocall_scheduled_at` → `dag` + `uur` (al berekend) |
| `https://meet.google.com/...` | `data.google_meet_link` |
| `+32 492 400 954` (in body) | hardcoded constante |

### Nieuwe body-tekst (exact zoals mockup, stopt op "Positieve groeten,")

```
Hi {voornaam}{ en partner_naam},

Bij deze bevestig ik graag onze videocall op {dag} om {uur}.
{google_meet_link}

Om ons gesprek goed te kunnen voorbereiden, mogen jullie mij vooraf gerust al even volgende zaken bezorgen:

• Enkele foto's die de huidige toestand van de zolder goed weergeven
• Een ruwe inschatting van de oppervlakte van de zolder
• Indien er een nieuwe vaste trap naar de zolder nodig is: graag ook enkele foto's of een korte toelichting van de verdieping onder de zolder. Zo krijgen we een beter beeld van waar jullie de trap eventueel zien komen, via welke ruimte dit zou gebeuren en welke ruimte daarvoor mogelijk opgeofferd wordt.

De foto's en informatie mogen eenvoudig doorgestuurd worden via WhatsApp of mail, afhankelijk van wat voor jullie het gemakkelijkst werkt.
+32 492 400 954

Ik kijk ernaar uit om jullie project verder samen te bekijken. Tot dan!

Positieve groeten,
```

Geen handtekening (Bram / Zaakvoerder / Zolderpunt.be) meer in de body — de mailclient-handtekening voegt dit automatisch toe.

### Subject ongewijzigd
`Bevestiging videocall {dag} om {uur} — Zolderpunt`

### Over de `tel:` link — belangrijke beperking

`mailto:` body is **plain text** — het ondersteunt geen HTML, dus geen klikbare `<a href="tel:...">` tag. De enige manieren om wél een echte tel-link te krijgen:
1. **Vertrouwen op auto-linkify** van de mailclient (Outlook/Gmail/Apple Mail detecteren `+32 492 400 954` automatisch en maken er een tel: link van bij ontvangst). → Werkt in praktijk overal, vereist geen code.
2. **HTML-mail genereren** via een eigen "open in nieuwe tab"-preview of via een backend send (edge function met Resend). → Grote ingreep, niet via `mailto:`.

**Voorstel:** optie 1 toepassen (gewoon het nummer in de tekst), tenzij je echt wilt overschakelen naar HTML-mailverzending via een backend.

### Te wijzigen bestand
- `src/pages/LiveCalling.tsx` (alleen de `body` constante op regel 420; eventueel `leadPartnerNaam` uit `lead` halen indien nog niet beschikbaar in scope)
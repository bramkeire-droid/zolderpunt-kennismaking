## Doel
Klanten kunnen foto's doorsturen via WhatsApp of e-mail naar één centraal ontvangstpunt. De tool herkent automatisch bij welk dossier ze horen, downloadt ze naar Storage (`lead-fotos`) en hangt ze in `leads.fotos` — precies dezelfde plek als de "Foto's uploaden"-actie in Dossiers.

## Architectuur (2 inbound-kanalen → 1 pipeline)

```text
 WhatsApp (any nr) ──► Twilio WA webhook ──┐
                                           ├──► Edge fn `inbound-media`
 E-mail (any adres) ──► Postmark inbound ──┘        │
                                                    ▼
                                          1. Media downloaden
                                          2. Lead-matching (zie onder)
                                          3. Compress + upload naar `lead-fotos`
                                          4. Append aan `leads.fotos`
                                          5. Bij twijfel → reply "voor welke klant?"
```

Beide kanalen leveren dezelfde interne payload: `{ from, subject_or_caption, text, attachments[] }`. Eén verwerkingsfunctie, twee dunne adapters.

### Kanaal 1 — WhatsApp (Twilio)
- Twilio WhatsApp Business Sender (goedkoopst en snelst live; Meta Cloud API kan later).
- Webhook: `POST /functions/v1/inbound-whatsapp` (public, `verify_jwt = false`, HMAC-check via `X-Twilio-Signature`).
- Media-URLs zijn signed; ophalen met Twilio Basic Auth.
- Replies naar de klant via Twilio API (bevestiging of vraag om verduidelijking).

### Kanaal 2 — E-mail (Postmark Inbound)
- Eén ontvangstadres, bv. `fotos@inbox.zolderpunt.be` (MX naar Postmark).
- Postmark POST't JSON met attachments (base64) naar `POST /functions/v1/inbound-email` (public, HMAC-check via basic-auth token in URL of `Authorization` header, secret in Supabase).
- Antwoorden via bestaande mail-flow (later; eerst enkel ingest).

Iedereen kan sturen (openbaar) — anti-misbruik via:
- Whitelist van bekende `email`/`telefoon` uit `leads` → auto-koppelen.
- Onbekende afzenders → in "quarantaine"-tabel `inbound_media_pending`, wacht op menselijke koppeling in Dossiers.

## Matching-logica (in volgorde)

1. **Directe hint in tekst/subject/caption** — regex op `#<lead_id>` of `#<offerte_nummer>`.
2. **Afzender-match** — `from_email` of `from_phone` (E.164, normaliseer) tegen `leads.email` / `leads.telefoon`.
3. **Naam/adres-match** — fuzzy op subject/tekst tegen `voornaam achternaam` / `adres` (Postgres `similarity()` via `pg_trgm`).
4. **Onduidelijk** → 
   - WhatsApp: auto-reply "Voor welke klant/adres zijn deze foto's? Antwoord met #<code> of naam+adres." De volgende bericht van dat nummer binnen 24u wordt automatisch aan de gesuggereerde lead gekoppeld (via `inbound_conversation_state`).
   - E-mail: reply met dezelfde vraag; correlatie via `In-Reply-To` header.
5. Blijft onduidelijk → item in **Inbox-tab** in Dossiers waar je met één klik naar het juiste dossier sleept.

## Nieuwe database-objecten

- `inbound_media_pending` — `id, source ('wa'|'mail'), from_identifier, subject, body, storage_paths text[], suggested_lead_id, status ('pending'|'assigned'|'rejected'), created_at`.
- `inbound_conversation_state` — `from_identifier, source, last_lead_id, expires_at` (24u TTL) voor multi-turn.
- Storage-map: `lead-fotos/<lead_id>/inbox/<timestamp>-<naam>.jpg` (zelfde bucket, submap).

Geen wijziging aan `leads.fotos` — bestaande UI leest gewoon door.

## Nieuwe UI (Dossiers)

- **Inbox-badge** rechtsboven met aantal `pending` items.
- Kleine dialog met previews, gesuggereerde match en dropdown "Koppel aan dossier…". Actie kopieert de paden naar de definitieve `<lead_id>/` en appendt aan `leads.fotos`.

## Nieuwe edge functions

| Functie | Auth | Rol |
|---|---|---|
| `inbound-whatsapp` | public + Twilio HMAC | ontvangt WA webhook, normaliseert, roept ingest aan |
| `inbound-email` | public + shared secret | ontvangt Postmark JSON, normaliseert, roept ingest aan |
| `ingest-inbound-media` | interne aanroep (service role) | matching, compress, upload, DB-writes, reply-trigger |
| `reply-whatsapp` | interne | verstuurt Twilio-antwoord |

## Benodigde credentials (te vragen bij implementatie)

- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WA_FROM`.
- Postmark: `POSTMARK_INBOUND_SECRET` (basic-auth in webhook-URL) + geverifieerd inbound-domein/adres.
- DNS: MX-record voor `inbox.zolderpunt.be` → Postmark.

## Aanpak (sprints)

1. **DB + ingest-core** — tabellen, `ingest-inbound-media` met matching + upload + pending-fallback. Test met synthetische payload.
2. **WhatsApp-adapter** — `inbound-whatsapp`, Twilio HMAC, media-download, auto-reply bij twijfel, conversation-state.
3. **E-mail-adapter** — `inbound-email`, Postmark parsing, attachment-decode, reply-support.
4. **Inbox-UI in Dossiers** — badge, dialog, drag-to-dossier, "Bevestigen".
5. **Polish** — throttling per afzender, dedup op filehash, log-tab per lead (bron + timestamp).

## Scope-grens

- Geen wijzigingen aan bestaande dossier-flow, PDF's, portal, autosave.
- `PhotoUploadDialog` en `Slide4` blijven één-op-één werken; inbound-pipeline schrijft naar exact hetzelfde `leads.fotos`-schema.
- Openbaar toegankelijk, maar elke schrijfactie naar `leads` gaat via service-role in de edge function — nooit direct vanaf de client.

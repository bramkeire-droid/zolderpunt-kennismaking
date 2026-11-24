# Sleutels en logins voor Zarvis

Stand op 2026-11-24, nagekeken in het Lovable-project van Compass (Settings, Secrets) en in Brams Chrome. Er staat nergens een waarde in dit document; secrets plakt Bram zelf in Lovable.

Lovable laat per venster één secret toe zodra een waarde ontbreekt ("Secret value is required"), dus ze gaan er één voor één in.

## Nu nodig

| Nr | Secret in Lovable | Stand | Waar de waarde vandaan komt | Deblokkeert |
|---|---|---|---|---|
| 1 | `ZARVIS_BEL_NAAR` | ontbreekt | Brams gsm-nummer, vorm `+32...` | bellen |
| 2 | `TWILIO_VAN_NUMMER` | ontbreekt | Twilio-console, Phone Numbers, Active numbers. Login nodig; `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` en `TWILIO_WA_FROM` staan er al | bellen |
| 3 | `ZARVIS_ROUTES_KEY` (nieuw; `GOOGLE_MAPS_API_KEY` hoort bij de koppeling van Lovable zelf en werkt niet rechtstreeks bij Google) | ontbreekt | Google Cloud. Onder het Google-account in Chrome staan twee projecten (`agentic-os`, `My First Project`); in geen van beide staat een Maps-sleutel. De sleutel in Lovable komt dus van een ander account of is verwijderd. Nodig: de Routes API aanzetten en een nieuwe sleutel maken, in een project met een betaalrekening | ritten, vertrekuur (IDEE-20) |
| 4 | `AZURE_SPEECH_KEY` (en `AZURE_SPEECH_REGION`, standaard `westeurope`) | ontbreekt | Azure. Het account `bram@belhouse...` is ingelogd maar heeft **geen abonnement**; een Speech-resource vraagt eerst een abonnement (gratis proef of betalend, met kaart) | de Vlaamse stem en alles rond spraak |
| 5 | `BRAVE_SEARCH_API_KEY` | ontbreekt | api-dashboard.search.brave.com. Geen login in Chrome; vraagt een account | zoeken op het web |

## Mag, niet nodig

| Secret | Waarvoor |
|---|---|
| `ZARVIS_VERTREKADRES` | vast vertrekpunt voor ritten; anders vraagt Zarvis het |
| `ANTHROPIC_API_KEY` | eigen tegoed in plaats van de AI-route van Lovable; wordt nodig voor computer use (IDEE-22) |
| `ANAM_API_KEY` | het gezicht (ligt stil) |
| `ZARVIS_BEL_STEM` | een andere stem aan de telefoon |

## Geen secret, wel van Bram

- De Lovable-koppeling toevoegen aan de geplande taak "Zarvis nachtbouwer" (zonder kan ze niets uitrollen).
- `Zarvis-installatie.exe` uitvoeren: gebouwd op deze pc in `zarvis-desktop/dist/`.
- WhatsApp koppelen met de gsm, in het programma.
- Zeggen welk toestel hij heeft (Android of iPhone).

## Later, per idee (uit de onderzoeken in `docs/onderzoek/`)

| Idee | Nodig |
|---|---|
| 10 mails | een smal servicetoken voor de app Maildude; toestemming voor migraties op Mail-CRM |
| 11 marketing | een GitHub-token dat alleen branches en pull requests mag maken in de repo van de website |
| 13 financiën | nakijken of de Yuki-sleutel openstaande posten mag lezen |
| 18 zelf bouwen | het token van de API-trigger van een routine in de cloud; een proefgebruiker |
| 20 agenda | zeggen welke agenda Bram gebruikt; eventueel toegang tot Google Calendar of Outlook |
| 22 computer use | `ANTHROPIC_API_KEY`; één keer inloggen in een eigen browservenster van Zarvis |
| 23 stem | `AZURE_SPEECH_KEY`; ongeveer vier uur opnames; eventueel ElevenLabs |
| 27 smartphone | VAPID-sleutels voor pushmeldingen |
| 30 brein | een sleutel voor een vectordienst (bijvoorbeeld Voyage) |

## Te vervangen, los van Zarvis

- De Nuance-sleutel die ooit in een chat stond.
- De geheime sleutel die leesbaar in de geplande taak `mail-sync-hourly` van Mail-CRM staat.
- De vaste sleutel in de code van FINDASHBOARD (`supabase/functions/_shared/auth.ts`).
- Het testwachtwoord in het overdrachtsdocument van Invensync (staat in git).
- De leesbare pincodes in de Werf-app.

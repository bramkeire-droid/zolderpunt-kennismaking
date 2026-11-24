# Verkenning Maildude (IDEE-10)

Gemeten op 2026-11-24, alleen gelezen, niets gewijzigd. Dit vervangt de afgebroken verkenning uit de overdracht.

## Er zijn twee systemen, niet één

| | A. Mail-CRM | B. Maildude ("Levend Bedrijfsbrein") |
|---|---|---|
| Plaats | `C:\Users\bramk\Desktop\mail-crm`, Supabase `ipnebgcuokehllepqwwm` | `C:\Users\bramk\.claude\projects\Maildude`, eigen server |
| Techniek | Postgres, vier Deno-functies, dashboard "Belhouse Mail Hub" | FastAPI, Postgres met pgvector, Redis, workers, PWA |
| Mailboxen | 2: `info@belhouse-atelier.be`, `hello@zolderpunt.be` | 3: dezelfde twee plus een Gmail |
| Toegang | Graph als toepassing, alleen lezen | Graph per mailbox ingelogd (lezen en schrijven), Gmail via IMAP |
| Ritme | elk half uur (pg_cron `5,35 * * * *`) | elke 5 minuten |
| Kan | samenvatten, koppelen aan een dossier (ZL-nummer), beslissingen markeren, controlelijst | inbox, concepten, verzenden na goedkeuring, plannen, doorsturen, regels via spraak, contactdossiers |
| Koppeling met Compass | ja, op ZL-nummer | geen enkele |
| Draait vandaag | ja | ja (`/health` antwoordt) |

Alleen A voedt Compass. De overdracht en IDEE-10 noemen A "Maildude", maar de map, de server en de screencast van B heten letterlijk Maildude. Brams twee zinnen wijzen daardoor naar twee systemen: "automatische koppelingen met dossiers" bestaat alleen in A; "aan verschillende mailboxen gekoppeld zoals Maildude" (per mailbox inloggen, lezen en schrijven, ook Gmail) bestaat alleen in B. **Open vraag aan Bram: bedoelt hij A, B of beide?**

## Hoe Compass vandaag mails leest

- Via de functie `compass-loket` in het Mail-CRM-project, met het token van de ingelogde Compass-gebruiker. Geen gedeeld geheim.
- Acties: `health`, `mails {zl}`, `mails_via_email {email}`, `mail_inhoud {email_id}`, `leveranciers`, `leverancier_mails {bedrijf_ids}`, `historiek` (die laatste schrijft en kost AI-oproepen).
- Er is geen actie om op tekst te zoeken.
- De sleutel naar Compass is `projects.extern_dossier_id` = het ZL-nummer = `leads.bouwflow_project_number`.

## De maildatabank (A)

- `emails` 14.719 rijen (25 februari 2025 tot 23 november 2026), `projects` 145, `contacts` 682, `companies` 310, `calls` 164.
- De tekst van een mail wordt niet bewaard, alleen onderwerp en AI-samenvatting. De volledige tekst komt live uit Exchange.
- `emails.thread_id` is de draad; er zijn 10.277 draden.
- Mailboxen zijn geen tabel: ze staan op vier plaatsen vast in de code.
- `koppel_status`: niet_geanalyseerd 8.016, genegeerd 4.661, niet_gekoppeld 1.077, gekoppeld 658, onzeker 300, bewaard_ongekoppeld 7.

## Het koppelen vandaag

- In `mail-sync`: eerst een filter zonder AI, dan `claude-sonnet-5` met de volledige lijst actieve dossiers. Zekerheid ≥ 0,85 gekoppeld; 0,50 tot 0,85 onzeker; daaronder niet gekoppeld.
- Geen enkele vaste regel (draad, afzender, ZL-nummer in de tekst).
- Een mislukte AI-oproep wordt als "onzeker" bewaard en nooit opnieuw geprobeerd.

Nagemeten cijfers (alle bevestigd):

- September tot november: 34% gekoppeld, 28% onzeker, 38% niet gekoppeld. Dat geldt zonder de genegeerde mails; op alle mails van die periode is 10% gekoppeld.
- 103 ongekoppelde mails zitten in een draad waarvan de andere mails naar precies één dossier wijzen. Geen enkele draad wijst naar twee dossiers.
- 158 van de 300 mails in de controlelijst zijn mislukte AI-oproepen (september 58, oktober 51, november 40).
- 47% van de AI-oproepen sinds 1 september ging naar mails die daarna genegeerd werden.
- Nieuw: 32 mails staan op "gekoppeld" zonder dossier (in geen enkel dossier zichtbaar); 62 mails staan op "onzeker" maar hebben wel een dossier.

## Risico's bij het aanraken van de koppellogica

- Vier schrijvers op dezelfde kolommen: `mail-sync` (klok), `historiek` (knop in Compass), Mail Hub (Bram, met de hand), de backfill-scripts.
- Een handmatige en een automatische koppeling zijn niet te onderscheiden: er is geen kolom voor wie koppelde. Een regel die herkoppelt, kan Brams eigen keuzes overschrijven. Er is eerst een kolom met herkomst en een logboek nodig. `bewaard_ongekoppeld` is altijd een keuze van Bram en mag nooit automatisch gekoppeld worden.
- De code van Mail-CRM heeft geen git-remote en geen testomgeving; uitrollen gaat recht naar productie.
- Een geheime sleutel staat leesbaar in de geplande taak `mail-sync-hourly`. Tijdens deze verkenning stond ze één keer leesbaar in de uitvoer van het gereedschap. **Vervangen is aangeraden.**
- De RLS van Mail-CRM laat elke ingelogde gebruiker alles lezen en schrijven.
- Twee systemen lezen dezelfde mailboxen. Als Zarvis gaat verzenden, overlapt dat met B.

## Plan

1. **Gebouwd (2026-11-24):** Zarvis leest mails via het bestaande loket (`lees_mails`, `lees_mail`). Mail-CRM is niet gewijzigd.
2. Zoeken op tekst: één nieuwe leesactie in het loket (`zoek`), daarna `zoek_mails` in Zarvis.
3. Koppelen met vaste regels, in deze volgorde: kolom `gekoppeld_door` en een logboek; dan de draadregel (103 mails); dan een nieuwe poging voor de 158 mislukte AI-oproepen; dan afgesloten dossiers als kandidaat.
4. Meerdere mailboxen "zoals Maildude": wacht op Brams antwoord over A of B.

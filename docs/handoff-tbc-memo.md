# Handoff — WhatsApp "tbc"-memo naar de mailbox

Plak dit volledig als eerste bericht in een nieuwe Claude Code-sessie op deze repo.

---

## Wie je bent en wat je overneemt

Je neemt een half afgewerkte feature over in `zolderpunt-kennismaking` (Lovable +
Vite/React/TypeScript frontend, Supabase edge functions in Deno). De **code is af,
getest en gepusht**; ze staat alleen nog niet live. Jouw taak is die laatste meters:
live zetten, end-to-end testen, en oplossen wat er dan misgaat.

De eigenaar is **Bram Keirsschieter** (Zolderpunt / Belhouse Atelier BV, Belgisch
zolderrenovatiebedrijf). Hij is geen developer — praat in gewone taal, geen jargon,
en geef hem klikinstructies in plaats van commando's tenzij hij erom vraagt.
**Antwoord in het Nederlands.**

## Waar alles staat

| | |
|---|---|
| Repo | `bramkeire-droid/zolderpunt-kennismaking` |
| Branch | `claude/whatsapp-foto-auto-koppelen-l1w0pl` |
| Commit | `993280d` — "WhatsApp-berichten met "tbc" doorsturen naar de mailbox" |
| PR | **#1**, nog **draft**, nog niet gemerged, mergebaar zonder conflicten |
| Basis | `main` op `fb65482`; de branch loopt 1 commit voor, 0 achter |
| Supabase project | `xgrshvqteylncjbfsqbi` |
| Planbestand vorige sessie | `/root/.claude/plans/het-is-in-dit-giggly-russell.md` (bestaat mogelijk niet meer in jouw container) |

## Het probleem dat dit oplost

Bram krijgt 's avonds en in het weekend berichten van klanten en partners die hij
niet meteen wil behandelen, maar wél vergeet als hij er niet onmiddellijk op
reageert. Hij wilde zo'n bericht kunnen doorsturen naar het WhatsApp-nummer dat
deze app al gebruikt voor foto-ingest, en er dan een e-mail over krijgen die als
ongelezen in zijn mailbox blijft staan tot hij terug op kantoor is.

Koppelen aan een dossier hoefde uitdrukkelijk **niet** in deze ronde. Het datamodel
houdt er plaats voor vrij (`inbound_memos.lead_id`, nu altijd `null`), maar er is
bewust geen koppellogica en geen UI voor gebouwd.

## De bestaande architectuur waar dit op inhaakt

Belangrijk om te snappen vóór je iets aanraakt — er zit een bewuste
race-condition-oplossing in die je niet mag breken:

- Een doorgestuurde reeks van 15 foto's komt binnen als **15 aparte Twilio-webhooks**,
  tot een dozijn tegelijk (gemeten: 11 ms uit elkaar). Geen enkele request weet dat
  hij de laatste is.
- Daarom **verzamelt** `inbound-whatsapp` alleen en **beslist** het nooit.
  `flush-inbound-groups` (pg_cron, elke 30 s) beslist ná 45 s stilte, één keer, en
  stuurt één antwoord.
- Vensterstaat zit in `inbound_conversation_state`; de atomaire merge gebeurt in de
  Postgres-functie `touch_inbound_window` met `FOR UPDATE`, precies omdat een
  read-modify-write in applicatiecode foto's verloor.

## Wat er gebouwd is

Zes bestanden, 359 regels erbij, 4 eraf.

### `supabase/migrations/20260801120000_inbound_memos.sql` (nieuw)

Tabel `public.inbound_memos`: `id, source, from_identifier, from_display, subject,
body, kind ('memo'|'unmatched_media'), lead_id, emailed_at, email_attempts,
email_error, created_at`. Grants en RLS gekopieerd van `inbound_media_pending`
(authenticated mag select/update/delete met `USING (true)`, service_role mag alles).
Partiële index `idx_inbound_memos_unsent ON (created_at) WHERE emailed_at IS NULL`,
want de retry-pass leest daar elke 30 s op.

### `supabase/functions/_shared/sendMail.ts` (nieuw, 66 regels)

- `sendMail({subject, text, to?})` → `{ok, error}`. POST naar
  `https://api.postmarkapp.com/email`, header `X-Postmark-Server-Token`,
  `MessageStream: 'outbound'`.
- **Throwt nooit.** Ontbrekende secrets of een 4xx komen terug als `{ok:false, error}`,
  omdat de aanroeper dat in `email_error` wegschrijft en de retry-pass het opnieuw doet.
- `appLink()` → optionele regel met `APP_BASE_URL`; leeg als die secret niet gezet is.
- Env: `POSTMARK_SERVER_TOKEN`, `MEMO_EMAIL_FROM`, `MEMO_EMAIL_TO`
  (default `hello@zolderpunt.be` staat hardcoded in dit bestand).

### `supabase/functions/_shared/ingestMedia.ts` (gewijzigd)

Nieuw, in volgorde van voorkomen:

- `parseMemoCommand(text): string|null` (regel ~64) — herkent prefix uit
  `MEMO_KEYWORDS = ['tbc']`, hoofdletterongevoelig, optionele `:` `,` `.` `-` erachter.
  Geeft de rest terug, `''` bij kaal trefwoord, `null` als het geen commando is.
  **Geankerd op het eerste woord** (`^tbc\b`), zodat een doorgestuurd bericht dat
  toevallig "tbc" bevat niets doet.
- `takeWindowNotes(supabase, source, from)` (~371) — leest `pending_notes` en wist
  **alleen die kolom**. Uitdrukkelijk niet `clearWindow`, want die wist ook
  `pending_media_ids` en dan sneuvelt een lopende fotobatch.
- `MemoRow` / `MemoInput` interfaces, `memoEmailBody(row)` (private).
- `mailMemo(supabase, row)` (~479) — mailt één opgeslagen rij en schrijft de uitkomst
  weg (`emailed_at` bij succes, anders `email_error` + `email_attempts+1`).
- `storeMemo(supabase, memo)` (~496) — alleen de insert, geeft de rij terug.
- `recordMemo(supabase, memo)` (~520) — `storeMemo` + `mailMemo`.
- **`flushGroup` laatste tak gewijzigd** (~660): waar bij nul kandidaten enkel een
  WhatsApp vertrok, wordt nu ook een `recordMemo` met `kind:'unmatched_media'`
  geschreven (aantal foto's, bijschriften, meegestuurde tekst). De WhatsApp-tekst
  meldt er nu bij dat er ook een mail vertrok. **De andere takken van `flushGroup`
  zijn ongemoeid** — een automatische koppeling of een dossierlijst is geen memo.

### `supabase/functions/inbound-whatsapp/index.ts` (gewijzigd)

Eén blok erbij in de no-media-tak, **na** de cijferkeuze en **vóór** `touchWindow`.
Volgorde is essentieel: de cijferkeuze beantwoordt een eerder gestuurde dossierlijst
en moet eerst blijven. Het blok slaat de rij synchroon op met `storeMemo` (snel,
zodat het antwoord eerlijk is) en mailt via `EdgeRuntime.waitUntil` — zelfde patroon
als `inbound-email/index.ts`, nodig omdat Twilio een trage webhook opnieuw aflevert.
`declare const EdgeRuntime` staat bovenaan het bestand.

### `supabase/functions/flush-inbound-groups/index.ts` (gewijzigd)

Retry-lus na de bestaande groepenlus. Constantes `MAX_EMAIL_ATTEMPTS = 5` en
`MAIL_GRACE_SECONDS = 120`. Twee bewuste beschermingen:

1. **Genadeperiode van 2 min** — een memo van seconden oud is waarschijnlijk nog
   onderweg via `waitUntil`, niet mislukt.
2. **Optimistisch claimen** — de rij wordt geclaimd met een update conditioneel op de
   gelezen `email_attempts`, vóór het versturen. Twee overlappende passes kunnen zo
   niet allebei mailen. De **pre-claim** rij gaat naar `mailMemo`, zodat die bij
   falen `attempts+1` schrijft — dezelfde waarde als de claim, dus geen dubbeltelling.

### `src/components/dossier/InboundHint.tsx` (gewijzigd)

`INBOUND_MEMO_KEYWORD = 'tbc'` geëxporteerd, een regel in `INBOUND_HINT_TEXT` en een
extra blok in de kaart. Dit bestand is volgens zijn eigen commentaar de enige plek
waar de doorstuurinstructies staan — hou dat zo.

## Het gedrag, precies

| Wat Bram stuurt | Wat er gebeurt |
|---|---|
| Bericht doorsturen, daarna los `tbc` | De doorgestuurde tekst (uit `pending_notes`) wordt de memo. Antwoord: "📬 Genoteerd. Je krijgt er een e-mail over." |
| `tbc bel de leverancier morgen` | Die tekst wordt de memo. **Het venster blijft ongemoeid** |
| `tbc` zonder dat er iets in het venster staat | "Niets te noteren — stuur eerst het bericht door en antwoord daarna "tbc"." |
| Een cijfer (antwoord op een dossierlijst) | Ongewijzigd, koppelt de foto's |
| Foto's mét herkenbaar dossier | Ongewijzigd |
| Foto's zonder enige kandidaat | WhatsApp-vraag **plus** een memo-mail |
| Foto met bijschrift `tbc ...` | Gaat naar de fotoflow, niet naar de memoflow. Bewust |

Onderwerp van de mail: `📌 TBC — <eerste 70 tekens>` of
`📌 <n> foto('s) zonder dossier`. Body eindigt met afzender, tijdstip in
`Europe/Brussels` en optioneel de `APP_BASE_URL`-link.

**Waarom `tbc <tekst>` het venster met rust laat** — dit was een correctie tijdens de
vorige sessie, wijk er niet van af zonder het met Bram te bespreken. Anders zou
`tbc bel de leverancier` de klantnaam opslokken die hij net voor een fotobatch had
getypt.

## Wat er al geverifieerd is

- `npm run lint` — **nul nieuwe fouten**. De repo heeft een basislijn van 259
  bestaande problemen; die moet zo blijven. De 4 meldingen in `ingestMedia.ts`
  (regel 204 `no-useless-escape`, en drie `no-explicit-any`) bestonden al vóór dit werk.
- `npx tsc --noEmit -p tsconfig.app.json` — schoon
- `npm run build` — groen
- `npm run test` — groen (1 test; **vitest dekt alleen `src/**`**, dus de edge
  functions zitten er niet in — `vitest.config.ts` regelt dat)
- `parseMemoCommand` los nagelopen op 14 gevallen, inclusief wat níét mag matchen:
  `nog tbc voor de trap` → `null`, `tbcx iets` → `null`, `3` → `null`

**Nooit end-to-end gedraaid.** Er is geen CI in de repo (nul GitHub Actions-workflows),
dus de PR heeft geen checks en krijgt die ook niet.

## Wat er NIET gedaan is — jouw werk

### 1. Postmark (bij Bram, mogelijk al klaar als je dit leest)

De belangrijkste ontdekking uit de laatste ronde: **in zijn Postmark staat alleen
`info@belhouse-atelier.be` als geconnecteerde/geverifieerde afzender.** `zolderpunt.be`
is niet als domein geverifieerd.

Gevolg: `MEMO_EMAIL_FROM` moet `info@belhouse-atelier.be` zijn, tenzij hij eerst
`zolderpunt.be` verifieert met DKIM. Dat eerste is de snelste weg en vergt geen DNS-werk.

Let op de verwarring die hij zelf had, en corrigeer die als ze terugkomt: een Sender
Signature gaat **alleen** over het uitgaande afzenderadres. Het beperkt op geen enkele
manier wie foto's naar `fotos@inbox.zolderpunt.be` of naar WhatsApp mag sturen.

**Risico dat nog niet uitgesloten is:** deze Postmark-server doet vandaag alleen
*inbound*. Als het account nooit voor outbound is goedgekeurd, staat het mogelijk in
de beperkte modus waarin je alleen naar geverifieerde adressen mag sturen. Dan wordt
mail naar `hello@zolderpunt.be` geweigerd. Merk je dat: laat hem in Postmark de
outbound-status nakijken, of zet `MEMO_EMAIL_TO=info@belhouse-atelier.be` als
tussenoplossing.

### 2. Secrets zetten (bij Bram)

`https://supabase.com/dashboard/project/xgrshvqteylncjbfsqbi/settings/functions`

| Secret | Nodig | Waarde |
|---|---|---|
| `POSTMARK_SERVER_TOKEN` | ja | Server API Token van de server die de inbound al doet (`account.postmarkapp.com/servers` → server → tab **API Tokens**) |
| `MEMO_EMAIL_FROM` | ja | `info@belhouse-atelier.be` |
| `MEMO_EMAIL_TO` | nee | Default `hello@zolderpunt.be` zit in `sendMail.ts` |
| `APP_BASE_URL` | nee | Alleen voor de link in de mail |

### 3. PR mergen (jij)

PR #1 uit draft halen en mergen naar `main`.

### 4. Migratie en functies live zetten (jij — HIER ZIT DE ONBEKENDE)

**Dit is de openstaande vraag waar de vorige sessie niet uit kwam.** De tabel
`inbound_memos` moet bestaan en `inbound-whatsapp` + `flush-inbound-groups` moeten
opnieuw uitgerold. Onbekend is of Lovable de map `supabase/` automatisch meeneemt bij
een push naar `main`, of dat er een handmatige `supabase db push` /
`supabase functions deploy` bij hoort. Er zit geen CI in de repo die het doet.

Zoek dit als eerste uit. Aanwijzingen: eerdere commits in dit project bevatten wél
migraties en edge functions ("Migratie functies toegevoegd", "Migratie bijgewerkt"),
dus de weg bestaat — alleen is niet vastgesteld welke. Vraag het desnoods gewoon aan
Bram, of controleer na de merge of de tabel verschenen is.

### 5. End-to-end testen (jij, samen met Bram)

1. **Sandbox opnieuw joinen.** Twilio-sandboxsessies verlopen na 72 uur. `join check-pocket`
   naar `+1 415 523 8886`.
2. Bericht doorsturen → los `tbc` → verwacht "📬 Genoteerd" en een mail.
3. `tbc bel de leverancier morgen` → mail, venster ongemoeid.
4. Foto's met een klantnaam → controleer dat de normale koppeling of de dossierlijst
   nog werkt. Dit is de regressietest die telt.
5. Foto's met een onzinnige naam → WhatsApp-vraag **en** een mail met
   `kind='unmatched_media'`.

Gaat er iets mis: de reden staat in `inbound_memos.email_error` en in de
Supabase-functielogs. Meest waarschijnlijk een Postmark `422` — dan klopt de
afzender niet.

## Conventies in deze repo

- **UI-teksten en commitberichten in het Nederlands.** Code en codecommentaar in het Engels.
- Commentaar legt **waarom** uit, niet wat. Kijk naar de bestaande blokken in
  `ingestMedia.ts` en `flush-inbound-groups/index.ts` — die beschrijven telkens de
  bug of race die de code voorkomt. Schrijf in diezelfde toon.
- Geen nieuwe lint-fouten toevoegen; de basislijn is 259.
- Edge functions die publiek zijn moeten in `supabase/config.toml` op
  `verify_jwt = false`. Voor deze feature is dát niet nodig — er kwam geen nieuwe
  functie bij.
- Bram werkt met Lovable; wijzigingen die hij daar maakt komen ook in deze repo terecht.
  Controleer bij het starten of `main` intussen verschoven is.

## Eerste zet

Begin met stap 4 (uitzoeken hoe de deploy loopt) en meld wat je vindt vóór je merget.
Merge daarna PR #1 en loop de testlijst af.

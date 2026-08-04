# Zolderpunt Compass — Bouwflow-fase (Chrome-extensie)

Zet de projectfase in Bouwflow zodra je een dossier in Compass naar een andere
kolom sleept en de bevestiging accepteert.

## Waarom een extensie en niet gewoon de API?

Bouwflow's publieke API **kan de fase van een bestaand project niet wijzigen**.
Live getest op 4 aug 2026:

| Weg | Resultaat |
|---|---|
| `PATCH /public-api/projects/{id}` met `project_phase_id` | HTTP 200, maar fase blijft ongewijzigd (8 → 8) |
| Alle 65 API-endpoints | Geen enkel endpoint wijzigt de fase van een bestaand project |
| `project_phase_id` bij `POST` | Wél schrijfbaar — maar alleen bij aanmaken |
| Bouwflow's eigen UI | Werkt, via `POST /livewire/update` |

Livewire is stateful: elke call draagt een server-gegenereerde snapshot met een
HMAC-checksum plus CSRF-token en sessiecookie. Dat van buitenaf namaken is niet
betrouwbaar en breekt bij elke Bouwflow-update. Daarom bedient een echte,
ingelogde browser gewoon de echte pagina — dezelfde conclusie als de
`zolderpunt-uren-robot` (Playwright) en de InvenSync-extensie.

## Installeren

1. Open `chrome://extensions`
2. Zet **Ontwikkelaarsmodus** aan (rechtsboven)
3. Klik **Uitgepakte extensie laden** en kies deze map (`chrome-extension`)
4. Zorg dat je in dezelfde browser ingelogd bent op `zolderpunt.bouwflow.be`

Er zijn geen instellingen en geen wachtwoorden: de extensie gebruikt de
Bouwflow-sessie die al in je browser zit.

## Hoe het werkt

1. Je sleept een dossier naar een andere kolom in Compass → bevestigingspopup.
2. Compass stuurt `SET_PHASE` naar de extensie (via `window.postMessage`).
3. De extensie opent/hergebruikt een Bouwflow-tabblad op de projectenlijst,
   gefilterd op het ZL-nummer, en zet daar de fase-select. Die select is een
   gewone `<select>` met de fase-id als option-value, aangestuurd door Alpine
   (`x-model="state"`) — vandaar de native setter plus `input`/`change`-events.
4. Compass controleert daarna **onafhankelijk** via Bouwflow's API of de fase
   er echt staat (lezen kan wél), en verplaatst het dossier alleen dan.

Die laatste stap is bewust: een RPA kan stilletjes falen. Compass gelooft de
extensie niet op haar woord, dus je ziet nooit een verplaatsing in Compass die
in Bouwflow niet echt gebeurd is.

## Als het niet werkt

- **"Extensie niet gevonden"** — niet geïnstalleerd, of je zit op een
  Compass-URL die niet in `manifest.json` staat onder `content_scripts.matches`.
- **"Niet ingelogd in Bouwflow"** — log in op `zolderpunt.bouwflow.be` in
  dezelfde browser en probeer opnieuw.
- **"Bouwflow staat niet op de gevraagde fase"** — de UI-wijziging is niet
  doorgekomen. Compass laat het dossier dan bewust staan. Pas de fase handmatig
  aan in Bouwflow; de eerstvolgende sync haalt Compass weer gelijk.

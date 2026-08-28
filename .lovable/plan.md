# Dossier-hoofdpagina + altijd terug naar het dossier

## Wat er nu misloopt

Klik je een dossier open, dan land je op `briefing` — de voorbereidingspagina van het intakegesprek ("Briefing intakegesprek", scenario & afspraak, vragen van de klant). Dat is een werkscherm voor één moment in het traject, geen overzicht van het dossier. Er bestaat vandaag geen view die het dossier als geheel toont.

Daarnaast: de dossierbalk bevat wel knoppen naar elk tabblad (Communicatie, Foto's, Telefoongesprek, Intakegesprek, Portaal, ...), maar geen enkele knop terug naar het dossier zelf. De dossiernaam links in de balk is platte tekst, geen link. Sta je in Communicatie of het telefoongesprek, dan is er geen weg terug behalve het dossier sluiten en opnieuw zoeken.

## De nieuwe hoofdpagina

Nieuwe view `dossier`: dit wordt wat opent als je een dossier aanklikt (in plaats van de briefing). Eén scrollbare pagina, drie kolommen op breed scherm, gestapeld op mobiel.

```text
Wijnants Jozefien · Wenduinesteenweg 111, De Haan · #ZL-0135     [status: Telefoongesprek gehad]
──────────────────────────────────────────────────────────────────────────────────────────
KLANT & WERF          |  VOLGENDE STAP              |  WAARDE
naam, tel, mail       |  "Videocall 31/8 13:00"     |  richtprijs / calculatie
adres, gevonden via   |  [Bekijk afspraak]          |  marge, laatste berekening
aanvraag via website  |                             |
──────────────────────────────────────────────────────────────────────────────────────────
TIJDLIJN (recent)     |  WAT WE WETEN               |  MEDIA
mails, calls, wa      |  Wat? welke aannemer?       |  laatste foto's/video's
beslissingen          |  waarom nu? welk budget?    |  aangeleverd door klant
[Alles in Communicatie]  vragen van de klant        |  [Alle foto's]
──────────────────────────────────────────────────────────────────────────────────────────
ANDERE DOSSIERS VAN DEZE KLANT   |   PORTAAL-status   |   Bouwflow-status/fase
```

Principes:
- Alleen samenvatten en doorverwijzen; elk blok heeft één knop naar het tabblad waar je verder werkt. Geen bewerken op deze pagina, behalve de status/fase.
- Blokken zonder inhoud worden niet getoond (geen lege kaders).
- Bovenaan één primaire actie die meebeweegt met de status: geen gesprek gehad → "Telefoongesprek starten"; wel gebeld, geen intake → "Start intakegesprek"; intake gehad → "Offerte & bijlage".

De briefing verdwijnt niet: die blijft bereikbaar via de knop "Intakegesprek" in de dossierbalk en via de primaire actie.

## Altijd terug naar het dossier

- De dossiernaam links in de dossierbalk wordt een klikbare knop terug naar de hoofdpagina, met mapicoon, en krijgt een actieve markering wanneer je er al bent.
- Elke knop in de dossierbalk krijgt een actieve staat, zodat je ziet in welk tabblad van het dossier je zit.
- In het hamburgermenu wordt "Terug naar dossier — naam" gericht op deze hoofdpagina.
- Dit werkt vanuit alle views die een actief dossier hebben: communicatie, briefing, telefoongesprek, transcriptvalidatie, slides, kanban.

## Technisch

- Nieuwe view `'dossier'` in `AppView` (`src/App.tsx`); `handleOpen`/`onOpenLead` uit `src/pages/Dossiers.tsx` zet voortaan `activeDossierId` en `view='dossier'` in plaats van `briefing`.
- Nieuw `src/pages/DossierOverzicht.tsx`: laadt in één keer de lead, `pre_intake`, communicatie-items, calculatiehistoriek en media; rendert de blokken hierboven. Hergebruikt bestaande componenten waar die er zijn (`KlantDossiers`, `CalculatieHistoriek`, `AangeleverdDoorKlant`, `BouwflowSyncStatus`, `MediaThumb`, `bepaalVolgendeActie`/`dossierWaarde` uit `src/lib/pipeline.ts`).
- `AppNavContext` krijgt `onOpenDossier(leadId)`; `AppShell`/`DossierActionsBar` gebruiken dat voor de klikbare dossiernaam. `HoofdMenu`'s "Terug naar dossier" wijst naar dezelfde handler.
- `DossierActionsBar` krijgt een prop `actief?: string` om de huidige tab te markeren; `AppShell` geeft die door op basis van `view`.
- Geen schemawijzigingen, geen wijziging aan opslaglogica, autosave of edge functions. Alleen lees-queries op bestaande tabellen.
- Na afloop: typecheck, build, en een doorloop van dossier → communicatie → telefoongesprek → terug naar dossier op 1857px en mobiel.

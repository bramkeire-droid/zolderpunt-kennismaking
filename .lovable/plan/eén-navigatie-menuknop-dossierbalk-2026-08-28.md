# Eén navigatie: menuknop + dossierbalk

## Wat er nu misloopt

Er zijn vandaag vier concurrerende balken die elkaar overlappen:

- `NavigationBar` (logo, "Nieuw dossier"-dropdown, Dossiers, Leveranciers, Beheer, "Terug naar dossier — naam", uitloggen)
- `AppTopBar` (logo "zolderpunt.", titel, "Naar dossiers", primaire actie, uitloggen) — op briefing en transcriptvalidatie
- Een eigen, met de hand nagebouwde kopbalk in het telefoongesprek (opnieuw "Naar dossiers" + uitloggen)
- `DossierActionsBar` (dossiernaam + 8 acties + Teamchat + "Naar dossiers") en daarnaast nog `LeadActionBar` met bijna dezelfde acties op het kanbanbord

Gevolg: "Naar dossiers" staat tot drie keer op één scherm, uitloggen twee keer, de dossiernaam twee keer, en op sommige pagina's staan er drie balken boven elkaar.

## Nieuwe structuur

Overal precies twee balken, nooit meer:

```text
[≡]  zolderpunt.        Pagina-titel · context            [primaire actie] [avatar/uit]
─────────────────────────────────────────────────────────────────────────────
[dossier] Naam klant · adres      Communicatie Foto's Telefoon Intake ... [×]
```

1. **Rij 1 — App-balk (altijd).** Links een menuknop (hamburger) met logo. In het midden de titel van waar je bent. Rechts hooguit één primaire actie van die pagina plus het gebruikersmenu (uitloggen zit daarin, niet los).
2. **Rij 2 — Dossierbalk (alleen met een actief dossier).** Naam + adres van het dossier, dan de dossieracties, en één kruisje om het dossier los te laten. Dit is de enige plek waar de dossiernaam en dossieracties staan.

### De menuknop

Klik op ≡ opent een paneel (sheet vanaf links) met alle globale navigatie, gegroepeerd:

- **Nieuw**: Leeg dossier · Telefoongesprek · Videocall intake
- **Werken**: Dossiers · Leveranciers · Beheer (alleen admin)
- **Actief dossier** (indien aanwezig): Terug naar dossier — naam · Dossier sluiten
- Onderaan: ingelogde gebruiker + Uitloggen

Daarmee verdwijnen uit de kopbalk: de "Nieuw dossier"-dropdown, de losse tabs Dossiers/Leveranciers/Beheer, de "Terug naar dossier"-chip en de losse uitlogknop.

### Wat wordt opgeruimd

- `AppTopBar` en de handgemaakte kopbalk in het telefoongesprek verdwijnen; beide gebruiken de nieuwe app-balk. Hun primaire acties blijven bestaan ("Start intakegesprek", "Opslaan") maar staan nu op de vaste plek rechts.
- `LeadActionBar` op het kanbanbord verdwijnt: bij het aanklikken van een kaart verschijnt gewoon de gedeelde dossierbalk bovenaan.
- "Naar dossiers" bestaat nog maar op één plaats: via het menu (Dossiers). De dossierbalk krijgt enkel een kruisje om te sluiten.
- De startpagina blijft, maar de knoppenlijst daar wordt exact dezelfde bewoording en volgorde als in het menu.
- De slide-teller ("Slide 3 / 7") en `ExtraInfoMenu` blijven, maar verhuizen naar de rechterkant van de app-balk binnen de slide-flow.

## Technisch

- Nieuw `src/components/AppShell.tsx`: rendert app-balk + optionele dossierbalk + children. Props: `titel`, `subtitel`, `primair`, `rechtsExtra`, `dossierId`, `dossierBron`.
- Nieuw `src/components/HoofdMenu.tsx`: shadcn `Sheet` met de menugroepen; krijgt de bestaande handlers uit `App.tsx` (`handleNewCall`, `handleNewIntake`, `handleGoDossiers`, `setView('leveranciers'|'beheer')`, `handleGoActiefDossier`, `handleSluitDossier`, `signOut`).
- `src/App.tsx`: alle views (`slides`, `dossiers`, `beheer`, `leveranciers`, `communicatie`, `briefing`, `calling`, `validation`) renderen via `AppShell`; `NavigationBar` en de losse `dossierBar`-aanroepen verdwijnen. `activeDossierId` / `activeDossierNaam` blijven zoals ze nu werken.
- `DossierActionsBar` behoudt alle acties en dialogen; enkel "Naar dossiers" wordt vervangen door een sluitkruisje, en de component wordt alleen nog via `AppShell` gerenderd.
- Verwijderen: `src/components/NavigationBar.tsx`, `src/components/AppTopBar.tsx`, `src/components/dossier/LeadActionBar.tsx`, en hun imports in `IntakeBriefing.tsx`, `TranscriptValidation.tsx`, `Dossiers.tsx`, `LiveCalling.tsx`.
- Geen wijzigingen aan opslaglogica, autosave, of backend. `handleSaveDossier`, `flushSave` en de `beforeunload`-afhandeling in `LiveCalling` blijven ongewijzigd.
- Controle na afloop: typecheck, build, en een preview-doorloop van elk van de acht views op 1857px en op mobiel.

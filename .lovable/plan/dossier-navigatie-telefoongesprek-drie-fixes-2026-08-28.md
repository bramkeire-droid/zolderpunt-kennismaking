# Dossier-navigatie & telefoongesprek: drie fixes

## 1. Bevestigingsmail mag geen "data gaat verloren"-waarschuwing geven

De knop "Bevestigingsmail" in het telefoonscherm is een gewone `mailto:`-link zonder `target`. De browser ziet dat als het verlaten van de pagina en triggert de `beforeunload`-waarschuwing van LiveCalling.

Fix: de mailto-link opent voortaan zonder de pagina te verlaten (eigen tabblad/handler), en de `beforeunload`-bewaking wordt kort onderdrukt rond het openen van externe links (mailto en Calendly). Het scherm en alle ingevulde data blijven staan.

## 2. "Opslaan" blijft op het telefoonscherm

`handleSaveDossier` navigeert nu na het opslaan naar de transcript-validatiepagina (of naar dossiers). Dat wordt geschrapt: opslaan slaat op, toont de bevestiging en laat je exact staan waar je bent — timer blijft gepauzeerd/lopend zoals nu, velden blijven ingevuld. Verlaten doe je bewust via "Naar dossiers" of via de dossieractiebalk.

## 3. Overal "in het dossier blijven"

Vandaag hangt het geopende dossier aan `activeDossierId` in `App.tsx`, en de dossieractiebalk verschijnt alleen op briefing, slides, telefoongesprek en communicatie. Hij verdwijnt zodra je ergens anders komt, en wordt gewist bij elke navigatie naar het dossieroverzicht.

Wat er verandert:

- Het actieve dossier blijft onthouden tot je bewust een ander dossier opent of het sluit. Naar het overzicht of de homepagina gaan wist het niet meer.
- De dossieractiebalk (naam, adres, Communicatie, Foto's, Telefoongesprek, Intakegesprek, Portaal, Calculator, Voorblad, Offerte, Teamchat) verschijnt op elke dossiergebonden weergave, inclusief de transcript-validatiepagina.
- In de navigatiebalk komt, zolang er een actief dossier is, een knop "Terug naar dossier — <naam>" waarmee je vanaf het overzicht, de homepagina, leveranciers of beheer meteen terug in dat dossier springt zonder opnieuw te zoeken. Daarnaast een klein kruisje om het actieve dossier los te laten.
- Wanneer je in een leeg dossier via het intakescherm een klant opslaat en er dus een dossier-id ontstaat, wordt dat meteen het actieve dossier, zodat de actiebalk ook daar verschijnt.

## Technische details

- `src/pages/LiveCalling.tsx`: mailto via klik-handler + `externeNavigatieRef` die `beforeunload` en de "onbewaard werk"-vraag kort overslaat; `handleSaveDossier` eindigt met een toast in plaats van `onOpenValidation`/`onGoDossiers`.
- `src/App.tsx`: `activeDossierId` niet meer wissen in `handleGoHome`/`handleGoDossiers`/`handleNewCall`; wel wissen in `handleNewIntake` en bij een expliciete sluitactie. `dossierBar` toevoegen aan de `validation`-view. Nieuwe prop op `NavigationBar` voor de "Terug naar dossier"-knop met `onGoActiefDossier` en `onSluitDossier`.
- `src/components/NavigationBar.tsx`: de knop tonen op basis van dossier-id + naam (naam via bestaande lead-fetch in de bar of doorgegeven vanuit App).
- `src/contexts/SessionContext` / `useLeadSave`: bij het aanmaken van een nieuw lead-id dit doorgeven zodat App het als actief dossier zet (via bestaande callback of een lichte state-sync, zonder de opslag-logica te wijzigen).
- Geen databasewijzigingen, geen edge functions, niets publiceren.

# Dossier-actiebalk op de dossierpagina zelf

Het doel: zodra je een specifiek dossier opent, staan bovenaan dat dossier alle acties voor dát dossier klaar. Niet in het overzicht, maar op de dossierpagina.

## Wat er verandert

1. **Overzicht terug zoals het was**: klikken op een rij in de tabel opent gewoon het dossier (zoals vroeger). In kanban blijft klikken selecteren met de bestaande balk, of opent ook direct — zie vraag hieronder.

2. **Actiebalk op de dossierpagina**: direct onder de hoofdnavigatie verschijnt, zolang er een dossier open is, een vaste balk met de naam/adres van dat dossier en knoppen:
   - Foto's
   - Telefoongesprek
   - Intakegesprek (videocall)
   - Portaal
   - Calculator (los van de intake)
   - Voorblad
   - Offerte & bijlage
   - Terug naar dossiers

3. De balk is zichtbaar op alle dossierschermen: de briefingpagina, de intake-slides en het telefoongesprekscherm. Overal dezelfde balk, dezelfde plek.

4. Foto's, portaal, calculator, voorblad en offerte openen als dialoog bovenop de pagina — je verliest je plek in het dossier niet. Telefoongesprek en intakegesprek navigeren zoals nu.

## Technisch

- `LeadActionBar` wordt hergebruikt, uitgebreid met een variant zonder sluitknop en met "Naar dossiers".
- In `src/App.tsx` komt een `activeDossierLead` state (gevuld door `handleOpenLead`, `handleOpenCall`, `handleStartVideocall` — geladen via een `leads`-select op id wanneer alleen een id bekend is). De balk rendert onder `NavigationBar` in de briefing-, slides- en calling-view.
- De dialogen `PhotoUploadDialog`, `PortalManageDialog` + `PortalPreview`, `CalculatorDialog`, `GenericVoorbladDialog` en `OffertebijlageDialog` worden op App-niveau gemount, gestuurd door één `dossierDialog`-state. Ze krijgen dezelfde props als in `Dossiers.tsx`; updates verversen de lokale kopie van de lead.
- In `src/pages/Dossiers.tsx` gaat de tabelrij-klik terug naar `handleOpen(lead)`; de per-view actiebalk-logica die vorige beurt is toegevoegd wordt teruggedraaid (kanban houdt zijn huidige gedrag).
- `LiveCalling` rendert zijn eigen topbalk; daar wordt de actiebalk eronder ingevoegd zodat de opmaak niet botst.

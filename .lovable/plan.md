
Probleemanalyse

- Ik heb de code in `src/slides/Slide4.tsx`, `src/hooks/useLeadSave.ts` en de werkende save-flow bekeken.
- Do I know what the issue is? Yes.
- De 3 gewone Opslaan-knoppen roepen `saveFeit(idx)` aan. Die flow werkt met lokale draft state (`inputs`), wist het invulveld, toont de save-animatie en voegt daarna pas een opgeslagen post-it toe aan `lead.project_feiten`.
- De label-knop doet iets totaal anders: die roept `saveLead()` aan.
- `saveLead()` maakt geen label-post-it aan, wist geen invoerveld, triggert de bestaande `saveFeit`-animatie niet, en kan zelfs stil niets doen wanneer `voornaam`, `achternaam`, `adres` en `email` nog leeg zijn.
- Daarbovenop wordt labeltekst nu al rechtstreeks in `lead.project_feiten` geschreven via `updateLabelText(...)` tijdens het typen. Daardoor bestaat er voor labels nu geen echte draft → save stap.
- Labels worden ook uitgesloten van de bestaande saved post-it lijst via `regularFeitjes`, dus er is momenteel nergens een “opgeslagen labelkaartje” dat na de klik kan verschijnen.

Kort: de labelknop is niet alleen verkeerd gekoppeld; de hele label-saveflow is anders opgebouwd dan de gewone tekstkaders. Daarom voelt het alsof er “niets gebeurt”.

Plan

1. `src/slides/Slide4.tsx` refactoren zodat labels exact dezelfde save-logica volgen als de gewone tekstkaders:
   - labeltekst niet meer direct in `project_feiten` muteren tijdens typen
   - aparte lokale draft state voor labels toevoegen
   - een `saveLabel(...)` functie maken, gemodelleerd op `saveFeit(idx)`

2. Label-flow opsplitsen in draft en saved:
   - bij klik op de foto: nummer + positie + foto-koppeling in een pending label zetten
   - rechts een invulkader tonen voor dat pending label
   - pas na klik op “Opslaan” een echt `FeitjeItem` aan `project_feiten` toevoegen

3. Visueel dezelfde actie geven als de andere Opslaan-knoppen:
   - textarea committen
   - input vervangen door een opgeslagen post-it kaartje
   - labelnummer zichtbaar houden op het kaartje én op de foto
   - delete moet kaartje en marker samen verwijderen

4. Verkeerde koppeling verwijderen:
   - de labelknop niet langer `saveLead()` laten aanroepen
   - indien mogelijk `useLeadSave` uit `Slide4` halen om dubbele autosave-hooks te vermijden, omdat de algemene saveflow al via de slide-layout loopt

Bestand dat wijzigt

- `src/slides/Slide4.tsx`

Verwacht resultaat

- klik op foto → label-input verschijnt
- tekst typen → klik “Opslaan” → exact dezelfde commit-ervaring als de andere tekstkaders
- daarna verschijnt een opgeslagen genummerd post-it kaartje dat gekoppeld blijft aan de marker op de foto
- bestaande autosave/manual save kan daarna de volledige lead normaal bewaren

Controle na implementatie

- label plaatsen op een foto
- tekst invullen en op “Opslaan” klikken
- bevestigen dat het invulkader verandert in een saved kaartje
- bevestigen dat het nummer op de foto blijft staan
- delete testen
- pagina herladen of navigeren om te controleren dat het opgeslagen label behouden blijft



# Fix: Opslaan-knop bij labels mist onClick handler

## Probleem

De "Opslaan"-knop bij de label invoervelden heeft geen `onClick` handler — het is een lege `<Button>` zonder actie. De tekst wordt wel live opgeslagen via `onChange` in het geheugen, maar niet naar de database gepersisteerd bij klikken.

## Oplossing

In `src/slides/Slide4.tsx`:

1. Importeer en gebruik de `useLeadSave` hook (die al in het project zit) om de `saveLead` functie beschikbaar te maken
2. Voeg `onClick={() => saveLead()}` toe aan de Opslaan-knop bij labels (regel 302-308)
3. Doe hetzelfde voor de 3 reguliere feitje-opslaan-knoppen als die het ook nog niet hebben — consistentie

De `saveLead()` functie persist de hele lead (inclusief `project_feiten` met labels) naar de database en toont een toast "Opgeslagen".

### Wijziging

**`src/slides/Slide4.tsx`:**
- Bovenaan: `const { saveLead } = useLeadSave();`
- Label opslaan-knop: `onClick={() => saveLead()}`

**1 bestand wijzigt.**


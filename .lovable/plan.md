

# Opslaan-knop toevoegen aan label invoervelden

## Wat verandert

In `src/slides/Slide4.tsx`, regel ~301: na de `<textarea>` en vóór de verwijder-knop (`<X>`) wordt een "Opslaan"-knop toegevoegd, vergelijkbaar met de bestaande opslaan-knoppen bij de 3 reguliere feitje-velden.

De label tekst wordt al live opgeslagen via `updateLabelText` bij elke `onChange`. De opslaan-knop geeft visuele bevestiging en kan optioneel een toast/feedback tonen. De knop is disabled wanneer het tekstveld leeg is.

### Technische aanpak

- Voeg een `<Button size="sm">` toe tussen de textarea en de X-knop in de `activeLabels.map()` loop (regel ~301)
- Stijl consistent met de bestaande "Opslaan" knoppen bij de reguliere feitjes (zelfde `self-stretch`, `px-3`, `text-xs`)
- Knop tekst: "Opslaan", disabled als `label.tekst.trim()` leeg is

**1 bestand wijzigt:** `src/slides/Slide4.tsx`


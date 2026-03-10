

# Wijzigingen Zolderpunt Intake App

## Samenvatting

8 concrete wijzigingen op basis van feedback, plus visuele afstemming op zolderpunt.be.

---

## 1. Geen verplichte velden, aparte "Opslaan" knop

**Slide 0A + 0B**: Verwijder alle `*` (verplicht) markeringen. Voeg een aparte "Opslaan" knop toe naast de bestaande navigatieknoppen. De opslaan-knop is een duidelijke blauwe knop met tekst "Opslaan" die de huidige data persisted (nu naar sessionState, later naar Supabase). Dit is gescheiden van "Volgende" navigatie.

**Implementatie**: Pas `SlideNavButtons.tsx` aan zodat slides een optionele `onSave` callback kunnen doorgeven, OF voeg de opslaan-knop direct in de slide-inhoud. Beter: voeg een `showSave` prop toe aan `SlideLayout` die een "Opslaan" knop rendert in de navigatiebalk.

---

## 2. Slide 0B: Verwijder type project dropdown

Verwijder de `project_type` Select/dropdown volledig uit Slide0B. Het veld `project_type` blijft bestaan in de data maar wordt niet meer op deze slide getoond.

---

## 3. Nieuw veld: Project Timing

Voeg aan `LeadData` toe: `project_timing: string` (default `''`).

Op Slide 0B (of 0A), voeg een tekstveld toe:
- Label: "Project timing"
- Placeholder: "De klant wil het project afronden tegen periode 'x' omwille van 'y'"

---

## 4. Slide 2A: Klikbare stappen met afbeeldingen

Elke stap in de tijdlijn wordt klikbaar. Bij klik opent een overlay/modal met 1-2 referentieafbeeldingen die de stap visueel illustreren. De achtergrond vervaagt (backdrop blur). Gebruik placeholder-afbeeldingen met beschrijvende tekst per stap (later te vervangen door echte foto's).

---

## 5. Nieuwe slide: "Hoe heb je Zolderpunt gevonden?"

Verplaats de `gevonden_via` dropdown uit Slide 0A naar een nieuwe **dedicated slide** die na de klantgegevens-slide komt.

**Nieuwe slide "0A2"** (tussen 0A en 0B):
- Titel: "Hoe heb je Zolderpunt gevonden?"
- Grote klikbare kaartjes (geen dropdown) met de opties
- Bij klik op een kaartje: achtergrond vervaagt, kaartje wordt geselecteerd met blauw kader
- Opties als cards in een grid, visueel aantrekkelijk voor live gesprek

**Slide order update**: `0A → 0A2 → 0B → 0C → ...`

---

## 6. Slide 3: Bewerkbare velden voor ontbrekende data

Momenteel toont Slide 3 data read-only. Wijzig naar bewerkbare modus: elk ontbrekend veld toont een inline input zodat Bram het live kan invullen. De InfoRow component krijgt een edit-mode met een Input veld.

---

## 7. Slide 7 (Jouw keuze): Meer visualisatie + tekst correctie

- Voeg iconen toe aan de 3 opties (Calendar, Users, MessageSquare uit Lucide)
- Optie 3 tekst wijzigen naar: "Ik vraag feedback over je beslissing om onze dienstverlening alsmaar te verbeteren"
- Meer visuele impact: grotere iconen, duidelijkere actieve state

---

## 8. Visuele afstemming op zolderpunt.be

Na inspectie van zolderpunt.be:

**Knoppen**: `rounded-none` (geen afgeronde hoeken, gewone rechthoeken). Pas `button.tsx` aan: vervang `rounded-md` door `rounded-none` in de base variant. Alle size-variants ook `rounded-none`.

**Input velden**: Ook `rounded-none` op `input.tsx`, consistent met de website.

**Kaartjes** op slides (tech options, next step options): `rounded-none` i.p.v. `rounded-xl`.

**Navigatiebar tabs**: `rounded-none`.

**Algemene stijl**: Meer recht, strak, zakelijk. De website gebruikt scherpe hoeken overal.

---

## Bestanden die wijzigen

| Bestand | Wijziging |
|---|---|
| `SessionContext.tsx` | Voeg `project_timing` toe aan LeadData + SlideId `'0A2'` toevoegen aan SLIDE_ORDER |
| `Slide0A.tsx` | Verwijder `*` markers, verwijder gevonden_via dropdown, voeg opslaan-knop toe |
| **Nieuw: `Slide0A2.tsx`** | Dedicated "Hoe heb je ons gevonden" slide met kaartjes |
| `Slide0B.tsx` | Verwijder project_type dropdown, voeg project_timing veld toe, voeg opslaan-knop toe |
| `Slide2A.tsx` | Klikbare stappen met modal/overlay voor afbeeldingen |
| `Slide3.tsx` | Bewerkbare velden voor ontbrekende data |
| `Slide7.tsx` | Iconen, tekst correctie optie 3 |
| `button.tsx` | `rounded-md` → `rounded-none` |
| `input.tsx` | `rounded-md` → `rounded-none` |
| `SlideLayout.tsx` | Voeg optionele opslaan-knop toe |
| `SlideNavButtons.tsx` | Opslaan-knop naast navigatie |
| `App.tsx` | Import Slide0A2, toevoegen aan SLIDE_COMPONENTS |
| `index.md` (memory) | Update met nieuwe regels (rechte hoeken, geen verplichte velden) |


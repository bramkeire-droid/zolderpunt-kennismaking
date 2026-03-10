# Zolderpunt Intake App — Implementation Plan

## Overview

A professional 4-mode web app for Zolderpunt (Belgian attic renovation company) that guides owner Bram through client intake calls via screen sharing. Built with Supabase backend for auth, database, and storage.

---

## Phase 1: Foundation & Design System

### Setup

- Install Google Fonts: **Space Grotesk** (headlines) and **Rethink Sans** (body)
- Copy SVG logo files to `src/assets/` (blue logo, black logo, beeldmerk)
- Configure CSS custom properties with Zolderpunt brand colors (#008CFF, #2B6CA0, #F8F3EB, #1A1A2E)
- Build reusable components: `SlideLayout`, `SlideLabel`, `NavigationBar`, `SlideNavButtons`, decorative 40° angle element

### Navigation Bar (persistent, 72px)

- Zolderpunt SVG logo left
- Mode tabs: Voorbereiding / Gesprek / Rapport / Dossiers
- Active slide indicator
- Keyboard navigation (← →) for slide changes

---

## Phase 2: Supabase Backend

### Enable Lovable Cloud with Supabase

- **Auth**: Email/password login, multi-user support
- **Database tables**: `leads`, `lead_fotos`, `lead_technisch` (as specified)
- **Storage bucket**: `lead-fotos` for photo uploads
- **RLS policies**: Users see only their own leads (`created_by = auth.uid()`)

### Login Screen

- Full-screen warm white background with decorative 40° blue element
- Centered Zolderpunt SVG logo
- Email + password fields, blue "Inloggen" button

### Start Screen (post-login)

- Large centered logo
- "Nieuw intakegesprek starten →" (primary blue button)
- "Dossiers bekijken →" (secondary button)

---

## Phase 3: Modus 1 — Voorbereiding (Slides 0A–0D)

Dark header indicator "VOORBEREIDING" — internal only, not shared with client.

### Slide 0A: Klantdossier

- Form: voornaam, achternaam, email, telefoon, gevonden_via (dropdown), gezocht_naar, notities
- Auto-creates lead record in Supabase when name filled in

### Slide 0B: Projectinfo

- Address field with Google Maps embed
- Surface area (m²), project type dropdown
- Multi-file photo upload → Supabase Storage with thumbnail previews

### Slide 0C: Technische voorconfiguratie

- 2×4 grid of checkbox cards (trap, dakraam, airco, draagmuur, badkamer, kasten, elektriciteit, dakconstructie)
- Pre-configures calculator on next slide

### Slide 0D: Calculator

- Integrate the existing `ZolderpuntCalculator.jsx` with full calculation logic preserved
- Pre-fill from Supabase data (oppervlakte, technische selections)
- Auto-save budget results on every change (budget_min, budget_max, budget_incl6, budget_incl21, inbegrepen_posten)
- Remove "Exporteer JSON" button

---

## Phase 4: Modus 2 — Gesprek (Slides 1–7)

Clean, large slides designed for screen sharing. Minimal text per slide.

### Slide 1: Welkomstslide

- Full blue (#008CFF) background, white logo centered
- "Welkom, [Voornaam]." headline, warm subtitle
- Decorative 40° element in #2B6CA0 bottom-right

### Slide 2A: Het volledige traject

- Horizontal 6-step timeline, "Intakegesprek" step active (blue)

### Slide 2B: Agenda

- 5 numbered agenda items, blue numbers

### Slide 3: Wat we al weten

- Two-column: Google Maps + project details (left), photo grid from Storage (right)
- Dark blue footer bar with welcoming text

### Slide 4: Situatie & wensen

- Conversation prompts for Bram (subtle gray box)
- Live notes field, auto-saves to `leads.gesprek_notities`

### Slide 5: Technische verkenning

- 2×4 interactive checkbox cards (pre-filled from slide 0C)
- Changes auto-update calculator output and sync to `lead_technisch`
- Note: text-only labels, no icons (per design direction)

### Slide 6: Budgetindicatie — **Signature Moment**

- **Transition**: Instant fade to #008CFF blue (250ms), then warm white card fades in center
- Full blue background, centered warm white card with budget range
- Price: "€[min] — €[max]" excl. BTW, incl. 6% and 21% below
- Chips showing included cost items
- Disclaimer: "Indicatieve raming ±15%"

### Slide 7: Volgende stap

- 3 selectable cards: Plaatsbezoek / Intern overleggen / Nadenken
- Selected card gets blue border + light blue background
- Auto-save to `leads.volgende_stap`

---

## Phase 5: Modus 3 — Rapport (Slides 8–10)

### Slide 8: Transcript uploaden

- Drag & drop zone for .md/.txt files
- Optional additions text field
- "Rapport genereren →" button

### Slide 9: Rapport preview

- AI-generated report via Lovable AI (edge function)
- Combines all lead data, technisch config, calculator output, transcript
- System prompt produces structured Dutch report (5 blocks, max 500 words)
- Editable preview with inline block editing
- Auto-save to `leads.rapport_tekst` with version history

### Slide 10: PDF Exporteren

- Summary card with client details
- "PDF downloaden" button
- PDF generated with `@react-pdf/renderer`:
  - Page 1: Client report with logo, 40° decorative element, branded typography
  - Page 2: Internal project dossier (all data, technical checklist, budget overview)
- Filename: `Zolderpunt_[Achternaam]_[datum].pdf`

---

## Phase 6: Modus 4 — Dossiers

### Tab: Overzicht

- Table of all leads: naam, datum, status (inline dropdown), budget, volgende stap, actions
- Filter bar: search by name/address, filter by status, filter by period
- Click lead → reopen full editable dossier

### Tab: Statistieken

- Summary cards: total leads, conversion ratio, average budget, top acquisition channel
- Charts (recharts): leads per month (bar), most-checked technical items (horizontal bar), project type distribution (pie)

---

## Auto-Save Logic (throughout)

- New lead created at Slide 0A when name is filled
- Every slide transition triggers save of current slide's data
- Photos upload immediately on selection
- Calculator auto-saves on every change
- No manual save button anywhere  
  
  
---  
  
My feedback on this plan:  
  
structurele aanpassingen nodig
  **Probleem 1: Klantinfo zit vast in Voorbereiding**
  Lovable heeft slide 0A (klantdossier) volledig in de "VOORBEREIDING" modus gezet met een donkere interne header. Maar jij wil dit ook live met de klant kunnen invullen.
  De oplossing: slide 0A moet een **neutrale, client-viewable layout** krijgen — dezelfde visuele stijl als de gesprekslides. Geen "VOORBEREIDING" header zichtbaar als je het scherm deelt. De donkere interne indicator mag alleen zichtbaar zijn als je het scherm *niet* deelt.
  Stuur dit als correctie naar Lovable:
  ```
  Slide 0A moet visueel geschikt zijn om 
  met de klant samen in te vullen tijdens 
  het gesprek (scherm delen). 
  Verwijder de donkere "VOORBEREIDING" 
  header op slide 0A en 0B. 
  Vervang door een neutrale warme witte 
  layout in Zolderpunt-huisstijl, 
  zodat de klant dit live kan zien 
  zonder interne labels.
  ```
  ---
  **Probleem 2: Calculator staat op de verkeerde plek**
  Lovable heeft de calculator op slide 0D in Modus 1 gezet — vóór het gesprek. Maar jij hebt pas voldoende input *tijdens* het gesprek na de technische verkenning.
  De calculator hoort thuis **tussen slide 5 en slide 6** in Modus 2. Slide 5 verzamelt de technische input, de calculator verwerkt die input, en slide 6 toont het resultaat aan de klant.
  Stuur dit als correctie:
  ```
  Verplaats de calculator van Modus 1 
  slide 0D naar Modus 2, tussen slide 5 
  en slide 6. 

  De nieuwe volgorde in Modus 2 wordt:
  - Slide 5: Technische verkenning 
    (aanvinken)
  - Slide 5B: Calculator 
    (invullen op basis van slide 5, 
    intern zichtbaar — niet voor klant)
  - Slide 6: Budgetindicatie 
    (resultaat tonen aan klant)

  Slide 5B heeft dezelfde interne 
  styling als de voorbereiding maar 
  zit in de gespreksflow. 
  Verwijder slide 0D volledig uit 
  Modus 1.
  ```
  ---
  ## Mijn bijkomende feedback
  **Wat Lovable goed heeft gedaan:**
  - Supabase structuur correct begrepen inclusief RLS
  - Auto-save logica op elke slide-wissel
  - PDF met twee pagina's (klantrapport + intern dossier)
  - Slide 6 als "signature moment" met fade-transitie — goede interpretatie
  - Statistieken tab volledig uitgewerkt
  ---
  **Wat ontbreekt of vaag is:**
  **1. Slide 3 toont data die nog niet bestaat** Als je slide 0A live invult met de klant, bestaat er op het moment van slide 3 mogelijk nog geen adres of foto. Lovable moet hier een graceful fallback voorzien — geen lege kaart of kapotte layout als data ontbreekt.
  ```
  Zorg dat slide 3 elegant omgaat met 
  ontbrekende data: geen Maps embed 
  als adres nog niet ingevuld, 
  geen lege foto-grid. 
  Toon een placeholder per ontbrekend 
  element dat er verzorgd uitziet.
  ```
  **2. Slide 5 — "no icons" is een gemiste kans** Lovable schrijft zelf "text-only labels, no icons (per design direction)" — maar dat staat nergens in de prompt. Dit is een eigen interpretatie die de kaartjes minder scanbaar maakt tijdens een gesprek. Corrigeer dit:
  ```
  Voeg iconen toe aan de technische 
  kaartjes op slide 5 en slide 0C. 
  Gebruik Lucide React iconen:
  - Trap: Stairs
  - Dakraam: Sun
  - Airco: Wind  
  - Draagmuur: Layers
  - Badkamer: Droplets
  - Kasten: Archive
  - Elektriciteit: Zap
  - Dakconstructie: AlertTriangle
  ```
  **3. Rapport API — edge function of client-side?** Lovable schrijft "via Lovable AI (edge function)" maar de prompt specificeerde een directe Anthropic API call. Dit kan een kostenverschil maken. Verifieer in Lovable welke aanpak ze gebruiken en of de Anthropic API key correct geconfigureerd is.
  **4. Dossiers — heropen als bewerkbaar** Lovable zegt "click lead → reopen full editable dossier" maar specificeert niet of dit de volledige slideflow herlaadt of een apart bewerkingsscherm is. Voor consistentie is het beter dat het de volledige app herlaadt met de bestaande sessionData:
  ```
  Bij het heropenen van een dossier 
  vanuit Modus 4: laad alle Supabase 
  data in sessionData en start de app 
  op Modus 1 Slide 0A in bewerkingsmodus. 
  Geen apart bewerkingsscherm.
  ```
  ---
  ## Samengevat — wat je Lovable stuurt
  Vier correcties in volgorde van prioriteit:
  1. Slide 0A + 0B → client-viewable layout, geen interne header
  2. Calculator verplaatsen van 0D naar nieuw slide 5B in Modus 2
  3. Iconen toevoegen aan technische kaartjes
  4. Dossier heropenen via volledige slideflow met sessionData  

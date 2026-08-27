# Communicatiepagina: Outlook-achtige herstructurering (puur visueel)

Alleen presentatie van het tabblad Communicatie binnen een dossier. Geen functionele wijzigingen: alle data, handlers, zoeklogica, tellingen, gesprekken, Historiek aanvullen, Mail-CRM-calls en routes blijven identiek.

## Wat verandert

1. **Paginakop** — titel "Communicatie", één oriëntatiezin, en daaronder één compacte statusregel met dossiernummer, Bouwflow-fase en Mail-CRM-bron (nu verspreid over meerdere alinea's).
2. **Eén actiebalk** — Gesprek starten, Videocall starten, Historiek aanvullen en Vernieuwen staan samen rechts van de titel (Historiek aanvullen zweeft nu los onder de tekst). Knopvarianten, groottes, iconen en states blijven exact zoals ze zijn; enkel positie en 8px tussenruimte veranderen.
3. **Zoekveld** — direct onder de kop, over de volledige contentbreedte. Zelfde input, icoon en placeholder.
4. **Tweekolomsgrid vanaf ~1180px** — links de communicatiestroom, rechts (±360px, sticky) het bestaande Beslissingen-blok. Onder 1180px: één kolom met Beslissingen boven de stroom. Contentbreedte gaat van max-w-4xl naar ±1440px met 24/32px goot.
5. **Vlakke berichtenrijen** — de aparte kaart rond elke mail/call/gesprek verdwijnt. In de plaats: één surface per sectie met haarlijnen tussen de rijen. Vaste leesvolgorde per rij: kanaalicoon + richting + persoon + datum/tijd (eigen rechterkolom op desktop) → onderwerp → preview → eventuele beslissing.
6. **Beslissing in een rij** wordt een compacte inline regel met pin-icoon en dunne accentlijn in plaats van een gevuld rood vlak. Zelfde kleurbetekenis, zelfde tekst.
7. **Sectiekoppen** (Klant, Klant + leverancier, Leveranciers, Varia) worden vlakke koppen met bestaande chevron en teller — inklappen blijft werken. Leveranciersgroepen per bedrijf worden subtiele subkoppen zonder kaart-in-kaart.
8. **Gespreknotities** krijgen een rustige lijst met vaste inspringing en haarlijnen; de post-its behouden hun semantische kleur als smal accent, niet als volledig vlak. PostItRij blijft bewerkbaar zoals nu.
9. **Beslissingenpaneel** — zelfde teller, zelfde klik-naar-bericht, maar als scanbare regels met pin-icoon, tekst en bron/datum in secundaire tekst.
10. **Loading, lege en fouttoestanden** krijgen dezelfde rustige stijl; logica en teksten blijven.

Bestaande groepen "Klant + leverancier" en "Varia" blijven behouden (die staan niet in de masterprompt maar bestaan in de code), met hetzelfde patroon.

## Wat expliciet niet verandert

Globale header, dossiertabs en hun beige stijl, design tokens, Tailwind-config, gedeelde UI-componenten, kleurbetekenis, fonts, iconenset, API's/queries, sorteervolgorde uit de bron.

## Technisch

- Werk in `src/pages/DossierCommunicatie.tsx`; splits presentatie af in nieuwe componenten onder `src/components/communicatie/`: `CommunicatieKop.tsx` (titel + statusregel + toolbar-slot), `CommunicatieRij.tsx` (gedeelde rij-layout voor mail/call/gesprek), `SectieKop.tsx`, `BeslissingenPaneel.tsx`. `MailRij`, `CallRij` en `GesprekRij` blijven qua props en handlers identiek, ze renderen enkel via de nieuwe rij-layout.
- Alle state (`zoek`, `openCategorieen`, `lopend`, `herlaadTeller`, `leesMailId`), `useMemo`-berekeningen, `scrollNaarId` en de id's `comm-<soort>-<id>` blijven ongewijzigd zodat de scroll-naar-bericht-koppeling blijft werken.
- Alleen bestaande Tailwind-tokens (`border-border`, `bg-card`, `text-muted-foreground`, `text-primary`, `rounded-lg`), geen nieuwe kleuren of shadows.
- Sticky rechterkolom via `lg:sticky lg:top-4` binnen de bestaande scrollcontainer; geen wijziging aan scrolllogica.
- Nacontrole op 1440 / 1180 / 1024 / 768 / 390px en een klik-inventaris van elke knop, collapsible, mailrij en beslissingsregel.

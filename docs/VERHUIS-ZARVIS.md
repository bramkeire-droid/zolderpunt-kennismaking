# Zarvis los van Compass

Beslist door Bram op 2026-11-24: "Nu LOS". Aanleiding: IDEE-31, "Waarom bouw jij alles vanuit zolderpunt compass? Terwijl hij net zo goed verbonden is met alle andere tools?"

## Het doel

Zarvis wordt een eigen project: eigen repo, eigen databank, eigen login, eigen sleutels. Compass wordt één van de gekoppelde apps, gelijk aan de website, Mail-CRM, Werf, FINDASHBOARD en Invensync. Elke app levert een loket met vaste acties; Zarvis kent de apps alleen via die loketten.

## Wat er vandaag aan Compass vasthangt (inventaris)

| Soort | Wat | Waar het heen gaat |
|---|---|---|
| Functies | `zarvis`, `zarvis-taken`, `zarvis-goedkeuren`, `zarvis-stem`, `zarvis-gezicht`, `whatsapp-koppeling` | het nieuwe project |
| Gedeelde code | `supabase/functions/_shared/zarvis/` (gereedschap, doen, buiten, mail, web, marketing, bellen) | het nieuwe project |
| Eigen tabellen | `zarvis_gesprekken`, `zarvis_berichten`, `zarvis_acties`, `zarvis_instellingen`, `zarvis_taken`, `zarvis_meldingen`, `zarvis_vaardigheden`, `zarvis_tekorten`, `zarvis_tik`, `whatsapp_berichten`, `whatsapp_uit`, en de klok (pg_cron) | het nieuwe project |
| Tabellen van Compass die Zarvis rechtstreeks leest | `leads`, `pre_intake`, `gesprekken`, `gesprek_notities`, `customers`, `calculaties`, `bouwflow_phase_category_map` | blijven in Compass, achter een nieuw loket |
| `zarvis_context` (welk dossier staat open) | geschreven door Compass | blijft in Compass, gelezen via het loket |
| Schermen | `/zarvis`, `/zarvis/bron`, `/zarvis/beheer`, het donkere inlogscherm, `src/components/zarvis`, `src/lib/zarvis`, `ZarvisContext` | het nieuwe project |
| Paneel in Compass | `ZarvisPaneel.tsx`, `ZarvisKnop.tsx`, de knop in `AppShell` | verdwijnt uit Compass (stond al op de lijst) |
| Programma op de pc | `zarvis-desktop/`, wijst naar het adres van Compass | het nieuwe project, nieuw adres |
| Login en rollen | de gebruikers en `has_role` van Compass | eigen login en eigen rollen in het nieuwe project |
| Sleutels | staan in het Lovable-project van Compass | opnieuw in het nieuwe project |
| Documenten | `docs/` over Zarvis, `SPRINTPLAN-ZARVIS.md`, de onderzoeken | het nieuwe project |

Het loket van de website (`compass-marketing-loket`) en dat van Mail-CRM (`compass-loket`) kijken vandaag de login van Compass na. Na de verhuis moeten ze de login van Zarvis nakijken.

## Hoe Compass gekoppeld wordt

Een nieuwe functie `zarvis-loket` in Compass, naar het model van de andere loketten:
- Ze kijkt de login van Zarvis na bij het project van Zarvis, en of die gebruiker daar beheerder is.
- Ze voert de bestaande leescode voor dossiers uit (zoeken, dossier, gesprekken, calculaties, overzicht van alle dossiers), die in de repo van Compass blijft, dicht bij het schema dat ze leest.
- Ze heeft één kleine actie voor wat andere gereedschappen van een dossier nodig hebben: naam, adres, telefoon, mailadres en dossiernummer.
- Ze schrijft niets. Schrijven in Compass komt later, via de wachtrij van golf 0.

Gevolg: vandaag leest Zarvis met de rechten van de ingelogde Compass-gebruiker; straks leest het loket met de serversleutel van Compass, en zit de grens in de code van het loket (alleen een beheerder van Zarvis, alleen vaste acties).

## Volgorde

1. **Nieuw project aanmaken** in Lovable, met een eigen databank.
2. **GitHub koppelen** aan dat project (een machtiging die alleen Bram kan geven), zodat code via een repo binnenkomt en niet via berichten aan de Lovable-agent.
3. **Databank:** de eigen tabellen, policies, rollen en de klok aanmaken in het nieuwe project.
4. **Code overzetten:** functies, gedeelde code, schermen, tests en documenten naar de nieuwe repo. De tests draaien daar.
5. **Loket in Compass** bouwen en uitrollen; de dossiergereedschappen in Zarvis roepen het aan.
6. **De loketten van de website en Mail-CRM** de login van Zarvis laten nakijken.
7. **Brams account** in het nieuwe project, met de rol beheerder. Zijn wachtwoord kiest hij zelf.
8. **Sleutels opnieuw**, in het nieuwe project (zie `docs/SLEUTELS-EN-LOGINS.md`).
9. **Programma op de pc** naar het nieuwe adres, opnieuw bouwen.
10. **Live testen** met een tijdelijke gebruiker: een dossier lezen, mails lezen, het weer, een voorstel en de Ja-knop, een proefoproep.
11. **Opruimen in Compass:** de functies, de schermen, het paneel en de knop van Zarvis weghalen. De tabellen `zarvis_*` blijven nog even staan tot Bram bevestigt dat alles werkt; daarna verwijderen na zijn ja.

Wat niet meeverhuist: de gesprekken en meldingen van vandaag (er staan alleen proefgegevens van de bouwer in; de tabel `zarvis_instellingen` is leeg).

## Wat intussen blijft werken

Zarvis in Compass blijft draaien tot stap 10 geslaagd is. Er wordt niets weggehaald voor het nieuwe project bewezen werkt.

## Risico's

- Twee logins voor Bram (Compass en Zarvis).
- De loketten van Mail-CRM en de website worden aangepast; Mail-CRM heeft geen testomgeving.
- Het loket in Compass leest met de serversleutel: een fout in het loket is een lek van klantgegevens. Daarom alleen vaste acties en een test per actie.
- De schatting van een week bouwwerk is een inschatting, niet gemeten.

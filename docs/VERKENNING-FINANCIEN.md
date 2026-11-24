# Verkenning FINDASHBOARD (IDEE-13)

Gemeten op 2026-11-24, alleen gelezen, niets gewijzigd. Geen bedragen in dit document.

## Wat het is

- "Belhouse Financial Compass": lokale repo `C:\Users\bramk\Desktop\Belhouse Financial Compass`, Lovable-project `50e67fe4-d103-4d97-b856-2d95a10b2aa3`, Supabase-ref `lrlmcnpbaybgtvqgerde`. Een ander project dan Compass.
- Schermen, elk met één vraag: Vandaag (hoe staan we ervoor), Waarom (de waterval van omzet naar nettoresultaat), Verloop, Sturen (hefbomen en "wat als"), Boekhouding (resultatenrekening), Instellingen (personeelskost per werker, overhead, zaakvoerderspakket, simulatoren, controleorgaan), AI-adviseur.

## Waar de cijfers vandaan komen

- **Yuki**, via SOAP: rekeningschema en grootboekregels. Elke nacht om 5 u rekent `kpi-snapshot` het boekjaar door naar `kpi_daily` en `kpi_maand_stand`, met een bewaker tegen stille nullen. Om 6.30 u schrijft `controleorgaan` bevindingen weg.
- Handmatig: de kennisbank `kb_*` (werkers, voertuigen, aannames).
- **Niet gekoppeld:** bank, Peppol, import van facturen, Bouwflow, Odoo.
- **Bestaat niet:** btw-berekening, cashflowvoorspelling, openstaande facturen, banksaldo.
- Demo-modus: gescheiden in de browser, per hook; de demo heeft geen watermerk op de cijfers.

## Aantallen

`kpi_daily` 265 (dagelijks sinds 4 maart 2026), `gl_history` 30.589, `kpi_maand_stand` 3.000, `kb_workers` 3, `kb_vehicles` 6, `kb_assumptions` 46, `kb_audit_findings` 10, `tenants` 3. RLS per huurder; de platformbeheerder ziet bewust geen bedrijfsdata.

## Zwakke plekken

- `DEFINITIES-KERNCIJFERS.md` is een concept dat Bram nog niet bekrachtigd heeft. Een CFO die voorleest zonder dat te zeggen, brengt niet-goedgekeurde cijfers als feit.
- De schermen rekenen in de browser; die rekenlogica bestaat niet op de server. `kpi_daily` kent andere laatjes dan de waterval, dus tussenstanden kunnen verschillen van het scherm (bedrijfswinst en netto zijn gelijk).
- De lopende maand is altijd onvolledig; lonen kunnen achterlopen.
- **In `supabase/functions/_shared/auth.ts` staat de sleutel van de geplande taken als vaste tekst in de code.** Wie die kent, kan elke functie aanroepen, ook die de boekhouding leest. **Naar een echt secret verplaatsen is aangeraden.**

## Hoe Zarvis erbij kan

Vandaag niet: andere databank, andere gebruikers. Zelfde oplossing als bij de mails: een alleen-lezen `financieel-loket` in het project van FINDASHBOARD dat het token van Compass nakijkt en daarna het mailadres toetst aan een korte lijst (Bram), vast op de huurder Belhouse.

Kleinste eerste stap: alleen de laatste twee rijen van `kpi_daily` lezen, zonder zelf te rekenen, met erbij tot welke datum de boekhouding verwerkt is en welke waarschuwingen lopen. `financieel_overzicht(periode)` in Zarvis naast `mail.ts`, met een eigen connector, niet beschikbaar voor geplande controles.

## Stappen naar "CFO"

1. Lezen, met vermelding van de actualiteit en wat onzeker is.
2. Verklaren waarom het resultaat veranderde (de waterval).
3. Signaleren: marge onder de norm, lonen nog niet geboekt, kosten die stijgen (bestaat al in `lib/signalen.ts`). Cash en onbetaalde facturen vragen een nieuwe koppeling met Yuki.
4. Scenario's voorstellen, altijd als scenario benoemd.

**Nooit zonder Bram:** betalen, bankopdrachten, boeken, de btw-aangifte, alles wat naar de boekhouder gaat. Het loket blijft alleen-lezen.

## Vertrouwelijkheid

Zarvis leest hardop voor, ook in de auto of op de werf. Loonkost per persoon, het pakket van de zaakvoerder en het aandeel van de grootste klant mogen daar niet zomaar klinken. Voorstel: alleen totalen voorlezen tot Bram anders beslist.

## Open vragen aan Bram

1. Mag alleen jij deze cijfers horen, of ook medewerkers die Zarvis gebruiken? Mag Zarvis ze hardop voorlezen?
2. Mag het loket gebouwd worden in het project van FINDASHBOARD, met alleen jouw mailadres toegelaten?
3. Wil je eerst de definities van de kerncijfers bekrachtigen?
4. Is de CFO-rol vooral "hoe staat het ervoor", of ook cash en onbetaalde facturen (nieuwe koppeling met Yuki)?
5. Eerst de vaste sleutel in de code naar een secret?

# IDEE-14 Inventaris: wat Zarvis kan DOEN (onderzoek)

Gemeten op 2026-11-24, alleen gelezen. Niets gewijzigd, uitgerold of verstuurd. Databank van Invensync gelezen met `query_database` (alleen SELECT, alleen tellingen en percentages); van de Werf-databank alleen tellingen van `material_line`. Aanvulling op `docs/VERKENNING-INVENTARIS.md`, dat blijft kloppen.

## 1. Samenvatting

1. Zarvis kan vandaag niets in Invensync, maar de weg is klein en bekend: één nieuwe functie `zarvis-loket` in Invensync die het token van Compass nakijkt, zoals `compass-marketing-loket`. Alle grenzen komen in de code van het loket, want het loket schrijft met de serversleutel en gaat dus langs de RLS heen.
2. Prijzen goedkeuren is de beste eerste actie: 3 open prijsverschillen, een bestaande review-regel, en de app doet het vandaag met drie losse schrijfacties zonder controle. In het loket wordt het één atomaire stap met voorstel, ja en terugdraaien. Naar Bouwflow gaat de prijs daarna semi-manueel (mini-CSV); een robot-push is geen goed vertrekpunt.
3. Opkuisen is kleiner dan gedacht (3 dubbele leveranciersgroepen, 1 open SKU-loze regel), maar er is een groter gat: **606 van de 870 actieve artikelen hebben geen leverancier**. Zonder dat kan er geen bestellijst per leverancier bestaan. Dat is dus de echte voorwaarde voor bestellen.
4. Bestellen voor een werf heeft geen bron van behoefte: Compass rekent in euro per post (geen artikelen), en `material_line` in Werf is gebruik achteraf (20 rijen in totaal). De kleinste weg: Bram dicteert of Zarvis leidt af, Zarvis zoekt de artikelen en prijzen op en zet een bestelmail klaar die Bram met één klik verstuurt. Echt verzenden door Zarvis kan pas met een schrijfrecht op de mailbox (IDEE-10).
5. Niet terug te draaien en altijd een ja: een mail aan een leverancier, een artikel aanmaken in Bouwflow, en alles wat geld kost. Kern (stap 1 tot 5): ongeveer 60 uur; met echt verzenden en een stuklijst per post ongeveer 88 uur.

## 2. Wat er vandaag is

**Invensync** (Lovable `d10e8317-dc1b-4158-95d2-0767be9915b8`, repo `C:\Users\bramk\.claude\projects\Invensync`, TanStack-app plus Supabase `yspbdukhoywahnnkdcgs`).

- Cijfers (live): 871 artikelen, 870 actief; 47 actief zonder SKU (SKU leeg of null; 10 andere artikelen hebben al een interne `BH-`SKU); 606 zonder leverancier; 250 zonder categorie plus 1 lege; 844 zonder verpakkingshoeveelheid; 282 met verkoopprijs. `naam` is gelijk aan `leverancier_omschrijving` bij 722 artikelen, dus de eigen omschrijving is bij 149 al bewerkt.
- `price_flags`: 25 in totaal (19 geaccepteerd, 3 afgewezen, 3 open sinds 18 november). `price_history`: 24 rijen. Slechts 20 artikelen hebben ooit een `last_price_update`, geen enkel in de laatste 30 dagen: de keten staat stil tot Bram nakijkt.
- `sku_loze_artikelen`: 73 rijen, waarvan 1 open, 69 verwerkt, 3 genegeerd. De wachtlijst is dus bijna leeg; wat overblijft zijn de 47 artikelen in `materials` die "zonder SKU verwerkt" werden.
- Leveranciers (vrije tekst, `materials.leverancier`): 18 verschillende waarden. Dubbels: `Verhelst` (37) en `Verhelst Bouwmaterialen` (25); `FACQ` (167) en `facq` (2); `Würth Belux` (3) en `Würth` (1). Plus 1 lege tekst.
- RLS: elke tabel heeft `auth read` en `auth write` voor `authenticated` met `true` (policies uitgelezen). Twee gebruikers, waarvan één testaccount; beide ingelogd in de laatste 30 dagen. Of registreren open staat, kon ik niet nagaan. Constraints: `materials.sku` unique, trigger op `updated_at`; geen enkele check op `status`, geen bescherming van `price_history`.
- Bestellen: geen enkele tabel, mail of functie. Er is geen mail die uitgaat (alleen Mailgun inkomend in `supabase/functions/process-email/index.ts`) en geen contactgegevens van leveranciers (`approved_senders` zijn afzenders die facturen mogen sturen).

**Compass**: de calculator (`src/lib/prijscalculator.ts`, tabel `calculaties`, `calculator_tarieven`) rekent in euro per m² en per post (dakisolatie spantendak of gordingendak, badkamer, extra elementen). Er staat nergens een artikel of hoeveelheid materiaal in. Compass heeft een eigen Chrome-extensie (`chrome-extension/`) die alleen de projectfase in Bouwflow zet.

**Werf-app** (`zolderpunt-werf-foundation`): `material_line` heeft `description`, `quantity`, `unit`, `supplier`, `unit_price`, `bouwflow_article_ref`, `from_inventory`, `project_id`, `work_order_id`, `processed` (migratie `20260615194713...sql:250`, types `src/integrations/supabase/types.ts:741`). Het zijn registraties van verbruik achteraf (`consumed_on_site`, `private_taken`). Live: 20 rijen; 5 op een werf, geen enkele met leverancier, 2 met artikelverwijzing.

**Chrome-extensie van Invensync** (`chrome-extension/`): knipt een productzone (`extract-product`) of een bestelmandje van een webshop (`extract-order`) en zet het in de catalogus; kan met RPA de Bouwflow-CSV-import bedienen (`background.js:150` `handlePushBouwflow`, werkt alleen met een open, ingelogde Bouwflow-tab in Brams Chrome). Dat "bestellijst" is dus een mandje dat al bij de leverancier staat, geen behoefte van een werf.

## 3. Bevindingen per vraag

### 3.1 Prijzen bijwerken

**Hoe een verschil ontstaat.** `supabase/functions/_shared/analyse.ts:283-302` en `quick-add/index.ts:127-145`: elk verschil van minstens 0,5 % tussen factuurprijs en `materials.aankoopprijs` wordt een `price_flags`-rij met `oude_prijs`, `nieuwe_prijs`, `percentage_verschil`, status `open`. Overschrijven gebeurt nooit stil. Her-analyse van hetzelfde document wist eerst de open flags van dat document (`analyse.ts:221`). 9 van de 25 flags hebben geen brondocument (`document_id` leeg: afkomstig van de extensie of B-CAL), dus daar valt niets te tonen.

**Wie keurt goed of af.** Er is geen serverfunctie. `src/routes/_authenticated/review.tsx:292` (`decideFlag`) doet in de browser, met de sessie van de gebruiker:
1. `materials.aankoopprijs = nieuwe_prijs` en `last_price_update = nu`;
2. `price_history` invoegen (`oude_prijs`, `nieuwe_prijs`, `leverancier`, `document_id`, notitie "Geaccepteerd via review");
3. `price_flags` op `geaccepteerd` met `beslissing_at` en notitie. Afwijzen en uitstellen doen alleen stap 3.

Gevonden zwakke plekken, allemaal te sluiten in het loket:
- Drie losse schrijfacties, geen transactie, foutafhandeling ontbreekt: een mislukte stap 2 laat een prijs zonder geschiedenis achter.
- Geen controle dat de huidige prijs nog gelijk is aan `oude_prijs` van de flag. Twee flags voor hetzelfde artikel (dezelfde factuur twee keer) kunnen elkaar overschrijven.
- `verkoopprijs` en `marge` worden niet aangepast (282 artikelen hebben een verkoopprijs): de marge verschuift stil.
- "Uitstellen" zet de status op `uitgesteld`, maar het scherm leest alleen `status = open` (`review.tsx:48-52`) en nergens anders staat `uitgesteld` (gezocht in `src` en `supabase`). Een uitgestelde flag verdwijnt dus voorgoed uit beeld.
- `price_history` kent geen terugdraaien; de businessregel zegt "nooit verwijderen" (`Handoffprompt CLAUDE.md` §9). Terugdraaien moet dus een nieuwe rij zijn.

**Hoe een prijs naar Bouwflow gaat.** Er is geen automatische weg vanuit de review. De pagina Export (`src/routes/_authenticated/export.tsx:50-70`) maakt een CSV `name,sku,ean,quantity,unit,cost,price,vat_percentage,taxonomy_id` van de (gefilterde) inventaris, met `quantity` altijd 0 en `price` gelijk aan `cost` (dus de aankoopprijs, niet de verkoopprijs). Bram uploadt die in Bouwflow (Inventaris, Gegevens, Importeer van CSV, "Update bestaande op SKU"). De extensie kan dat bedienen, maar alleen met een open Bouwflow-tab (`background.js:150-200`). Bouwflow heeft geen artikel-endpoint (onderzocht in het overdrachtsdocument, sprint 8: 54 paden, 0 treffers). Artikels zonder SKU kunnen in deze keten nooit bijgewerkt worden, want de koppeling loopt op SKU.

**Het voorstel dat Zarvis voorleest.** Zarvis haalt `open_prijsverschillen`, het loket bundelt in drie bakken en geeft een `voorstel_id`:

> "Er staan 3 prijsverschillen open van 18 november, allemaal Verhelst, allemaal een daling: min 4,6, min 8,1 en min 19,7 procent. Bij de laatste lijkt het een andere verpakking; wil je die zelf bekijken? De eerste twee zet ik om. Ja?"

Na het ja: `voer_uit(voorstel_id)`. Het loket controleert dat het voorstel bestaat, jonger is dan 30 minuten, nog niet uitgevoerd is en van dezelfde gebruiker komt, en dat `aankoopprijs` nog gelijk is aan `oude_prijs`. Dan één databanktransactie (RPC): prijs, `price_history`, flag, en een rij in `zarvis_wijziging` met voor en na. Terugdraaien (`draai_terug(batch_id)`): per artikel de oude prijs terugzetten als de huidige prijs nog gelijk is aan de nieuwe, een nieuwe `price_history`-rij "teruggedraaid door Zarvis", flag terug op `open`. Is de prijs intussen veranderd, dan meldt het een conflict in plaats van te overschrijven.

**Drempel om te bundelen.** Meetgegevens van de 25 flags: geen enkele onder 0,5 % (de ondergrens van het systeem), 1 onder 2 %, 6 tussen 2 en 5 %, de rest van 5 % tot 66 %. Geaccepteerd zijn dalingen van min 66,7, min 34,3 en min 32,3 %, en stijgingen tot 20,5 %. Afgewezen zijn min 50,2 %, plus 22,3 % en plus 1885 %, dus de echt onwaarschijnlijke gevallen zijn eenheids- of verpakkingsfouten. Daaruit volgt:
- **Klein, gebundeld in één ja:** absoluut verschil kleiner dan 2 % (dezelfde grens als de grijze badge in de review, `review.tsx:~637`) én een eurogrens per regel die Bram kiest (vraag 3). Eerlijk: vandaag valt 1 op 25 flags in die bak. De bundeling is dus nog geen winst in uren; ze wordt dat pas als facturen vaker binnenkomen (Brams eigen bedoeling met de mailstraat).
- **Gewoon, in één voorlezing:** 2 tot 25 %, hoogstens vijf per beurt, met document erbij.
- **Altijd apart en nooit gebundeld:** 25 % of meer, een teken- of eenheidsverdacht verschil, of een flag zonder brondocument. Dat zijn precies de gevallen die Bram afwees.

Een vast percentage is geen verdediging op zich; wat telt is dat het loket nooit meer dan 25 artikelen per uitvoering toelaat en nooit een prijs aanpast die niet binnen de drie bakken valt.

### 3.2 Catalogus opkuisen

**Wat de Unifier al doet** (`src/routes/_authenticated/unifier.tsx`, 1293 regels; functie `supabase/functions/unifier-propose/index.ts`, 261 regels). Een AI-functie die alleen voorstelt en nooit schrijft; toepassen gebeurt in de browser met `materials.update`. Vier standen, allemaal `claude-sonnet-4-6`:
- `descriptions`: per categorie één oproep met alle artikelen, per artikeltype een vaste volgorde van kenmerken (`index.ts:~228`, `max_tokens` 8192).
- `categories`: detecteert bijna-dubbele categorienamen (`index.ts:~245`).
- `extrapolate`: past één handmatig voorbeeld toe op de andere regels.
- `research`: zoekt online (server-tool `web_search_20250305`, hoogstens `min(2 × artikelen, 20)` zoekopdrachten per oproep) en herschrijft de omschrijving; met `unify` vergelijkt het binnen een categorie.
Het toegangsbewijs is `requireUser` (`_shared/auth.ts`): een Invensync-login. Een token van Compass werkt niet. Het leveranciersgedeelte (`src/components/inventory/suppliers-tab.tsx`, `src/lib/supplier-match.ts`) gebruikt geen AI: een lokale gelijkenisscore met drempel 0,82; voorkeursnaam is de kortste. Het past alleen `materials.leverancier` aan.

**Wat Zarvis ervan kan aansturen.** Alles, maar niet rechtstreeks: de prompts en de leveranciersdetectie moeten naar `supabase/functions/_shared/` verhuisd worden zodat het loket ze kan aanroepen met de serversleutel (de bestaande functie kan niet met de sleutel van Compass of de serversleutel aangeroepen worden). Reken op één AI-oproep per categorie (39 categorieën, dus hoogstens 39 oproepen voor een volledige ronde); `research` kost meer door het zoeken. De werkelijke kost is niet opgemeten.

**Wat er te doen is, in volgorde van grootte:**
1. **Leveranciers**: 3 groepen (62 + 169 + 4 artikelen). De bestaande detectie vindt ze zonder AI. Beter dan "de kortste naam": de naam uit de Bouwflow-leverancierslijst (`bouwflow-suppliers`, 13 leveranciers) als vaste naam. Let op: dezelfde vrije tekst staat ook in `price_flags`, `price_history`, `sku_loze_artikelen`, `new_material_suggestions` en `documents`; de bestaande samenvoeging past alleen `materials` aan.
2. **606 artikelen zonder leverancier**: uit documenten of prijsgeschiedenis af te leiden is dat maar voor 9 tot 14 artikelen. De rest kwam uit de eerste Bouwflow-CSV, die geen leveranciers bevat. Zinvolle manier: groeperen op SKU-voorvoegsel en merk (bijvoorbeeld 36 artikelen met hetzelfde voorvoegsel, allemaal zonder leverancier) en Bram per groep één leverancier laten bevestigen. Zarvis stelt voor, Bram zegt ja per groep.
3. **250 zonder categorie**: voorstellen per groep, zelfde methode.
4. **47 zonder SKU**: een SKU verzinnen mag niet (regel 6 in het overdrachtsdocument: geen SKU op factuur is review, geen nieuw artikel). Twee wegen: een echte SKU met bewijs (regel op een document of een productpagina, via `research`), of de interne `BH-####` (bestaat in de Review, 10 keer gebruikt). Risico: een SKU toevoegen of wijzigen op een artikel dat al zonder SKU naar Bouwflow ging, maakt daar een nieuw artikel, want Bouwflow koppelt op SKU. Of er in Bouwflow zulke artikelen staan, kon ik niet nagaan.
5. **Omschrijvingen**: 722 artikelen met naam gelijk aan de leveranciersomschrijving; via `descriptions` per categorie, in porties van hoogstens 25 per ja.
6. De "73 SKU-loze regels aanvullen" is grotendeels gedaan (1 open).

**Wat is omkeerbaar.** In de app niets: updates van `naam`, `categorie`, `leverancier` overschrijven zonder logboek. Daarbij staat in `unifier.tsx:246` een echte `delete` van een artikel, tegen regel 7 (soft delete). Het loket schrijft daarom per wijziging in `zarvis_wijziging` (artikel, kolom, voor, na, batch) en kan een hele batch terugzetten zolang de huidige waarde nog de nieuwe is. Het loket krijgt geen enkele verwijderactie. Niet omkeerbaar: een batch die al in Bouwflow is geïmporteerd (daar moet een tweede import het rechtzetten), en AI-kosten.

### 3.3 Bestellen voor een werf

**Waar komt de behoefte vandaan?** Geen structurele bron:
- Compass: euro per post, geen artikelen (`prijscalculator.ts`, `CalcState` met m², dakisolatietype, badkamer, extra elementen). Een behoefte vraagt een stuklijst per post (bijvoorbeeld "dakisolatie gordingendak": platen per m², schroeven, tape). Die bestaat nergens; alleen Bram kent ze.
- Werf `material_line`: gebruik achteraf, 20 rijen. Bruikbaar later om per type werk te leren wat er gewoonlijk verbruikt wordt, nu te dun.
- Chrome-extensie: een mandje dat al bij de leverancier staat.
- Bouwflow-offertes met artikelregels: de API heeft `quotes`, maar of de regels artikels met SKU dragen, kon ik niet nagaan.
Dus: **Bram zegt het** ("voor ZL-dossier X: 12 platen A, 3 dozen B"), Zarvis zoekt de artikelen op, of hij vraagt "wat verbruikten de vorige gordingendaken?" en leidt voor te stellen hoeveelheden af uit `material_line` zodra er genoeg rijen zijn.

**Kleinste weg naar een bestellijst per leverancier.**
1. `bestellijst_prijzen { regels: [{artikel, aantal}] }` in het loket: zoekt artikelen, geeft eenheid, aankoopprijs, leverancier en `last_price_update` terug en groepeert per leverancier. Geen schrijven.
2. Struikelblokken, gemeten: 606 artikelen zonder leverancier; slechts 27 van 871 met verpakkingshoeveelheid (844 zonder), dus "40 m² nodig, pak van 12" kan Zarvis niet zelf omrekenen; een prijs is per eenheid van het artikel en soms per verpakking in de naam (de Export-CSV kent geen verpakking). Zarvis bestelt daarom in de eenheid van het artikel en vraagt bij twijfel.
3. Leveranciersgegevens ontbreken helemaal: er is geen e-mailadres of klantnummer in Invensync. Bronnen die ik kon aanwijzen maar niet uitlezen: de leveranciersbedrijven in Mail-CRM (`compass-loket`, actie `leveranciers`, 310 bedrijven) en de Bouwflow-leveranciers via de Public API (`suppliers:read`, velden onbekend). Veiligste eenmalige oplossing: een tabel `leverancier_contact` (naam, bestel-e-mail, klantnummer) die Bram voor de 13 leveranciers één keer invult, door het Zarvis te laten dicteren.

**Hoe een bestelling vertrekt.** Vandaag kan Zarvis niets verzenden (Mail-CRM leest alleen; verzenden bestaat enkel in de aparte app Maildude, zie `VERKENNING-MAILDUDE.md`). Twee trappen:
- **Eerst**: Zarvis maakt de bestelmail (aan, onderwerp, regels, werf, leveradres) en opent die als concept in Brams mailprogramma (`mailto:` of Outlook-concept). Het "ja" is Brams eigen klik op Verzenden: geen extra rechten, geen risico. Zarvis logt de bestelling als `concept`.
- **Later**: echt verzenden na ja vraagt schrijfrecht op een mailbox (Graph `Mail.Send` of Maildude). Dat is IDEE-10 en hoort niet in dit idee.
Een tabel `bestelling` (leverancier, regels, berekend totaal, ZL-nummer, status concept, verstuurd, geannuleerd) houdt bij wat er uitging. Een verzonden mail is niet terug te draaien; annuleren is een nieuwe mail, en ook die vraagt een ja.

### 3.4 Het loket

**Model**: `compass-marketing-loket` (`C:\Users\bramk\Desktop\Zolderpunt Website\supabase\functions\compass-marketing-loket\index.ts`). `compassBeheerder(token)` legt het token voor aan Compass zelf (`/auth/v1/user`, dan `rpc/has_role` met rol `admin`). Geen gedeeld geheim. Het loket gebruikt de serversleutel van het eigen project voor de databank en schrijft elke actie in een logboek. `verify_jwt = false` in `config.toml` (token is niet van dit project). In Invensync wordt dat `[functions.zarvis-loket] verify_jwt = false`; de controle zit in de code, zoals het overdrachtsdocument bij `_shared/auth.ts` al vaststelt.

**Waar het model te licht is.** In het marketingloket is `bevestigd: true` een argument dat het taalmodel zelf kan doorgeven; het voorstel en de uitvoering kunnen in dezelfde beurt gebeuren zonder dat Bram iets hoorde. Voor Invensync (geld en leveranciers) is dat te licht. Voorstel: het loket geeft een `voorstel_id` terug en `voer_uit` accepteert alleen dat id, na controle op bestaan, vervaldatum, gebruiker en ongewijzigde toestand. Het ja zelf wordt door Zarvis vastgelegd in code (een knop of een ja-herkenning op het volgende bericht, in `zarvis_acties` met status `wacht_op_goedkeuring` naar `uitgevoerd`), niet door een argument van het model. Dat laatste raakt de Zarvis-functie zelf en geldt dan voor alle loketten; dat besluit is aan de projectdirigent.

**Acties.** Lezen:
- `review_stand`: tellers van open flags, voorstellen, SKU-loos, wachtend op goedkeuring, vastgelopen documenten.
- `zoek_artikel {tekst, leverancier?, categorie?}` (hoogstens 25), `artikel {id of sku}` met de laatste 10 prijsrijen en open flags.
- `open_prijsverschillen` (de drie bakken), `catalogus_gezondheid`, `leveranciers` (met aantal en dubbels), `wijzigingen {batch?}`.
- `bestellijst_prijzen {regels}`.
Schrijven, steeds in twee stappen (`voorstel_*` en `voer_uit`):
- `voorstel_prijzen {flag_ids}`: hoogstens 25, alleen uit de bakken klein en gewoon, nooit flags met 25 % of meer of zonder document tenzij Bram die uitdrukkelijk apart noemt.
- `voorstel_leveranciers_samenvoegen`, `voorstel_leverancier_per_groep`, `voorstel_categorie_per_groep`, `voorstel_omschrijvingen {categorie}`, `voorstel_sku {id, bron}`.
- `voorstel_bestelling {regels, leverancier, zl}` maakt alleen een concept.
- `draai_terug {batch_id}`.

**Grenzen die in het loket zelf staan.** Een vaste lijst van kolommen die het mag aanraken (`naam`, `categorie`, `leverancier`, `sku`, `eenheid`, `verpakking_*`, en `aankoopprijs` alleen via een flag); geen vrije SQL, geen verwijderen, geen `documents`, `approved_senders` of opslag; hoogstens 25 prijzen en 100 artikelen per uitvoering; controle dat de huidige waarde nog de verwachte is (anders conflict); elke uitvoering in `zarvis_wijziging` en elke actie in een logboek met het mailadres van Bram. RLS blijft zoals ze is: Zarvis krijgt geen Invensync-login, dus de "ingelogd mag alles" wordt niet erger. Dat probleem op zich blijft (zie risico's).

**Nieuwe tabellen in Invensync** (additief, geen bestaande tabel gewijzigd): `zarvis_voorstel`, `zarvis_wijziging`, `zarvis_log`, later `leverancier_contact`, `bestelling`, `bouwflow_wachtrij`. Prijs goedkeuren als `security definer`-functie in de databank zodat het atomair is.

### 3.5 Wat altijd een ja vraagt, en wat niet terug te draaien is

| Actie | Ja van Bram | Terug te draaien |
|---|---|---|
| Lezen, zoeken, voorstellen | nee | n.v.t. |
| Prijs goedkeuren in Invensync | ja | ja, via `draai_terug` (nieuwe historiekrij) |
| Leveranciers samenvoegen, categorie, omschrijving, SKU (nog niet in Bouwflow) | ja | ja, zolang de waarde niet intussen veranderde |
| Mini-CSV klaarzetten voor Bouwflow | nee (er verandert niets in Bouwflow) | n.v.t. |
| CSV in Bouwflow uploaden (prijsupdate) | ja, Brams eigen klik | deels: een tweede import met de oude prijs; **Aantal 0 in de CSV kan de echte voorraad in Bouwflow overschrijven, niet nagegaan** |
| Artikel aanmaken in Bouwflow (extensie of robot) | altijd ja | **nee**: geen verwijdering via API of robot; alleen met de hand in Bouwflow |
| SKU wijzigen na export | ja | nee voor de Bouwflow-kant (nieuw artikel) |
| Bestelmail naar leverancier | altijd ja | **nee** |
| Betalen of een bedrag boven een plafond | altijd ja | nee |
Alles wat buiten Compass en Invensync iets verandert of geld kost volgt de regel van IDEE-29: Zarvis stelt voor, Bram zegt ja, de poort zit in de code.

## 4. Voorstel in bouwstappen

Elke stap hoeft Bram alleen sleutels te geven als erbij staat. Uren zijn bouwwerk, zonder wachttijd op Lovable.

**Stap 1. Leesloket en gezondheid (10 u).**
- Zarvis kan: `review_stand`, artikelen zoeken, een artikel met prijsgeschiedenis lezen, "hoe gezond is de catalogus", leveranciers met dubbels.
- Geraakt: nieuwe `supabase/functions/zarvis-loket/index.ts` en `config.toml` in Invensync; in Zarvis een `supabase/functions/_shared/zarvis/inventaris.ts` naast `mail.ts` en `marketing.ts`, registratie in `gereedschap.ts`, een connector "Inventaris" in de beheersectie.
- Ja van Bram: geen (alleen lezen).
- Nodig van Bram: de functie laten uitrollen in Invensync (de Lovable-agent, 1 bericht; volgens het overdrachtsdocument faalde dat op 30 juni door opgebruikte credits), de connector aanzetten.
- Bewijs: tests tegen een nagebootst loket (zoals de vijf van marketing); een echte aanroep met een tijdelijke beheerder die daarna verwijderd wordt (zoals bij marketing), en een vals token geeft 403.

**Stap 2. Prijzen goedkeuren met voorstel, ja en terugdraaien (14 u).**
- Zarvis kan: de open prijsverschillen voorlezen in drie bakken, na ja goedkeuren, afwijzen of uitstellen (met een scherm waar uitgesteld zichtbaar blijft), en terugdraaien.
- Geraakt: migratie met `zarvis_voorstel`, `zarvis_wijziging`, `zarvis_log` en de databankfunctie voor goedkeuren; loket; `inventaris.ts`. De Review-pagina van Invensync zou best dezelfde databankfunctie gebruiken (laat de drie losse schrijfacties vallen en maakt "Uitgesteld" zichtbaar); dat is een kleine wijziging in `review.tsx`, buiten Zarvis.
- Ja van Bram: elke uitvoering; kleine verschillen in één ja.
- Nodig van Bram: de eurogrens voor "klein" (vraag 3) en uitrol.
- Bewijs: tests op de grenzen (25 %, stale prijs, dubbele flag, document ontbreekt); echte test op de 3 open flags met een kopie of een tijdelijke flag en terugdraaien, waarna de prijs en geschiedenis nagelezen worden.

**Stap 3. Prijzen naar Bouwflow klaarzetten (8 u).**
- Zarvis kan: na stap 2 een mini-CSV maken van de net aangepaste artikelen (alleen die met SKU), op de pc bewaren en de Bouwflow-importpagina openen; Bram uploadt. Een tabel `bouwflow_wachtrij` houdt bij wat al klaar of verstuurd is. Geen robot.
- Geraakt: loket (`voorstel_bouwflow_csv`), tabel, Zarvis-programma (`zarvis-desktop`: bestand schrijven en pagina openen).
- Ja van Bram: het uploaden zelf is zijn klik.
- Nodig van Bram: één test met een wegwerpartikel om te zien of `quantity` 0 de voorraad in Bouwflow wijzigt, voor elke volgende import.
- Bewijs: CSV openen in Bouwflow met een wegwerpartikel, kolommen en bedragen kloppen met Invensync.

**Stap 4. Catalogus opkuisen (16 u).**
- Zarvis kan: dubbele leveranciers voorstellen en samenvoegen (met de Bouwflow-naam), 606 leveranciers en 250 categorieën per groep laten bevestigen, SKU's aanvullen met bewijs of intern, omschrijvingen per categorie rechtzetten via de Unifier, en elke batch terugzetten.
- Geraakt: `unifier-propose` en `supplier-match.ts` verhuizen naar `_shared/` (de Unifier-pagina blijft werken); loket; `inventaris.ts`.
- Ja van Bram: elke batch.
- Nodig van Bram: de leveranciersgroepen bevestigen en bepalen of artikelen zonder SKU naar `BH-` of naar een echte SKU gaan (vraag 2).
- Bewijs: batch toepassen en terugdraaien op een kopie van 20 artikelen; getal van leveranciers vóór en na; AI-voorstellen steekproefsgewijs door Bram bekeken.

**Stap 5. Bestellijst en bestelmail klaarzetten (12 u).**
- Zarvis kan: een lijst artikelen en aantallen voor een ZL-dossier opzoeken, per leverancier groeperen met prijzen en een bestelmail als concept openen; de bestelling wordt gelogd.
- Geraakt: loket (`bestellijst_prijzen`, `voorstel_bestelling`), tabellen `leverancier_contact` en `bestelling`, `inventaris.ts`, het programma (concept openen).
- Ja van Bram: het versturen is zijn klik; het loket verstuurt niets.
- Nodig van Bram: e-mailadressen en klantnummers van de leveranciers (13 in Bouwflow), leveradres per werf, en het plafond per bestelling (vraag 4).
- Bewijs: een proefbestelling aan Bram zelf, met de juiste groepering, prijzen en eenheden.

**Stap 6. Echt verzenden na ja (12 u, hangt van IDEE-10 af).** Zarvis stuurt de bestelmail zelf na ja via een mailbox met schrijfrecht. Nodig: dat schrijfrecht en de keuze van de mailbox (vraag 5). Bewijs: een echte mail aan een eigen adres.

**Stap 7. Behoefte afleiden uit een dossier (16 u, optioneel).** Een tabel `stuklijst_recept` per soort post van de calculator, door Bram ingevuld, en een actie die uit `lees_calculaties` een bestellijst voorstelt. Zonder dat blijft de behoefte van Bram zelf komen. Eerst na stap 5 beslissen.

Totaal: stap 1 tot 5 ongeveer 60 uur; alles inclusief stap 6 en 7 ongeveer 88 uur.

## 5. Afhankelijkheden van andere ideeën

- IDEE-29 (doen, niet vertellen) en de ja-poort in code: bepalen of de bevestiging een argument van het model is of iets wat de app vastlegt.
- IDEE-15 (rollen tonen): inventaris wordt de vijfde rol; het totaaloverzicht van wachtende goedkeuringen moet er eerst zijn voor stap 2 meerdere voorstellen tegelijk laat wachten.
- IDEE-10 (mail): echt verzenden (stap 6) en de bron van leverancierscontacten.
- IDEE-12 (Werf): `material_line` als bron van gebruik per type werk; vraagt eerst dat die tabel gevuld wordt.
- IDEE-13 (financiën): een bestelling hoort bij de latere factuur; een document in Invensync zou aan een `bestelling` gekoppeld kunnen worden.
- Brams lopende werk in Invensync (extensie, B-CAL via `quick-add` en `packages/artikelformulier`): dezelfde tabellen; een schema-wijziging moet met dat werk afgesproken zijn.

## 6. Risico's

- Het loket schrijft met de serversleutel en omzeilt de RLS: één fout in een grens is een fout in alle 871 artikelen. Daarom vaste kolomlijst, plafonds per beurt, controle op de verwachte oude waarde, en tests op elke grens.
- De ja-poort: zolang `bevestigd` een argument van het model is, beschermt ze alleen tegen een model dat de instructie volgt.
- Prijs naar Bouwflow zet `price` gelijk aan `cost` (aankoopprijs), met `quantity` 0; verkoopprijzen en marges (282 artikelen) gaan niet mee, en de mogelijke overschrijving van de voorraad is niet nagegaan.
- SKU-wijzigingen na export breken de koppeling met Bouwflow (nieuw artikel).
- Eenheden en verpakking: bijna geen verpakkingsgegevens (844 van 871 zonder), dus bestellijsten kunnen een verkeerde hoeveelheid bevatten. De afgewezen flags van +1885 % en min 50 % wijzen op dat soort fouten.
- Zonder leveranciers (606 artikelen) kan een bestelling niet per leverancier; zonder e-mailadressen niet verstuurd.
- Invensync blijft ongelijk beveiligd: elke ingelogde gebruiker mag alles lezen, schrijven en verwijderen; er is één testaccount, en het overdrachtsdocument bevat een testwachtwoord dat in git staat (niet hier overgenomen). Of de registratie open staat, is niet nagegaan. `verify_jwt` wordt niet afgedwongen (gemeten 5 september).
- De Unifier verwijdert artikelen echt (`unifier.tsx:246`), tegen de eigen regel van soft delete.
- Lovable-credits: functies uitrollen loopt via de agent en kostte credits; die waren op 30 juni opgebruikt. Of dat vandaag nog zo is, is niet nagegaan.

## 7. Zeker tegenover niet kunnen nagaan

**Zeker (gelezen of gemeten):** alle cijfers in 2; de flow van `decideFlag`; de drempel van 0,5 % in `analyse.ts` en `quick-add`; dat "uitgesteld" nergens meer verschijnt; dat het Export-CSV `price` gelijk aan `cost` zet; de vier standen en prompts van `unifier-propose`; dat de leveranciersdetectie lokaal is; de policies en constraints; de structuur van `material_line` en het aantal rijen; dat het marketingloket `bevestigd` als argument neemt; het patroon van `compassBeheerder`.

**Niet kunnen nagaan:**
- Of Bouwflow bij een CSV-import met `quantity` 0 en "update op SKU" de voorraad overschrijft, en of artikelen zonder SKU er dubbel aankomen. Bouwflow was niet te openen.
- De velden van de Bouwflow-leveranciers (e-mail, klantnummer) en of artikelen daar een leverancier hebben.
- Of de leveranciersbedrijven in Mail-CRM overeenkomen met die in Invensync en of er e-mailadressen bij staan (alleen de actienaam gezien in `compass-loket`).
- Of Bouwflow-offertes artikelregels met SKU dragen.
- Of registreren in Invensync open staat; of Lovable-credits nu beschikbaar zijn.
- De werkelijke kost van een AI-ronde over de catalogus.
- Dat de afgeleide bakken de juiste keuze zijn voor Bram: de drempels zijn een voorstel op 25 gevallen.

## 8. Vragen voor Bram

1. Mag Zarvis prijzen en opkuiswerk in de catalogus doen met een ja per voorstel (klein in één ja, rest per stuk), terwijl het naar Bouwflow nog altijd door jouw eigen upload gaat?
2. Voor de 47 artikelen zonder SKU: eerst een echte SKU zoeken (met bewijs), of meteen de interne `BH-`nummers?
3. Welk bedrag per prijsregel is "klein genoeg" om met anderen in één ja te bundelen (naast de 2 %)?
4. Welk plafond per bestelling, en mag Zarvis ooit zelf verzenden, of blijft de bestelmail altijd een concept dat jij verstuurt?
5. Wie bepaalt de leverancier van de 606 artikelen zonder leverancier: jij per groep, of mag ik die uit Bouwflow of een leveranciersmail afleiden en jij bevestigt? En in welke mailbox moeten bestellingen vertrekken?

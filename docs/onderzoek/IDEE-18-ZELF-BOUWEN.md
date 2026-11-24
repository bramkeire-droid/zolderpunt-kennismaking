# IDEE-18, het open deel: Zarvis onderzoekt en bouwt zelf wat hij nog niet kan

Onderzoek van 24 november 2026. Alleen gelezen en opgezocht; niets gebouwd, niets uitgerold. Het geheugen en de kloon (IDEE-30) komen hier niet aan bod.

## 1. Samenvatting

1. Een bouw starten vanuit de functie `zarvis` kan het best met een routine (geplande taak) in de cloud van Claude met een API-trigger: één POST op `/fire`, werkt met de pc uit, en de routine kan de Lovable-koppeling gebruiken. Een GitHub Action kan bouwen, testen en een pull request openen, maar niet uitrollen. Een wachtrij op Brams pc werkt alleen als de pc aan staat.
2. Volledig zonder mens uitrollen is vandaag maar half mogelijk: publiceren kan via `deploy_project` van Lovable, functies enkel door de Lovable-agent een bericht te sturen (kost Lovable-credits). Een rechtstreekse Supabase-CLI-weg vond ik niet voor Lovable Cloud.
3. De grens hoort in code, niet in een instructie: elk gereedschap krijgt een `risico` (lezen, schrijft intern, extern of geld, rechten of migratie), een test en een CI-controle dwingen dat af, en migraties of rechten kunnen niet zonder Brams review samengevoegd worden.
4. "Het kan nu" is pas waar als de bouwer een vaste proefvraag stelt aan de echte functie, met een proefgebruiker, en het antwoord en de gebruikte gereedschappen in de rij van de bouwopdracht bewaart. Zarvis leest die rij en zegt het pas dan.
5. De kleine versie bestaat al (`leer_vaardigheid`); wat ontbreekt is een harde controle in code of een werkwijze echt alleen bestaand gereedschap gebruikt. Totaal voor de kern: ongeveer 23 uur bouwwerk.

## 2. Wat er vandaag is

- `leer_vaardigheid` en `meld_tekort`: `supabase/functions/_shared/zarvis/doen.ts` regels 102 tot 128 (definitie) en 258 tot 269 en 283 tot 292 (uitvoering). `leer_vaardigheid` schrijft naam, wanneer en stappen in `zarvis_vaardigheden`; er wordt niet gecontroleerd of de stappen bestaand gereedschap noemen. `meld_tekort` schrijft `vraag` en `reden` in `zarvis_tekorten`.
- Tabel `zarvis_tekorten`: `supabase/migrations/20261124010000_zarvis_taken.sql` regels 69 tot 76. Kolommen: vraag, reden, status (`open`, `gebouwd`, `afgewezen`), `created_at`. Geen koppeling met een bouw, geen pull request, geen bewijs, geen risicoklasse. De RLS laat alleen de eigenaar zijn eigen rijen lezen en bijwerken (regels 86 tot 95); de nachtbouwer moet dus via de Lovable-databankkoppeling werken om status te wijzigen.
- De werkwijzen komen bij elk gesprek in het geheugen: `supabase/functions/zarvis/index.ts` regel 206 tot 208 en 326. De instructie zegt al: noteer eerst met `meld_tekort`, bied aan om aan te leren, bewaar na ja (`index.ts` regel 100). Dat laatste staat alleen in de instructie, niet in code.
- De poort: `gereedschapVoor` in `supabase/functions/_shared/zarvis/gereedschap.ts` regel 115 zet gereedschap uit als zijn connector in `zarvis_instellingen` op `false` staat. Dat is al een werkende uitzetknop per gereedschap (beheersectie `/zarvis/beheer`).
- Het patroon "niets zonder ja" bestaat in code: `bevestigd` in `plan_taak` en `stuur_whatsapp` (`doen.ts` regel 174 en 245), en in het loket van marketing (logboek `SPRINTPLAN-ZARVIS.md`, "bijsturing: niets uitsluiten zonder Brams ja").
- Nachtbouwer: `docs/ZARVIS-BOUWER.md`. Elke nacht lezen, één stap kiezen, bouwen, mergen, uitrollen, publiceren, melding laten. Ze heeft geen Lovable-koppeling (`docs/HANDOFF-ZARVIS.md` regel 54 en 72). Er is geen manier waarop Zarvis zelf een bouw start; alleen de klok.
- Uitrollen met de hand, vier stappen: `docs/HANDOFF-ZARVIS.md` regel 36 (pull request mergen, migraties toepassen en nakijken, de Lovable-agent de functies laten uitrollen met de zin dat hij niets wijzigt, publiceren en de bundel nakijken). Les uit het logboek: publiceren vlak na een merge kan te vroeg zijn; eerst `latest_commit_sha` controleren.
- Tests: `npx vitest run`; serverfuncties worden getest in `src/lib/zarvis/__tests__` (`takenBellen.test.ts`, `marketing.test.ts`, enz.). Er is geen `.github`-map in de repo, dus geen CI.
- Geplande taken op de pc: ik las de lijst van de geplande taken in de desktopapp. "Zarvis nachtbouwer" staat daar niet bij (er staan vijf andere taken). Ze is dus waarschijnlijk een cloudtaak, of staat elders; dat kon ik niet bevestigen. Wel zichtbaar: de taken op de pc staan nu op "due, not started yet" en het logboek meldt dat de weeklimiet van Claude bereikt is. Een nachtbouwer deelt dus Brams abonnementsruimte met alles wat hij zelf doet.

## 3. Bevindingen per vraag

### Vraag 1: de keten en de manieren om een bouw te starten

De gewenste keten, met één tabel als ruggengraat (`zarvis_bouwopdrachten`, zie stap 1):
tekort gemeld, Zarvis stelt een bouw voor en krijgt ja (of niet, bij klasse A zie 3), de rij krijgt status `goedgekeurd`, de bouwer wordt gestart, onderzoekt, bouwt, test, opent een pull request, rolt uit, doet de proefvraag, zet `geverifieerd` en schrijft een rij in `zarvis_meldingen`.

Drie manieren om de bouwer te starten:

| | Routine in de cloud met API-trigger | GitHub Action (`repository_dispatch` of issue) | Wachtrij die Brams pc afhandelt |
|---|---|---|---|
| Starten vanuit `zarvis` | Eén `fetch` POST naar `https://api.anthropic.com/v1/claude_code/routines/<id>/fire` met bearer-token en beta-header | Een `fetch` naar de GitHub API met een token dat een workflow mag starten | Zarvis schrijft een rij; het programma `zarvis-desktop` leest ze en start `claude -p` |
| Werkt met pc uit | Ja ("they keep working when your laptop is closed") | Ja | Nee |
| Uitrollen mogelijk | Ja, via de Lovable-koppeling van de routine (claude.ai-koppelingen kunnen in een routine) | Nee: de Lovable MCP-server kent alleen OAuth met browserlogin; zonder Lovable-API-sleutel (Business of Enterprise) geen uitrol | Ja, met de lokale koppelingen van Bram |
| Kost | Telt mee op het abonnement van Bram; limieten: 30 vuren per uur per taak, 100 per uur per account, geen overschrijding mogelijk; anders usage credits | GitHub Actions-minuten plus API-tokens (met `ANTHROPIC_API_KEY`) of abonnement (met `CLAUDE_CODE_OAUTH_TOKEN`); `--max-turns` en timeouts beschikbaar | Abonnement; geen extra |
| Euro-plafond afdwingen | Niet rechtstreeks (abonnement); wel een maandelijks plafond op usage credits | Ja: met een API-sleutel `--max-budget-usd` en een bestedingslimiet op de werkruimte in de Console | Nee |
| Van Bram nodig | Eén token (eenmalig getoond) als secret in Lovable; routine bewerken op claude.ai/code/routines | GitHub App of token plus secret; workflowbestand | Niets nieuws, maar de pc moet aan |
| Stabiliteit | Onderzoekspreview; beta-header `experimental-cc-routine-2026-04-01`; vorm kan veranderen | Officieel product, stabiel (`@v1`) | Eigen code |

Belangrijke details uit de documentatie van de routines:
- De `text` die je meestuurt komt toe verpakt als niet-vertrouwde gegevens; de opgeslagen opdracht van de routine moet er expliciet naar verwijzen. Conclusie: Zarvis stuurt alleen het id van de bouwopdracht mee, nooit vrije tekst; de bouwer leest de rij zelf via de databank. Zo wordt een mail of webpagina nooit een bouwopdracht.
- `/fire` is er alleen voor claude.ai-gebruikers en maakt geen deel uit van de Platform-API.
- Een run start in "auto mode" (een classificator laat acties toe of blokkeert ze). Na herhaalde blokkades wacht de run op een antwoord van Bram. Een onbewaakte bouw kan dus blijven hangen. Niet na te gaan hoe vaak dat bij Lovable-schrijfacties gebeurt.
- De routine pusht naar `claude/`-takken. Rechten op GitHub volgen de gekoppelde GitHub-identiteit: een regel die die toegang kan omzeilen, blokkeert de push niet. Bram is eigenaar van de repo; een ruleset moet dus "ook voor beheerders" gelden of de bouwer moet een aparte identiteit hebben.
- Een routine kan een omgeving met "Limited" netwerk gebruiken; Lovable-koppelingen lopen via de servers van Anthropic en hebben geen toegestane domeinen nodig. Voor een rechtstreekse oproep naar de Supabase-API vond ik `supabase.co` niet in de gelezen tekst over de standaardlijst; niet bevestigd.

Mijn aanbeveling: routine met API-trigger als hoofdweg, de bestaande nachtelijke planning als vangnet (dezelfde taak mag meerdere triggers hebben, dus geen tweede taak). GitHub Action alleen voor de controles (tests, risicoklasse) op elke pull request, niet als bouwer. Wachtrij op de pc niet als hoofdweg: past niet bij "ook als mijn pc uit staat".

Een serverfunctie van Supabase zelf als bouwer valt af: een bouw duurt minuten tot uren en heeft een shell nodig. Niet nagemeten welke tijdslimiet de functie heeft.

### Vraag 2: uitrollen zonder mens

Wat de officiële documentatie zegt:
- Lovable MCP-server: "OAuth is the only supported way". Tools onder meer `create_project`, `send_message`, `query_database`, `deploy_project`. Credits worden gebruikt voor `create_project` en `send_message`; "other tools are free". `deploy_project` publiceert naar `lovable.app` en wordt geweigerd bij onopgeloste kritieke beveiligingsbevindingen als die blokkade aan staat. Een tool voor het uitrollen van edge functions staat niet in de documentatie.
- Lovable API (REST, `/v1`): projecten, deployments (publiceren, ongedaan maken, status), analytics, beveiliging. Sleutels per werkruimte, enkel voor Business en Enterprise. Bouwen kost er geen credits. Geen berichten naar de agent, geen edge functions.
- GitHub-koppeling van Lovable: tweerichtingssynchronisatie met één tak (standaard de hoofdtak); een push op die tak wordt opgepikt als GitHub dat meldt. De pagina zegt niets over `supabase/functions` of migraties die automatisch uitrollen. Dat past bij wat Bram vaststelde: functies rollen niet vanzelf uit na een merge.
- Lovable Cloud: de pagina zegt niet of de onderliggende Supabase bereikbaar is met de CLI, een dashboard of een servicesleutel. Het logboek zegt dat de databank van Compass enkel via de Lovable-koppeling bereikbaar is, niet via de Supabase-koppeling. Een `supabase functions deploy` vanuit een bouwer lijkt dus uitgesloten; niet bevestigd door een proef. Overstappen op een eigen Supabase-project is volgens Lovable een handmatige verhuizing in meerdere stappen (omgekeerd wordt niet ondersteund).

Wat dat betekent voor de keten van vandaag, per stap:

| Stap | Zonder mens mogelijk? | Hoe |
|---|---|---|
| Pull request mergen | Ja, op voorwaarde van een GitHub-toegang voor de bouwer | Via het gekoppelde GitHub-account, met regels (zie 3) |
| Migratie toepassen | Waarschijnlijk, via `query_database` zoals nu gedaan werd; niet getoetst of dat schrijven toelaat in elke geval | Altijd met nazicht (zie 3) |
| Functies uitrollen | Ja, maar via `send_message` aan de Lovable-agent, dat credits kost en een tweede AI laat meebeslissen | Zin "wijzig geen code, voer geen migraties uit, rol alleen deze functies uit" |
| Publiceren | Ja | `deploy_project` |
| Nakijken dat het live staat | Ja | `get_project` voor `latest_commit_sha`, dan bundel of echte oproep |

Wat de nachtbouwer vandaag precies mist, in volgorde van belang:
1. De Lovable-koppeling in de taak (Bram moet ze toevoegen; HANDOFF regel 72).
2. Een manier om te starten buiten de klok (geen API-trigger, geen token).
3. Een bouwopdracht met status en risicoklasse; nu is de enige invoer de vrije lijst `zarvis_tekorten`, zonder goedkeuring of bewijs.
4. Regels op GitHub (er is geen CI en geen branch-beveiliging; dat is nu niet nagekeken in de repo, enkel afgeleid uit het ontbreken van `.github`).
5. Een proefgebruiker en een vaste proefvraag; de test van 24 november gebeurde met een tijdelijke gebruiker die achteraf verwijderd werd.
6. Een plafond (per nacht en per maand) en een noodstop.
7. Een afspraak over wat bij een hangende run gebeurt.

### Vraag 3: de grens, in code

Voorstel voor vier klassen. Alles hangt aan het gereedschap, niet aan de bouwer.

| Klasse | Wat | Zonder Brams nazicht live? | Hoe afgedwongen |
|---|---|---|---|
| A, lezen | Alleen-lezen gereedschap, geen migratie, geen nieuwe geheimen | Ja, na groene tests en geslaagde proefvraag | Automatische merge als de CI de klasse A bevestigt |
| B, schrijven | Schrijft in Compass met de rechten van de gebruiker, zonder buitenwereld of geld | Code mag samengevoegd worden, het gereedschap staat uit tot Brams eerste ja; elke aanroep vraagt `bevestigd` | Connector-vlag standaard `false`, `bevestigd` verplicht in de poort |
| C, extern of geld | Versturen, boeken, bestellen, publiceren, alles wat geld kost | Nee: pull request blijft open | Merge vraagt Brams review; gereedschap vraagt bij elke aanroep `bevestigd`; plafond in code zoals het dagbudget (45 euro) |
| D, migratie of rechten | Elke wijziging in `supabase/migrations`, policies, `grant`, `revoke`, `has_role`, `verify_jwt`, secrets | Nooit | CODEOWNERS en vereiste review van Bram; de bouwer mag nooit zelf mergen |

Hoe de bouwer dat niet kan omzeilen (drie lagen, geen enkele rust op een instructie):

1. In het gereedschap zelf. Elke definitie in `GEREEDSCHAP` en `DOE_GEREEDSCHAP` krijgt een veld `risico: 'lezen' | 'schrijft' | 'extern'`. Een test (`src/lib/zarvis/__tests__/grens.test.ts`) loopt alle gereedschap af en faalt als een veld ontbreekt, als een gereedschap met `schrijft` of `extern` geen `bevestigd` in zijn schema heeft, of als zijn uitvoerder zonder `bevestigd: true` toch iets wegschrijft (de test roept hem aan met een nagebootste databank en eist dat er niets gebeurt). Dit is de uitbreiding van het patroon uit `plan_taak` en `stuur_whatsapp`.
2. In de CI. Een GitHub Action die geen model draait maar het verschil leest: raakt het `supabase/migrations`, het woord `create policy`, `grant`, `revoke`, `has_role`, `verify_jwt` of `config.toml`, dan krijgt de pull request het label `klasse-D` en kan niet samengevoegd worden zonder Brams review. Een nieuw gereedschap met `risico` boven `lezen` geeft het label `klasse-B` of `klasse-C`. De bouwer kan zijn eigen label niet bepalen.
3. Op GitHub. Branch-beveiliging op `main`: verplichte groene controle, CODEOWNERS voor `supabase/migrations/` en `supabase/functions/_shared/zarvis/grens.ts` op Bram, de bouwer pusht enkel naar `claude/`-takken (dat doet de routine standaard). Zonder "ook voor beheerders" zou Brams eigen identiteit de regels kunnen omzeilen (documentatie van de routines).

Runtime-vangnet naast de bouw: een nieuw gereedschap krijgt een connectornaam; zet de bouwer die standaard uit voor klasse B en C, dan staat niets aan voor Bram het in de beheersectie aanzet. Dezelfde knop is de terugrolweg (zie vraag 4).

Een extra grens voor het aanleren zelf: een werkwijze die een gereedschap met `risico` boven `lezen` bevat, bewaart Zarvis pas na voorlezen en ja (nu staat dat alleen in de instructie). Reden: een werkwijze komt bij elk gesprek in de instructie en is dus een blijvende opdracht; ze mag nooit voortkomen uit tekst van een mail of webpagina.

### Vraag 4: kwaliteit

Verplicht voor elke bouw, in deze volgorde, en zonder één ervan geen status `pr_open`:
- `npx tsc --noEmit -p tsconfig.app.json`, `TZ=Europe/Brussels npx vitest run`, `npm run build` (de drie die HANDOFF regel 40 noemt), uitgevoerd in de CI én in de bouw.
- Een nieuw testbestand voor elk nieuw gereedschap, tegen een nagebootste dienst zoals `marketing.test.ts`; de CI faalt als een nieuw gereedschap in `_shared/zarvis` geen test heeft (eenvoudig te controleren op naam).
- De grenstest hierboven.
- Een proefgebruiker: één vaste gebruiker met enkel rol `user`, niet beheerder, aangemaakt door Bram eenmaal. Zijn inloggegevens horen als secret in de omgeving van de routine, niet in een document. De bouwer stelt de proefvraag aan de echte functie en bewaart het antwoord en de lijst van aangeroepen gereedschappen. Deze weg bestond al als handwerk op 24 november; hier wordt hij vast. Les uit het logboek: een schrijvende actie test je nooit met een echte term; de proefvraag voor klasse B en C eist een bestaande-niet-term of een voorstel zonder `bevestigd`.
- Terugrollen: (a) onmiddellijk, zonder uitrol: connectorvlag uit zetten in `zarvis_instellingen`; (b) code: pull request terugdraaien en functie opnieuw laten uitrollen; (c) migraties zijn additief en bestaan als klasse D toch onder nazicht, dus geen automatische terugdraai.
- Maximum per nacht en per maand, afgedwongen in de tabel, niet in de instructie: een tellerrij of een controle in de starter (`zarvis` weigert te vuren boven N bouwen per dag). Eén bouw per nacht is al de regel in `ZARVIS-BOUWER.md`; hetzelfde getal wordt het plafond voor vuren via de API-trigger, ruim onder de 30 per uur per taak.
- Maandplafond in euro: dit kan alleen echt met een API-sleutel (`--max-budget-usd` in print-modus, het is een schatting aan de clientzijde die kan overschreden worden; en een bestedingslimiet op de werkruimte in de Console). Met het abonnement bestaat er geen eurobedrag per run; wel een eurolimiet op de usage credits. Praktische vervanger: een teller van runs per maand in de tabel en een melding aan Bram bij 80%. Lovable-credits voor `send_message` tellen apart en moeten ook in die teller. Wat een bouw gemiddeld kost, is niet te weten voor er een gebouwd is; Anthropic noemt gemiddeld circa 13 dollar per ontwikkelaar per actieve dag voor Claude Code als algemeen cijfer, geen schatting voor deze taak.
- Een hangende run (wacht op antwoord) telt als mislukt na een maximumduur; de starter vuurt geen nieuwe bouw zolang er een `bezig` staat.

### Vraag 5: bevestigen dat het kan

Een tekort is pas opgelost als de rij van de bouwopdracht zegt: `geverifieerd`, met `bewijs`: de proefvraag, het antwoord, de gebruikte gereedschappen, de commit en het tijdstip. Aanpak:
1. Elke bouwopdracht draagt een `bewijsvraag`, in Brams woorden uit het tekort ("Hoe laat moet ik vertrekken naar Gent?"), vastgelegd bij het goedkeuren, niet door de bouwer verzonnen.
2. Na het uitrollen roept de bouwer de live functie aan als proefgebruiker en eist: er is een gereedschapsoproep van het nieuwe gereedschap en het resultaat is geen fout. Het model-antwoord alleen volstaat niet.
3. Alleen dan zet ze `geverifieerd`, het tekort op `gebouwd` en schrijft ze één melding in `zarvis_meldingen`.
4. Nieuw gereedschap `bouw_stand` (klasse A): Zarvis leest de rij. Hij zegt "gebouwd" alleen als de status `geverifieerd` is en geeft in dezelfde zin wat niet getest werd (bijvoorbeeld geen echte aanroep van een externe dienst). Bij `pr_open` zegt hij dat er een pull request klaarstaat.
5. De eerstvolgende keer dat Bram in een gesprek zit: Zarvis ziet een nieuw `geverifieerd` en herhaalt de oorspronkelijke vraag ("Je vroeg me eerder naar X. Ik kan dat nu. Zal ik het meteen doen?").
Voorbeeldzin: "Dat kon ik nog niet. Sinds vannacht wel: ik kan nu ritafstanden berekenen. Ik probeerde het met een proefvraag en het werkte. Niet getest: een echte rit met verkeer." Dit volgt de eerlijkheidsregel van Brams overdracht (HANDOFF regel 18).

### Vraag 6: de kleine versie tijdens het gesprek

Wat Zarvis zichzelf nu al zonder code kan aanleren: alles wat een volgorde van bestaand gereedschap is, plus tijd (`plan_taak`), plus opmaak. Voorbeelden: een weekoverzicht van offertes zonder antwoord, "elke ochtend de nieuwe dossiers van gisteren", "zeg me bij elke werf wat de laatste mail was".

Hoe Zarvis beslist of iets werkwijze of code is, met de huidige gereedschappen als maatstaf (en in code, niet enkel in de instructie):
1. Welke gegevens en acties heeft de vraag nodig? Bestaat elk daarvan als gereedschap in de lijst die hij al heeft (zoeken, lezen, plannen, mails, weer, web, route, marketing)?
2. Ja voor elk: werkwijze (soort A). Nee voor één: code (soort B), dus `meld_tekort` met reden "ontbrekend gereedschap: <naam>".
3. Harde controle: `leer_vaardigheid` krijgt een extra veld `gereedschap: string[]` en weigert als één naam niet bestaat in `GEREEDSCHAP` of `DOE_GEREEDSCHAP`. Zo kan Zarvis geen werkwijze aanleren die stilzwijgend naar iets verwijst dat niet bestaat, en moet hij bij twijfel naar `meld_tekort`.
4. Een werkwijze wordt bewezen door ze meteen één keer uit te voeren in hetzelfde gesprek en pas daarna "dit kan ik nu" te zeggen.
5. Grenzen: maximum 25 werkwijzen (IDEEENBAK IDEE-30), ja vereist als een stap schrijft of verstuurt, dubbele namen weigeren (nu kan hij dezelfde naam tweemaal bewaren: de insert in `doen.ts` regel 265 heeft geen controle; niet in de migratie nagekeken of er een unieke index is, in de gelezen delen niet).
6. Wat Zarvis niet zelf mag beslissen: of iets "nieuwe code" is in grensgevallen (bijvoorbeeld een bestaand gereedschap dat een veld mist, zoals een filter dat niet bestaat). Daar kiest hij voor `meld_tekort` en benoemt het ontbrekende veld.

## 4. Voorstel in bouwstappen

### Stap 0: de kleine versie hard maken (ongeveer 3 uur)
- Zarvis kan dan: een werkwijze aanleren die gecontroleerd bestaand gereedschap gebruikt, ze meteen één keer bewijzen, en bij ontbrekend gereedschap het tekort noteren met de naam van het ontbrekende.
- Geraakt: `supabase/functions/_shared/zarvis/doen.ts` (veld `gereedschap`, `leer_vaardigheid`, dubbele naam, ja voor schrijvende stappen), `supabase/functions/zarvis/index.ts` (beslisregel in de instructie), tests in `src/lib/zarvis/__tests__/`. Geen migratie nodig, behalve een unieke index als die ontbreekt.
- Ja van Bram: enkel voor werkwijzen die iets schrijven of versturen.
- Van Bram nodig: niets.
- Bewijs: nieuwe tests (onbekende gereedschapsnaam wordt geweigerd, schrijvende stap zonder `bevestigd` wordt niet bewaard, dubbele naam), `npx vitest run`, daarna een echt gesprek met de proefgebruiker waarin één werkwijze wordt aangeleerd en uitgevoerd.

### Stap 1: de bouwopdracht en de grens in code (ongeveer 6 uur)
- Zarvis kan dan: een tekort omzetten in een voorstel met klasse, kost-inschatting en bewijsvraag; Brams ja vastleggen; de stand van een bouw navertellen. Nog geen automatische bouw.
- Geraakt: nieuwe migratie `zarvis_bouwopdrachten` (id, tekort_id, soort, klasse, status, bewijsvraag, pr_url, bewijs jsonb, aantal_runs, timestamps; RLS zoals de andere Zarvis-tabellen; additief); `doen.ts` (`stel_bouw_voor`, `bouw_stand`); veld `risico` op alle bestaande gereedschapsdefinities in `gereedschap.ts`, `doen.ts`, `buiten.ts`, `mail.ts`, `web.ts`, `marketing.ts`; `grens.test.ts`; `docs/ZARVIS-BOUWER.md` (leest enkel goedgekeurde opdrachten).
- Ja van Bram: bij elke opdracht (klasse B, C en D); klasse A volgens zijn antwoord op vraag 1 hieronder.
- Van Bram nodig: de beslissing over klasse A en het plafond.
- Bewijs: grenstest groen; migratie toegepast en nagekeken op de live databank; een echt gesprek: Zarvis stelt een bouw voor, Bram zegt ja, de rij krijgt `goedgekeurd`.
- Geschatte omvang: 6 uur (de `risico`-labels op ongeveer 30 gereedschappen zijn het grootste deel).

### Stap 2: de bouwer kan zelf uitrollen en bewijzen, 's nachts (ongeveer 8 uur)
- Zarvis kan dan: een goedgekeurde bouw laten afwerken tot en met uitrol en proefvraag, in de nacht; Bram krijgt een melding met bewijs.
- Geraakt: de geplande taak (opdracht herschrijven naar de statusmachine, Lovable-koppeling toevoegen); `.github/workflows/` (nieuw: tests, risicoklasse-label, controle op testbestand); GitHub-ruleset en CODEOWNERS; proefgebruiker; `docs/ZARVIS-BOUWER.md`.
- Ja van Bram: klasse B, C, D volgens hierboven; klasse A met automatische merge.
- Van Bram nodig: de Lovable-koppeling toevoegen aan de taak; een proefgebruiker aanmaken en zijn inloggegevens als secret in de omgeving van de taak zetten; de GitHub-regels aanvaarden (ook voor beheerders); een beslissing over de identiteit waarmee de bouwer merget.
- Bewijs: een echte bouw van een klein, onschadelijk alleen-lezen gereedschap (klasse A) van begin tot eind, met `bewijs` ingevuld en de bundel of functie nagekeken; en een bewust gemaakte klasse-D-wijziging die niet kan samengevoegd worden zonder Bram.
- Risico dat hier pas blijkt: hangende runs in auto mode; de uitrol van functies via een bericht aan de Lovable-agent.

### Stap 3: Zarvis start de bouw zelf, tijdens het gesprek (ongeveer 6 uur)
- Zarvis kan dan: na Brams ja de bouwer meteen starten via de API-trigger en tijdens het gesprek de stand melden ("de bouw loopt, ik meld het zodra het kan").
- Geraakt: `stel_bouw_voor` of een nieuw gereedschap `start_bouw` in `doen.ts` (roept `/fire` aan, enkel met het id van de opdracht); een beheerregel in `/zarvis/beheer` voor de noodstop; een teller (per dag, per maand); de melding aan de pc (bestaat).
- Ja van Bram: bij het starten (klasse A volgens zijn keuze).
- Van Bram nodig: de API-trigger op de routine aanmaken, de token als secret `ZARVIS_BOUWER_TOKEN` in Lovable plakken (nooit in code), en de plafonds geven.
- Bewijs: een test tegen een nagebootste `/fire` (token meegestuurd, enkel het id, weigert boven het plafond, weigert bij een lopende bouw); daarna één echte start met de proefopdracht van stap 2.

### Stap 4 (optioneel, groot): volledig zonder tussenpersoon uitrollen (10 tot 14 uur)
Kies er één van de twee, en pas als stap 2 en 3 een paar echte bouwen hebben gedaan:
- (a) Een Lovable-API-sleutel gebruiken voor publiceren (Business of Enterprise, geen credits) en het uitrollen van functies door een bericht aan de Lovable-agent laten, zoals nu. Kleiner, maar blijft afhankelijk van Lovable-credits en een tweede AI.
- (b) Het project verhuizen naar een eigen Supabase-project, zodat een GitHub Action `supabase db push` en `supabase functions deploy` kan doen. Dat is een handmatige verhuizing (Lovable zegt het zelf), een apart risico voor de rest van Compass, en valt buiten Zarvis. Alleen doen als Bram ook andere redenen heeft.
- Bewijs: een bouw zonder één bericht aan de Lovable-agent, met de bundel of functieversie nagekeken.

Totaal voor de kern (stap 0 tot 3): ongeveer 23 uur bouwwerk. Stap 4 komt er 10 tot 14 uur bovenop. Dit zijn schattingen uit eigen inzicht, niet gemeten.

## 5. Afhankelijkheden van andere ideeën

- IDEE-29 (de poort voor alles buiten Compass): de klassen B en C hier zijn dezelfde regel, met dezelfde `bevestigd`. Stap 1 moet de `risico`-labels op ook de loketten van marketing en latere rollen zetten; wie IDEE-29 uitbreidt moet dat label erbij zetten, anders faalt de grenstest.
- IDEE-16 (taken op tijd): een bouw kan een taak van soort `bouw` worden zodat bestaande planning, meldingen en `toon_taken` hergebruikt worden. Niet nodig voor stap 0 tot 3; wel een nette uitbreiding.
- IDEE-28 (bellen) en `zarvis_meldingen`: het resultaat van de bouw gaat langs bestaande kanalen; bellen bij mislukken alleen als Bram dat vraagt.
- IDEE-30 (geheugen en kloon): apart. Raakpunt: `zarvis_vaardigheden` is nu het enige geheugen dat leert; als IDEE-30 daar iets anders van maakt, moet stap 0 mee veranderen.
- IDEE-15 (rollen tonen): een bouw voor een nieuwe rol raakt het ontwerp van de rollen; zo'n opdracht hoort bij Bram, niet bij de nachtbouwer.
- Beheersectie `/zarvis/beheer`: de uitzetknop per gereedschap is de terugrolweg; elke connector van nieuw gereedschap moet daar verschijnen.

## 6. Risico's

- Een bouwer die zijn eigen controle schrijft: daarom staan de grenstest en de CI-labels buiten wat de bouwer in dezelfde pull request mag wijzigen (CODEOWNERS op `grens.ts` en `.github/`).
- Promptinjectie: een mail, webpagina of WhatsApp kan proberen een bouw of werkwijze te laten starten. Maatregelen: enkel een id meesturen naar de routine; werkwijzen en bouwopdrachten enkel uit Brams eigen woorden in het gesprek; de bouwer leest tekorten als gegevens.
- De weeklimiet: de nachtbouwer verbruikt dezelfde ruimte als Brams eigen werk; het logboek meldt al dat ze bereikt werd. Een bouw die halverwege stopt, laat een open pull request of een uitgerolde functie zonder proef achter. Maatregel: een opdracht blijft `bezig` met tijdstempel; de starter beschouwt na een maximumduur als mislukt en meldt het.
- Hangende run in auto mode (zie vraag 1): geen eigen oplossing gevonden; enkel opsporen via de duur.
- Uitrol via een bericht aan de Lovable-agent: de agent kan zelf code wijzigen; het logboek bevat al een voorbeeld van de zin die dat verbiedt. Credits per bericht.
- Onderzoekspreview: `/fire` en de beta-header kunnen veranderen; bouw de starter in één bestand zodat een wijziging één plek raakt.
- Een gebouwd gereedschap dat per ongeluk meer rechten heeft dan bedoeld (bijvoorbeeld de serversleutel in plaats van het token van de gebruiker): klasse D en de grenstest; extra regel: een bouw mag de serversleutel nooit importeren buiten `zarvis-taken`.
- Kostenoverschrijding: geen eurobedrag mogelijk met het abonnement; plafond is een telling.
- Eén eigenaar, één GitHub-identiteit: de bouwer handelt als Bram.

## 7. Zeker tegenover niet kunnen nagaan

Zeker (uit repo en officiële pagina's die ik las):
- De bestaande gereedschappen, de tabel `zarvis_tekorten` en de status van de nachtbouwer zoals hierboven beschreven (`doen.ts`, de migratie, `ZARVIS-BOUWER.md`, `HANDOFF-ZARVIS.md`).
- Routines hebben een API-trigger via `/fire` met bearer-token en beta-header, werken met de laptop dicht, kunnen claude.ai-koppelingen gebruiken, pushen naar `claude/`-takken; limieten 30 en 100 per uur; `text` komt toe als niet-vertrouwde gegevens (https://code.claude.com/docs/en/routines).
- `anthropics/claude-code-action` draait op elke GitHub-gebeurtenis met `prompt`, ondersteunt `--max-turns`, `--allowedTools`, en `ANTHROPIC_API_KEY` of `CLAUDE_CODE_OAUTH_TOKEN` (https://code.claude.com/docs/en/github-actions).
- `--max-budget-usd` en `--max-turns` bestaan in print-modus; de eerste is een schatting (https://code.claude.com/docs/en/cli-reference).
- Lovable MCP: enkel OAuth; `deploy_project` bestaat; credits enkel voor `create_project` en `send_message` (https://docs.lovable.dev/integrations/lovable-mcp-server). Lovable API: publiceren zonder credits, enkel Business en Enterprise (https://docs.lovable.dev/integrations/lovable-api).

Niet kunnen nagaan:
- Of "Zarvis nachtbouwer" een cloudtaak of een taak op een andere plaats is: ze staat niet in de lijst van de geplande taken op de pc; de cloudlijst kon ik niet inzien.
- Of de Lovable-koppeling in een routine ook zonder browserlogin blijft werken (de OAuth hangt aan de koppeling in claude.ai; niet geprobeerd).
- Of `query_database` van de Lovable-koppeling migraties kan toepassen; het logboek zegt dat dat zo gedaan werd, ik las de tool niet.
- Of Lovable Cloud enige directe Supabase-toegang (CLI, accesstoken, servicesleutel) toelaat; de docs zeggen er niets over, het logboek zegt van niet.
- Of een uitrol van functies door de Lovable-agent betrouwbaar blijft bij herhaling, en wat het in credits kost.
- Of `supabase.co` bereikbaar is vanuit de standaardomgeving van een routine; niet gevonden in de gelezen delen van de documentatie.
- Of de routine een pull request zelf kan mergen (de documentatie noemt branches en pushen, niet merge).
- Welk Lovable-plan Bram heeft (Business of Enterprise nodig voor de API).
- Of het GitHub-plan van de repo ruleset en CODEOWNERS met "ook voor beheerders" toelaat.
- De kost van één bouw in tokens of in procenten van zijn weekbudget; er is nog geen enkele bouw gemeten.
- De tijdslimiet van een Supabase-functie; niet nodig voor het voorstel.

## 8. Vijf vragen voor Bram

1. Mag een nieuw alleen-lezen gereedschap van Zarvis (geen schrijven, geen migratie, geen geheimen, groene tests, geslaagde proefvraag) zonder jouw nazicht live, of wil je ook daar eerst een ja? Mijn voorstel: ja, live zonder nazicht; alles wat schrijft of verstuurt na jouw ja; migraties en rechten altijd door jou.
2. Welk plafond? Een aantal bouwruns per maand (bijvoorbeeld vier) en één per nacht, of een eurobedrag met een API-sleutel van Anthropic (dan kan dat exact afgedwongen worden)? En mogen Lovable-credits per uitrol meetellen?
3. Mag de bouwer samenvoegen met jouw GitHub-account, met regels die ook jou binden voor klasse D, of liever een aparte GitHub-identiteit voor Zarvis?
4. Welk Lovable-plan heb je (voor de API-sleutel), en is "Zarvis nachtbouwer" een taak in de cloud of op je pc?
5. Wil je dat Zarvis na een goedgekeurde bouw zelf meteen start (stap 3) of blijft de nacht genoeg?

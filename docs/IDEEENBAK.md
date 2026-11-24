# Ideeënbak

Ideeën, vragen en feedback die Bram tussendoor inbracht terwijl er aan iets anders
gewerkt werd. Ze worden hier letterlijk bewaard zodat ze een sessie overleven, en
later grondig behandeld worden — niet met één regel afgedaan.

Nummers zijn doorlopend en worden nooit hergebruikt.

---

## IDEE-1 — Min en max ook manueel intypen naast de handles
- **Datum**: 2026-08-11
- **Bram zei letterlijk**: "Wanneer ik de handles van het bereik verschuif moet ik ook de optie hebben om manueel het min en max bedrag aan te passen waarbij de handles dan automatisch mee verschuiven."
- **Waar ik mee bezig was**: techniekenregel bij badkamer + inklapbare elementen in de calculator (afgerond en live, bundle index-c0Vq0Mvq.js)
- **Eerste inschatting**: Raakt `MargeBalk.tsx` en het `marge`-model in `prijscalculator.ts`. De omgekeerde weg bestaat nog niet: nu gaat het van factor → bedrag, dit vraagt bedrag → factor (`factor = bedrag / standaardExcl`, na aftrek van de eigen-bereik-elementen die niet meeschuiven). Klein tot middelgroot; de rekenkant is een paar regels, de UI-kant iets meer. Risico: bij dossiers waar de eigen-bereik-elementen een groot deel van het bedrag uitmaken, kan een ingetypt minimum een factor opleveren die buiten de sleepgrenzen (40%–160%) valt — dan moeten die grenzen meebewegen of moet er een nette begrenzing komen.
- **Mijn open vragen erover**: (1) Gaat het ingetypte bedrag over excl. btw of over het getoonde bedrag incl. 6%? De balk toont nu incl. btw. (2) Moet de reden-popup ook verschijnen bij handmatig intypen, net als bij slepen? (3) Wat als hij een minimum boven de raming typt — begrenzen op de raming, of toestaan?
- **Behandeling**: opgepakt op 2026-08-11 op vraag van Bram ("DOe nu")
- **Beslissingen op de open vragen** (zelf genomen, één consistent antwoord met wat er al was):
  1. Bedragen zijn **incl. 6% btw** — dat is wat de balk toont, alles anders zou verwarren.
  2. De **reden-popup verschijnt ook bij intypen**: het gevolg is hetzelfde als bij slepen.
  3. **Zelfde grenzen als slepen**: minimum blijft onder de raming, maximum erboven, en alles binnen 40–160%.
- **Status**: afgewerkt (2026-08-11) — min en max zijn klikbare invoervelden in MargeBalk.tsx; het handvat schuift mee via bedragNaarFactor in PrijsCalculatorPaneel.tsx, met vier tests in src/lib/__tests__/marge.test.ts

## IDEE-2 — Minimumslider stopt op 99% maar bedrag lijkt niet te kloppen
- **Datum**: 2026-08-11
- **Bram zei letterlijk**: "Ik sleep de minimumslider helemaal naar rechts en links onderaan wordt dit begrensd dfoor €80 287 terwijl het bedrag in het midden €90591 is. Fout?"
- **Screenshot (cijfers overgenomen)**: midden €90.591 incl. 6% · minimum €80.287 met label "99%" · maximum €109.738 "115%" · excl. €85.463 · btw-keuze 6%.
- **Waar ik mee bezig was**: calculator-doorlichting (workflow wf_0d358990-656) draait — audit van berekening/weergave/btw/export.
- **Eerste inschatting**: 80.287/90.591 ≈ 88,6%, geen 99%. Vermoedelijk: het %-label toont de factor op het TARIEFDEEL, terwijl het bedrag ook eigen-bereik-elementen (badkamer/maatwerk/extra, die niet meeschuiven) bevat — dan is het bedrag correct maar het label misleidend. Alternatief: de begrenzing op 0.99 werkt op het verkeerde totaal. Raakt MargeBalk.tsx (naarPct/labels) en berekenPrijs (exclMin-opbouw).
- **Mijn open vragen erover**: moet het %-label de verhouding t.o.v. het middenbedrag tonen i.p.v. de tariefdeel-factor?
- **Behandeling**: meegenomen in de fix-ronde van de calculator-doorlichting. De audit vond het onafhankelijk ook (MargeBalk %-label toont de tariefdeel-factor, terwijl de bedragen ook eigen-bereik-elementen bevatten).
- **Status**: afgewerkt (2026-08-11) — de %-labels naast minimum en maximum tonen nu de verhouding van het GETOONDE bedrag tot het meest waarschijnlijke bedrag (80.287/90.591 → 89%), niet langer de interne factor. De begrenzing zelf was correct: het minimum-handvat stopt waar het tariefdeel de raming raakt.

## IDEE-3 — Communicatietijdlijn opgesplitst in inklapbare categorieën
- **Datum**: 2026-08-26
- **Bram zei letterlijk**: "In plaats van de communicaties te labelen als (klant, leverancier, klant + leverancier, varia) wil ik ze opgesplitst in categorien, inklapbaar"
- **Waar ik mee bezig was**: afronding /nietstoppen-sessie S0–S4 (alles gecommit; wachtend op merge + Anthropic-limiet)
- **Eerste inschatting**: raakt alleen DossierCommunicatie.tsx — de platte tijdlijn wordt gegroepeerd in Collapsible-secties (patroon bestaat al in Mail Hub-maandgroepen). Klein-middelgroot, geen datamodelwijziging, geen risico voor andere schermen.
- **Mijn open vragen erover**: (1) exacte categorie-indeling — zijn opsomming leest als de huidige labels; meest verdedigbare groepen: Klant / Leveranciers / Eigen gesprekken & notities / Varia. (2) Alles standaard open of alleen Klant?
- **Behandeling**: eerst — goedkoopst precies nu (context en branch staan open, nog niet gemerged)
- **Beslissingen op de open vragen** (zelf genomen): (1) groepen = Klant / Klant + leverancier / Leveranciers / Varia, bepaald per item op de betrokken rollen (afzender + cc'ers; eigen gesprekken en Leexi-klantcalls onder Klant, gemengde mails onder Klant + leverancier). (2) Alles standaard open behalve Varia; een actieve zoekterm klapt elke groep met treffers open zodat zoeken nooit iets verbergt; rol-badges alleen nog in de gemengde en Varia-groep.
- **Status**: afgewerkt (2026-08-26) — inklapbare categoriegroepen in DossierCommunicatie.tsx (shadcn Collapsible, zelfde patroon als de Mail Hub-maandgroepen); beslissing-klik opent eerst de (eventueel dichte) doelgroep. Live geverifieerd op ZL-0116: Klant(5) + Leveranciers(3), inklappen en zoek-gedrag getest.

## IDEE-4 — Kost de communicatiefunctie extra Anthropic-tegoed?
- **Datum**: 2026-08-26
- **Bram zei letterlijk**: "Er moet toch geen extra tegoed van Anthorpic komen voor deze functie? De API calls komen uit de MAIL CRM database en moeten toch niet nog eens aangesproken worden? Ofwel?"
- **Waar ik mee bezig was**: niets meer open — wachtend op merge + limietbeslissing
- **Eerste inschatting**: begripvraag, geen bouwwerk
- **Behandeling**: direct beantwoord (stuurt zijn openstaande limietbeslissing)
- **Status**: afgewerkt (2026-08-26) — beantwoord: bekijken kost nul (alles komt uit de Mail-CRM-database); Anthropic wordt alleen betaald bij het éénmalig aanmaken van een samenvatting (nieuwe mail ±€1-5/mnd, en de Historiek-knop met kost vooraf in beeld). De volle limiet komt van de eenmalige backfill-inhaalslag, niet van de nieuwe functie; verhogen is optioneel — zonder verhoging herstelt alles op 1 sept vanzelf en herclassificeer ik de tussenliggende mails.

## IDEE-5 — Kostenvragen: extra verbruik door merge, selectieve backfill, en API-optimalisatie
- **Datum**: 2026-08-26
- **Bram zei letterlijk**: "Voor mij is het nog niet duidelijk op dit moment:\nIk heb de MAIL CRM app gebouwd. \nDie heeft Anthorpic API key tegoed nodig om mails samen te vatten. Dat weet ik. En het verbruik van de backfill heeft dit gisteren opgevuld akkoord.\n\nMaar:\n1: Is er in deze merge nu een bijkomende tool/functie die meer tegoed zal gebruiken dan voor de merge?\n\n2. Ik wil enkel van enkele specifieke projecten een backfill doen en de rest gebeurd vanaf nu live per event.\nHoe kan ik deze projecten kiezen?\n\n\nKunnen we onze tools nog optimaliseren in API usage? Kan het nog goedkoper? Hoe?"
- **Waar ik mee bezig was**: niets meer open (S0-S4 + IDEE-3 live geverifieerd)
- **Geverifieerde cijfers (2026-08-26)**: 1932 mails gratis weggefilterd door de regex-voorfilter · **728 mails betaald aan de AI en daarna alsnog genegeerd (38% van alle betaalde calls)** · 1179 betaald en bewaard · actieve projectenlijst = 4099 tekens (~1025 tokens) die bij ELKE classificatie meegaat · Compass-AI draait op LOVABLE_API_KEY (aparte pot), alleen mail-crm gebruikt het Anthropic-tegoed.
- **Antwoord vraag 1**: nee, de merge voegt geen automatische AI-call toe; enige nieuwe verbruiker is de handmatige Historiek-knop.
- **Antwoord vraag 2**: de fase-gate (alleen offerte) moet weg — hij wil zelf per dossier kiezen; de kostenbescherming zit al in de twee-stapsknop.
- **Behandeling**: eerst — niets anders open, en het stuurt zijn limietbeslissing
- **Status**: afgewerkt (2026-08-26). (1) Beantwoord: de merge voegt geen automatische AI-call toe; Compass-AI draait op LOVABLE_API_KEY, een andere pot. (2) Fase-gate verwijderd — de Historiek-knop staat nu op elk dossier met ZL-nummer en e-mailadres, Bram kiest zelf (commit 6595f4c). (3) Optimalisaties gebouwd en live in mail-sync v13: prompt-caching (projectenlijst van gebruikersbericht naar gecachete system-prompt), knipBody (citaten/handtekeningen weg, 3000 i.p.v. 8000 tekens), max_tokens 2048→1024, en dezelfde ingrepen op de call-classificatie. Beide codepaden gelijk gehouden.

## IDEE-6 — Slimme gratis voorscreening van mails vóór de AI-call
- **Datum**: 2026-08-26
- **Bram zei letterlijk**: "Als ik nu hoor dat er dergelijke kostenlekken zijn dan maak ik mij ernstig zorgen.\n\nBedenk een intelligente wijze waarop mails eerst gefilterd/gescreend kunnen worden met minimale of zelf geen API-usage om dit te optimaliseren"
- **Waar ik mee bezig was**: IDEE-5 stap 3 (kostenoptimalisatie) — valt samen, dus meteen meegenomen
- **Eerste inschatting**: raakt lib/filter.mjs + mail-sync (beide kanten). Van losse regexregels naar een gelaagde scoringspoort: harde signalen (List-Unsubscribe-header, Auto-Submitted, no-reply, bulkdomein) → gratis weg; bekende relatie (afzender staat al in contacts/gekoppeld dossier) → altijd doorlaten; rest krijgt een goedkope score op onderwerp/inhoudkenmerken. Geen AI nodig.
- **Behandeling**: eerst, samen met IDEE-5
- **Status**: afgewerkt (2026-08-26) — gelaagde `screenMail()`: (1) bekende relatie uit contacts = ALTIJD doorlaten, (2) mailheaders List-Unsubscribe/List-Id/List-Post/X-Auto-Response-Suppress + Auto-Submitted + Precedence, (3) afzender- en onderwerppatronen incl. e-commerce/verzending, (4) interne kopie. `internetMessageHeaders` toegevoegd aan de Graph-select in beide codepaden. GEMETEN tegen echte data: vangt 73/120 (61%) van de mails die eerder betaald werden en toch genegeerd, en 0/120 van de mails die wél aan een dossier hangen. Feedback-ID en campagne-headers zijn na die meting BEWUST GESCHRAPT (gaven 7/120 valse positieven op echte leveranciersmail). Live in mail-sync v13, 59/59 tests groen.

## IDEE-7 — Communicatie onderverdelen per leverancier
- **Datum**: 2026-08-26
- **Bram zei letterlijk**: "In de communicatiepagina en MAIL CRM moet een onderverdeling komen per leverancier zodat ik alle communicatie per leverancier georden zie"
- **Waar ik mee bezig was**: IDEE-5/6 kostenoptimalisatie (halfweg, mail-sync nog niet gedeployed)
- **Eerste inschatting**: twee plekken. (a) Compass-communicatiepagina: binnen de bestaande groep "Leveranciers" een tweede niveau per bedrijf (companies.naam via contacts.bedrijf_id) — inklapbaar, zelfde Collapsible-patroon als IDEE-3. Het loket levert contacten al mee, maar nog zonder bedrijf; `verrijk()` moet bedrijf_id + bedrijfsnaam toevoegen. (b) Mail Hub: eigen leveranciersoverzicht. Klein-middelgroot, geen schemawijziging.
- **Mijn open vragen erover**: (1) groeperen op bedrijf (companies) of op individueel contact? Bedrijf lijkt bedoeld ("per leverancier"), en dan valt Tim Verleye onder Kozijn&Co. (2) Ook een dossier-overstijgend leveranciersoverzicht ("alle communicatie met Verhelst over alle projecten"), of alleen binnen een dossier? Zijn zin leest als binnen de communicatiepagina, maar "alle communicatie per leverancier" kan ook het bredere overzicht betekenen — ik bouw beide lagen als dat zonder risico kan.
- **Behandeling**: na IDEE-5/6 (kostenoptimalisatie eerst afmaken — half werk laten liggen is erger)
- **Beslissingen op de open vragen** (zelf genomen): (1) groeperen op BEDRIJF, niet op contact — Tim Verleye valt onder Kozijn&Co. (2) Beide lagen gebouwd: binnen het dossier én dossier-overstijgend, want gemeten bleek het grootste deel van de leverancierscommunicatie aan géén dossier te hangen (Liantis 96 mails, Verhelst 65, beide zonder dossier).
- **Status**: afgewerkt (2026-08-26) — (a) in de dossier-communicatiepagina krijgt de groep 'Leveranciers' een tweede inklapbaar niveau per bedrijf; (b) nieuwe pagina Leveranciers in de hoofdnavigatie: 85 leveranciers met mails, beslissingen, laatste contact en betrokken ZL-dossiers, doorklikbaar naar alle mail van dat bedrijf over alle werven. Loket kreeg de acties `leveranciers` en `leverancier_mails` (v5) en levert nu bedrijf_id + bedrijfsnaam per contact. **Naamvarianten worden samengevoegd in de weergave**: 'Trappen Smet' en 'Trappensmet' zijn één rij (live: 4+1 → 5 in ZL-0015, 86 → 85 in het overzicht); de database blijft ongemoeid omdat bedrijven samenvoegen bestaande mailkoppelingen zou herschrijven. Live geverifieerd met een echte Compass-sessie.

## IDEE-8 — Waar hoort gedeelde logica: bij de app of bij de database?
- **Datum**: 2026-08-26
- **Bram zei letterlijk**: "Als het overzicht van leveranciers een onderdeel is van de database en in meerdere tools moet gebruikt kunnen wordern bouwen we dit beter in Mail CRM, Nee? Wrm wel? Wrm niet?"
- **Waar ik mee bezig was**: afronding IDEE-7 (Mail Hub-kant)
- **Antwoord**: ja, en zo stond het al — met één gat. Drie lagen: DATA (companies/contacts/emails, in Mail-CRM), LOGICA (groeperen, naamvarianten samenvoegen, tellen — in de edge function `compass-loket`, die IN het mail-crm-project draait), WEERGAVE (React-pagina, per app). Alleen laag 2 accepteerde uitsluitend Compass-logins, waardoor Mail Hub de logica had moeten dupliceren.
- **Status**: afgewerkt (2026-08-26) — `isCompassGebruiker` → `isIngelogdeGebruiker`: probeert eerst `auth.getUser` op het mail-crm-project zelf (Mail Hub + toekomstige tools), dan Compass' auth-endpoint. Loket v6. Live geverifieerd: Mail-CRM-login OK (85 leveranciers), Compass-login OK (leveranciers + ZL-0116-mails + health), ongeldig token en geen token beide correct geweigerd. Veiligheidsgrens ongewijzigd: nog steeds inloggen verplicht, vaste alleen-lezen acties, geen vrije query-invoer — en een Mail-CRM-gebruiker kon deze data via RLS sowieso al lezen.

## IDEE-9 — Historiek aanvullen met parameters (datumreeks, afzenders, ...)
- **Datum**: 2026-08-27
- **Bram zei letterlijk**: "En kunnen we die Historiek aanvullen uitrusten met parameters? Datamreeks, afzenders, ...?"
- **Waar ik mee bezig was**: net klaar met de live-oplevering van IDEE-3 t/m 7
- **Status**: afgewerkt (2026-08-27) — vier filters (adressen, van/tot-datum, mailbox, richting), werkend in zowel de gratis telling als de verwerking. Telling geeft nu ook de verdeling per jaar en oudste/nieuwste datum. UI: drie stappen (afbakenen → tellen met kostenindicatie → verwerken). Loket v9.
- **Twee bugs onderweg gevonden en gefixt** (beide stil, geen foutmelding):
  1. Graph `$search` leest `"participants:a OR participants:b"` als letterlijke tekst, niet als zoeklogica → bij twee adressen kwam er bijna niets terug. Nu één zoekopdracht per (mailbox, adres).
  2. **De grote**: `.in()` met 100 graph_message_ids (152 tekens elk) maakt een URL van ~15.000 tekens; die faalt op de gateway en de fout werd genegeerd (`const { data } = await q`). Gevolg: stilzwijgend te weinig of nul rijen. Gemeten: één adres gaf 33 mails, na de fix 106 — er verdween dus 69% zonder enig signaal. Nu batches van 20 + fouten worden gerapporteerd. Dezelfde valkuil preventief gefixt in `verrijk()` (email_cc/call_deelnemers waren ongebatcht tot 500 uuid's, viel niet op omdat email_cc leeg is).
- **Verificatie**: 106 kandidaten; 2025+2026 = 80+26; in+uit = 63+43; belhouse+zolderpunt = 105+1 — alle drie exact 106. Nul AI-calls verbruikt (alleen 'tellen' gedraaid).

## IDEE-10 — Zarvis doet alles wat Maildude doet, maar beter
- **Datum**: 2026-11-23
- **Bram zei letterlijk**: "Jarvis moet alles kunnen wat Maildude kan maar beter. Automatische koppelingen met dossiers. Alleen de laatste 6 maanden relevante mails supersnel laden om index supersnel te minimaliseren?" En over alle vijf (IDEE-10 tot 14): "Geen van bovenstaande kan je licht opnemen. Stel je voor dat deze functies 100% verantwoordelijk krijgen en als dusdanig gebouwd moeten worden"
- **Waar ik mee bezig was**: Zarvis als los bureaubladvenster is opgeleverd (PR #25); volgende stap was Compass het open dossier laten doorgeven aan Zarvis. WhatsApp als gekoppeld toestel wacht op Brams "go".
- **Eerste inschatting**: Maildude is de Mail-CRM (apart Supabase-project `ipnebgcuokehllepqwwm`, met `mail-sync`, AI-samenvattingen, koppeling aan dossiers op ZL-nummer, review-wachtrij in Mail Hub). Zarvis leest daar vandaag niets van. Raakt: een leesgereedschap op het bestaande loket, daarna de koppellogica zelf (nu met confidence-drempels en een review-wachtrij), en de indexstrategie. Groot: meerdere sprints. Risico: het is een tweede databank met eigen afspraken ("additief-principe", `mail-sync` en de drempels blijven dicht volgens SPRINTPLAN-COMMUNICATIE) en er hangt dagelijks werk aan. Uit IDEE-5 staat genoteerd dat 38% van de betaalde AI-calls naar mails ging die daarna genegeerd werden; "zuiniger" is dus aantoonbaar haalbaar.
- **Mijn open vragen erover**: (1) Vervangt Zarvis Maildude, of blijft Maildude de motor en wordt Zarvis de bediening? (2) "Laatste 6 maanden": voor alle mailboxen, en wat met oudere mails van dossiers die nog lopen? (3) Wat betekent "beter" concreet: minder foute koppelingen, sneller, goedkoper, of minder handwerk in de review-wachtrij? (4) Mag de regel "Compass schrijft niets naar de Mail-CRM-databank" vervallen?
- **Behandeling**: parkeren tot het open dossier doorgegeven wordt aan Zarvis; daarna als eerste van deze vijf, want het sluit aan op het leesgereedschap dat er al is.
- **Aanvulling 2026-11-24, Bram zei letterlijk**: "Zoeg dat ZARVIS aan verschillende mailboxn gekoppeld wordt zoals maildude". Meerdere mailboxen, niet één. Bram gaf op 2026-11-24 ook toestemming om in de Mail-CRM-databank te schrijven.
- **Status**: deels (2026-11-24): Zarvis leest de mails van een dossier (`lees_mails`, `lees_mail`). Open: zoeken op tekst, koppelen met vaste regels, meerdere mailboxen. Zie `docs/VERKENNING-MAILDUDE.md`; open vraag aan Bram of hij Mail-CRM, de app Maildude of beide bedoelt.

## IDEE-11 — Zarvis als marketeer en Google Ads-expert
- **Datum**: 2026-11-23
- **Bram zei letterlijk**: "Zolderpunt website en het marketing dashboard altijd live. Jarvis moet ook mijn marketeer en google ads expert worden."
- **Waar ik mee bezig was**: zie IDEE-10.
- **Eerste inschatting**: De website is een apart Lovable-project ("Zolderpunt Website", stuurt leads door via Make en Zapier). Een marketingdashboard heb ik nog niet gezien; ik weet niet of het bestaat of gebouwd moet worden. Voor Google Ads is toegang tot het advertentieaccount nodig; in deze omgeving zie ik wel een Ahrefs-koppeling, geen Google Ads-koppeling. Groot. Risico: advertentiebudget is echt geld; wijzigingen aan campagnes horen achter de goedkeuringsstap, nooit automatisch.
- **Mijn open vragen erover**: (1) Welk marketingdashboard: bestaat het al, en waar? (2) "Altijd live": bewaking dat site en dashboard bereikbaar zijn, of dat de cijfers altijd actueel zijn? (3) Mag Zarvis campagnes en budgetten wijzigen, of alleen analyseren en voorstellen? (4) Welke bronnen: Google Ads, Analytics, Search Console, Ahrefs, Meta?
- **Behandeling**: parkeren tot IDEE-10 loopt; eerst nagaan welke toegang er bestaat.
- **Status**: deels (2026-11-24): Zarvis leest de marketingcijfers en sluit zelf dure zoektermen uit, via een loket in het project van de website. Open: budget en biedingen bijsturen (wacht op een plafond van Bram), pagina's verbeteren en publiceren, aanvragen opvolgen. Zie `docs/VERKENNING-MARKETING.md`.

## IDEE-12 — Werf-app: arbeidsuren, tijdsnormen, loonadministratie
- **Datum**: 2026-11-23
- **Bram zei letterlijk**: "Werf app om arbeidsuren, tijdsnormen, loonsadministratie klaar te maken"
- **Waar ik mee bezig was**: zie IDEE-10.
- **Eerste inschatting**: Er bestaat een Lovable-project "Zolderpunt Werf Base" (rollen, registraties, projecten, werkbonnen, afstemming, personeel, eigen Supabase). Ik heb de code nog niet gezien. Loonadministratie in België is gereglementeerd (sociaal secretariaat, RSZ, Checkinatwork op werven); een fout raakt lonen van mensen. Groot, en het deel met het hoogste risico van de vijf.
- **Mijn open vragen erover**: (1) "Klaarmaken": de bestaande app afwerken, of de gegevens klaarzetten voor het sociaal secretariaat? Welk secretariaat, welk formaat? (2) Tijdsnormen: normtijden per taak om na te calculeren, of wettelijke arbeidstijd? (3) Wie registreert uren: eigen personeel, onderaannemers, beide? (4) Is er al echte data in de app?
- **Behandeling**: parkeren; eerst de bestaande app lezen voor ik iets voorstel.
- **Status**: verkend (2026-11-24), zie `docs/VERKENNING-WERF.md`. Tijdsnormen bestaan in de praktijk nog niet; uren kennen twee waarheden. Volgende stap: een leesloket in Werf dat alleen totalen geeft. Wacht op vijf antwoorden van Bram.

## IDEE-13 — FINDASHBOARD: Zarvis als persoonlijke CFO
- **Datum**: 2026-11-23
- **Bram zei letterlijk**: "FINDASHBOARD om mijn persoonlijk CFO te zijn"
- **Waar ik mee bezig was**: zie IDEE-10.
- **Eerste inschatting**: Vermoedelijk het Lovable-project "Belhouse Financial Compass" (dagelijkse snapshots uit Yuki-boekhouding in Supabase, KPI's met uitleg, trends, scenario's). Niet bevestigd dat dit hetzelfde is als "FINDASHBOARD". Een CFO-rol betekent cashflow, marges per project, btw en vooruitblik; cijfers moeten aantoonbaar kloppen met de boekhouding, anders is elk advies gevaarlijk. Groot.
- **Mijn open vragen erover**: (1) Is FINDASHBOARD het project "Belhouse Financial Compass"? (2) Persoonlijk of van de vennootschap, of beide? (3) Welke beslissingen wil je ermee nemen: prijszetting, aanwerven, investeren, liquiditeit? (4) Hoe actueel en volledig zijn de Yuki-gegevens?
- **Behandeling**: parkeren; eerst het bestaande dashboard en zijn databron lezen.
- **Status**: verkend (2026-11-24), zie `docs/VERKENNING-FINANCIEN.md`. De cijfers komen elke nacht uit Yuki; cash, openstaande facturen en btw bestaan niet. Volgende stap: een leesloket in FINDASHBOARD. Wacht op vijf antwoorden van Bram.

## IDEE-14 — INVENSYNC: Zarvis als beheerder van de inventaris
- **Datum**: 2026-11-23
- **Bram zei letterlijk**: "INVENSYNC om beheerder van mijn inventaris te zijn."
- **Waar ik mee bezig was**: zie IDEE-10.
- **Eerste inschatting**: Lovable-project "INVENSYNC" (omschreven als Belhouse Inventory Hub: materialen en prijzen voor een houtbewerkingsbedrijf). Code nog niet gezien. "Beheerder" betekent voorraadstanden, bestelpunten, prijzen en koppeling met wat projecten verbruiken; de waarde hangt af van of de standen in de app overeenkomen met wat er echt ligt.
- **Mijn open vragen erover**: (1) Wordt de app vandaag gebruikt en klopt de voorraad erin? (2) Mag Zarvis bestellingen voorbereiden bij leveranciers, of alleen signaleren? (3) Moet verbruik gekoppeld worden aan dossiers in Compass en aan de calculator? (4) Voor Belhouse, voor Zolderpunt, of beide?
- **Behandeling**: parkeren; eerst de bestaande app lezen.
- **Status**: verkend (2026-11-24), zie `docs/VERKENNING-INVENTARIS.md`. Invensync is een prijscatalogus, geen voorraadbeheer: er bestaat nergens een voorraadstand. Wacht op Brams antwoord waar de echte voorraad staat.

## IDEE-15 — De rollen van Zarvis overzichtelijk tonen
- **Datum**: 2026-11-23
- **Bram zei letterlijk**: "Denk dus ook goed na hoe al die verschillende rollen ook naar mij toe duidelijk gevisualiseerd zullen worden en niet chaotisch zullen zijn"
- **Waar ik mee bezig was**: IDEE-10 (inventaris van Maildude loopt) en de WhatsApp-koppeling.
- **Eerste inschatting**: Ontwerpeis voor IDEE-10 tot 14, geen aparte bouwsteen. Met vijf rollen (mail, marketing, werf, financiën, inventaris) naast dossiers moet altijd zichtbaar zijn: welke rol antwoordt, wat elke rol op dit moment aan het doen is, en wat van welke rol op een goedkeuring wacht. Het losse venster is klein; daar past één rol tegelijk met een duidelijke aanduiding, en een apart overzicht voor "alles tegelijk". Risico als dit niet eerst ontworpen wordt: elke rol krijgt zijn eigen schermpje en meldingen, en het geheel wordt precies de chaos die Bram wil vermijden.
- **Mijn open vragen erover**: (1) Wil je één Zarvis die zelf de juiste rol kiest, of kies jij de rol? (2) Waar wil je het totaaloverzicht: in het zwevende venster, of op een groter scherm ernaast? (3) Welke rol mag je spontaan onderbreken, en welke wacht tot de briefing?
- **Behandeling**: eerst, vóór de eerste rol na dossiers gebouwd wordt: uitwerken op het ontwerpcanvas in de nieuwe donkere stijl.
- **Status**: open

## IDEE-16 — Herhalende taken en verwittigen
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "Herhalende taken uitvoeren moet mogelijk zijn. "Kan je elke uur tot vnvd 20u controleren of dit is binnen gekomen en lij verwittigen via whatsapp?""
- **Waar ik mee bezig was**: het installatieprogramma met de beheersectie.
- **Eerste inschatting**: Drie stukken. (1) Een tabel met taken per gebruiker: wat nakijken, hoe vaak, tot wanneer, wanneer klaar. (2) Een uitvoerder op de server (geplande taak elk kwartier) die elke taak die aan de beurt is door Zarvis laat nakijken met hetzelfde gereedschap, onder de rechten van de eigenaar, en stopt bij de einddatum of zodra de voorwaarde vervuld is. (3) Verwittigen. Zarvis moet ook een gereedschap krijgen om zo'n taak aan te maken, te tonen en te stoppen, en het venster moet lopende taken tonen. Risico: een taak die blijft lopen kost bij elke beurt een oproep naar het model; daarom verplicht een einde en een maximum aantal beurten.
- **Mijn open vragen erover**: (1) Verwittigen via WhatsApp botst met de afspraak dat de koppeling alleen leest: Zarvis moet dan één bericht sturen, alleen naar je eigen nummer. Wil je dat, wetend dat versturen het risico op blokkering vergroot? Alternatief zonder dat risico: een melding van Windows via het programma, of een mail. (2) "Dit" in je voorbeeld is vandaag alleen na te kijken in wat Zarvis kan lezen (dossiers, gesprekken, WhatsApp). Mail kan pas na IDEE-10.
- **Behandeling**: eerst, vóór IDEE-10 verder gaat: het is een basisvermogen van Zarvis en klein tegenover de rollen. Verwittigen begint met een Windows-melding; WhatsApp komt erbij zodra Bram vraag 1 beantwoordt.
- **Aanvulling 2026-11-24, Bram zei letterlijk**: "Timerfuncties zullen ook cruciaal zijn. "Stuur op tijdstip x een whatsapp naar persoon y" "Kan je le herinneren over een uur aan x"" Eenmalige taken op een tijdstip horen in dezelfde bouwsteen. Een WhatsApp naar een klant versturen is een externe actie: volgens de afspraak "intern zelf, extern vragen" toont Zarvis het bericht eerst en verstuurt pas na ja; en het vraagt dat de koppeling mag versturen.
- **Status**: afgewerkt (2026-11-24), op het testen op een echte pc na. Gebouwd: tabellen `zarvis_taken`, `zarvis_meldingen`, `whatsapp_uit`; een klok in de databank die elke minuut de functie `zarvis-taken` wekt; gereedschap `plan_taak`, `toon_taken`, `stop_taak`, `stuur_whatsapp`; versturen via het programma op de pc; meldingen in het Zarvis-venster, hardop en als Windows-melding. Bram besliste op 2026-11-24: "natuurlijk moet Zarvis versturen".

## IDEE-17 — Zarvis leest emoties
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "En hoe zal Zarvis lijn emoties kunnen lezen?"
- **Waar ik mee bezig was**: het zwarte gat herschrijven als echte simulatie.
- **Eerste inschatting**: Drie bronnen, in volgorde van haalbaarheid. (1) Wat je zegt: het model leest toon en ongeduld al uit je woorden; dat vraagt alleen een instructie en een veld 'stemming' bij elk antwoord. (2) Hoe je het zegt: toonhoogte, tempo en volume van je stem. De microfoon wordt al gemeten voor de knop; daar zijn eenvoudige kenmerken uit te halen, en er bestaan diensten die emotie uit spraak schatten (te onderzoeken op Nederlands en op verwerking binnen de EU). (3) Je gezicht via de webcam: technisch mogelijk, maar het zwaarst voor privacy en het minst betrouwbaar; ik raad het af als eerste stap. Wat Zarvis ermee doet: korter antwoorden als je gehaast klinkt, niet doorvragen als je geïrriteerd bent, en het zwarte gat dat meekleurt.
- **Mijn open vragen erover**: (1) Wil je dat Zarvis je stemming alleen gebruikt om zijn toon aan te passen, of ook bijhoudt over de tijd? Bijhouden is een gevoelig gegeven. (2) Webcam: ja of nee?
- **Behandeling**: na IDEE-16; stap 1 en 2, zonder webcam en zonder bijhouden tot Bram anders beslist.
- **Status**: deels (2026-11-24): stap 1 gebouwd, Zarvis leest uit je woorden hoe je klinkt en past zijn antwoord aan, zonder iets bij te houden. Open: stap 2 (je stem: toonhoogte, tempo, volume) en het zwarte gat dat meekleurt.

## IDEE-18 — Zelflerend: een vaardigheid die ontbreekt zelf onderzoeken en bouwen
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "Hoe zal je omgaan met vragen die Zarvis nog niet kan beantwoorden. Ik wil dat Zarvis zelflerend is. "Ik kan dat nog niet Bram, wil je dat ik die skill nu onderzoek en aanleer?" En dan ook effectief zelfstandig bouwt en bevestigd dat het vanaf dan wel mogelijk is"
- **Waar ik mee bezig was**: het zwarte gat herschrijven als echte simulatie.
- **Eerste inschatting**: Twee soorten leren, met een verschillende weg. (A) Een werkwijze met gereedschap dat al bestaat (bijvoorbeeld 'maak elke maandag een overzicht van offertes zonder antwoord'): Zarvis schrijft die zelf weg als vaardigheid in een tabel (naam, wanneer te gebruiken, stappen) en kan ze meteen. Dat is in de app te bouwen. (B) Iets waarvoor nieuwe code nodig is (een nieuwe connector): Zarvis kan zijn eigen code niet veilig herschrijven terwijl hij draait. De weg is dat Zarvis een bouwopdracht aanmaakt die een codeer-agent in de cloud oppakt: onderzoeken, bouwen, testen, een pull request openen, uitrollen, en Zarvis meldt daarna dat het kan. Dat is dezelfde keten die nu met de hand loopt in deze sessies. Vereist: een log van 'kon ik niet' (wat gevraagd werd, waarom niet), een wachtrij van bouwopdrachten, en een grens op wat zonder Bram live mag.
- **Mijn open vragen erover**: (1) Mag een door Zarvis gebouwde vaardigheid zonder jouw nazicht live, of wil je elke keer een ja geven voor ze aan staat? Mijn voorstel: lezen mag vanzelf, schrijven of versturen pas na jouw ja. (2) De codeer-agent kost per bouwopdracht; wil je een maandplafond?
- **Behandeling**: na IDEE-16. Eerst het 'kon ik niet'-log en soort A; daarna soort B.
- **Status**: deels afgewerkt (2026-11-24). Gebouwd: `leer_vaardigheid` (werkwijzen met bestaand gereedschap, gaan bij elk gesprek mee), `meld_tekort` (wat nog niet kon komt op de bouwlijst), en een nachtelijke bouwer die die lijst oppakt (`docs/ZARVIS-BOUWER.md`). Open: Zarvis die tijdens het gesprek zelf een bouw start en meldt wanneer het klaar is.

## IDEE-19 — Google Maps: routes en ritafstanden
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "Connecties met google maps om routes en ritafstanden te bespreken"
- **Waar ik mee bezig was**: het zwarte gat herschrijven als echte simulatie.
- **Eerste inschatting**: Een gereedschap dat een route opvraagt tussen twee adressen (afstand, rijtijd met verkeer) via de Routes API van Google. Adressen van klanten staan al in de dossiers. Nodig: een Google Cloud-sleutel als secret. Klein werk.
- **Mijn open vragen erover**: Geen blokkerende. Vertrekpunt standaard het kantooradres.
- **Behandeling**: na IDEE-16, samen met IDEE-20.
- **Status**: gebouwd en getest tegen een nagebootste Google (2026-11-24); nog niet gemerged of uitgerold, wacht op de sleutel `GOOGLE_MAPS_API_KEY`.

## IDEE-20 — Agenda en locatie: verwittigen als je nog niet onderweg bent
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "Connectie met lijn google calendar ol mij te verwittigen als mijn locatie nog steeds op kantoor is en niet onderweg naar lijn afspraak"
- **Waar ik mee bezig was**: het zwarte gat herschrijven als echte simulatie.
- **Eerste inschatting**: Bouwt op IDEE-16 (taken op tijd) en IDEE-19 (rijtijd). Zarvis leest je agenda, berekent wanneer je moet vertrekken, en verwittigt als je dan nog niet weg bent. Het moeilijke stuk is je locatie: een pc weet die niet betrouwbaar. Opties: je gsm deelt zijn locatie (vraagt een app of een snelkoppeling op de gsm), of Zarvis leidt 'nog op kantoor' af uit het feit dat je pc nog actief gebruikt wordt. Dat laatste is meteen te bouwen en meestal juist.
- **Mijn open vragen erover**: Mag Zarvis 'je pc is nog actief' als teken nemen dat je nog op kantoor bent, tot er een oplossing via je gsm is?
- **Behandeling**: na IDEE-19.
- **Status**: open

## IDEE-21 — Browser: Zarvis surft zelf
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "Browser capabilities zullen super belangrijk zijn"
- **Waar ik mee bezig was**: het zwarte gat herschrijven als echte simulatie.
- **Eerste inschatting**: Zarvis krijgt een eigen browser om iets op te zoeken, een pagina te lezen, een formulier in te vullen. Twee niveaus: (1) opzoeken en lezen op het web via de zoek- en leesfunctie van het model zelf: klein werk, geen risico. (2) Een echte browser besturen op jouw pc met jouw logins (bijvoorbeeld in Bouwflow klikken): dat hoort bij IDEE-22.
- **Mijn open vragen erover**: Geen blokkerende voor niveau 1.
- **Behandeling**: niveau 1 na IDEE-16; niveau 2 met IDEE-22.
- **Status**: deels (2026-11-24): niveau 1 gebouwd (`zoek_web`, `lees_webpagina`). Een pagina lezen werkt live. Zoeken wordt vanaf de server geweigerd door de gratis zoekdienst en werkt pas met de sleutel `BRAVE_SEARCH_API_KEY`. Niveau 2 hoort bij IDEE-22.

## IDEE-22 — Computer use: Zarvis bedient je pc
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "Een eigen computeruse functie zal SUPER belangrijk zijn. "Zarvis, kan ke over een uur de voortgang in dit programma checken en dan op voltooien klikken""
- **Waar ik mee bezig was**: het zwarte gat herschrijven als echte simulatie.
- **Eerste inschatting**: Het programma op je pc is hiervoor de juiste plek: het kan een schermafdruk nemen, die naar het model sturen, en klikken en typen. Het model kan dat (computer use). Wat het zwaar maakt is veiligheid: een assistent die op je pc mag klikken, kan ook verkeerd klikken. Nodig: per programma toestemming, een zichtbare aanduiding dat Zarvis bezig is, een noodstop met één toets, een log met schermafdrukken van wat hij deed, en nooit betalingen of verwijderen zonder jouw ja. Samen met IDEE-16 geeft dit precies je voorbeeld.
- **Mijn open vragen erover**: (1) Mag Zarvis klikken terwijl jij weg bent, of alleen terwijl je erbij zit? Je voorbeeld vraagt het eerste. (2) Welke programma's eerst?
- **Behandeling**: na IDEE-16 en IDEE-18. Eerst alleen kijken (schermafdruk lezen en melden), dan pas klikken.
- **Status**: open

## IDEE-23 — Zarvis herkent Brams stem
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "Ik speel veel muziek, Zarvis moet het verschil kennen tussen mijn stem en achtergrondmuziek en tussen mijn stem en die van anderen"
- **Waar ik mee bezig was**: afronden van taken, timers en versturen.
- **Eerste inschatting**: Twee verschillende problemen. (1) Muziek op de achtergrond: op te lossen met filtering van de microfoon vóór de herkenning (echo weg, ruis en muziek gedempt, stemisolatie waar de pc het kan). Gebouwd op 2026-11-24 voor de Azure-stem. (2) Andere stemmen: dat vraagt sprekerherkenning. Bram spreekt één keer een halve minuut in; daarvan wordt een stemafdruk gemaakt; elke uiting wordt ermee vergeleken en genegeerd als ze niet van hem is. De dienst van Azure hiervoor is stopgezet, dus het wordt een model dat op de pc zelf draait, in het programma. De RTX 5080 is daar ruim genoeg voor. Risico's: een stemafdruk is een biometrisch gegeven en blijft daarom op de pc; en de drempel moet op Brams echte stem afgesteld worden, dus dit is niet af zonder dat hij het zelf test met muziek aan en iemand anders in de kamer.
- **Mijn open vragen erover**: Als iemand anders iets zegt terwijl Zarvis luistert: negeren zonder iets te zeggen, of melden "dat was niet jouw stem"? Mijn voorstel: negeren.
- **Behandeling**: stap 1 gebouwd; stap 2 eerst, vóór de sneltoets ooit vervangen wordt door een wekwoord, want dan luistert Zarvis de hele tijd.
- **Status**: deels afgewerkt (2026-11-24): filtering gebouwd, sprekerherkenning open.

## IDEE-24 — Weerbericht
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "Weerbericht"
- **Waar ik mee bezig was**: ritten met Google Maps en de verkenning van Maildude.
- **Eerste inschatting**: Een gereedschap `weerbericht` in `supabase/functions/_shared/zarvis/buiten.ts`, naast `bereken_route`. De gratis dienst Open-Meteo werkt zonder sleutel en is op 2026-11-24 live nagekeken vanuit de databank: eerst een plaatsnaam omzetten naar coördinaten (`https://geocoding-api.open-meteo.com/v1/search?name=Aalter&count=1&language=nl`, antwoord `results[0].latitude/longitude/name`), dan de voorspelling (`https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&current=temperature_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max&timezone=Europe%2FBrussels&forecast_days=N`, antwoord met `current` en `daily` als lijsten per dag). De weercode is een WMO-code en moet naar gewoon Nederlands vertaald worden. Voor een dakwerker tellen vooral regen en rukwinden; laat Zarvis die uit zichzelf noemen bij een werf of plaatsbezoek. Plaats: uit de vraag, of uit het adres van een dossier (postcode en gemeente eruit halen; de dienst kent alleen plaatsnamen, geen straten).
- **Mijn open vragen erover**: Geen blokkerende. Vaste plaats als er geen genoemd wordt: laten aanleren met `leer_vaardigheid`, niet in de code zetten.
- **Behandeling**: eerst: klein, geen sleutel nodig.
- **Status**: gebouwd (2026-11-24): gereedschap `weerbericht`, nagekeken tegen de echte Open-Meteo.

## IDEE-25 — Familiale komische modus
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "familiaire komische modus"
- **Waar ik mee bezig was**: ritten met Google Maps en de verkenning van Maildude.
- **Eerste inschatting**: Een stijl van praten die Bram aan en uit zet met zijn stem. Bedoeld voor als de familie erbij is: warm, grappig, proper, en zonder zakelijke of vertrouwelijke gegevens hardop te zeggen tenzij hij er uitdrukkelijk om vraagt. Bouw: kolom `stijl` in `zarvis_instellingen` (waarden gewoon, familie, savage), een gereedschap `zet_stijl`, en per stijl een extra alinea in de instructie van `supabase/functions/zarvis/index.ts`. Het zwarte gat kan per stijl een eigen tint of tempo krijgen zodat zichtbaar is welke modus aan staat.
- **Mijn open vragen erover**: Moet Zarvis in deze modus bedragen en klantnamen verzwijgen als er anderen bij zijn? Mijn voorstel: ja, tenzij Bram er op dat moment zelf om vraagt.
- **Behandeling**: samen met IDEE-26, één bouwsteen.
- **Status**: gebouwd (2026-11-24): `zet_stijl` met stijl familie. Het zwarte gat kleurt mee: goud voor familie, rood voor savage (bekeken op Brams grafische kaart).

## IDEE-26 — Savage modus
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "savage modus"
- **Waar ik mee bezig was**: ritten met Google Maps en de verkenning van Maildude.
- **Eerste inschatting**: Zelfde bouwsteen als IDEE-25. Stijl: snoeihard eerlijk, droog, sarcastisch, zonder omwegen, ook over Brams eigen keuzes. Twee grenzen die in de instructie moeten staan en niet door de modus opgeheven worden: de feiten blijven kloppen (alleen zeggen wat gelezen is), en alles wat naar buiten gaat (WhatsApp of mail aan een klant) blijft professioneel, wat de modus ook is.
- **Mijn open vragen erover**: Geen blokkerende.
- **Behandeling**: samen met IDEE-25.
- **Status**: gebouwd (2026-11-24): `zet_stijl` met stijl savage. Het zwarte gat kleurt mee: goud voor familie, rood voor savage (bekeken op Brams grafische kaart).

## IDEE-27 — Smartphone use: Zarvis bedient apps op de gsm
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "connectie met apps op mijn gsm via computeruse maar dan \"smartphoneuse\""
- **Waar ik mee bezig was**: ritten met Google Maps en de verkenning van Maildude.
- **Eerste inschatting**: Zelfde idee als IDEE-22 (computer use) maar op de gsm. Haalbaarheid hangt af van het toestel. Android: te doen, via een eigen app met toegankelijkheidsrechten of via een verbinding met de pc (scherm lezen, tikken, typen). iPhone: Apple laat een app geen andere apps bedienen; daar blijft alleen over wat via Opdrachten (Shortcuts), meldingen en officiële koppelingen kan, of het spiegelen van de iPhone op een Mac. Veiligheid zoals bij IDEE-22: per app toestemming, zichtbaar dat Zarvis bezig is, noodstop, log met schermafdrukken, nooit betalen of verwijderen zonder ja.
- **Mijn open vragen erover**: Welk toestel heeft Bram: Android of iPhone? Dat bepaalt of dit kan.
- **Behandeling**: na IDEE-22; eerst het toestel kennen.
- **Status**: open

## IDEE-28 — Zarvis belt Bram bij iets dringends
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "Zorg dat zarvis mij kan bellen als er iets dringends besproken moet worden."
- **Waar ik mee bezig was**: de verkenning van Maildude (IDEE-10) en het installatieprogramma bouwen op Brams pc.
- **Eerste inschatting**: Twee stukken. (1) Het bellen zelf: een echte telefoonoproep naar Brams gsm vraagt een beldienst (bijvoorbeeld Twilio) met een sleutel en een nummer; Zarvis leest dan de boodschap voor met de Vlaamse stem. Zonder beldienst kan alleen een WhatsApp-bericht of een melding, en dat is geen bellen. Een WhatsApp-oproep via Baileys is niet betrouwbaar en verhoogt het risico op blokkering. (2) Wat dringend is: een gereedschap `bel_gebruiker` dat een gesprek of een geplande controle (`zarvis-taken`) mag gebruiken, met een rem zodat hij niet 's nachts of tien keer na elkaar belt. "Besproken" wijst op een gesprek in twee richtingen: Bram antwoordt aan de telefoon en Zarvis luistert. Dat is zwaarder dan alleen voorlezen; eerst voorlezen met "bel terug of open Zarvis", daarna het echte gesprek.
- **Mijn open vragen erover**: (1) Welke dingen zijn dringend genoeg om te bellen? (2) Mag hij ook 's nachts en in het weekend bellen? (3) Een beldienst kost per oproep en vraagt een sleutel: akkoord met Twilio?
- **Behandeling**: na de lopende taak (Maildude, IDEE-10). Alles tot aan de sleutel bouwen; de sleutel plakt Bram zelf in Lovable.
- **Status**: gebouwd tot aan de sleutel (2026-11-24): een taak met verwittig "bel" belt via Twilio en leest voor. Wacht op de vier secrets van Bram. Een gesprek in twee richtingen is niet gebouwd.

## IDEE-29 — Zarvis doet dingen in de apps, hij vertelt ze niet alleen
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "Je hebt mij nog niets gevraagd over wat zarvis in al deze apps kan DOEN. Ik wil feen papegaai die mij x verteld. Ik wil een assistent die dingen fixed"
- **Waar ik mee bezig was**: de vier verkenningen (IDEE-11 tot 14) afronden; mijn voorstel was per app een leesloket.
- **Eerste inschatting**: Dit stuurt IDEE-10 tot 14 bij. Een loket dat alleen leest is niet het doel maar de eerste helft: elk loket krijgt van bij het begin ook acties die iets oplossen, met een logboek en terugdraaien. De verkenningen zeggen per app wat geld kost of niet terug te draaien is; dat blijft een ja van Bram vragen, de rest doet Zarvis zelf. Dezelfde regel als nu: intern zelf, extern vragen.
- **Mijn open vragen erover**: Per app: welke dingen moet Zarvis zelf oplossen? Gevraagd aan Bram op 2026-11-24.
- **Behandeling**: eerst; bepaalt wat er per rol gebouwd wordt.
- **Brams keuzes (2026-11-24, aangevinkt in een vragenlijst)**: hij koos alles behalve "voorraad bijhouden".
  - Marketing: dure zoektermen uitsluiten; budget en biedingen bijsturen; pagina's verbeteren en publiceren; aanvragen opvolgen.
  - Werf: registraties rechtzetten; arbeiders aanspreken; de maand klaarzetten voor het loon; uren in Bouwflow krijgen.
  - Financiën: onbetaalde facturen opvolgen; boekhouding aanvullen; marge van offertes bewaken; kosten drukken.
  - Inventaris: prijzen bijwerken; catalogus opkuisen; bestellen voor een werf. Niet gekozen: voorraad bijhouden.
- **Volgorde**: per rol eerst de actie die op een bestaande, terugdraaibare weg in de app steunt. Marketing eerst (uitsluiten loopt al via `ads_actie` met goedkeuren en terugdraaien). Wat geld kost of naar buiten gaat (budget, bestellen, herinneringen, berichten aan arbeiders, publiceren) krijgt een plafond of een ja van Bram; die grenzen moet hij nog geven.
- **Aanvulling 2026-11-24, Bram zei letterlijk**: "Deze lijst is niet limitatief en zal groeien naarmate gebruik van de app". En over het uitsluiten van zoektermen: "Er worden alleen zaken uitgesloten na mijn bevestigen". Gevolg: Zarvis stelt voor en voert pas uit na Brams ja. Dat zit sinds 2026-11-24 in de code van het loket en van het gereedschap (zonder `bevestigd: true` verandert er niets). De regel geldt voor alles wat buiten Compass iets verandert of geld kost.
- **Status**: open: keuzes gemaakt, bouw begint bij marketing.

## IDEE-30 — Hoe het AI-brein, de kloon van Bram, gebouwd en bijgewerkt wordt
- **Datum**: 2026-11-24
- **Bram zei letterlijk**: "En je hebt nog altijd niet uitgelegd hoe mijn AI-brein/kloon gebouwd en geupdate wordt... Ik wil weten hoe dit werkt en of je hier grondig onderzoek hebt naar gedaan"
- **Waar ik mee bezig was**: het marketingloket (IDEE-11 en 29).
- **Eerste inschatting**: Eerlijk: hier is nog geen grondig onderzoek naar gedaan en er is nog geen brein. Wat vandaag bestaat: (1) een vaste instructie in de code, door de bouwer geschreven; (2) `leer_vaardigheid`: hoogstens 25 werkwijzen die Bram dicteert en die bij elk gesprek meegaan; (3) `meld_tekort`: een lijst van wat niet kon; (4) de geschiedenis van één gesprek. Zarvis onthoudt niets tussen gesprekken behalve die werkwijzen, en hij leert niets uit wat Bram doet (zijn mails, zijn offertes, zijn beslissingen, zijn manier van schrijven). Een kloon vraagt minstens: een geheugen van feiten en voorkeuren dat groeit uit gesprekken; Brams beslissingen met hun reden (waarom deze prijs, waarom deze klant geweigerd); zijn schrijfstijl uit verstuurde mails en WhatsApp; een manier om te zoeken in dat geheugen bij elke vraag; en een manier waarop Bram ziet en verbetert wat Zarvis over hem denkt te weten. De app Maildude heeft al een geheugen met vectoren ("Levend Bedrijfsbrein"); dat is nog niet bekeken als bron.
- **Mijn open vragen erover**: (1) Mag Zarvis leren uit je verstuurde mails en WhatsApp-berichten om te schrijven zoals jij? (2) Wil je elke les zien en goedkeuren voor ze telt, of achteraf kunnen schrappen? (3) Moet het brein ook werken als iemand anders dan jij Zarvis gebruikt, of is het strikt van jou?
- **Behandeling**: eerst grondig onderzoek (hoe bouwen anderen een geheugen dat klopt en bijgewerkt blijft; wat staat er al in Maildude), dan een ontwerp aan Bram voorleggen, dan bouwen.
- **Status**: open

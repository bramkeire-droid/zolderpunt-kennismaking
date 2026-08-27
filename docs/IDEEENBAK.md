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

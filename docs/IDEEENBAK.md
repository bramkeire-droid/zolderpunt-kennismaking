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

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
- **Behandeling**: parkeren tot de lopende calculatorvragen van Bram afgehandeld zijn
- **Status**: open

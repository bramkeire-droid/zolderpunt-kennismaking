# Zarvis op het bureaublad

Een dunne schil die Zarvis als klein venster boven je andere werk houdt.

- Laadt het Zarvis-venster van de webapp (`/zarvis`). Alles wat Zarvis kan, zit in de webapp en op de server; een verbetering daar is hier meteen zichtbaar, zonder nieuwe installatie.
- Blijft bovenop andere vensters. Uitzetten kan via het icoon in het systeemvak.
- Eén systeembrede sneltoets, standaard **Ctrl + Shift + Spatie**: toont het venster en start het luisteren.
- Sluiten verbergt het venster; Zarvis blijft klaarstaan. Echt afsluiten kan via het systeemvak.
- Onthoudt plaats en grootte van het venster.

## Bouwen

```sh
npm install
npm run bouw:win   # dist/Zarvis.exe, draagbaar, geen installatie
npm run bouw:mac   # alleen op een Mac
```

Het programma is niet ondertekend. Windows toont daarom bij de eerste start een waarschuwing ("Windows heeft uw pc beschermd"); kies "Meer info" en "Toch uitvoeren".

## Testen

`ZARVIS_URL` wijst de schil naar een ander adres, `ZARVIS_SNELTOETS` zet een andere toetsencombinatie (Electron-notatie). `ZARVIS_ZELFTEST=<pad.png>` draait een korte zelftest en schrijft een schermafdruk.

## Beveiliging

De pagina in het venster krijgt geen toegang tot het systeem: alleen de sneltoets en "verberg" lopen over de brug in `preload.js`. Het venster navigeert nergens anders heen dan naar Zarvis; andere links openen in de gewone browser. De microfoon is alleen toegestaan voor het adres van Zarvis.

## WhatsApp

Via het icoon in het systeemvak, "WhatsApp koppelen…": scan de QR-code met de gsm (Instellingen, Gekoppelde apparaten). Daarna leest Zarvis mee.

- Er wordt nooit een bericht verstuurd.
- Groepen, statusupdates en kanalen worden niet doorgestuurd.
- De server bewaart alleen gesprekken met nummers die in een dossier staan.
- De koppeling gebruikt een bibliotheek die niet van WhatsApp is (Baileys). Dat gaat in tegen hun voorwaarden; in het ergste geval blokkeren ze het nummer.
- Ontkoppelen kan in hetzelfde venster, of op de gsm onder Gekoppelde apparaten.

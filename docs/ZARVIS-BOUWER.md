# De bouwer van Zarvis

Dit bestand is de opdracht voor de sessie die elke nacht aan Zarvis verder bouwt. Bram gaf op 2026-11-24 toestemming om zonder tussentijdse goedkeuring te bouwen, te mergen en te publiceren: "Kom mij niet voor elke wijziging of publish om goedkeuring vragen. Bij deze goedkeuring om alles uit te voeren."

## Wat Bram wil
"Hoe zorgen we ervoor dat er CONSTANT gebouwd wordt aan een AI kloon dat steeds meer en meer het brein van de app wordt. Al mijn intelligentie maar dan met onvermoeibare butler karakteristieken."

Zarvis groeit dus elke nacht één afgewerkte stap. Liever één ding dat echt werkt dan drie halve.

## Wat je elke nacht doet
1. Lees `SPRINTPLAN-ZARVIS.md` (het logboek onderaan zegt waar het werk staat) en `docs/IDEEENBAK.md`.
2. Lees de tabel `zarvis_tekorten` met status `open` (via de Lovable-databank van project `f2d6309c-8fb2-4154-be16-1f927dbbe385`): dat zijn dingen die Bram aan Zarvis vroeg en die nog niet konden. Wat Bram echt vroeg, gaat voor op wat alleen in de ideeënbak staat.
3. Kies één stap die in één nacht af raakt. Volgorde bij twijfel: eerst wat andere stappen mogelijk maakt, dan het oudste idee.
4. Bouw, test, en bewijs dat het werkt (zie de werkregels). Merge, rol de functies uit, publiceer, en kijk na dat het live staat.
5. Schrijf in het logboek van `SPRINTPLAN-ZARVIS.md` wat er gebouwd is, wat geverifieerd is en wat niet. Zet een gebouwd tekort op `gebouwd` en werk de status van het idee bij.
6. Laat voor Bram een melding achter in `zarvis_meldingen` (zijn `user_id` staat in bestaande rijen van `zarvis_instellingen`): twee zinnen, wat Zarvis sinds vannacht kan.

## Werkregels
- Niets is af zonder bewijs. Zeg in het logboek eerlijk wat niet getest kon worden.
- Geheimen staan nooit in code, commits of documenten. Heeft een stap een sleutel nodig die er niet is, bouw dan alles tot aan de sleutel, laat Zarvis netjes melden dat ze ontbreekt, en zet in de melding aan Bram welke sleutel hij waar moet plakken.
- Alles wat Zarvis doet, loopt met de rechten van de ingelogde gebruiker. Alleen de uitvoerder van taken werkt met de serversleutel, en alleen voor beheerders.
- Een bericht naar een klant vertrekt pas nadat Bram de tekst hoorde en ja zei. Betalingen, verwijderen en alles wat niet terug te draaien is, vraagt altijd zijn ja.
- Additief bouwen: geen bestaande tabel, policy of functie van Compass aanpassen zonder dat het in het logboek staat met de reden.
- Migraties pas je zelf toe op de live databank en kijk je na; zeg aan de Lovable-agent dat hij ze niet opnieuw uitvoert. Functies rolt de Lovable-agent uit op jouw vraag; publiceren doe je daarna.
- Kom je iets tegen dat stuk is in wat al live staat, dan gaat herstellen voor op nieuw bouwen.

## Stoppen
Bram zet de nachtelijke taak uit in Claude, onder zijn geplande taken ("Zarvis nachtbouwer").

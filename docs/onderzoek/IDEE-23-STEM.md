# Onderzoek: de stem van Zarvis (IDEE-23, IDEE-17 stap 2, wekwoord, eigen stem)

Onderzoek van 2026-11-24. Alleen gelezen en opgezocht, niets gebouwd. Bronnen zijn officiële pagina's (Microsoft Learn, GitHub van de makers, Hugging Face-modelkaarten, ElevenLabs-docs). Wat ik niet kon bevestigen staat in elk punt en gebundeld in punt 7.

## 1. Samenvatting

1. De sprekerherkenning van Azure bestaat niet meer (stopgezet op 30 september 2025). Wie wíé spreekt moet dus lokaal op Brams pc, met een open model (aanbevolen: `sherpa-onnx` in Electron, Apache-2.0, met sprekerverificatie, stemactiviteit, wekwoord en ruisonderdrukking in één pakket).
2. Het bestaande microfoonfilter (`azureStem.ts` r.67-78) vraagt enkel de ingebouwde filters van de browser; die zijn niet gebouwd voor muziek en trekken de muziek van de pc zelf waarschijnlijk niet af. Eerst meten met de echte Azure-sleutel, dan pas bouwen.
3. Een wekwoord kan lokaal. Porcupine is voor Bram de slechtste keuze (geen gratis plan voor bedrijfsgebruik meer, volgens Picovoice zelf geen niet-commercieel plan gepland). Beter: open woordenschat in `sherpa-onnx` of een eigen getraind `openWakeWord`-model; Nederlands is voor geen van beide bevestigd, dus eerst op "Zarvis" testen.
4. Stemming uit volume, tempo en pauzes mag en is klein werk. Een model voor emotie uit spraak is voor Nederlands niet betrouwbaar gemeten, en de AI-verordening verbiedt emotieherkenning op de werkplek: voor Bram alleen, zonder opslag, is dat verdedigbaar maar niet uitdrukkelijk beantwoord door de bron. Zodra een medewerker Zarvis gebruikt, moet het uit.
5. Een stem die klinkt als Bram: de persoonlijke stem van Azure is een beperkte dienst voor goedgekeurde klanten (waarschijnlijk niet haalbaar voor één zaakvoerder); ElevenLabs kan (Nederlands staat in de lijst, vanaf ongeveer 22 dollar per maand voor de professionele kloon). Gebruiken voor bellen of berichten aan klanten raad ik af.

Totale omvang: ongeveer 72 uur bouwwerk, plus ongeveer 4 uur van Bram voor de opnames (stap 0 en 3).

## 2. Wat er vandaag is

- `src/lib/zarvis/azureStem.ts`: herkennen rechtstreeks tussen browser en Azure met een kortlevend bewijs (r.34-40, r.98-99); `recognizeOnceAsync` (r.109) laat Azure zelf bepalen wanneer een uiting eindigt. Microfoon via `getUserMedia` met `echoCancellation`, `noiseSuppression`, `autoGainControl`, `channelCount: 1` en een `voiceIsolation`-wens (r.73-78); lukt dat niet, dan de gewone microfoon (r.94). Het commentaar zegt zelf: "het herkent nog niet wíé er spreekt" (r.69-70).
- `src/lib/zarvis/niveau.ts`: de microfoonknop meet enkel volume (RMS, r.8-17 en `meetMicrofoon` r.84-102, met een tweede `getUserMedia` zonder `channelCount`). Er is geen toonhoogte, tempo of pauze. `spreekSpectrum` (r.34-52) verdeelt de stem van Zarvis zelf in 8 banden voor `ZarvisGat.tsx` (r.216-274); de microfoon heeft zo'n verdeling niet.
- `supabase/functions/zarvis-stem/index.ts`: `bewijs` (r.83-93) en `spreek` (r.96-120), stem `nl-BE-ArnaudNeural` standaard, regio `westeurope`. Login en rol gecontroleerd in code (r.52-74). Geen SSML-stijl of toonhoogte, enkel de gewone stem. Zonder `AZURE_SPEECH_KEY` geeft hij 503 (r.77) en blijft de browserstem.
- `zarvis-desktop/main.js`: sneltoets Ctrl + Shift + Spatie (r.221-222), microfoontoestemming enkel voor de eigen oorsprong (r.273-276). Geen eigen audioverwerking in het programma. Het installatieprogramma is een eigen NSIS-script (`bouw-installatie.js`); een natieve module (zoals `sherpa-onnx-node`) moet daar expliciet in meegepakt worden (niet nagekeken, zie punt 7).
- Wat de ideeënbak al vastlegt: IDEE-23 (`docs/IDEEENBAK.md` r.216-228): stemafdruk blijft op de pc, negeren zonder iets te zeggen, drempel op Brams echte stem afstellen, sprekerherkenning vóór een wekwoord. IDEE-17 (r.162-170): stap 1 gebouwd (uit woorden), stap 2 open, niets bijhouden, geen webcam.
- Nooit getest: alles van de stem, met een echte microfoon (HANDOFF r.56-65). De Azure-sleutel ontbreekt.

## 3. Bevindingen per vraag

### 3.1 Sprekerherkenning

**Azure.** De documentatie van Microsoft zegt dat sprekerherkenning in Azure AI Speech op 30 september 2025 stopt en dat toepassingen het daarna niet meer kunnen gebruiken; de Speech SDK haalde de ondersteuning en voorbeelden weg. Een antwoord op Microsoft Q&A noemde 15 oktober 2025; ik volg de officiële pagina's (30 september). Een rechtstreekse opvolger is er volgens de bronnen niet. De realtime-diarisatie geeft stabiele spreker-nummers per gesprek maar geen identiteit (Q&A-antwoord, secundair). Bovendien verbiedt de gedragscode van Microsoft AI-diensten het identificeren of verifiëren van personen aan hun stem, behalve met goedkeuring (punt 15 van de gebruiksbeperkingen). Azure is dus ook niet de weg als het terugkwam.
Bronnen: https://learn.microsoft.com/en-us/azure/cognitive-services/speaker-recognition/home, https://mc.merill.net/message/AZ-azure-ai-speaker-recognition-retirement, https://learn.microsoft.com/en-us/legal/cognitive-services/speech-service/tts-code-of-conduct

**Open modellen op de pc (cijfers uit de bronnen, op Engelstalige testsets).**

| Model | Cijfer (EER, VoxCeleb1) | Licentie | Opmerking |
|---|---|---|---|
| SpeechBrain ECAPA-TDNN | 0,80% | Apache-2.0 | 16 kHz mono, score is cosinus tussen stemafdrukken; de kaart geeft geen drempel; SpeechBrain geeft "geen garantie" op andere datasets |
| WeSpeaker (VoxSRC2023-basis) | CAM++ 0,654%; ECAPA 0,728%; ResNet34 0,723% | code Apache-2.0; getrainde gewichten CC BY 4.0 volgens modelkaart | exporteerbaar naar ONNX |
| pyannote `embedding` | 2,8% | MIT | oudere, zwakkere afdruk; vooral voor diarisatie |
| WavLM-base-plus-sv (via transformers.js) | geen EER op de kaart; voorbeeld: ongeveer 0,96 gelijke spreker, 0,62 andere spreker | zie kaart | draait in de browser; zwaarder en minder nauwkeurig dan ECAPA/CAM++ |

Resemblyzer heb ik niet nagekeken. EER is één werkpunt waar "vreemde doorlaten" en "Bram weigeren" even vaak gebeuren; hoeveel van elk bij een bepaalde drempel, staat in geen enkele bron die ik vond. Onder lawaai en ver van de microfoon: een team in de ROBOVOX-wedstrijd (2024) haalde met ECAPA/ResNet en versterkte training 6,46% EER; dat is een indicatie dat 0,8% niet geldt met muziek aan. Cijfers voor Nederlands of Vlaams vond ik niet. VoxCeleb is overwegend Engelstalig; sprekerafdrukken zijn grotendeels taalonafhankelijk maar dat is niet bevestigd voor Vlaams.

**Hoe lang inspreken, welke drempel.** Geen bron met een getal voor inspreektijd; één studie zegt enkel dat de afdruk stabieler wordt naarmate het langer duurt. Mijn schatting (niet uit een bron): 60 tot 90 seconden gewone spraak, verspreid over drie momenten (stil, met pc-geluid, met muziek zacht), uiting per uiting opgeslagen en gemiddeld. De drempel kies je niet uit een boek maar uit Brams eigen opnames (punt 3.6): zet hem waar Bram bijna nooit geweigerd wordt, en meet dan hoeveel vreemden doorkomen.

**Waar draait het.** `sherpa-onnx` (Apache-2.0) ondersteunt volgens zijn GitHub-pagina sprekeridentificatie en -verificatie, diarisatie, stemactiviteit, wekwoord en spraakverbetering, op Windows x64, met npm-pakket `sherpa-onnx-node` en een Electron-voorbeeld van derden. Over CUDA of DirectML staat niets op die pagina; een stemafdruk van enkele seconden audio is op een i9 ook zonder grafische kaart snel genoeg (mijn inschatting, niet gemeten). Een alternatief is `onnxruntime-node` met een WeSpeaker-ONNX, maar dan moet de rekenstap van audio naar kenmerken (fbank) zelf geschreven worden.
Bronnen: https://github.com/k2-fsa/sherpa-onnx, https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb, https://arxiv.org/pdf/2306.15161, https://huggingface.co/pyannote/embedding, https://huggingface.co/Xenova/wavlm-base-plus-sv

**Diensten met verwerking in de EU.** Ik vond geen dienst voor sprekerverificatie in de EU die ik kan aanbevelen of waarvan ik de voorwaarden heb gelezen; Picovoice Eagle is een vendor die in de bronnen opduikt, maar die heb ik niet nagekeken. Gezien een stemafdruk biometrisch is (GDPR artikel 9, bronnen zijn vendor-blogs), is lokaal ook juridisch de eenvoudigste weg: de afdruk verlaat de pc niet, en wordt bewaard met Electrons `safeStorage` (Windows-gegevensbescherming).

**Licentievoorbehoud.** De ECAPA- en WeSpeaker-modellen zijn getraind op VoxCeleb. Of die dataset commercieel gebruik van het model toelaat, heb ik niet kunnen nagaan. Controleren vóór het programma bij anderen dan Bram terechtkomt.

### 3.2 Muziek op de achtergrond

**Wat het huidige filter doet.** Het vraagt aan de browser: echo weg, ruis weg, automatische versterking, en stemisolatie als beschikbaar. Wat dat niet doet:
- Echo-onderdrukking in Chromium gebruikt als referentie enkel het geluid dat de browser zelf afspeelt. Een bericht op een ontwikkelaarsforum zegt dat geluid van andere programma's niet wordt weggehaald; Chromium vindt het "niet gespecificeerd". Spotify of YouTube op Brams pc wordt dus waarschijnlijk niet afgetrokken (forum, geen officiële tekst; het "chrome-wide AEC"-verhaal bij Zoom laat een uitzondering open voor geluid dat via de eigen audiocontext loopt, maar niet voor andere programma's).
- Ruisonderdrukking in de browser is gebouwd voor ruis, niet voor muziek met zang; zang is spraak voor een filter. Dit is mijn inschatting, geen bron.
- Of `voiceIsolation` in Electron werkt weet ik niet (de instelling is er in `azureStem.ts` r.76 als wens; niet nagekeken).
- Het filter kijkt niet wie spreekt; een mens op de achtergrond of zang in een liedje komt gewoon door.

**Opties.**
1. *Stemactiviteit (Silero VAD)*: MIT-licentie volgens de GitHub-pagina (de badge daar zegt CC BY-NC, dus het LICENSE-bestand nakijken), model van ongeveer 2 MB, minder dan 1 ms per chunk van 30 ms op één CPU-draad, 8 of 16 kHz, ONNX. De pagina zegt niet of het muziek van spraak scheidt; zang kan als spraak tellen. Nuttig om stilte weg te laten en om te beslissen wanneer een uiting begint, niet als muziekfilter. Ook beschikbaar in `sherpa-onnx`.
2. *Ruisonderdrukking op de pc*: RNNoise (BSD-3, getraind op schone spraak en ruis; de pagina noemt muziek niet, 48 kHz mono, geen JS-poort vermeld) of de spraakverbetering van `sherpa-onnx` (voorbeelden: gtcrn). *NVIDIA Broadcast* draait op RTX 2060 en hoger onder Windows 10/11 en maakt een virtuele microfoon met ruisverwijdering; de RTX 5080 volstaat ruim. De FAQ zegt "storende geluiden", over muziek met zang staat niets. Het kost geen code: Zarvis kiest gewoon die microfoon. Eén eenvoudige proef met Bram's muziek zegt of het helpt. De Maxine-SDK-licentie voor eigen inbouw heb ik niet gevonden.
3. *De muziek van de pc zelf aftrekken*: echte echo-onderdrukking met als referentie wat de pc afspeelt (Windows-loopback). Het beste tegen muziek van de eigen pc, maar het moeilijkste (vertraging uitlijnen, een eigen echo-onderdrukker); of Electron dat geluid kan binnenhalen (er is een loopback-optie bij schermopname) heb ik niet nagekeken. Pas bouwen als 1 en 2 niet volstaan. Muziek uit een luidspreker in de kamer die niet van de pc komt, lost dit niet op.
4. *Sprekerverificatie als laatste slot*: ook als muziek half doorkomt, wordt een uiting die niet op Bram lijkt geweigerd. Dat is feitelijk het sterkste middel tegen muziek én vreemden samen (stap 3 in het voorstel).
Bronnen: https://github.com/snakers4/silero-vad, https://github.com/xiph/rnnoise, https://www.nvidia.com/en-eu/geforce/broadcasting/broadcast-app/faq/, https://nvidia.com/en-us/geforce/guides/nvidia-rtx-voice-setup-guide, https://developer.chrome.com/blog/more-native-echo-cancellation/

### 3.3 Wekwoord ("Zarvis")

| Motor | Draait lokaal op Windows/Electron | Eigen woord | Licentie | Nederlands |
|---|---|---|---|---|
| Picovoice Porcupine | ja (Node-SDK bestaat, niet nagekeken) | ja, in hun console, enkele seconden | Een bericht op het forum van Home Assistant: gratis AccessKeys stoppen op 30 juni 2026 en er is "geen niet-commerciële laag gepland"; de sleutel wordt bij elke start gecontroleerd, ook offline. De README van Porcupine zegt dat console-modellen voor niet-commercieel gebruik zijn; hun prijzenpagina zegt voor een gratis plan het tegendeel. Tegenstrijdig; ik kon hun prijs niet ophalen | Nederlands ondersteund? niet nagekeken |
| openWakeWord | ja, op Windows enkel via onnxruntime | ja, trainen met een Colab-notitieboek in minder dan een uur op synthetische spraak | code Apache-2.0, kant-en-klare modellen CC BY-NC-SA 4.0; eigen model getraind op de aanbevolen data kan die beperking erven (derde partij, niet bevestigd) | alleen Engels (TTS-modellen); "Zarvis" met Engelse uitspraak is een proef waard |
| sherpa-onnx keyword spotting | ja, Node-pakket | ja, open woordenschat: je geeft het woord op zonder te trainen, met een drempel | Apache-2.0 | geen Nederlands model op de pagina (Engels, Chinees); een Engels model kan "Zarvis" misschien herkennen, niet bevestigd |
| Azure aangepast sleutelwoord | modellen draaien lokaal (`.table`-bestand uit Speech Studio) | ja, enkel in Speech Studio | dienst van Microsoft | een Q&A van 2021 zegt enkel Engels en Chinees; huidige lijst niet kunnen ophalen |

Cijfers: openWakeWord mikt op minder dan 5% gemiste oproepen en minder dan 0,5 valse alarmen per uur met een afgestelde drempel (standaard 0,5), met de waarschuwing dat de testset klein is. Van de andere motoren vond ik geen cijfers.

**Aanbeveling.** Drie proeven op Brams pc met 100 keer "Zarvis" en 24 uur gewoon geluid (stem, muziek, tv): sherpa-onnx KWS (geen extra pakket als we toch voor sprekerverificatie kiezen), openWakeWord-model getraind op "Zarvis", Azure-sleutelwoord als het Nederlands blijkt te kunnen. Combineren met sprekerverificatie: het wekwoord wekt het systeem, de sprekerverificatie beslist of het Bram was. Dat dempt de valse alarmen uit tv of muziek.

**Privacy van altijd luisteren.** Met een lokale motor gaat er niets naar Azure vóór het wekwoord valt; het geluid blijft in een korte lus in het werkgeheugen (bijvoorbeeld 2 seconden), niet op schijf. Windows toont zelf dat een programma de microfoon gebruikt. Voeg toe: een uitknop in het systeemvak en een duidelijke aanduiding in het zwarte gat. Wie zonder Bram in de kamer is, wordt nooit doorgestuurd. Wettelijk is de afdruk van Brams stem een biometrisch gegeven van Bram zelf; iemand anders (Christophe, een klant in de kamer) wordt niet opgeslagen. Gesprekken in de buurt worden wel kort in het werkgeheugen gehoord; mijn voorstel is dit in een zin in de installatietekst te zeggen.
Bronnen: https://github.com/dscripka/openWakeWord, https://community.home-assistant.io/t/fyi-picovoice-confirmed-free-tier-accesskeys-will-stop-working-after-june-30-2026/1012744, https://picovoice.ai/docs/faq/general/, https://k2-fsa.github.io/sherpa/onnx/kws/index.html, https://learn.microsoft.com/azure/ai-services/speech-service/language-support

### 3.4 Stemming uit de stem

**Eenvoudige kenmerken.** Volume (bestaat), tempo (lettergrepen of woorden per seconde uit de tussentijdse tekst van Azure en de duur), pauzes (stilte tussen de woorden uit de stemactiviteit), toonhoogte (autocorrelatie in de audio-analyser; niets bijhouden, enkel verschil met een vaste referentie). Dit zijn "kenmerken van het geluid", geen oordeel over gevoel; Zarvis krijgt een label zoals `haastig`, `rustig`, `luid`, `vermoeid klinkend` voor dat ene antwoord. Betrouwbaarheid: ik vond geen bron; het is eenvoudige signaalverwerking en dus te meten, niet te "geloven". Het heeft een persoonlijke basislijn nodig (Brams normale tempo en volume) anders is "haastig" ruis.

**Model voor emotie uit spraak.** `emotion2vec+` is het meest gebruikte open model: code MIT, gewichten onder de FunASR-licentie (een derde partij leest dat commercieel gebruik niet uitdrukkelijk geregeld is: nakijken), 5 of 9 klassen (bronnen spreken elkaar tegen), alleen discrete labels, geen arousal/valence vermeld. Voor Nederlands: geen cijfers gevonden. De benchmark EmoBox (Interspeech 2024) test 32 corpora in 14 talen maar toont kruiscorpusresultaten enkel voor 4 Engelse sets. Een studentenscriptie (Utrecht) trainde op Engels en testte op een Nederlands corpus: nauwkeurigheid 0,311 (boven toeval, ver van bruikbaar). Een overzichtsartikel (2021) zegt dat de meeste modellen slecht presteren buiten hun eigen corpus of taal. Conclusie uit de bronnen: te onbetrouwbaar om op te sturen; hoogstens een tweede signaal.
Bronnen: https://github.com/ddlBoJack/emotion2vec, https://eprints.whiterose.ac.uk/id/eprint/222971/1/INTERSPEECH2024_EmoBox-2.pdf, https://studenttheses.uu.nl/handle/20.500.12932/40678, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8666588/

**Mag het?** (Geen juridisch advies; ik las samenvattingen, niet het volledige richtsnoer.)
- Artikel 5(1)(f) van de AI-verordening verbiedt AI die emoties van een natuurlijke persoon afleidt op de werkplek en in onderwijsinstellingen, behalve om medische of veiligheidsredenen. De tekst zegt niets over biometrie; de richtsnoeren van de Commissie beperken het tot emoties afgeleid uit biometrische gegevens (dus ook stem), niet uit geschreven tekst. Het louter vaststellen van een opvallend kenmerk zoals een verheven stem of gefluister valt er niet onder zolang het niet gebruikt wordt om een emotie af te leiden. "Werkplek" is ruim: elke fysieke of virtuele plek waar gewerkt wordt, ook werving. Welzijn, stress of motivatie meten telt niet als medisch.
- De richtsnoeren in de samenvattingen zeggen niet of een zaakvoerder die het op zichzelf toepast eronder valt, noch of zelfstandigen gedekt zijn. De ratio (bescherming van afhankelijke personen) wijst erop dat Bram op zichzelf een grijze zone is, een medewerker (Christophe, arbeiders) duidelijk niet. Het is dus een beslissing voor Bram met advies van een jurist, niet een vaststelling.
- Microsoft: de gedragscode voor Azure-diensten verbiedt uitdrukkelijk om emotionele toestanden af te leiden uit spraakpatronen (punt 12). Dit geldt voor het gebruik van Azure-diensten; lokaal rekenen valt daar buiten, maar stuur dus geen audio naar Azure met dat doel.
- Mijn ontwerp, binnen die grenzen: enkel voor de ingelogde eigenaar, standaard uit voor andere gebruikers, per antwoord berekend in het geheugen van de pc, niets opgeslagen, niets naar de server behalve het label "haastig" in de vraag van dat ene antwoord, nooit gebruikt om iets over Bram of iemand anders vast te leggen. Dat sluit aan bij Brams beslissing in IDEE-17 (niets bijhouden).
Bronnen: https://artificialintelligenceact.eu/article/5/, https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/, https://learn.microsoft.com/en-us/legal/cognitive-services/speech-service/tts-code-of-conduct

**Wat Zarvis ermee doet zonder iets bij te houden.** Korter antwoorden en eerst het resultaat bij `haastig`; niet doorvragen bij `luid en kort`; rustig en volledig bij `rustig`; het zwarte gat kleurt zacht mee via de bestaande tint (`u_tint` in `ZarvisGat.tsx`). Geen melding "je klinkt boos"; geen dagboek.

### 3.5 Een stem die klinkt als Bram

**Persoonlijke stem van Azure.** Een sample van 5 tot 90 seconden en een uitgesproken toestemmingszin; training minder dan 5 seconden; spreekt in meer dan 90 talen. Maar: de API is beperkt tot "in aanmerking komende klanten en goedgekeurde toepassingen"; aanvraag via een formulier, enkel voor klanten die rechtstreeks met Microsoft-accountteams werken (een zoekresultaat; niet in de hoofdtekst bevestigd), en gebruik beperkt tot de goedgekeurde toepassing. De doelgroep is "bedrijven die gebruikers hun eigen stem laten maken in een app". Kans dat een zaakvoerder zonder Microsoft-account voor zijn eigen assistent wordt goedgekeurd: klein (inschatting). Of Vlaams (nl-BE) in de lijst staat kon ik niet ophalen; de docs zeggen wel dat een stem in meer dan 90 talen spreekt met automatische taaldetectie, dus dat zegt niets over Vlaamse klank. Prijs: per miljoen tekens, stemmen maken gratis, opslag per 1000 profielen (pagina toonde de bedragen niet).
Bronnen: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/personal-voice-overview, https://learn.microsoft.com/en-us/legal/cognitive-services/speech-service/tts-code-of-conduct

**ElevenLabs.** Instant Voice Cloning vanaf het plan Starter (6 dollar per maand, 30.000 credits); Professional Voice Cloning vanaf Creator (22 dollar per maand, 121.000 credits; Scale 3 klonen, Business 10). De professionele kloon vraagt minstens 30 minuten, liefst 2 tot 3 uur schone spraak, geen achtergrondgeluid of muziek, enkel van jezelf, met een stemcontrole bij het aanmaken. Nederlands staat in de lijst van de professionele kloon (de pagina is hierover niet consequent); Vlaamse klank en uitspraak van Belgische plaatsnamen zijn niet bevestigd. Een kloon is niet te downloaden. Gegevensverwerking in de EU staat niet op de prijzenpagina: niet bevestigd, en niet gelezen in de voorwaarden. Integratie: één extra aanroep in `zarvis-stem` in plaats van Azure, met mp3 per zin zoals nu.
Bronnen: https://elevenlabs.io/pricing, https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/professional-voice-cloning

**Risico van misbruik en voorwaarden.** Een kloon van Brams stem is een aanvalsmiddel zodra hij ergens gestolen wordt (telefoonfraude bij klanten, bij zijn bank). Microsoft eist bij elke AI-stem dat de gebruiker niet kan denken dat hij een mens hoort, en verbiedt imitatie zonder toestemming. Zarvis kan nu al bellen en WhatsApp sturen (IDEE-28): in Brams stem laten bellen of lezen is misleiden van klanten en strookt niet met IDEE-29 ("extern: vragen"). Mijn voorstel: de kloon enkel voor wat Zarvis tegen Bram zegt, nooit voor oproepen of berichten naar derden, en een vaste vermelding dat het synthetische stem is als dat ooit verandert. Of Bram het eigenlijk wil: het is een smaakvraag (vraag 3).

### 3.6 Wat testen zodra de sleutel er is, en hoe meten

Wat vandaag nog geen enkele test heeft gezien: de basis. Volgorde:
1. *Sleutel en lijn*: `bewijs` en `spreek` live (de functie geeft 503 zonder sleutel); herkennen in nl-BE met de echte microfoon; vertraging van einde zin tot tekst, van tekst tot eerste geluid.
2. *Het filter*: dezelfde zinnen met en zonder `noiseSuppression`/`voiceIsolation` om te zien of die schakelaars iets doen (`track.getSettings()` toont wat Chromium effectief toepast).
3. *De vaste reeks opnames*, één keer opgenomen en dan telkens opnieuw afgespeeld (zodat elke verbetering met hetzelfde materiaal meet):
   - 40 korte vragen van Bram (stil), 40 met zijn gewone muziek zacht, 40 met muziek hard, 40 op 2 meter afstand, 40 terwijl de tv aanstaat;
   - 40 uitingen van een of twee andere mensen (man en vrouw, Vlaams), stil en met muziek;
   - 20 stukken enkel muziek (met zang) en 20 enkel ruis (ventilator, klopwerk), om te zien of er iets "herkend" wordt dat niemand zei.
4. *Wat je telt*: woordfoutenpercentage (woorden fout gedeeld door woorden in de vaste tekst) per scenario; voor sprekerverificatie het aandeel van Bram dat geweigerd wordt en het aandeel van vreemden dat doorkomt, bij vijf drempels, en het punt waar die twee gelijk zijn; voor het wekwoord gemiste oproepen op 100 pogingen en valse alarmen per uur op 24 uur gewoon geluid; vertraging in seconden.
5. *Hoeveel is genoeg*: bij 0 fouten op n pogingen ligt de echte foutkans met 95% zekerheid onder ongeveer 3/n (vuistregel). Met 40 uitingen per scenario kan je dus geen fout onder 7% bewijzen; wil je "vreemden komen minder dan 1% door" bewijzen, dan ongeveer 300 uitingen van vreemden. Zeg dat eerlijk: een kleine reeks toont vooral grove fouten.
6. *Aanvaardingsdrempels (voorstel, bij te stellen door Bram)*: Bram stil en met zachte muziek minstens 95% aanvaard; vreemden maximum 2 op 100 doorgelaten; wekwoord maximum 1 vals alarm per uur in de gewone dag; muziek alleen geeft nooit een commando.
7. *Een scenario dat we niet doen*: een opname van Brams stem afspelen als aanval; ook een goed model laat een opname of een nagemaakte stem door. Sprekerverificatie is geen beveiliging; de poort met Brams ja in de code (IDEE-29) blijft het echte slot.

## 4. Voorstel in bouwstappen

Per stap: wat Zarvis kan doen; geraakt; wat een ja van Bram vraagt; wat het van Bram nodig heeft; uren; bewijs.

**Stap 0. Eerst meten met wat er is.** Zarvis kan: horen en spreken zoals nu, met een meetrapport.
- Geraakt: nieuwe map `zarvis-desktop/meting/` of een eigen testpagina, niets in productie; `azureStem.ts` en `niveau.ts` lezen enkel. Geen wijziging aan Compass.
- Ja van Bram: de opnames maken (zijn stem, muziek, een tweede persoon); niets naar buiten.
- Nodig: `AZURE_SPEECH_KEY` in Lovable (staat al als openstaand punt), 60 minuten voor de opnamereeks, een tweede persoon voor 10 minuten.
- Omvang: 6 uur.
- Bewijs: een tabel woordfouten per scenario (punt 3.6) en de vaststelling of het huidige filter muziek dempt (ja of nee, met getal).

**Stap 1. Stemming uit volume, tempo en pauzes (IDEE-17 stap 2).** Zarvis kan: korter en sneller antwoorden als Bram haastig klinkt; het gat kleurt zacht mee.
- Geraakt: `niveau.ts` (toonhoogte en tempo naast het volume), `azureStem.ts` (kenmerken per uiting doorgeven), `ZarvisContext.tsx` en de aanroep van `zarvis` (één extra veld `klank` per vraag), `ZarvisGat.tsx` (tint). Instructie van `zarvis` (supabase/functions/zarvis/index.ts) één alinea. Niets in de databank, niets bijgehouden.
- Ja van Bram: de beslissing over de AI-verordening (vraag 2); voor anderen dan hem standaard uit.
- Nodig: een minuut spreken om zijn basislijn te zetten (in het geheugen, niet opgeslagen).
- Omvang: 8 uur.
- Bewijs: opnames van dezelfde zin rustig, snel, luid; het label verandert juist; geen enkel veld bewaard (nakijken in de databank en in `localStorage`).

**Stap 2. Een voorfilter in het programma: stemactiviteit en ruis.** Zarvis kan: stilte en ruis niet meer doorsturen; begint pas bij echte spraak.
- Geraakt: `zarvis-desktop/` (nieuw `audio.js` in het hoofdproces met `sherpa-onnx-node`, nieuwe `preload`-brug, `bouw-installatie.js` en `package.json` om de natieve module en de modellen (enkele MB) mee te pakken); `azureStem.ts` krijgt een tweede weg: audio via `PushAudioInputStream` in plaats van `fromStreamInput` (alleen in het programma; in de browser blijft het zoals nu).
- Ja van Bram: geen. Alles lokaal.
- Nodig: eventueel NVIDIA Broadcast installeren en testen als de eenvoudigste winst (stap 0 zegt of dat voldoende is).
- Omvang: 14 uur (de natieve module in het installatieprogramma is het onzekerste stuk).
- Bewijs: dezelfde opnamereeks als stap 0, opnieuw gemeten: woordfouten met muziek dalen; "muziek alleen" levert geen tekst op; vertraging stijgt niet meer dan een halve seconde.

**Stap 3. Alleen Brams stem (IDEE-23, tweede deel).** Zarvis kan: een uiting van een ander of van een liedje negeren zonder iets te zeggen.
- Geraakt: `zarvis-desktop/audio.js` (stemafdruk, vergelijking per uiting), een instelscherm "stem leren" in het beheervenster, `azureStem.ts` (de eerste 1,5 tot 2 seconden worden vastgehouden, de verificatie beslist, daarna gaat het vastgehouden geluid naar Azure of wordt het weggegooid). De afdruk in `safeStorage` op de pc; niets in Supabase.
- Ja van Bram: het inspreken (de afdruk is biometrisch en blijft op de pc), en de beslissing "negeren zonder melding" (staat al in IDEE-23 als voorstel).
- Nodig: 3 keer 30 seconden voorlezen op drie momenten; de opnamereeks uit stap 0 voor de drempel; later een tweede en derde stem enkel als hij dat vraagt.
- Omvang: 20 uur.
- Bewijs: de aanvaardingsdrempels van punt 3.6, met een tabel bij vijf drempels, en Brams eigen test met muziek aan en een tweede mens in de kamer (zoals IDEE-23 zelf eist). Zonder die test is het niet af.

**Stap 4. Wekwoord "Zarvis" in plaats van of naast de sneltoets.** Zarvis kan: luisteren zonder dat Bram iets indrukt; reageert enkel als het woord valt én het Brams stem is.
- Geraakt: `zarvis-desktop/audio.js` (motor, lus in het werkgeheugen), `main.js` (aan/uit in het systeemvak, sneltoets blijft), `ZarvisVenster.tsx` en `ZarvisGat.tsx` (zichtbare aanduiding "luistert mee"), installatietekst. Geen server.
- Ja van Bram: of er altijd geluisterd mag worden (vraag 4); standaard uit tot hij het aanzet.
- Nodig: een eigen woord opnemen (100 keer "Zarvis", verschillende afstanden) voor de proef; later ook voor de gsm (IDEE-27, buiten dit onderzoek).
- Omvang: 16 uur (inclusief de drie proeven van 3.3 en de dagproef van 24 uur).
- Bewijs: gemiste oproepen op 100 pogingen en valse alarmen per uur op een gewone dag met tv en muziek, binnen de drempels van 3.6. Stoppen en terug naar de sneltoets als het niet haalt.

**Stap 5. Een eigen stem voor Zarvis (alleen als Bram dat wil).** Zarvis kan: tegen Bram spreken met een stem die op de zijne lijkt.
- Geraakt: `supabase/functions/zarvis-stem/index.ts` (een tweede aanbieder naast Azure, keuze via een secret), geen wijziging aan `azureStem.ts`. Bellen en WhatsApp blijven op de standaardstem.
- Ja van Bram: de keuze zelf, de toestemmingszin opnemen, en uitdrukkelijk: nooit naar derden.
- Nodig: een ElevenLabs-account, minimum plan Creator voor de professionele kloon; 30 minuten tot 3 uur schone opname; een secret `ELEVENLABS_API_KEY` in Lovable. Betaling en account zelf maakt Bram.
- Omvang: 8 uur (waarvan 2 om de aanvraag voor de persoonlijke stem van Azure te proberen, als hij dat verkiest).
- Bewijs: dezelfde 20 zinnen door de oude en de nieuwe stem, blind beluisterd door Bram; vertraging per zin niet erger dan nu; de functie weigert nog steeds zonder login.

Totaal: 6 + 8 + 14 + 20 + 16 + 8 = 72 uur. Aanbevolen volgorde: 0, 1, 2, 3, 4; 5 enkel op verzoek. Stap 1 kan parallel met 2.

## 5. Afhankelijkheden van andere ideeën

- IDEE-16 (taken) en IDEE-28 (bellen): een geplande taak mag nooit door spraak veranderd worden; de verificatie beschermt enkel het gesprek. Bellen met een kloon: uit (punt 3.5).
- IDEE-29 (de poort: alles dat buiten Compass iets verandert of geld kost wacht op Brams ja in de code): blijft ongewijzigd. Spraakverificatie komt er niet voor in de plaats.
- IDEE-25 en 26 (familiemodus, savage): kunnen de stemming gebruiken, en de familiemodus kan baat hebben bij een wekwoord; een tweede stem (familie) vraagt een tweede afdruk en is dus een eigen beslissing.
- IDEE-30 (brein): als er ooit een geheugen komt, mag de stemming daar niet in terechtkomen zonder een nieuwe beslissing van Bram.
- IDEE-22 (computer use): laat Zarvis klikken terwijl Bram weg is; het wekwoord en de verificatie zijn dan niet relevant voor die weg, maar een luisterende pc is een aanvalsoppervlak (punt 6).
- IDEE-27 (gsm): een wekwoord op de gsm is een apart onderzoek (andere motoren, andere rechten).
- De stap "meten met een echte microfoon" hangt af van het openstaande punt "sleutel van Azure" in HANDOFF r.71.

## 6. Risico's

- Een stemafdruk is biometrisch (GDPR artikel 9). Lokaal houden, versleuteld bewaren, verwijderknop, geen afdruk van anderen zonder hun toestemming. Een jurist moet nakijken of de afdruk van Bram zelf, voor zijn eigen zaak, onder een uitzondering valt; ik kon dat niet nagaan.
- Sprekerverificatie is geen slot: een opname of een nagemaakte stem kan doorkomen. Niet gebruiken om gevoelige acties te ontgrendelen.
- Altijd luisteren: valse alarmen, geluid van derden in de kamer (klanten, Christophe) in het werkgeheugen. Aan/uit zichtbaar, standaard uit, een zin in de installatietekst.
- Valse weigering: als Zarvis Bram niet hoort omdat hij verkouden is of een andere microfoon heeft, voelt het kapot aan. Een uitwijk (sneltoets en tekstvak blijven) en een herlerende afdruk op uitdrukkelijke vraag.
- Natieve module in Electron en het eigen installatieprogramma: kan het pakket doen mislukken of enkele honderden MB toevoegen; vroeg testen in stap 2.
- Licenties van modellen (VoxCeleb, FunASR, `openWakeWord`-gewichten): nakijken vóór het programma bij iemand anders dan Bram terechtkomt of het bedrijf verkocht wordt (Brams einddoel, HANDOFF r.7); een verkoper moet dit kunnen aantonen.
- Emotieherkenning en de AI-verordening: zodra een medewerker Zarvis gebruikt, uit. De Microsoft-gedragscode verbiedt emotie-afleiding met Azure.
- Eigen stem: fraude als de kloon uitlekt, misleiding als hij naar klanten gaat. Een kloon van Bram kan bij telefonische fraude tegen zijn bank of zijn bedrijf ingezet worden.
- Prijsstijgingen of wijziging van voorwaarden bij Picovoice, ElevenLabs, Azure: daarom lokaal en open waar mogelijk. Picovoice is al één keer van gratis naar enkel zakelijk gegaan (forumbericht).

## 7. Zeker tegenover niet kunnen nagaan

Zeker (met bron):
- Azure sprekerherkenning is stopgezet op 30 september 2025 en uit de SDK verwijderd.
- ECAPA-TDNN van SpeechBrain: EER 0,80% op VoxCeleb1-test, Apache-2.0, 16 kHz; WeSpeaker-basiscijfers (CAM++ 0,654%, ECAPA 0,728%, ResNet34 0,723%); pyannote embedding 2,8%.
- `sherpa-onnx` is Apache-2.0 en noemt sprekerverificatie, VAD, wekwoord en spraakverbetering, Windows x64 en een Node-pakket.
- openWakeWord: code Apache-2.0, modellen CC BY-NC-SA 4.0, enkel Engels, op Windows enkel onnxruntime, training in minder dan een uur.
- Picovoice: de pagina over het gratis plan veranderde; een bericht op het forum van Home Assistant meldt dat gratis sleutels op 30 juni 2026 stoppen en er geen niet-commerciële laag komt (dit zegt het forum, niet Picovoice zelf rechtstreeks).
- Artikel 5(1)(f) van de AI-verordening verbiedt emotieafleiding op de werkplek, behalve medisch of veiligheid; de Microsoft-gedragscode verbiedt emotie-afleiding uit spraak met hun diensten en identificatie op stem zonder goedkeuring.
- Persoonlijke stem van Azure: beperkte toegang, goedgekeurde toepassingen, 5 tot 90 seconden en een toestemmingszin; ElevenLabs-prijzen en eisen zoals aangehaald.

Niet kunnen nagaan:
- Cijfers voor Nederlands of Vlaams bij sprekerverificatie, emotieherkenning en wekwoord: nergens gevonden.
- Hoe lang Bram moet inspreken en welke drempel: enkel mijn schatting; moet gemeten worden.
- Hoeveel vreemden doorkomen en hoe vaak Bram geweigerd wordt bij een gegeven drempel: geen bron.
- Of Silero VAD en RNNoise muziek met zang tegenhouden: de bronnen zeggen het niet.
- Of NVIDIA Broadcast muziek met zang weghaalt: de FAQ noemt het niet; de Maxine-SDK-licentie niet gevonden.
- Of Chromium in Electron op Windows de muziek van andere programma's aftrekt: forumbericht zegt nee; niet uitgeprobeerd. Of `voiceIsolation` werkt in Electron: niet nagekeken. Of Electron een loopback van de pc-uitvoer kan innemen: niet nagekeken.
- Of `sherpa-onnx-node` probleemloos in het eigen NSIS-installatieprogramma meegaat en welke vertraging dat geeft: niet geprobeerd.
- De huidige prijs van Porcupine en of zijn Node-SDK en Nederlandse woorden werken: niet kunnen ophalen.
- Of Azure aangepast sleutelwoord Nederlands ondersteunt: de lijst kon ik niet laden.
- Of de persoonlijke stem van Azure nl-BE ondersteunt, of voor Bram goedgekeurd wordt, en de prijs: de lijst en de bedragen kon ik niet laden.
- Of ElevenLabs de gegevens in de EU verwerkt en hoe goed het Vlaams klinkt: niet nagekeken.
- Of een zaakvoerder die emotieherkenning enkel op zichzelf toepast onder artikel 5(1)(f) valt: de richtsnoeren behandelen dat in de samenvattingen niet; ik las enkel samenvattingen, niet de volledige tekst. De status van de richtsnoeren (ontwerp of definitief) tussen bronnen is tegenstrijdig; het huidige tijdschema van de verordening (en een mogelijke uitstelwet) heb ik niet nagekeken.
- Of de stemafdruk van Bram zelf, voor zijn bedrijf, een uitzondering heeft onder GDPR artikel 9, en of de Gegevensbeschermingsautoriteit hier richtlijnen over heeft: niet gevonden; bronnen waren vendor-blogs.
- Niets van dit is getest op Brams pc of met een echte microfoon.

## 8. Vragen voor Bram

1. Wil je Zarvis alleen op jouw stem laten luisteren, en mag Zarvis een uiting van een ander zonder melding negeren (zoals IDEE-23 voorstelt)? En ben je bereid 90 seconden in te spreken en later een testreeks met muziek en een tweede persoon te doen?
2. Mag Zarvis je stemming (haastig, rustig, luid) uit het geluid halen om korter of rustiger te antwoorden, enkel voor jou, zonder iets te bewaren, en uit voor medewerkers? Wil je daarover eerst met een jurist spreken?
3. Wil je een stem die op de jouwe lijkt, enkel voor wat Zarvis tegen jou zegt, en nooit voor bellen of berichten aan derden? Of is een mooie Vlaamse stem zoals nu goed genoeg?
4. Mag Zarvis op je pc altijd meeluisteren naar het woord "Zarvis" (niets verlaat de pc vóór het woord), met een zichtbare uitknop? Of blijft het voorlopig bij de sneltoets?
5. Speel je de muziek meestal af op dezelfde pc als waar Zarvis draait, of via een luidspreker of een tweede toestel? En heb je NVIDIA Broadcast al geïnstalleerd (dat is de snelste proef tegen muziek)?

// Stem van Zarvis: twee smalle interfaces, zodat de invulling verwisselbaar is.
//
// VOORLOPIGE INVULLING: de spraak die in de browser zelf zit (Web Speech API).
// Die kost niets en vraagt geen sleutel, en laat toe om de dialoog nu al te
// beleven. Twee beperkingen die je moet kennen:
//   1. Herkenning werkt in Chrome en Edge, wisselvallig in Safari, niet in
//      Firefox. Waar ze ontbreekt verdwijnt de microfoonknop en blijft typen.
//   2. Chrome stuurt de opname naar Google om ze om te zetten. Dat is NIET de
//      EU-verwerking die voor Zarvis afgesproken is. Deze invulling is dus een
//      proefopstelling; de definitieve spraakdienst komt in de plaats zonder
//      dat het paneel verandert (SPRINTPLAN-ZARVIS, sprint Z3).

export interface StemIn {
  beschikbaar: boolean;
  /** Begint te luisteren. `opTussentijds` krijgt wat er tot nu toe verstaan is. */
  start(h: {
    opTussentijds: (tekst: string) => void;
    opKlaar: (tekst: string) => void;
    opFout: (reden: string) => void;
  }): void;
  /** Stopt met luisteren en levert af wat er is. */
  stop(): void;
  /** Stopt en gooit weg. */
  annuleer(): void;
}

export interface StemUit {
  beschikbaar: boolean;
  /** Zet een zin achteraan in de wachtrij. */
  zeg(zin: string): void;
  /** Roept `klaar` zodra de wachtrij leeg is uitgesproken. */
  opLeeg(klaar: () => void): void;
  /** Zwijgt meteen en maakt de wachtrij leeg. */
  zwijg(): void;
}

const TAAL = 'nl-BE';

// De Web Speech API zit nog niet in de standaardtypes van TypeScript; dit is
// het stukje dat hier gebruikt wordt.
type HerkenningsResultaat = { isFinal: boolean; 0: { transcript: string } };
type HerkenningsGebeurtenis = { resultIndex: number; results: ArrayLike<HerkenningsResultaat> };
interface Herkenner {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: HerkenningsGebeurtenis) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type HerkennerKlasse = new () => Herkenner;

const FOUTEN: Record<string, string> = {
  'not-allowed': 'De microfoon is geblokkeerd. Geef toestemming in de adresbalk van je browser.',
  'service-not-allowed': 'De microfoon is geblokkeerd. Geef toestemming in de adresbalk van je browser.',
  'audio-capture': 'Ik vind geen microfoon op dit toestel.',
  'network': 'Geen verbinding met de spraakherkenning. Typ je vraag of probeer opnieuw.',
  'no-speech': 'Ik hoorde niets. Druk opnieuw op de microfoon en spreek.',
};

export function maakBrowserStemIn(): StemIn {
  const w = typeof window === 'undefined'
    ? undefined
    : (window as unknown as { SpeechRecognition?: HerkennerKlasse; webkitSpeechRecognition?: HerkennerKlasse });
  const Herkenning = w?.SpeechRecognition ?? w?.webkitSpeechRecognition;
  if (!Herkenning) {
    return { beschikbaar: false, start() {}, stop() {}, annuleer() {} };
  }

  let actief: Herkenner | null = null;
  let weggooien = false;

  return {
    beschikbaar: true,
    start({ opTussentijds, opKlaar, opFout }) {
      actief?.abort();
      weggooien = false;
      const r = new Herkenning();
      actief = r;
      r.lang = TAAL;
      r.interimResults = true;
      r.continuous = false;
      let definitief = '';
      let gemeld = false;

      r.onresult = (e) => {
        let tussen = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const stuk = e.results[i][0].transcript;
          if (e.results[i].isFinal) definitief += stuk;
          else tussen += stuk;
        }
        opTussentijds((definitief + tussen).trim());
      };
      r.onerror = (e) => {
        if (e.error === 'aborted' || weggooien) return;
        gemeld = true;
        opFout(FOUTEN[e.error] ?? 'De spraakherkenning haperde. Probeer opnieuw.');
      };
      r.onend = () => {
        if (actief === r) actief = null;
        if (weggooien || gemeld) return;
        opKlaar(definitief.trim());
      };
      try {
        r.start();
      } catch {
        opFout('De microfoon kon niet starten. Probeer opnieuw.');
      }
    },
    stop() { actief?.stop(); },
    annuleer() { weggooien = true; actief?.abort(); actief = null; },
  };
}

export function maakBrowserStemUit(): StemUit {
  const synth = typeof window === 'undefined' ? undefined : window.speechSynthesis;
  if (!synth) {
    return { beschikbaar: false, zeg() {}, opLeeg(k) { k(); }, zwijg() {} };
  }

  let bezig = 0;
  let wachters: Array<() => void> = [];
  // Na zwijg() komen er nog onend/onerror binnen van wat afgebroken werd; die
  // mogen een nieuwe beurt niet als "uitgesproken" melden.
  let beurt = 0;

  const kiesStem = () => {
    const stemmen = synth.getVoices();
    return (
      stemmen.find((s) => s.lang === TAAL) ??
      stemmen.find((s) => s.lang?.toLowerCase().startsWith('nl')) ??
      null
    );
  };
  // Chrome laadt de stemmenlijst pas na een eerste vraag.
  synth.getVoices();

  const meldLeeg = () => {
    if (bezig > 0) return;
    const w = wachters;
    wachters = [];
    w.forEach((k) => k());
  };

  return {
    beschikbaar: true,
    zeg(zin) {
      if (!zin) return;
      const u = new SpeechSynthesisUtterance(zin);
      const stem = kiesStem();
      if (stem) u.voice = stem;
      u.lang = stem?.lang ?? TAAL;
      u.rate = 1.05;
      const mijnBeurt = beurt;
      bezig++;
      const af = () => {
        if (mijnBeurt !== beurt) return;
        bezig = Math.max(0, bezig - 1);
        meldLeeg();
      };
      u.onend = af;
      u.onerror = af;
      synth.speak(u);
    },
    opLeeg(klaar) {
      wachters.push(klaar);
      meldLeeg();
    },
    zwijg() {
      beurt++;
      bezig = 0;
      wachters = [];
      synth.cancel();
    },
  };
}

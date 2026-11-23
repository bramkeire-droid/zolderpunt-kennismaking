// De Vlaamse stem van Zarvis via Azure Speech (West-Europa), als invulling van
// dezelfde twee interfaces als de browserstem. Zolang de server geen
// Azure-sleutel heeft, geeft `maakAzureStem` null en blijft de browserstem.
//
// Herkennen gebeurt rechtstreeks tussen browser en Azure, met een kortlevend
// toegangsbewijs van de server. Voorlezen loopt via de server, zin per zin.

import { supabase } from '@/integrations/supabase/client';
import type { StemIn, StemUit } from './stem';

const STEM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zarvis-stem`;
// Azure geeft een bewijs van tien minuten; ruim daarvoor vernieuwen.
const BEWIJS_GELDIG_MS = 8 * 60 * 1000;

type Bewijs = { token: string; regio: string; taal: string; op: number };

async function roep(body: unknown, signaal?: AbortSignal): Promise<Response> {
  const { data: sessie } = await supabase.auth.getSession();
  const token = sessie.session?.access_token;
  if (!token) throw new Error('Niet ingelogd.');
  return fetch(STEM_URL, {
    method: 'POST',
    signal: signaal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
}

async function haalBewijs(): Promise<Bewijs | null> {
  const res = await roep({ actie: 'bewijs' });
  if (!res.ok) return null;
  const j = await res.json().catch(() => null) as { token?: string; regio?: string; taal?: string } | null;
  if (!j?.token || !j.regio) return null;
  return { token: j.token, regio: j.regio, taal: j.taal ?? 'nl-BE', op: Date.now() };
}

/**
 * Geeft de Azure-stem terug, of null als ze niet beschikbaar is (geen sleutel op
 * de server, niet ingelogd, geen verbinding). Gooit nooit: de browserstem is de
 * terugval.
 */
export async function maakAzureStem(): Promise<{ stemIn: StemIn; stemUit: StemUit } | null> {
  let bewijs: Bewijs | null;
  try {
    bewijs = await haalBewijs();
  } catch {
    return null;
  }
  if (!bewijs) return null;

  const versBewijs = async (): Promise<Bewijs> => {
    if (bewijs && Date.now() - bewijs.op < BEWIJS_GELDIG_MS) return bewijs;
    const nieuw = await haalBewijs();
    if (!nieuw) throw new Error('geen bewijs');
    bewijs = nieuw;
    return nieuw;
  };

  // ── Luisteren ──────────────────────────────────────────────────────────────
  type Herkenner = { close: () => void; stopContinuousRecognitionAsync: (cb?: () => void) => void };
  let actief: Herkenner | null = null;
  let beurt = 0;

  const stemIn: StemIn = {
    beschikbaar: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    start({ opTussentijds, opKlaar, opFout }) {
      const mijnBeurt = ++beurt;
      actief?.close();
      actief = null;
      void (async () => {
        try {
          const [b, sdk] = await Promise.all([
            versBewijs(),
            import('microsoft-cognitiveservices-speech-sdk'),
          ]);
          if (mijnBeurt !== beurt) return;
          const config = sdk.SpeechConfig.fromAuthorizationToken(b.token, b.regio);
          config.speechRecognitionLanguage = b.taal;
          const herkenner = new sdk.SpeechRecognizer(config, sdk.AudioConfig.fromDefaultMicrophoneInput());
          actief = herkenner;
          herkenner.recognizing = (_s, e) => {
            if (mijnBeurt === beurt) opTussentijds(e.result.text);
          };
          // Eén uiting: Azure stopt zelf zodra de spreker zwijgt.
          herkenner.recognizeOnceAsync(
            (resultaat) => {
              herkenner.close();
              if (actief === herkenner) actief = null;
              if (mijnBeurt !== beurt) return;
              if (resultaat.reason === sdk.ResultReason.RecognizedSpeech) {
                opKlaar(resultaat.text.trim());
              } else if (resultaat.reason === sdk.ResultReason.NoMatch) {
                opFout('Ik hoorde niets. Druk opnieuw op de microfoon en spreek.');
              } else {
                opFout(
                  /microphone|permission|NotAllowed/i.test(resultaat.errorDetails ?? '')
                    ? 'De microfoon is geblokkeerd. Geef toestemming in de adresbalk van je browser.'
                    : 'De spraakherkenning haperde. Probeer opnieuw.',
                );
              }
            },
            (fout) => {
              herkenner.close();
              if (actief === herkenner) actief = null;
              if (mijnBeurt !== beurt) return;
              opFout(
                /microphone|permission|NotAllowed/i.test(String(fout))
                  ? 'De microfoon is geblokkeerd. Geef toestemming in de adresbalk van je browser.'
                  : 'De spraakherkenning haperde. Probeer opnieuw.',
              );
            },
          );
        } catch {
          if (mijnBeurt === beurt) opFout('De spraakherkenning kon niet starten. Typ je vraag of probeer opnieuw.');
        }
      })();
    },
    // Azure rondt zelf af bij stilte; "klaar met spreken" hoeft dus niets te doen
    // behalve wachten op dat resultaat.
    stop() {},
    annuleer() {
      beurt++;
      actief?.close();
      actief = null;
    },
  };

  // ── Spreken ────────────────────────────────────────────────────────────────
  // Elke zin wordt meteen opgevraagd, maar in volgorde afgespeeld.
  const speler = typeof Audio === 'undefined' ? null : new Audio();
  let rij: Array<Promise<string | null>> = [];
  let bezig = false;
  let afbreken = new AbortController();
  let wachters: Array<() => void> = [];
  let spreekBeurt = 0;

  const meldLeeg = () => {
    if (bezig || rij.length > 0) return;
    const w = wachters;
    wachters = [];
    w.forEach((k) => k());
  };

  const speelVolgende = async () => {
    if (bezig || !speler) return;
    const mijnBeurt = spreekBeurt;
    const volgende = rij.shift();
    if (!volgende) { meldLeeg(); return; }
    bezig = true;
    const url = await volgende;
    if (mijnBeurt !== spreekBeurt) { if (url) URL.revokeObjectURL(url); return; }
    if (url) {
      await new Promise<void>((klaar) => {
        speler.onended = () => klaar();
        speler.onerror = () => klaar();
        speler.src = url;
        speler.play().catch(() => klaar());
      });
      URL.revokeObjectURL(url);
    }
    if (mijnBeurt !== spreekBeurt) return;
    bezig = false;
    void speelVolgende();
  };

  const stemUit: StemUit = {
    beschikbaar: speler !== null,
    zeg(zin) {
      if (!zin || !speler) return;
      const signaal = afbreken.signal;
      rij.push(
        roep({ actie: 'spreek', tekst: zin.slice(0, 600) }, signaal)
          .then(async (res) => (res.ok ? URL.createObjectURL(await res.blob()) : null))
          .catch(() => null),
      );
      void speelVolgende();
    },
    opLeeg(klaar) {
      wachters.push(klaar);
      meldLeeg();
    },
    zwijg() {
      spreekBeurt++;
      afbreken.abort();
      afbreken = new AbortController();
      rij = [];
      wachters = [];
      bezig = false;
      if (speler) {
        speler.onended = null;
        speler.onerror = null;
        speler.pause();
        speler.removeAttribute('src');
      }
    },
  };

  return { stemIn, stemUit };
}

// Hoe luid er op dit moment gesproken wordt, tussen 0 en 1. Het zwarte gat
// beweegt op de stem van Zarvis, de microfoonknop op die van de gebruiker.
// Beide meters zijn louter beeld: valt er een weg, dan werkt het gesprek gewoon.

type Meter = () => number;

/** Leest het volume uit een analyser, als een rustig getal tussen 0 en 1. */
export function meterVan(analyser: AnalyserNode): Meter {
  const buffer = new Uint8Array(analyser.fftSize);
  return () => {
    analyser.getByteTimeDomainData(buffer);
    let som = 0;
    for (let i = 0; i < buffer.length; i++) { const v = (buffer[i] - 128) / 128; som += v * v; }
    // Gewone spraak zit rond 0,05 tot 0,2; opgerekt zodat ze het bereik vult.
    return Math.min(1, Math.sqrt(som / buffer.length) * 4.5);
  };
}

// ── De stem van Zarvis ───────────────────────────────────────────────────────
let spreekMeter: Meter | null = null;
let spreekAnalyser: AnalyserNode | null = null;
let spectrumBuffer: Uint8Array | null = null;

/** Het echte volume van Zarvis' stem, of null als dat niet te meten valt. */
export const spreekNiveau = (): number | null => (spreekMeter ? spreekMeter() : null);

/** Aantal toonbanden waarin de stem verdeeld wordt, van laag naar hoog. */
export const BANDEN = 8;

/**
 * Vult `doel` met de sterkte van de stem per toonband (0 tot 1), van laag naar
 * hoog over het bereik van spraak. Geeft false als er niets te meten valt.
 */
export function spreekSpectrum(doel: Float32Array): boolean {
  const a = spreekAnalyser;
  if (!a) return false;
  if (!spectrumBuffer || spectrumBuffer.length !== a.frequencyBinCount) spectrumBuffer = new Uint8Array(a.frequencyBinCount);
  a.getByteFrequencyData(spectrumBuffer);
  const hzPerBak = a.context.sampleRate / a.fftSize;
  // Gelijke stappen in toonhoogte tussen 90 en 6000 Hz.
  let onder = 90;
  for (let i = 0; i < BANDEN; i++) {
    const boven = onder * Math.pow(6000 / 90, 1 / BANDEN);
    const van = Math.max(1, Math.floor(onder / hzPerBak));
    const tot = Math.max(van + 1, Math.ceil(boven / hzPerBak));
    let som = 0;
    for (let k = van; k < tot && k < spectrumBuffer.length; k++) som += spectrumBuffer[k];
    doel[i] = Math.min(1, (som / (tot - van) / 255) * 1.6);
    onder = boven;
  }
  return true;
}

let gekoppeld = false;
/**
 * Hangt een meter aan de speler van de stem. Pas als het geluid zeker blijft
 * doorlopen: een speler die aan een slapende audiocontext hangt, zwijgt.
 */
export async function meetSpeler(speler: HTMLMediaElement): Promise<void> {
  if (gekoppeld) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    await ctx.resume().catch(() => {});
    if (ctx.state !== 'running') { void ctx.close(); return; }
    if (gekoppeld) { void ctx.close(); return; }
    gekoppeld = true;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    const bron = ctx.createMediaElementSource(speler);
    bron.connect(analyser);
    analyser.connect(ctx.destination);
    spreekMeter = meterVan(analyser);
    spreekAnalyser = analyser;
  } catch { /* geen meter; de stem zelf speelt gewoon */ }
}

// ── De stem van de gebruiker ─────────────────────────────────────────────────
/**
 * Meet de microfoon zolang er geluisterd wordt. Geeft een meter en een functie
 * om te stoppen; null als de microfoon niet mag of niet bestaat.
 */
export async function meetMicrofoon(): Promise<{ niveau: Meter; stop: () => void } | null> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    const stroom = await navigator.mediaDevices.getUserMedia({ audio: true });
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    await ctx.resume().catch(() => {});
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stroom).connect(analyser);
    return {
      niveau: meterVan(analyser),
      stop: () => { stroom.getTracks().forEach((t) => t.stop()); void ctx.close(); },
    };
  } catch {
    return null;
  }
}

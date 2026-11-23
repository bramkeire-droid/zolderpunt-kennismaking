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

/** Het echte volume van Zarvis' stem, of null als dat niet te meten valt. */
export const spreekNiveau = (): number | null => (spreekMeter ? spreekMeter() : null);

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

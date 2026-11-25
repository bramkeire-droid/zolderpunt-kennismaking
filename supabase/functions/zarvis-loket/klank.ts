// De klankvouwing van de contactbibliotheek (ARCHITECTUUR 3.29, stap 1). vouwKlank, gelijkenis en klankTreffer zijn
// LETTERLIJK die van BREIN (zarvis: supabase/functions/_shared/zarvis/klank.ts, main 4162adc). Een regel erbij of eraf
// gaat aan beide kanten tegelijk. Dit bestand staat identiek in Mail-CRM (compass-loket) en Compass (zarvis-loket).

/** Zuiver: de gevouwen klank van een naam, woorden gescheiden door één spatie. */
export function vouwKlank(naam: string): string {
  let s = naam.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z ]+/g, ' '); // 1
  s = s.replace(/ph/g, 'f').replace(/ch/g, 'k').replace(/ck/g, 'k').replace(/[cq]/g, 'k'); // 2
  s = s.replace(/ij/g, 'ei').replace(/ie/g, 'i').replace(/v/g, 'f').replace(/z/g, 's'); // 3
  return s.split(/\s+/).filter(Boolean).map((w) => {
    w = w.replace(/dt$/, 't').replace(/d$/, 't'); // 4
    w = w.replace(/(.)\1+/g, '$1'); // 5
    return w.length >= 5 && /[^aeiou]e$/.test(w) ? w.slice(0, -1) : w; // 6
  }).join(' ');
}

const drie = (s: string) => {
  const uit = new Set<string>();
  for (const w of s.split(' ').filter(Boolean)) { const p = `  ${w} `; for (let i = 0; i + 3 <= p.length; i++) uit.add(p.slice(i, i + 3)); }
  return uit;
};
/** Zuiver: gelijkenis op drieletterreeksen (zoals pg_trgm), tussen 0 en 1. */
export function gelijkenis(a: string, b: string): number {
  const x = drie(a), y = drie(b);
  let samen = 0;
  for (const t of x) if (y.has(t)) samen++;
  return x.size + y.size - samen ? samen / (x.size + y.size - samen) : 0;
}

/** Zuiver: past de vraag bij de naam? 'sterk', 'zwak' (gelijkenis >= 0,6) of null. */
export function klankTreffer(vraag: string, naam: string): 'sterk' | 'zwak' | null {
  const v = vouwKlank(vraag), n = vouwKlank(naam);
  if (!v || !n) return null;
  const woorden = new Set(n.split(' '));
  if (v.split(' ').every((w) => woorden.has(w)) || v.replace(/ /g, '') === n.replace(/ /g, '')) return 'sterk';
  return gelijkenis(v, n) >= 0.6 ? 'zwak' : null;
}

/** Een telefoonnummer in één vorm (+32 …), of null als het geen nummer is. */
export function telefoonVorm(t: string | null | undefined): string | null {
  let d = String(t ?? '').replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = '+' + d.slice(2);
  else if (d.startsWith('0')) d = '+32' + d.slice(1);
  else if (/^32\d{8,9}$/.test(d)) d = '+' + d;
  const cijfers = d.replace(/\D/g, '');
  return d.startsWith('+') && cijfers.length >= 9 && cijfers.length <= 15 ? '+' + cijfers : null;
}

/** Wat zoekt men: een mailadres, een telefoonnummer of een naam? */
export function zoekSoort(q: string): 'mail' | 'telefoon' | 'naam' {
  if (q.includes('@')) return 'mail';
  if (telefoonVorm(q) && !/[a-z]/i.test(q)) return 'telefoon';
  return 'naam';
}

/** De zekerheid van een naam voor het loket: 1 bij dezelfde klank, 0,9 bij een sterke treffer, bij een zwakke de
 *  gelijkenis (0,6 tot 0,89), anders 0. Steunt alleen op klankTreffer en gelijkenis hierboven. */
export function naamScore(vraag: string, naam: string | null | undefined): number {
  const t = klankTreffer(vraag, naam ?? '');
  if (t === 'sterk') return vouwKlank(vraag) === vouwKlank(naam ?? '') ? 1 : 0.9;
  if (t === 'zwak') return Math.min(0.89, Math.round(gelijkenis(vouwKlank(vraag), vouwKlank(naam ?? '')) * 100) / 100);
  return 0;
}

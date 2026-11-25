// Rekenstukken voor het loket, los van de aanroep zodat ze te testen zijn (reken_test.ts).
// Ze volgen berekenPrijs in src/lib/prijscalculator.ts, maar vertrekken van wat bewaard is
// (calculaties.inbegrepen_posten en calculator_state), niet van de invoer van de calculator.

export type BewaardePost = { post: string; bedrag: number; categorie?: string; min?: number; max?: number };
type Marge = { min?: unknown; max?: unknown } | null | undefined;

/** Standaard bandbreedte van de tarieven (STANDAARD_TARIEVEN.bandbreedte). calculator_tarieven is leeg, dus deze geldt. */
export const BANDBREEDTE = 0.15;

/**
 * Totaal en vork zoals de calculator ze rekent: tariefposten (categorie standaard) krijgen de bandbreedte
 * of de verschoven marge; badkamer, maatwerk en extra brengen hun eigen min en max mee.
 * De bewaarde bedragen zijn afgerond, dus het resultaat kan een paar euro van het bewaarde totaal afwijken.
 */
export function herreken(posten: BewaardePost[], marge: Marge) {
  let standaard = 0, extraMin = 0, extraMax = 0;
  for (const p of posten) {
    const b = Number(p.bedrag) || 0;
    if ((p.categorie ?? 'standaard') === 'standaard') { standaard += b; continue; }
    extraMin += typeof p.min === 'number' ? p.min : b;
    extraMax += typeof p.max === 'number' ? p.max : b;
  }
  const verschoven = !!marge && typeof marge.min === 'number' && typeof marge.max === 'number';
  const fMin = verschoven ? marge!.min as number : 1 - BANDBREEDTE;
  const fMax = verschoven ? marge!.max as number : 1 + BANDBREEDTE;
  const a = standaard * fMin + extraMin, z = standaard * fMax + extraMax;
  return {
    totaal_excl: Math.round(standaard + (extraMin + extraMax) / 2),
    min_excl: Math.round(Math.min(a, z)), max_excl: Math.round(Math.max(a, z)),
    factor_min: fMin, factor_max: fMax, marge_verschoven: verschoven,
  };
}

/**
 * Welk tarief een bewaarde tariefpost gebruikt, op basis van het label dat berekenPrijs zet.
 * sleutel = de postsleutel in calculator_state.overrides (een handmatig bedrag gaat voor op het tarief).
 */
export function tariefVanPost(label: string, state: { dak_bekleed?: boolean } | null | undefined): { tarief: string; sleutel: string } | null {
  if (label === 'Binnenplaatafwerking') return { tarief: state?.dak_bekleed ? 'binnenplaatAfgedekt' : 'binnenplaatafwerking', sleutel: 'bpa' };
  if (label === 'Algemene afwerking') return { tarief: 'algemeenAfwerking', sleutel: 'alg' };
  if (label === 'Plamuur & wandafwerking') return { tarief: 'plamuur', sleutel: 'pla' };
  if (label === 'Dakisolatie spantendak') return { tarief: 'dakisolatieSpantendak', sleutel: 'iso' };
  if (label === 'Dakisolatie gordingendak') return { tarief: 'dakisolatieGordingendak', sleutel: 'iso' };
  if (label.startsWith('Vloer')) return { tarief: 'vloer', sleutel: 'vl' };
  if (label.startsWith('Velux')) return { tarief: 'velux', sleutel: 'vx' };
  if (label === 'Trap') return { tarief: 'trap', sleutel: 'tr' };
  if (label === 'Trapgat (beton)') return { tarief: 'trapgatBeton', sleutel: 'tg' };
  if (label.startsWith('Trapgat')) return { tarief: 'trapgatHout', sleutel: 'tg' };
  if (label.startsWith('Airco')) return { tarief: 'airco', sleutel: 'ac' };
  if (label === 'Schilderwerken') return { tarief: 'schilderwerken', sleutel: 'sw' };
  return null;
}

/** Laatste negen cijfers van een telefoonnummer, of '' (zoals 'nummers' en sync-calendly-event). */
export const tel9 = (t: unknown) => { const c = typeof t === 'string' ? t.replace(/\D/g, '') : ''; return c.length >= 9 ? c.slice(-9) : ''; };

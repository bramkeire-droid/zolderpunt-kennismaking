// Rekenkern van de prijscalculator, los van de UI.
//
// Stond eerst inline in src/slides/Slide5B.tsx. Nu gedeeld, zodat de
// calculator in het intakegesprek en de losse calculator op de dossierpagina
// gegarandeerd hetzelfde rekenen.
//
// TWEE SOORTEN POSTEN
// - Tariefposten (binnenplaat, isolatie, trap, ...): één bedrag uit een
//   tarief × oppervlakte. De onzekerheid zit in de ±15% bandbreedte.
// - Elementen met eigen min/max (badkamer-onderdelen, maatwerk, vrije
//   elementen): daar kennen we de marge zelf, dus die min/max telt exact mee
//   en de ±15% wordt er NIET nog eens overheen gelegd.
//
// Zonder die nieuwe elementen komt er exact hetzelfde uit als voorheen
// (bandmin = excl × 0.85), zodat bestaande dossiers niet van bedrag wijzigen.

export const INDEX = 1.05;

export const RATES = {
  binnenplaatafwerking: 230 * INDEX,
  binnenplaatAfgedekt: 115 * INDEX,
  dakisolatieSpantendak: 85 * INDEX,
  dakisolatieGordingendak: 100 * INDEX,
  vloer: 70 * INDEX,
  velux: 2250 * INDEX,
  trap: 6000 * INDEX,
  trapgatHout: 1750 * INDEX,
  trapgatBeton: 5500 * INDEX,
  algemeenAfwerking: 230 * INDEX,
  airco: { 1: 4000 * INDEX, 2: 6000 * INDEX, 3: 7500 * INDEX, 4: 10000 * INDEX, 5: 11000 * INDEX } as Record<number, number>,
  plamuur: (netto: number) => {
    if (netto < 40) return Math.round(3250 * INDEX);
    if (netto < 65) return Math.round(4500 * INDEX);
    if (netto < 85) return Math.round(5750 * INDEX);
    return Math.round(8000 * INDEX);
  },
  schilderwerken: (netto: number) => (netto < 40 ? 2500 : 4000),
  bandbreedte: 0.15,
};

export const BAND_MIN = 1 - RATES.bandbreedte; // 0.85
export const BAND_MAX = 1 + RATES.bandbreedte; // 1.15

export type DakisolatieType = 'geen' | 'spantendak' | 'gordingendak';
export type PostCategorie = 'standaard' | 'badkamer' | 'maatwerk' | 'extra';

/** Categorieën die in het klantrapport mét deelbedrag getoond worden. */
export const CATEGORIE_MET_BEDRAG: PostCategorie[] = ['badkamer', 'maatwerk', 'extra'];

export interface BadkamerOnderdeel {
  key: string;
  label: string;
  actief: boolean;
  min: number | null;
  max: number | null;
}

export interface ExtraElement {
  id: string;
  titel: string;
  omschrijving: string;
  min: number | null;
  max: number | null;
}

export interface CalcState {
  dak_bekleed?: boolean;
  dakisolatie_type?: DakisolatieType;
  vloer?: boolean;
  velux?: number;
  trap?: boolean;
  trapgat?: 'hout' | 'beton' | 'geen';
  airco?: number;
  schilderwerken?: boolean;
  netto_m2?: number | null;
  netto_manually_set?: boolean;
  // Nieuw. Ontbreken bij oudere dossiers — vandaar overal optioneel.
  badkamer?: { actief: boolean; onderdelen: BadkamerOnderdeel[] };
  maatwerk?: { actief: boolean; min: number | null; max: number | null };
  extras?: ExtraElement[];
}

export interface PostItem {
  key: string;
  label: string;
  categorie: PostCategorie;
  /** Meest waarschijnlijke bedrag. Voor min/max-elementen het midden. */
  amount: number;
  min?: number;
  max?: number;
  omschrijving?: string;
}

export interface CalcResult {
  items: PostItem[];
  /** Som van de tariefposten, vóór bandbreedte. */
  standaardExcl: number;
  /** Meest waarschijnlijk totaal excl. btw. */
  excl: number;
  exclMin: number;
  exclMax: number;
  incl6: number;
  incl21: number;
  /** Band incl. 6% btw — historische betekenis van budget_min/budget_max. */
  min: number;
  max: number;
}

export const BADKAMER_ONDERDELEN: { key: string; label: string }[] = [
  { key: 'tegelwerken', label: 'Tegelwerken' },
  { key: 'douche', label: 'Douche' },
  { key: 'bad', label: 'Bad' },
  { key: 'boiler', label: 'Boiler' },
  { key: 'ventilatie', label: 'Ventilatie' },
  { key: 'wastafel', label: 'Wastafel en wastafelmeubel' },
];

/**
 * Standaardbedragen die een nieuw element meekrijgt. Hier vul je ze in — de
 * calculator neemt ze over als beginwaarde, per dossier nog aanpasbaar.
 *
 * Alleen van toepassing op een element dat nog nooit op dit dossier stond. Een
 * bedrag dat bewust leeggemaakt is blijft leeg; anders zou het standaardbedrag
 * telkens terugkomen.
 */
export const STANDAARD_BEDRAGEN: Record<string, { min: number | null; max: number | null }> = {
  // bv. douche: { min: 2000, max: 3500 },
  tegelwerken: { min: null, max: null },
  douche: { min: null, max: null },
  bad: { min: null, max: null },
  boiler: { min: null, max: null },
  ventilatie: { min: null, max: null },
  wastafel: { min: null, max: null },
  maatwerk: { min: null, max: null },
};

const standaardVoor = (key: string) => STANDAARD_BEDRAGEN[key] ?? { min: null, max: null };

export function legeBadkamer(): { actief: boolean; onderdelen: BadkamerOnderdeel[] } {
  return {
    actief: false,
    onderdelen: BADKAMER_ONDERDELEN.map((o) => ({ ...o, actief: false, ...standaardVoor(o.key) })),
  };
}

/**
 * Vult ontbrekende nieuwe velden aan zonder bestaande waarden te wijzigen.
 * Zo opent een dossier van vóór deze uitbreiding gewoon met lege secties, en
 * blijft het opnieuw opslaan idempotent.
 */
export function normaliseerCalcState(cs: CalcState | null | undefined): CalcState {
  const basis = cs ?? {};
  const bestaand = basis.badkamer;
  const onderdelen = BADKAMER_ONDERDELEN.map((o) => {
    const gevonden = bestaand?.onderdelen?.find((x) => x.key === o.key);
    // Nog nooit opgeslagen → standaardbedrag. Wél opgeslagen → die waarde
    // respecteren, ook als ze leeggemaakt is.
    if (!gevonden) return { key: o.key, label: o.label, actief: false, ...standaardVoor(o.key) };
    return {
      key: o.key,
      label: o.label,
      actief: gevonden.actief ?? false,
      min: gevonden.min ?? null,
      max: gevonden.max ?? null,
    };
  });
  return {
    ...basis,
    badkamer: { actief: bestaand?.actief ?? false, onderdelen },
    maatwerk: basis.maatwerk ?? { actief: false, ...standaardVoor('maatwerk') },
    extras: Array.isArray(basis.extras) ? basis.extras : [],
  };
}

const getal = (v: number | null | undefined): number => (typeof v === 'number' && isFinite(v) ? v : 0);

/**
 * Een element telt mee zodra er een bedrag ingevuld is. Een aangevinkt maar
 * nog leeg element (Bram vult de standaardbedragen later in) verandert het
 * totaal dus niet, maar blijft wel zichtbaar in de lijst.
 */
function minMaxVan(el: { min: number | null; max: number | null }): { min: number; max: number } {
  const min = getal(el.min);
  // Alleen een min ingevuld: dan is dat ook de bovengrens, niet 0.
  const max = el.max == null ? min : getal(el.max);
  return { min, max: Math.max(min, max) };
}

export function berekenPrijs(stateIn: CalcState | null | undefined, brutoNum: number): CalcResult | null {
  if (!(brutoNum > 0)) return null;
  const state = normaliseerCalcState(stateIn);
  const nettoNum = getal(state.netto_m2) || brutoNum;

  const items: PostItem[] = [];
  const std = (key: string, label: string, amount: number) =>
    items.push({ key, label, categorie: 'standaard', amount });

  const bpa = state.dak_bekleed ? RATES.binnenplaatAfgedekt : RATES.binnenplaatafwerking;
  std('bpa', 'Binnenplaatafwerking', brutoNum * bpa);
  std('alg', 'Algemene afwerking', nettoNum * RATES.algemeenAfwerking);
  std('pla', 'Plamuur & wandafwerking', RATES.plamuur(nettoNum));
  if (state.dakisolatie_type === 'spantendak') std('iso', 'Dakisolatie spantendak', brutoNum * RATES.dakisolatieSpantendak);
  if (state.dakisolatie_type === 'gordingendak') std('iso', 'Dakisolatie gordingendak', brutoNum * RATES.dakisolatieGordingendak);
  if (state.vloer) std('vl', 'Vloer (chape/uitpassen)', nettoNum * RATES.vloer);
  const velux = getal(state.velux);
  if (velux > 0) std('vx', `Velux dakramen (${velux}×)`, velux * RATES.velux);
  if (state.trap) {
    std('tr', 'Trap', RATES.trap);
    if (state.trapgat && state.trapgat !== 'geen') {
      std('tg', `Trapgat (${state.trapgat})`, state.trapgat === 'beton' ? RATES.trapgatBeton : RATES.trapgatHout);
    }
  }
  const airco = getal(state.airco);
  if (airco > 0) std('ac', `Airco (${airco} toestel${airco > 1 ? 'len' : ''})`, RATES.airco[Math.min(airco, 5)]);
  if (state.schilderwerken) std('sw', 'Schilderwerken', RATES.schilderwerken(nettoNum));

  const standaardExcl = items.reduce((s, i) => s + i.amount, 0);

  // ── Elementen met een eigen min/max ────────────────────────────────
  let extraMin = 0;
  let extraMax = 0;
  const voegToe = (key: string, label: string, categorie: PostCategorie, el: { min: number | null; max: number | null }, omschrijving?: string) => {
    const { min, max } = minMaxVan(el);
    extraMin += min;
    extraMax += max;
    items.push({ key, label, categorie, amount: (min + max) / 2, min, max, omschrijving });
  };

  if (state.badkamer?.actief) {
    for (const o of state.badkamer.onderdelen) {
      if (o.actief) voegToe(`bk-${o.key}`, o.label, 'badkamer', o);
    }
  }
  if (state.maatwerk?.actief) {
    voegToe('mw', 'Maatwerk', 'maatwerk', state.maatwerk);
  }
  for (const e of state.extras ?? []) {
    const titel = (e.titel || '').trim();
    if (!titel) continue; // een half aangemaakte regel mag de prijs niet beïnvloeden
    voegToe(`ex-${e.id}`, titel, 'extra', e, (e.omschrijving || '').trim() || undefined);
  }

  const excl = standaardExcl + (extraMin + extraMax) / 2;
  const exclMin = standaardExcl * BAND_MIN + extraMin;
  const exclMax = standaardExcl * BAND_MAX + extraMax;

  return {
    items,
    standaardExcl,
    excl,
    exclMin,
    exclMax,
    incl6: excl * 1.06,
    incl21: excl * 1.21,
    min: exclMin * 1.06,
    max: exclMax * 1.06,
  };
}

/** Vorm waarin de posten in leads.inbegrepen_posten bewaard worden. */
export interface OpgeslagenPost {
  post: string;
  bedrag: number;
  categorie?: PostCategorie;
  min?: number;
  max?: number;
  omschrijving?: string;
}

export function naarOpgeslagenPosten(items: PostItem[]): OpgeslagenPost[] {
  return items.map((i) => ({
    post: i.label,
    bedrag: Math.round(i.amount),
    categorie: i.categorie,
    ...(i.min != null ? { min: Math.round(i.min) } : {}),
    ...(i.max != null ? { max: Math.round(i.max) } : {}),
    ...(i.omschrijving ? { omschrijving: i.omschrijving } : {}),
  }));
}

/**
 * Posten uit de database, met de vorm van vóór deze uitbreiding erbij.
 * Rijen zonder `categorie` zijn tariefposten uit de oude calculator en
 * krijgen daarom 'standaard' — die horen zonder bedrag in het rapport.
 */
export interface GelezenPost extends OpgeslagenPost {
  categorie: PostCategorie;
}

export function leesPosten(raw: unknown): GelezenPost[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
    .map((p) => ({
      post: typeof p.post === 'string' ? p.post : '',
      bedrag: typeof p.bedrag === 'number' ? p.bedrag : 0,
      categorie: (['standaard', 'badkamer', 'maatwerk', 'extra'] as const).includes(p.categorie as PostCategorie)
        ? (p.categorie as PostCategorie)
        : 'standaard',
      ...(typeof p.min === 'number' ? { min: p.min } : {}),
      ...(typeof p.max === 'number' ? { max: p.max } : {}),
      ...(typeof p.omschrijving === 'string' ? { omschrijving: p.omschrijving } : {}),
    }))
    .filter((p) => p.post);
}

export const fmtEuro = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

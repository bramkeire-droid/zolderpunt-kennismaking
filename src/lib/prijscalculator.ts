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

/**
 * Eén trede van een staffel: geldt zolang de netto-oppervlakte kleiner is dan
 * `tot`. De laatste trede heeft `tot: null` en vangt de rest op.
 */
export interface Staffel {
  tot: number | null;
  bedrag: number;
}

export interface StaffelGroep {
  /** Of de indexatie op deze bedragen wordt toegepast. */
  geindexeerd: boolean;
  treden: Staffel[];
}

/**
 * Alle instelbare prijzen. Bewerkbaar in de beheerdersconsole; wat daar niet
 * (of nog niet) is ingevuld valt terug op STANDAARD_TARIEVEN hieronder, zodat
 * de calculator ook zonder database-rij blijft rekenen zoals voorheen.
 *
 * De basisbedragen staan hier ONGEÏNDEXEERD: het effectieve tarief is
 * `basisbedrag × index`. Zo blijft een jaarlijkse indexatie één veld.
 */
export interface Tarieven {
  index: number;
  bandbreedte: number;
  /** Tarieven per m². */
  perM2: {
    binnenplaatafwerking: number;
    binnenplaatAfgedekt: number;
    dakisolatieSpantendak: number;
    dakisolatieGordingendak: number;
    vloer: number;
    algemeenAfwerking: number;
  };
  /** Vaste bedragen per stuk. */
  vast: {
    velux: number;
    trap: number;
    trapgatHout: number;
    trapgatBeton: number;
  };
  /** Bedrag per aantal toestellen (1 t/m 5). */
  airco: Record<number, number>;
  plamuur: StaffelGroep;
  schilderwerken: StaffelGroep;
  /** Beginwaarden voor badkamer-onderdelen, maatwerk en vrije elementen. */
  standaardBedragen: Record<string, { min: number | null; max: number | null }>;
}

export const STANDAARD_TARIEVEN: Tarieven = {
  index: INDEX,
  bandbreedte: 0.15,
  perM2: {
    binnenplaatafwerking: 230,
    binnenplaatAfgedekt: 115,
    dakisolatieSpantendak: 85,
    dakisolatieGordingendak: 100,
    vloer: 70,
    algemeenAfwerking: 230,
  },
  vast: {
    velux: 2250,
    trap: 6000,
    trapgatHout: 1750,
    trapgatBeton: 5500,
  },
  airco: { 1: 4000, 2: 6000, 3: 7500, 4: 10000, 5: 11000 },
  plamuur: {
    geindexeerd: true,
    treden: [
      { tot: 40, bedrag: 3250 },
      { tot: 65, bedrag: 4500 },
      { tot: 85, bedrag: 5750 },
      { tot: null, bedrag: 8000 },
    ],
  },
  // Let op: schilderwerken werd historisch NIET geïndexeerd, in tegenstelling
  // tot alle andere posten. Bewust zo gelaten om bestaande prijzen niet stil
  // met 5% te verhogen — in de beheerdersconsole om te zetten.
  schilderwerken: {
    geindexeerd: false,
    treden: [
      { tot: 40, bedrag: 2500 },
      { tot: null, bedrag: 4000 },
    ],
  },
  standaardBedragen: {
    tegelwerken: { min: null, max: null },
    douche: { min: null, max: null },
    bad: { min: null, max: null },
    boiler: { min: null, max: null },
    ventilatie: { min: null, max: null },
    wastafel: { min: null, max: null },
    technieken: { min: null, max: null },
    maatwerk: { min: null, max: null },
  },
};

/** Zoekt de trede die bij deze oppervlakte hoort en past de indexatie toe. */
export function staffelBedrag(groep: StaffelGroep, netto: number, index: number): number {
  const trede = groep.treden.find((t) => t.tot === null || netto < t.tot)
    ?? groep.treden[groep.treden.length - 1];
  if (!trede) return 0;
  return Math.round(trede.bedrag * (groep.geindexeerd ? index : 1));
}

/**
 * De tarieven zoals ze effectief gerekend worden: basisbedrag × index, met de
 * staffels als functie. Handig voor de UI, die per optie het bedrag toont —
 * zo staat de indexatie op één plek en niet verspreid over de schermen.
 */
export function effectieveTarieven(t: Tarieven) {
  const ix = (n: number) => n * t.index;
  return {
    binnenplaatafwerking: ix(t.perM2.binnenplaatafwerking),
    binnenplaatAfgedekt: ix(t.perM2.binnenplaatAfgedekt),
    dakisolatieSpantendak: ix(t.perM2.dakisolatieSpantendak),
    dakisolatieGordingendak: ix(t.perM2.dakisolatieGordingendak),
    vloer: ix(t.perM2.vloer),
    algemeenAfwerking: ix(t.perM2.algemeenAfwerking),
    velux: ix(t.vast.velux),
    trap: ix(t.vast.trap),
    trapgatHout: ix(t.vast.trapgatHout),
    trapgatBeton: ix(t.vast.trapgatBeton),
    airco: Object.fromEntries(
      Object.entries(t.airco).map(([k, v]) => [k, ix(v)]),
    ) as Record<number, number>,
    plamuur: (netto: number) => staffelBedrag(t.plamuur, netto, t.index),
    schilderwerken: (netto: number) => staffelBedrag(t.schilderwerken, netto, t.index),
  };
}

export const bandMin = (t: Tarieven) => 1 - t.bandbreedte;
export const bandMax = (t: Tarieven) => 1 + t.bandbreedte;

export const BAND_MIN = bandMin(STANDAARD_TARIEVEN); // 0.85
export const BAND_MAX = bandMax(STANDAARD_TARIEVEN); // 1.15

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

/**
 * Handmatig gezet bedrag voor één tariefpost, voor dít dossier.
 *
 * De factoren worden vermenigvuldigd: één factor is gewoon een bedrag,
 * meerdere factoren vormen een rekensom (bv. 12 x 3 x 45). Wat er in het
 * rapport en op de klantslide terechtkomt is enkel de uitkomst — de som zelf
 * blijft intern.
 */
export type OverrideRegel = [number | null, number | null, number | null];

export interface PostOverride {
  /** Elke regel is A × B × C; de regels worden bij elkaar opgeteld. */
  regels: OverrideRegel[];
}

/** Een verse regel: derde veld op 1, zodat A × B meteen klopt. */
export const nieuweRegel = (): OverrideRegel => [null, null, 1];

/**
 * Subtotaal van één regel. Zolang A en B allebei leeg zijn telt de regel niet
 * mee — anders zou een net toegevoegde regel er meteen € 1 bij optellen.
 */
export function regelBedrag(r: OverrideRegel): number {
  const [a, b] = r;
  if (a == null && b == null) return 0;
  return r
    .filter((x): x is number => typeof x === 'number' && isFinite(x))
    .reduce((x, y) => x * y, 1);
}

/** De uitkomst van een override, of null als er niets bruikbaars staat. */
export function overrideBedrag(o: PostOverride | undefined | null): number | null {
  const regels = o?.regels ?? [];
  const meetellend = regels.filter((r) => regelBedrag(r) !== 0 || r.some((x) => x === 0));
  if (meetellend.length === 0) return null;
  return meetellend.reduce((som, r) => som + regelBedrag(r), 0);
}

/** Eén argument waarom de marge verschoven is, per gedetecteerd kader. */
export interface MargeArgument {
  kader: string;
  tekst: string;
}

/**
 * Verschoven marge voor dít dossier. `min` en `max` zijn factoren op het
 * tariefdeel (0.85 = 15% onder de raming), en vervangen de standaard
 * bandbreedte. Elementen met een eigen minimum en maximum blijven ongemoeid:
 * daar is de marge al bekend en zou een tweede marge dubbeltellen.
 */
export interface MargeVerschuiving {
  min: number;
  max: number;
  argumenten: MargeArgument[];
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
  /** Handmatig gezette bedragen per postsleutel, alleen voor dit dossier. */
  overrides?: Record<string, PostOverride>;
  /** Handmatig verschoven marge op het tariefdeel, met onderbouwing. */
  marge?: MargeVerschuiving;
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
  /** Bedrag is handmatig gezet voor dit dossier i.p.v. uit het tarief. */
  handmatig?: boolean;
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
  /** Factoren die op het tariefdeel zijn toegepast. */
  factorMin: number;
  factorMax: number;
  /** True zodra de marge handmatig verschoven is voor dit dossier. */
  margeVerschoven: boolean;
}

export const BADKAMER_ONDERDELEN: { key: string; label: string }[] = [
  { key: 'tegelwerken', label: 'Tegelwerken' },
  { key: 'douche', label: 'Douche' },
  { key: 'bad', label: 'Bad' },
  { key: 'boiler', label: 'Boiler' },
  { key: 'ventilatie', label: 'Ventilatie' },
  { key: 'wastafel', label: 'Wastafel en wastafelmeubel' },
  { key: 'technieken', label: 'Technieken — druknet en afvoeren' },
];

/**
 * Standaardbedragen die een nieuw element meekrijgt. Staan in de tarieven en
 * zijn dus instelbaar in de beheerdersconsole; de calculator neemt ze over als
 * beginwaarde, per dossier nog aanpasbaar.
 *
 * Alleen van toepassing op een element dat nog nooit op dit dossier stond. Een
 * bedrag dat bewust leeggemaakt is blijft leeg; anders zou het standaardbedrag
 * telkens terugkomen.
 */
export const STANDAARD_BEDRAGEN = STANDAARD_TARIEVEN.standaardBedragen;

const standaardVoor = (key: string, t: Tarieven = STANDAARD_TARIEVEN) =>
  t.standaardBedragen?.[key] ?? { min: null, max: null };

export function legeBadkamer(t: Tarieven = STANDAARD_TARIEVEN): { actief: boolean; onderdelen: BadkamerOnderdeel[] } {
  return {
    actief: false,
    onderdelen: BADKAMER_ONDERDELEN.map((o) => ({ ...o, actief: false, ...standaardVoor(o.key, t) })),
  };
}

/**
 * Vult ontbrekende nieuwe velden aan zonder bestaande waarden te wijzigen.
 * Zo opent een dossier van vóór deze uitbreiding gewoon met lege secties, en
 * blijft het opnieuw opslaan idempotent.
 */
export function normaliseerCalcState(cs: CalcState | null | undefined, t: Tarieven = STANDAARD_TARIEVEN): CalcState {
  const basis = cs ?? {};
  const bestaand = basis.badkamer;
  const onderdelen = BADKAMER_ONDERDELEN.map((o) => {
    const gevonden = bestaand?.onderdelen?.find((x) => x.key === o.key);
    // Nog nooit opgeslagen → standaardbedrag. Wél opgeslagen → die waarde
    // respecteren, ook als ze leeggemaakt is.
    if (!gevonden) return { key: o.key, label: o.label, actief: false, ...standaardVoor(o.key, t) };
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
    maatwerk: basis.maatwerk ?? { actief: false, ...standaardVoor('maatwerk', t) },
    extras: Array.isArray(basis.extras) ? basis.extras : [],
    overrides: basis.overrides ?? {},
    marge: basis.marge,
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

export function berekenPrijs(
  stateIn: CalcState | null | undefined,
  brutoNum: number,
  tarieven: Tarieven = STANDAARD_TARIEVEN,
): CalcResult | null {
  if (!(brutoNum > 0)) return null;
  const t = tarieven;
  const state = normaliseerCalcState(stateIn, t);
  const nettoNum = getal(state.netto_m2) || brutoNum;

  // Basisbedragen staan ongeïndexeerd in de tarieven; hier wordt de index
  // toegepast, precies zoals de vorige hardgecodeerde tabel deed.
  const ix = (basis: number) => basis * t.index;

  const items: PostItem[] = [];
  const std = (key: string, label: string, amount: number) => {
    // Een handmatig bedrag voor dit dossier gaat voor op het tarief.
    const eigen = overrideBedrag(state.overrides?.[key]);
    items.push({
      key, label, categorie: 'standaard',
      amount: eigen ?? amount,
      ...(eigen != null ? { handmatig: true } : {}),
    });
  };

  const bpa = state.dak_bekleed ? ix(t.perM2.binnenplaatAfgedekt) : ix(t.perM2.binnenplaatafwerking);
  std('bpa', 'Binnenplaatafwerking', brutoNum * bpa);
  std('alg', 'Algemene afwerking', nettoNum * ix(t.perM2.algemeenAfwerking));
  std('pla', 'Plamuur & wandafwerking', staffelBedrag(t.plamuur, nettoNum, t.index));
  if (state.dakisolatie_type === 'spantendak') std('iso', 'Dakisolatie spantendak', brutoNum * ix(t.perM2.dakisolatieSpantendak));
  if (state.dakisolatie_type === 'gordingendak') std('iso', 'Dakisolatie gordingendak', brutoNum * ix(t.perM2.dakisolatieGordingendak));
  if (state.vloer) std('vl', 'Vloer (chape/uitpassen)', nettoNum * ix(t.perM2.vloer));
  const velux = getal(state.velux);
  if (velux > 0) std('vx', `Velux dakramen (${velux}×)`, velux * ix(t.vast.velux));
  if (state.trap) {
    std('tr', 'Trap', ix(t.vast.trap));
    if (state.trapgat && state.trapgat !== 'geen') {
      std('tg', `Trapgat (${state.trapgat})`, ix(state.trapgat === 'beton' ? t.vast.trapgatBeton : t.vast.trapgatHout));
    }
  }
  const airco = getal(state.airco);
  if (airco > 0) std('ac', `Airco (${airco} toestel${airco > 1 ? 'len' : ''})`, ix(t.airco[Math.min(airco, 5)] ?? 0));
  if (state.schilderwerken) std('sw', 'Schilderwerken', staffelBedrag(t.schilderwerken, nettoNum, t.index));

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
  // Een handmatig verschoven marge vervangt de standaard bandbreedte, maar
  // enkel op het tariefdeel: extraMin/extraMax komen uit elementen die hun
  // eigen minimum en maximum al meebrengen.
  const factorMin = state.marge ? state.marge.min : bandMin(t);
  const factorMax = state.marge ? state.marge.max : bandMax(t);
  const exclMin = standaardExcl * factorMin + extraMin;
  const exclMax = standaardExcl * factorMax + extraMax;

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
    factorMin,
    factorMax,
    margeVerschoven: !!state.marge,
  };
}

/**
 * De prijsvork EXCL btw van een dossier, met terugvallen voor oudere dossiers:
 * eerst de expliciete excl-kolommen, dan budget_excl × band, en als laatste de
 * historische incl-6%-kolommen teruggerekend. Eén plek voor deze keten, zodat
 * badge, offertedialoog en pipelinewaarde nooit excl met incl vergelijken.
 */
export function exclVorkVanLead(l: {
  budget_min_excl?: number | null; budget_max_excl?: number | null;
  budget_excl?: number | null; budget_min?: number | null; budget_max?: number | null;
}): { min: number; max: number } | null {
  const n = (v: number | null | undefined) => (typeof v === 'number' && isFinite(v) && v > 0 ? v : null);
  const min = n(l.budget_min_excl)
    ?? (n(l.budget_excl) != null ? n(l.budget_excl)! * BAND_MIN : null)
    ?? (n(l.budget_min) != null ? n(l.budget_min)! / 1.06 : null);
  const max = n(l.budget_max_excl)
    ?? (n(l.budget_excl) != null ? n(l.budget_excl)! * BAND_MAX : null)
    ?? (n(l.budget_max) != null ? n(l.budget_max)! / 1.06 : null);
  if (min == null || max == null) return null;
  return { min: Math.round(min), max: Math.round(max) };
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

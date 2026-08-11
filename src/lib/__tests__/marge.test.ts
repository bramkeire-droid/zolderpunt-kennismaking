import { describe, expect, it } from 'vitest';
import {
  berekenPrijs,
  legeBadkamer,
  naarOpgeslagenPosten,
  normaliseerCalcState,
  type CalcState,
} from '@/lib/prijscalculator';

const basis: CalcState = {
  dak_bekleed: false, dakisolatie_type: 'spantendak', vloer: true, velux: 2,
  trap: true, trapgat: 'hout', airco: 1, schilderwerken: true,
  netto_m2: 50, netto_manually_set: true,
};

/** Basis plus een badkamerelement dat zijn eigen min/max meebrengt. */
function metEigenBereik(): CalcState {
  const badkamer = legeBadkamer();
  badkamer.actief = true;
  badkamer.onderdelen = badkamer.onderdelen.map((o) =>
    o.key === 'douche' ? { ...o, actief: true, min: 2000, max: 3000 } : o,
  );
  return { ...basis, badkamer };
}

describe('marge verschuiven', () => {
  it('laat het meest waarschijnlijke bedrag ongemoeid', () => {
    const zonder = berekenPrijs(basis, 60)!;
    const met = berekenPrijs({ ...basis, marge: { min: 0.7, max: 1.3, argumenten: [] } }, 60)!;
    expect(Math.round(met.excl)).toBe(Math.round(zonder.excl));
    expect(Math.round(met.incl6)).toBe(Math.round(zonder.incl6));
  });

  it('verschuift alleen de vork', () => {
    const r = berekenPrijs({ ...basis, marge: { min: 0.7, max: 1.3, argumenten: [] } }, 60)!;
    expect(Math.round(r.exclMin)).toBe(Math.round(r.standaardExcl * 0.7));
    expect(Math.round(r.exclMax)).toBe(Math.round(r.standaardExcl * 1.3));
    expect(r.margeVerschoven).toBe(true);
  });

  it('zonder verschuiving blijft de standaard bandbreedte gelden', () => {
    const r = berekenPrijs(basis, 60)!;
    expect(r.factorMin).toBe(0.85);
    expect(r.factorMax).toBe(1.15);
    expect(r.margeVerschoven).toBe(false);
  });

  it('raakt NIET de elementen die al een eigen min en max hebben', () => {
    const state = metEigenBereik();
    const zonder = berekenPrijs(state, 60)!;
    const met = berekenPrijs({ ...state, marge: { min: 0.7, max: 1.3, argumenten: [] } }, 60)!;

    // Het douche-element blijft exact 2000–3000, ongeacht de marge.
    const douche = (r: typeof zonder) => r.items.find((i) => i.key === 'bk-douche')!;
    expect([douche(zonder).min, douche(zonder).max]).toEqual([2000, 3000]);
    expect([douche(met).min, douche(met).max]).toEqual([2000, 3000]);

    // En het verschil in de vork komt uitsluitend uit het tariefdeel.
    expect(Math.round(met.exclMin - zonder.exclMin))
      .toBe(Math.round(met.standaardExcl * 0.7 - zonder.standaardExcl * 0.85));
  });

  it('de eigen bereiken blijven exact meetellen bovenop de verschoven vork', () => {
    const r = berekenPrijs({ ...metEigenBereik(), marge: { min: 0.7, max: 1.3, argumenten: [] } }, 60)!;
    expect(Math.round(r.exclMin)).toBe(Math.round(r.standaardExcl * 0.7 + 2000));
    expect(Math.round(r.exclMax)).toBe(Math.round(r.standaardExcl * 1.3 + 3000));
  });

  it('argumenten komen NIET in wat de klant ziet', () => {
    const r = berekenPrijs({
      ...basis,
      marge: { min: 0.7, max: 1.3, argumenten: [{ kader: 'Trap', tekst: 'smalle draaitrap, extra hijswerk' }] },
    }, 60)!;
    const posten = JSON.stringify(naarOpgeslagenPosten(r.items));
    expect(posten).not.toContain('argumenten');
    expect(posten).not.toContain('draaitrap');
    expect(posten).not.toContain('marge');
  });

  it('een dossier van vóór deze functie heeft simpelweg geen marge', () => {
    expect(normaliseerCalcState({}).marge).toBeUndefined();
    // Zonder opties blijven de vaste posten over, met de standaard vork.
    const leeg = berekenPrijs({}, 60)!;
    expect(leeg.margeVerschoven).toBe(false);
    expect(leeg.factorMin).toBe(0.85);
  });

  it('bewaart de argumenten bij het normaliseren', () => {
    const marge = { min: 0.8, max: 1.2, argumenten: [{ kader: 'Algemeen', tekst: 'krappe markt' }] };
    expect(normaliseerCalcState({ marge }).marge).toEqual(marge);
  });
});

describe('badkamer-onderdelen', () => {
  it('bevat de techniekenregel en die telt mee in de prijs', () => {
    const badkamer = legeBadkamer();
    badkamer.actief = true;
    badkamer.onderdelen = badkamer.onderdelen.map((o) =>
      o.key === 'technieken' ? { ...o, actief: true, min: 1200, max: 2400 } : o,
    );
    expect(badkamer.onderdelen.map((o) => o.key)).toContain('technieken');

    const zonder = berekenPrijs(basis, 60)!;
    const met = berekenPrijs({ ...basis, badkamer }, 60)!;
    const post = met.items.find((i) => i.key === 'bk-technieken')!;

    expect(post.label).toContain('Technieken');
    expect([post.min, post.max]).toEqual([1200, 2400]);
    // Telt exact mee, zonder dat de bandbreedte er nog eens overheen gaat.
    expect(Math.round(met.exclMin)).toBe(Math.round(zonder.exclMin + 1200));
    expect(Math.round(met.exclMax)).toBe(Math.round(zonder.exclMax + 2400));
  });

  it('een leeg dossier krijgt de techniekenregel er gewoon bij', () => {
    expect(normaliseerCalcState({}).badkamer!.onderdelen.map((o) => o.key)).toContain('technieken');
  });

  it('een bestaand dossier behoudt zijn ingevulde bedragen', () => {
    // Zoals een dossier dat opgeslagen werd vóór de techniekenregel bestond.
    const oud = {
      actief: true,
      onderdelen: [{ key: 'douche', label: 'Douche', actief: true, min: 2000, max: 3000 }],
    };
    const genormaliseerd = normaliseerCalcState({ badkamer: oud } as never).badkamer!;
    const douche = genormaliseerd.onderdelen.find((o) => o.key === 'douche')!;
    expect([douche.min, douche.max]).toEqual([2000, 3000]);
    expect(genormaliseerd.onderdelen.find((o) => o.key === 'technieken')).toBeDefined();
  });
});

// De omrekening die de balk gebruikt wanneer je een bedrag intypt: het
// getoonde bedrag is incl. 6% btw, en de elementen met een eigen bereik
// schuiven niet mee — die moeten er dus eerst af.
const bedragNaarFactor = (
  r: ReturnType<typeof berekenPrijs>, bedragInclBtw: number, kant: 'min' | 'max', btw = 6,
) => {
  const res = r!;
  const excl = bedragInclBtw / (1 + btw / 100);
  const eigenBereik = kant === 'min'
    ? res.exclMin - res.standaardExcl * res.factorMin
    : res.exclMax - res.standaardExcl * res.factorMax;
  if (res.standaardExcl <= 0) return null;
  return (excl - eigenBereik) / res.standaardExcl;
};

describe('bedrag intypen schuift het handvat mee', () => {
  it('het getoonde bedrag levert exact de huidige factor op', () => {
    const r = berekenPrijs(basis, 60)!;
    expect(bedragNaarFactor(r, r.min, 'min')).toBeCloseTo(r.factorMin, 6);
    expect(bedragNaarFactor(r, r.max, 'max')).toBeCloseTo(r.factorMax, 6);
  });

  it('een ingetypt bedrag komt er na herberekening ook weer uit', () => {
    const r = berekenPrijs(basis, 60)!;
    const gewenst = Math.round(r.min * 0.9);
    const f = bedragNaarFactor(r, gewenst, 'min')!;
    const na = berekenPrijs({ ...basis, marge: { min: f, max: r.factorMax, argumenten: [] } }, 60)!;
    expect(Math.round(na.min)).toBe(gewenst);
  });

  it('houdt rekening met elementen die hun eigen bereik meebrengen', () => {
    const state = metEigenBereik();
    const r = berekenPrijs(state, 60)!;
    const gewenst = Math.round(r.min * 0.9);
    const f = bedragNaarFactor(r, gewenst, 'min')!;
    const na = berekenPrijs({ ...state, marge: { min: f, max: r.factorMax, argumenten: [] } }, 60)!;
    expect(Math.round(na.min)).toBe(gewenst);
    // Het douche-element blijft onaangeroerd op 2000–3000.
    const douche = na.items.find((i) => i.key === 'bk-douche')!;
    expect([douche.min, douche.max]).toEqual([2000, 3000]);
  });

  it('volgt het gekozen btw-tarief, niet altijd 6%', () => {
    const r = berekenPrijs(basis, 60)!;
    // Wat er bij 21% getoond wordt, moet bij 21% ook weer de huidige factor geven.
    const toonMin21 = r.exclMin * 1.21;
    expect(bedragNaarFactor(r, toonMin21, 'min', 21)).toBeCloseTo(r.factorMin, 6);
    // En met de verkeerde btw eruit halen levert een andere factor op — precies
    // de fout die dit voorkomt.
    expect(bedragNaarFactor(r, toonMin21, 'min', 6)).not.toBeCloseTo(r.factorMin, 3);
  });

  it('geeft null als er geen tariefdeel is om te verschuiven', () => {
    const r = berekenPrijs(basis, 60)!;
    const leeg = { ...r, standaardExcl: 0 } as typeof r;
    expect(bedragNaarFactor(leeg, 10000, 'min')).toBeNull();
  });
});

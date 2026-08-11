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

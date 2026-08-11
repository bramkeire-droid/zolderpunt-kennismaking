import { describe, expect, it } from 'vitest';
import {
  berekenPrijs,
  naarOpgeslagenPosten,
  nieuweRegel,
  normaliseerCalcState,
  overrideBedrag,
  regelBedrag,
  type CalcState,
} from '@/lib/prijscalculator';

const basis: CalcState = {
  dak_bekleed: false, dakisolatie_type: 'spantendak', vloer: true, velux: 2,
  trap: true, trapgat: 'hout', airco: 1, schilderwerken: true,
  netto_m2: 50, netto_manually_set: true,
};

describe('een regel is A × B × C', () => {
  it('vermenigvuldigt de drie velden', () => {
    expect(regelBedrag([12, 3, 45])).toBe(12 * 3 * 45);
  });

  it('een verse regel staat op × 1 en telt nog niet mee', () => {
    expect(nieuweRegel()).toEqual([null, null, 1]);
    expect(regelBedrag(nieuweRegel())).toBe(0);
  });

  it('alleen het eerste veld ingevuld is gewoon dat bedrag', () => {
    expect(regelBedrag([1500, null, 1])).toBe(1500);
  });

  it('leeg middenveld wordt overgeslagen i.p.v. als nul gelezen', () => {
    expect(regelBedrag([12, null, 45])).toBe(540);
  });
});

describe('regels worden opgeteld', () => {
  it('telt de subtotalen bij elkaar', () => {
    expect(overrideBedrag({ regels: [[12, 3, 45], [1000, null, 1]] })).toBe(12 * 3 * 45 + 1000);
  });

  it('een lege regel telt niet mee', () => {
    expect(overrideBedrag({ regels: [[1000, null, 1], nieuweRegel()] })).toBe(1000);
  });

  it('niets ingevuld betekent geen override', () => {
    expect(overrideBedrag({ regels: [] })).toBeNull();
    expect(overrideBedrag({ regels: [nieuweRegel()] })).toBeNull();
    expect(overrideBedrag(undefined)).toBeNull();
  });

  it('bewust op nul zetten mag wél, en is geen "leeg"', () => {
    expect(overrideBedrag({ regels: [[0, null, 1]] })).toBe(0);
  });
});

describe('handmatig bedrag in de berekening', () => {
  it('vervangt het tariefbedrag van die ene post', () => {
    const zonder = berekenPrijs(basis, 60)!;
    const met = berekenPrijs({ ...basis, overrides: { vl: { regels: [[1000, null, 1]] } } }, 60)!;
    const vloerZonder = zonder.items.find((i) => i.key === 'vl')!;
    const vloerMet = met.items.find((i) => i.key === 'vl')!;

    expect(vloerMet.amount).toBe(1000);
    expect(vloerMet.handmatig).toBe(true);
    expect(vloerZonder.handmatig).toBeUndefined();
    expect(Math.round(met.excl)).toBe(Math.round(zonder.excl - vloerZonder.amount + 1000));
  });

  it('werkt met een rekensom over meerdere regels', () => {
    const r = berekenPrijs({ ...basis, overrides: { vx: { regels: [[2, 1500, 1], [250, null, 1]] } } }, 60)!;
    expect(r.items.find((i) => i.key === 'vx')!.amount).toBe(3250);
  });

  it('de vork blijft om het nieuwe totaal liggen', () => {
    const r = berekenPrijs({ ...basis, overrides: { vl: { regels: [[1000, null, 1]] } } }, 60)!;
    expect(Math.round(r.exclMin)).toBe(Math.round(r.excl * 0.85));
    expect(Math.round(r.exclMax)).toBe(Math.round(r.excl * 1.15));
  });

  it('een lege override laat het tarief staan', () => {
    const zonder = berekenPrijs(basis, 60)!;
    const met = berekenPrijs({ ...basis, overrides: { vl: { regels: [nieuweRegel()] } } }, 60)!;
    expect(Math.round(met.excl)).toBe(Math.round(zonder.excl));
    expect(met.items.find((i) => i.key === 'vl')!.handmatig).toBeUndefined();
  });

  it('de rekensom komt NIET in wat de klant ziet', () => {
    const r = berekenPrijs({ ...basis, overrides: { vl: { regels: [[12, 3, 45]] } } }, 60)!;
    const posten = naarOpgeslagenPosten(r.items);
    const vloer = posten.find((p) => p.post.startsWith('Vloer'))!;

    expect(vloer.bedrag).toBe(12 * 3 * 45);
    // Geen regels, geen 'handmatig'-vlag: rapport en klantslide krijgen enkel
    // de uitkomst.
    expect(JSON.stringify(posten)).not.toContain('regels');
    expect(JSON.stringify(posten)).not.toContain('handmatig');
  });

  it('overrides overleven het normaliseren van een ouder dossier', () => {
    expect(normaliseerCalcState({ overrides: { vl: { regels: [[50, null, 1]] } } }).overrides).toEqual({
      vl: { regels: [[50, null, 1]] },
    });
    expect(normaliseerCalcState({}).overrides).toEqual({});
  });
});

import { describe, expect, it } from 'vitest';
import {
  berekenPrijs,
  naarOpgeslagenPosten,
  normaliseerCalcState,
  overrideBedrag,
  type CalcState,
} from '@/lib/prijscalculator';

const basis: CalcState = {
  dak_bekleed: false, dakisolatie_type: 'spantendak', vloer: true, velux: 2,
  trap: true, trapgat: 'hout', airco: 1, schilderwerken: true,
  netto_m2: 50, netto_manually_set: true,
};

describe('overrideBedrag', () => {
  it('één factor is gewoon dat bedrag', () => {
    expect(overrideBedrag({ factoren: [1234] })).toBe(1234);
  });

  it('meerdere factoren worden vermenigvuldigd', () => {
    expect(overrideBedrag({ factoren: [12, 3, 45] })).toBe(12 * 3 * 45);
  });

  it('lege factoren tellen niet mee, zodat typen niet naar nul springt', () => {
    expect(overrideBedrag({ factoren: [12, null, 3] })).toBe(36);
  });

  it('niets ingevuld betekent geen override', () => {
    expect(overrideBedrag({ factoren: [] })).toBeNull();
    expect(overrideBedrag({ factoren: [null, null] })).toBeNull();
    expect(overrideBedrag(undefined)).toBeNull();
  });
});

describe('handmatig bedrag in de berekening', () => {
  it('vervangt het tariefbedrag van die ene post', () => {
    const zonder = berekenPrijs(basis, 60)!;
    const met = berekenPrijs({ ...basis, overrides: { vl: { factoren: [1000] } } }, 60)!;
    const vloerZonder = zonder.items.find((i) => i.key === 'vl')!;
    const vloerMet = met.items.find((i) => i.key === 'vl')!;

    expect(vloerMet.amount).toBe(1000);
    expect(vloerMet.handmatig).toBe(true);
    expect(vloerZonder.handmatig).toBeUndefined();
    // Alleen die post verschuift, de rest blijft gelijk.
    expect(Math.round(met.excl)).toBe(Math.round(zonder.excl - vloerZonder.amount + 1000));
  });

  it('werkt ook als rekensom', () => {
    const r = berekenPrijs({ ...basis, overrides: { vx: { factoren: [2, 1500] } } }, 60)!;
    expect(r.items.find((i) => i.key === 'vx')!.amount).toBe(3000);
  });

  it('raakt de bandbreedte niet: de vork blijft om het nieuwe totaal liggen', () => {
    const r = berekenPrijs({ ...basis, overrides: { vl: { factoren: [1000] } } }, 60)!;
    expect(Math.round(r.exclMin)).toBe(Math.round(r.excl * 0.85));
    expect(Math.round(r.exclMax)).toBe(Math.round(r.excl * 1.15));
  });

  it('een lege override laat het tarief staan', () => {
    const zonder = berekenPrijs(basis, 60)!;
    const met = berekenPrijs({ ...basis, overrides: { vl: { factoren: [null] } } }, 60)!;
    expect(Math.round(met.excl)).toBe(Math.round(zonder.excl));
    expect(met.items.find((i) => i.key === 'vl')!.handmatig).toBeUndefined();
  });

  it('de rekensom komt NIET in wat de klant ziet', () => {
    const r = berekenPrijs({ ...basis, overrides: { vl: { factoren: [12, 3, 45] } } }, 60)!;
    const posten = naarOpgeslagenPosten(r.items);
    const vloer = posten.find((p) => p.post.startsWith('Vloer'))!;

    expect(vloer.bedrag).toBe(12 * 3 * 45);
    // Geen factoren, geen 'handmatig'-vlag: het rapport en de klantslide
    // krijgen enkel de uitkomst.
    expect(JSON.stringify(posten)).not.toContain('factoren');
    expect(JSON.stringify(posten)).not.toContain('handmatig');
  });

  it('overrides overleven het normaliseren van een ouder dossier', () => {
    expect(normaliseerCalcState({ overrides: { vl: { factoren: [50] } } }).overrides).toEqual({
      vl: { factoren: [50] },
    });
    // Een dossier van vóór deze functie krijgt gewoon een lege verzameling.
    expect(normaliseerCalcState({}).overrides).toEqual({});
  });
});

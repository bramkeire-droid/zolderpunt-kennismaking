import { describe, expect, it } from 'vitest';
import {
  STANDAARD_TARIEVEN,
  berekenPrijs,
  effectieveTarieven,
  legeBadkamer,
  staffelBedrag,
  type Tarieven,
} from '@/lib/prijscalculator';
import { normaliseerTarieven } from '@/hooks/useTarieven';

const basis = {
  dak_bekleed: false, dakisolatie_type: 'spantendak' as const, vloer: true, velux: 2,
  trap: true, trapgat: 'hout' as const, airco: 1, schilderwerken: true,
  netto_m2: 50, netto_manually_set: true,
};

const kopie = (): Tarieven => JSON.parse(JSON.stringify(STANDAARD_TARIEVEN));

describe('tarieven zijn instelbaar', () => {
  it('rekent zonder tarieven exact zoals met de standaardtarieven', () => {
    expect(berekenPrijs(basis, 60)!.excl).toBe(berekenPrijs(basis, 60, STANDAARD_TARIEVEN)!.excl);
  });

  it('een duurder tarief per m2 verhoogt het totaal', () => {
    const t = kopie();
    t.perM2.vloer = STANDAARD_TARIEVEN.perM2.vloer + 10;
    const duurder = berekenPrijs(basis, 60, t)!;
    // 50 m2 netto x 10 EUR x index 1.05
    expect(Math.round(duurder.excl - berekenPrijs(basis, 60)!.excl)).toBe(Math.round(50 * 10 * t.index));
  });

  it('de indexatie werkt door op alle tariefposten', () => {
    const t = kopie();
    t.index = 1;
    const zonderIndex = berekenPrijs(basis, 60, t)!;
    const met = berekenPrijs(basis, 60)!;
    expect(zonderIndex.excl).toBeLessThan(met.excl);
  });

  it('bandbreedte bepaalt de vork', () => {
    const t = kopie();
    t.bandbreedte = 0.2;
    const r = berekenPrijs(basis, 60, t)!;
    expect(Math.round(r.exclMin)).toBe(Math.round(r.excl * 0.8));
    expect(Math.round(r.exclMax)).toBe(Math.round(r.excl * 1.2));
  });

  it('schilderwerken volgt de indexatie-instelling', () => {
    const uit = staffelBedrag(STANDAARD_TARIEVEN.schilderwerken, 50, 1.05);
    expect(uit).toBe(4000); // historisch niet geindexeerd
    const t = kopie();
    t.schilderwerken.geindexeerd = true;
    expect(staffelBedrag(t.schilderwerken, 50, 1.05)).toBe(4200);
  });

  it('staffel kiest de juiste trede, ook op de grens', () => {
    const p = STANDAARD_TARIEVEN.plamuur;
    expect(staffelBedrag(p, 39, 1)).toBe(3250);
    expect(staffelBedrag(p, 40, 1)).toBe(4500); // 40 valt in de volgende schijf
    expect(staffelBedrag(p, 999, 1)).toBe(8000); // laatste trede vangt alles op
  });

  it('standaardbedragen uit de tarieven landen op een nieuw dossier', () => {
    const t = kopie();
    t.standaardBedragen.douche = { min: 2000, max: 3500 };
    // Zoals de UI het doet: een verse badkamer krijgt de standaardbedragen mee.
    const badkamer = legeBadkamer(t);
    badkamer.actief = true;
    badkamer.onderdelen = badkamer.onderdelen.map((o) =>
      o.key === 'douche' ? { ...o, actief: true } : o,
    );
    const r = berekenPrijs({ ...basis, badkamer } as any, 60, t)!;
    const douche = r.items.find((i) => i.key === 'bk-douche')!;
    expect([douche.min, douche.max]).toEqual([2000, 3500]);
  });

  it('een bewust leeggemaakt bedrag komt niet terug via de standaardtarieven', () => {
    const t = kopie();
    t.standaardBedragen.douche = { min: 2000, max: 3500 };
    const r = berekenPrijs(
      { ...basis, badkamer: { actief: true, onderdelen: [{ key: 'douche', label: 'Douche', actief: true, min: null, max: null }] } } as any,
      60, t,
    )!;
    const douche = r.items.find((i) => i.key === 'bk-douche')!;
    expect([douche.min, douche.max]).toEqual([0, 0]);
  });

  it('effectieve tarieven tonen het geindexeerde bedrag', () => {
    expect(effectieveTarieven(STANDAARD_TARIEVEN).vloer).toBeCloseTo(70 * 1.05);
  });
});

describe('normaliseerTarieven vult ontbrekende delen aan', () => {
  it('een lege rij levert de standaardtarieven', () => {
    expect(normaliseerTarieven(null)).toEqual(STANDAARD_TARIEVEN);
    expect(normaliseerTarieven({})).toEqual(STANDAARD_TARIEVEN);
  });

  it('een rij van voor een nieuw veld blijft bruikbaar', () => {
    const oud = { index: 1.1, perM2: { vloer: 80 } };
    const t = normaliseerTarieven(oud);
    expect(t.index).toBe(1.1);
    expect(t.perM2.vloer).toBe(80);
    expect(t.perM2.binnenplaatafwerking).toBe(STANDAARD_TARIEVEN.perM2.binnenplaatafwerking);
    expect(t.vast.trap).toBe(STANDAARD_TARIEVEN.vast.trap);
    expect(berekenPrijs(basis, 60, t)).not.toBeNull();
  });

  it('een lege staffel valt terug op de standaard i.p.v. 0 euro', () => {
    const t = normaliseerTarieven({ plamuur: { geindexeerd: true, treden: [] } });
    expect(t.plamuur.treden.length).toBeGreaterThan(0);
  });

  it('onzin in de index breekt de berekening niet', () => {
    const t = normaliseerTarieven({ index: 'kapot' });
    expect(t.index).toBe(STANDAARD_TARIEVEN.index);
  });
});

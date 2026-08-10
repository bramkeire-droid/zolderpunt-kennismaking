import { describe, it, expect } from 'vitest';
import { berekenPrijs, legeBadkamer, leesPosten, naarOpgeslagenPosten } from '@/lib/prijscalculator';

const basis = {
  dak_bekleed: false, dakisolatie_type: 'spantendak' as const, vloer: true, velux: 2,
  trap: true, trapgat: 'hout' as const, airco: 1, schilderwerken: true,
  netto_m2: 50, netto_manually_set: true,
};

const badkamerMet = (patch: Record<string, { min: number | null; max: number | null }>) => {
  const bk = legeBadkamer();
  bk.actief = true;
  bk.onderdelen = bk.onderdelen.map((o) => (patch[o.key] ? { ...o, actief: true, ...patch[o.key] } : o));
  return bk;
};

describe('berekenPrijs', () => {
  it('geeft zonder eigen-min/max-elementen exact de oude uitkomst', () => {
    // De vork was altijd excl x 0.85 / 1.15. Bestaande dossiers mogen door
    // deze uitbreiding niet van bedrag veranderen.
    const r = berekenPrijs(basis, 60)!;
    expect(r.exclMin).toBeCloseTo(r.excl * 0.85, 6);
    expect(r.exclMax).toBeCloseTo(r.excl * 1.15, 6);
    expect(r.min).toBeCloseTo(r.excl * 1.06 * 0.85, 6);
  });

  it('telt een eigen min/max exact mee in plaats van de bandbreedte', () => {
    const r = berekenPrijs({
      ...basis,
      badkamer: badkamerMet({ douche: { min: 2000, max: 3500 } }),
      maatwerk: { actief: true, min: 4000, max: 7000 },
    }, 60)!;
    expect(r.exclMin).toBeCloseTo(r.standaardExcl * 0.85 + 6000, 6);
    expect(r.exclMax).toBeCloseTo(r.standaardExcl * 1.15 + 10500, 6);
    expect(r.excl).toBeCloseTo(r.standaardExcl + (6000 + 10500) / 2, 6);
  });

  it('sluit de meest waarschijnlijke prijs altijd in de vork in', () => {
    const r = berekenPrijs({
      ...basis,
      badkamer: badkamerMet({ bad: { min: 1500, max: 9000 } }),
    }, 60)!;
    expect(r.exclMin).toBeLessThanOrEqual(r.excl);
    expect(r.excl).toBeLessThanOrEqual(r.exclMax);
  });

  it('negeert een aangevinkt element zonder bedrag, maar toont het wel', () => {
    const zonder = berekenPrijs(basis, 60)!;
    const met = berekenPrijs({ ...basis, badkamer: badkamerMet({ boiler: { min: null, max: null } }) }, 60)!;
    expect(met.excl).toBeCloseTo(zonder.excl, 6);
    expect(met.items.some((i) => i.key === 'bk-boiler')).toBe(true);
  });

  it('gebruikt de min als bovengrens wanneer alleen de min ingevuld is', () => {
    const r = berekenPrijs({ ...basis, maatwerk: { actief: true, min: 1800, max: null } }, 60)!;
    const zonder = berekenPrijs(basis, 60)!;
    expect(r.exclMin - zonder.exclMin).toBeCloseTo(1800, 6);
    expect(r.exclMax - zonder.exclMax).toBeCloseTo(1800, 6);
  });

  it('laat een vrij element zonder titel buiten de prijs', () => {
    const zonder = berekenPrijs(basis, 60)!;
    const met = berekenPrijs({
      ...basis,
      extras: [{ id: 'a', titel: '   ', omschrijving: '', min: 5000, max: 5000 }],
    }, 60)!;
    expect(met.excl).toBeCloseTo(zonder.excl, 6);
  });

  it('geeft null zonder bruto oppervlakte', () => {
    expect(berekenPrijs(basis, 0)).toBeNull();
  });
});

describe('opslag van posten', () => {
  it('behoudt categorie en bereik over een opslagronde', () => {
    const r = berekenPrijs({
      ...basis,
      badkamer: badkamerMet({ douche: { min: 2000, max: 3500 } }),
      extras: [{ id: 'x', titel: 'Dakkapel', omschrijving: '2m', min: 8000, max: 12000 }],
    }, 60)!;
    const terug = leesPosten(naarOpgeslagenPosten(r.items));
    const douche = terug.find((p) => p.post === 'Douche')!;
    expect(douche.categorie).toBe('badkamer');
    expect([douche.min, douche.max]).toEqual([2000, 3500]);
    const dakkapel = terug.find((p) => p.post === 'Dakkapel')!;
    expect(dakkapel.categorie).toBe('extra');
    expect(dakkapel.omschrijving).toBe('2m');
  });

  it('leest posten van voor deze uitbreiding als tariefpost', () => {
    // Zonder categorie horen ze zonder deelbedrag in het rapport.
    expect(leesPosten([{ post: 'Trap', bedrag: 6300 }])[0].categorie).toBe('standaard');
  });

  it('overleeft rommel in de opgeslagen data', () => {
    expect(leesPosten(null)).toEqual([]);
    expect(leesPosten([null, { bedrag: 5 }, 'x'])).toEqual([]);
  });
});

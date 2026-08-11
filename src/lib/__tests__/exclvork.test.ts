import { describe, expect, it } from 'vitest';
import { exclVorkVanLead } from '@/lib/prijscalculator';
import { dossierWaarde } from '@/lib/pipeline';

describe('exclVorkVanLead — één terugvalketen voor de excl-vork', () => {
  it('gebruikt de expliciete excl-kolommen als die er zijn', () => {
    expect(exclVorkVanLead({ budget_min_excl: 50000, budget_max_excl: 60000, budget_min: 53000, budget_max: 63600 }))
      .toEqual({ min: 50000, max: 60000 });
  });

  it('valt terug op budget_excl x band', () => {
    expect(exclVorkVanLead({ budget_excl: 60000 })).toEqual({ min: 51000, max: 69000 });
  });

  it('rekent als laatste redmiddel de incl-6%-kolommen terug', () => {
    const vork = exclVorkVanLead({ budget_min: 53000, budget_max: 63600 })!;
    expect(vork.min).toBe(50000);
    expect(vork.max).toBe(60000);
  });

  it('geeft null zonder bruikbare velden', () => {
    expect(exclVorkVanLead({})).toBeNull();
    expect(exclVorkVanLead({ budget_min: 0, budget_excl: null })).toBeNull();
  });
});

describe('dossierWaarde — altijd excl. btw', () => {
  it('offerte gaat voor', () => {
    expect(dossierWaarde({ offerte_bedrag_excl: 45000, budget_min: 53000 })).toBe(45000);
  });

  it('terugval is de excl-ondergrens, niet de incl-6%-kolom', () => {
    // Voorheen: 53000 (incl 6%). Nu: de echte excl-ondergrens.
    expect(dossierWaarde({ budget_min: 53000, budget_max: 63600 })).toBe(50000);
    expect(dossierWaarde({ budget_min_excl: 50000, budget_max_excl: 60000, budget_min: 53000 })).toBe(50000);
  });

  it('een offerte op de excl-ondergrens verandert de waarde niet meer', () => {
    // De fout die de audit vond: waarde zakte 3000 zodra een offerte op
    // exact de ondergrens werd ingevuld, puur door de eenheidwissel.
    const zonderOfferte = dossierWaarde({ budget_min_excl: 50000, budget_max_excl: 60000 });
    const metOfferte = dossierWaarde({ budget_min_excl: 50000, budget_max_excl: 60000, offerte_bedrag_excl: 50000 });
    expect(metOfferte).toBe(zonderOfferte);
  });
});

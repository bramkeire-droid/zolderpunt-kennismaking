import { describe, expect, it, vi } from 'vitest';
import { voerUit, MAX_WACHT_MS, type FaseOpdracht, type Hulp } from '@/lib/faseOpdracht';

// Nagemaakte opdracht en nagemaakte extensie/Bouwflow: er wordt niets echt gezet.
const NU = Date.parse('2026-11-25T14:00:00Z');
const o = (x: Partial<FaseOpdracht> = {}): FaseOpdracht => ({
  id: 'o1', lead_id: 'l1', project_nummer: 'ZL-TEST', naar_fase: 27, naar_titel: 'Offerte te maken',
  afwijs_reden_zetten: false, afwijs_reden_na: null, gemaakt_op: '2026-11-25T13:50:00Z', ...x,
});
const hulp = (x: Partial<Hulp> = {}): Hulp => ({
  extensie: vi.fn(async () => true),
  zetInBouwflow: vi.fn(async () => ({ ok: true })),
  controleer: vi.fn(async () => ({ ok: true })),
  zetReden: vi.fn(async () => null),
  nu: NU,
  ...x,
});

describe('een fase-opdracht van Zarvis', () => {
  it('gaat langs Bouwflow en de controle, en is dan gedaan', async () => {
    const h = hulp();
    const s = await voerUit(o(), h);
    expect(s.status).toBe('gedaan');
    expect(h.zetInBouwflow).toHaveBeenCalledOnce();
    expect(h.controleer).toHaveBeenCalledOnce();
    expect(h.zetReden).not.toHaveBeenCalled();
  });

  it('blijft wachten zonder extensie en raakt dan niets aan', async () => {
    const h = hulp({ extensie: vi.fn(async () => false) });
    expect((await voerUit(o(), h)).status).toBe('wacht');
    expect(h.zetInBouwflow).not.toHaveBeenCalled();
  });

  it('wijzigt Compass niet als Bouwflow de fase niet bevestigt', async () => {
    const h = hulp({ controleer: vi.fn(async () => ({ ok: false, fout: 'staat op 8' })) });
    const s = await voerUit(o(), h);
    expect(s.status).toBe('mislukt');
    expect(h.zetReden).not.toHaveBeenCalled();
  });

  it('mislukt als de extensie de fase niet zet, zonder te controleren', async () => {
    const h = hulp({ zetInBouwflow: vi.fn(async () => ({ ok: false, fout: 'niet ingelogd in Bouwflow' })) });
    expect((await voerUit(o(), h)).melding).toContain('niet ingelogd');
    expect(h.controleer).not.toHaveBeenCalled();
  });

  it('zet de afwijsreden pas na de bevestiging', async () => {
    const volgorde: string[] = [];
    const h = hulp({
      controleer: vi.fn(async () => { volgorde.push('controle'); return { ok: true }; }),
      zetReden: vi.fn(async () => { volgorde.push('reden'); return null; }),
    });
    await voerUit(o({ naar_fase: 8, naar_titel: 'Geweigerd', afwijs_reden_zetten: true, afwijs_reden_na: 'te duur' }), h);
    expect(volgorde).toEqual(['controle', 'reden']);
  });

  it('voert een opdracht van meer dan een dag oud niet meer uit', async () => {
    const h = hulp();
    const s = await voerUit(o({ gemaakt_op: new Date(NU - MAX_WACHT_MS - 1000).toISOString() }), h);
    expect(s.status).toBe('mislukt');
    expect(h.extensie).not.toHaveBeenCalled();
  });
});

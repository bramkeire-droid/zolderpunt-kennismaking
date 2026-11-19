import { describe, expect, it } from 'vitest';
import { leesWatWeWeten, voegSamen } from '@/lib/watWeWeten';

const rij = (box: Record<string, string[]>, qr: Record<string, unknown> = {}) => ({
  box_notes: { wat: [], aannemer: [], waarom: [], budget: [], ...box },
  questions_raised: qr,
});

describe('Wat we weten bewerken: alleen wat Bram wijzigde, op de verse stand', () => {
  it('niets gewijzigd = niets bewaren', () => {
    const r = rij({ wat: ['zolder leefbaar maken'] }, { budget: { raised: true, note: '' } });
    expect(voegSamen(r, leesWatWeWeten(r), leesWatWeWeten(r))).toEqual({});
  });

  it('een notitie die intussen in een lopend gesprek bijkwam, blijft staan', () => {
    const geopend = rij({ wat: ['zolder leefbaar maken'], waarom: ['te weinig ruimte'] });
    const vers = rij({ wat: ['zolder leefbaar maken'], waarom: ['te weinig ruimte', 'kind op komst'] });
    const nieuw = leesWatWeWeten(geopend);
    nieuw.vakken.wat = ['zolder leefbaar maken als bureau'];

    const patch = voegSamen(vers, leesWatWeWeten(geopend), nieuw) as any;
    expect(patch.box_notes.wat).toEqual(['zolder leefbaar maken als bureau']);
    expect(patch.box_notes.waarom).toEqual(['te weinig ruimte', 'kind op komst']);
    expect(patch.questions_raised).toBeUndefined();
  });

  it('een notitie met een regeleinde blijft één notitie', () => {
    const r = rij({ waarom: ['eerste regel\ntweede regel'] });
    const nieuw = leesWatWeWeten(r);
    nieuw.vakken.budget = ['30k'];
    expect((voegSamen(r, leesWatWeWeten(r), nieuw) as any).box_notes.waarom).toEqual(['eerste regel\ntweede regel']);
  });

  it('lege notities vallen weg', () => {
    const r = rij({ wat: ['a'] });
    const nieuw = leesWatWeWeten(r);
    nieuw.vakken.wat = ['a', '  '];
    expect(voegSamen(r, leesWatWeWeten(r), nieuw)).toEqual({});
  });

  it('een vraag aanvinken met notitie houdt andere velden van die vraag', () => {
    const r = rij({}, { overlast: { raised: false, note: '', bron: 'gesprek' } });
    const nieuw = leesWatWeWeten(r);
    nieuw.vragen.overlast = { raised: true, note: 'werken beiden thuis' };
    expect((voegSamen(r, leesWatWeWeten(r), nieuw) as any).questions_raised.overlast)
      .toEqual({ raised: true, note: 'werken beiden thuis', bron: 'gesprek' });
  });
});

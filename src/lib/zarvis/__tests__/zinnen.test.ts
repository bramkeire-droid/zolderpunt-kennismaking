import { describe, it, expect } from 'vitest';
import { nieuweZinnen, voorUitspraak } from '../zinnen';
import { leesSseBlok } from '../client';

describe('nieuweZinnen', () => {
  it('geeft alleen afgewerkte zinnen terwijl de stroom loopt', () => {
    const r = nieuweZinnen('Dat klopt. De offerte is ver', 0, false);
    expect(r.zinnen).toEqual(['Dat klopt.']);
    expect('Dat klopt. De offerte is ver'.slice(r.tot)).toBe('De offerte is ver');
  });

  it('wacht met een leesteken helemaal achteraan tot er meer komt', () => {
    expect(nieuweZinnen('Dat klopt.', 0, false).zinnen).toEqual([]);
    expect(nieuweZinnen('Dat klopt. ', 0, false).zinnen).toEqual(['Dat klopt.']);
  });

  it('knipt niet midden in een kommagetal', () => {
    const r = nieuweZinnen('Het is 3.5 meter breed. Klaar', 0, false);
    expect(r.zinnen).toEqual(['Het is 3.5 meter breed.']);
  });

  it('levert bij het einde ook de staart zonder leesteken', () => {
    const r = nieuweZinnen('Eerste zin. en nog iets', 0, true);
    expect(r.zinnen).toEqual(['Eerste zin.', 'en nog iets']);
    expect(r.tot).toBe('Eerste zin. en nog iets'.length);
  });

  it('geeft een zin geen tweede keer af', () => {
    const tekst = 'Een. Twee. Drie';
    const eerste = nieuweZinnen(tekst, 0, false);
    const tweede = nieuweZinnen(tekst, eerste.tot, true);
    expect([...eerste.zinnen, ...tweede.zinnen]).toEqual(['Een.', 'Twee.', 'Drie']);
  });
});

describe('voorUitspraak', () => {
  it('haalt opmaaktekens weg', () => {
    expect(voorUitspraak('**Let op:** bel `vandaag` nog.')).toBe('Let op: bel vandaag nog.');
  });
});

describe('leesSseBlok', () => {
  it('leest een gebeurtenis', () => {
    expect(leesSseBlok('data: {"type":"tekst","delta":"Dag"}')).toEqual({ type: 'tekst', delta: 'Dag' });
  });
  it('negeert commentaar, lege blokken en kapotte json', () => {
    expect(leesSseBlok(': ping')).toBeNull();
    expect(leesSseBlok('')).toBeNull();
    expect(leesSseBlok('data: {kapot')).toBeNull();
  });
});

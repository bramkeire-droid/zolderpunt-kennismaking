import { describe, it, expect } from 'vitest';
import { maakInvoerTekst, heeftInvoer } from '@/lib/rapporten';

// Het invoerbestand is wat Bram als "transcriptfile" terugvindt bij een
// rapport. Het moet leesbaar zijn en niets stil weglaten.

const kop = 'Intakegesprek Huub & Ama Jans — 28/10/2026';

describe('heeftInvoer', () => {
  it('ziet een leeg gesprek als niets om te bewaren', () => {
    expect(heeftInvoer({})).toBe(false);
    expect(heeftInvoer({ transcript: '   ', gesprek_notities: '' })).toBe(false);
    // Alleen posten of een oppervlakte is geen gespreksinhoud: dat komt uit de
    // calculator en staat al in het rapport zelf.
    expect(heeftInvoer({ inbegrepen_posten: [{ post: 'Trap', bedrag: 6300 }] })).toBe(false);
  });

  it('ziet een transcript, notities of vaststellingen wel', () => {
    expect(heeftInvoer({ transcript: 'Klant belt over zolder.' })).toBe(true);
    expect(heeftInvoer({ gesprek_notities: 'Wil twee kamers.' })).toBe(true);
    expect(heeftInvoer({ project_feiten: [{ tekst: 'Houten vloerconstructie.' }] })).toBe(true);
  });
});

describe('maakInvoerTekst', () => {
  it('zet alles wat het rapport voedde in één leesbaar bestand', () => {
    const tekst = maakInvoerTekst({
      transcript: 'Bram: goeiemiddag.\nHuub: dag Bram.',
      gesprek_notities: 'Wil twee kamers met mezzanine.',
      project_feiten: [
        { label_nummer: 1, tekst: 'Dakkapel met plat dak. Recent vernieuwd' },
        { label_nummer: 2, tekst: 'Houten vloerconstructie.' },
      ],
      technisch: { trap: true, dakraam: false, badkamer: true },
      inbegrepen_posten: [{ post: 'Trap', bedrag: 6300 }],
      oppervlakte_m2: 20,
      gezocht_naar: 'Twee kamers',
    }, kop);

    expect(tekst.startsWith(kop)).toBe(true);
    expect(tekst).toContain('Huub: dag Bram.');
    expect(tekst).toContain('Wil twee kamers met mezzanine.');
    expect(tekst).toContain('1. Dakkapel met plat dak. Recent vernieuwd');
    expect(tekst).toContain('Oppervlakte: 20 m²');
    // Alleen aangevinkte technische keuzes, niet de uitgevinkte.
    expect(tekst).toContain('- trap');
    expect(tekst).toContain('- badkamer');
    expect(tekst).not.toContain('- dakraam');
  });

  it('laat lege onderdelen weg in plaats van een lege kop te tonen', () => {
    const tekst = maakInvoerTekst({ transcript: 'Enkel dit.' }, kop);
    expect(tekst).toContain('--- TRANSCRIPT ---');
    expect(tekst).not.toContain('GESPREKSNOTITIES');
    expect(tekst).not.toContain('VASTSTELLINGEN');
  });

  it('overleeft rommel in de opgeslagen velden', () => {
    const tekst = maakInvoerTekst({
      transcript: 'Iets.',
      project_feiten: 'geen lijst' as any,
      technisch: null as any,
      inbegrepen_posten: [null, 'Losse tekst'] as any,
    }, kop);
    expect(tekst).toContain('Iets.');
    expect(tekst).toContain('Losse tekst');
  });
});

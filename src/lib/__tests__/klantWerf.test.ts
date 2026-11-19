import { describe, expect, it } from 'vitest';
import { bepaalWijzigingen, bouwAdres, klantSleutel, splitsAdres } from '@/lib/klantWerf';

// Verzonnen adressen in de vormen die live in leads.adres staan (gemeten 19/11/2026).
describe('splitsAdres leest de vormen die in Compass voorkomen', () => {
  const geval = (invoer: string, straat: string, nummer: string, postcode: string, gemeente: string) =>
    expect(splitsAdres(invoer)).toEqual({ straat, nummer, postcode, gemeente });

  it('alleen een postcode (website-aanvraag)', () => geval('9400', '', '', '9400', ''));
  it('straat en nummer, met komma, postcode en gemeente', () =>
    geval('Kerkstraat 12, 9400 Ninove', 'Kerkstraat', '12', '9400', 'Ninove'));
  it('nummer met letter', () => geval('Dorpslaan 30D', 'Dorpslaan', '30D', '', ''));
  it('zonder komma, met postcode', () => geval('Molenweg 333 8000 Brugge', 'Molenweg', '333', '8000', 'Brugge'));
  it('zonder komma, zonder postcode', () => geval('Veldstraat 9 Meulebeke', 'Veldstraat', '9', '', 'Meulebeke'));
  it('gemeente zonder postcode na de komma', () => geval('Hofstraat 19, Evergem', 'Hofstraat', '19', '', 'Evergem'));
  it('straat zonder nummer', () => geval('Dwarsstraat, 9880 Aalter', 'Dwarsstraat', '', '9880', 'Aalter'));
  it('straatnaam met cijfers ervoor', () => geval('Koning Albert I-laan 59, 8500 Kortrijk', 'Koning Albert I-laan', '59', '8500', 'Kortrijk'));
  it('leeg', () => geval('', '', '', '', ''));
});

describe('bouwAdres maakt de vorm die de rest van de app terugleest', () => {
  it('volledig', () =>
    expect(bouwAdres({ straat: 'Kerkstraat', nummer: '12', postcode: '9400', gemeente: 'Ninove' })).toBe('Kerkstraat 12, 9400 Ninove'));
  it('alleen postcode en gemeente', () =>
    expect(bouwAdres({ straat: '', nummer: '', postcode: '9400', gemeente: 'Ninove' })).toBe('9400 Ninove'));
});

describe('bepaalWijzigingen schrijft alleen wat Bram echt wijzigde', () => {
  const lead = { id: 'x', adres: 'Molenweg 333 8000 Brugge', telefoon: '0470 11 22 33', email: 'a@b.be', gevonden_via: 'Google' };
  const ongewijzigd = { telefoon: lead.telefoon, email: lead.email, gevonden_via: lead.gevonden_via };

  it('niets aangeraakt = niets bewaren', () =>
    expect(bepaalWijzigingen(lead, splitsAdres(lead.adres), ongewijzigd)).toEqual({}));

  it('alleen telefoon: het oude adres blijft letterlijk staan (geen herschrijving)', () =>
    expect(bepaalWijzigingen(lead, splitsAdres(lead.adres), { ...ongewijzigd, telefoon: '0499 00 00 00' }))
      .toEqual({ telefoon: '0499 00 00 00' }));

  it('adres gewijzigd: nieuwe vorm en oude coördinaten weg', () =>
    expect(bepaalWijzigingen(lead, { ...splitsAdres(lead.adres), nummer: '335' }, ongewijzigd))
      .toEqual({ adres: 'Molenweg 335, 8000 Brugge', adres_lat: null, adres_lng: null }));
});

describe('klantSleutel volgt de databankfunctie leads_koppel_klant', () => {
  it('e-mail gaat voor, in kleine letters', () => expect(klantSleutel(' Jan@Voorbeeld.be ', '0470112233')).toBe('jan@voorbeeld.be'));
  it('zonder e-mail: laatste 9 cijfers van de telefoon', () => expect(klantSleutel('', '+32 470 11 22 33')).toBe('470112233'));
  it('niets', () => expect(klantSleutel('', '')).toBeNull());
});

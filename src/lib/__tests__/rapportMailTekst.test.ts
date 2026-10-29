import { describe, it, expect } from 'vitest';
import {
  bouwRapportMail, formatPlaatsbezoek, kiesVariant, CALENDLY_PLAATSBEZOEK,
} from '@/lib/rapportMailTekst';

// Deze tekst gaat naar klanten. De toetsen hieronder zijn de twee dingen die
// Bram expliciet gevraagd heeft (geen aanzet om te verzetten, niets over de
// dakconstructie) plus de dingen die een mail onbruikbaar maken: een lege
// aanhef, een ontbrekende datum of niet-ontsnapte naam.

describe('bouwRapportMail — variant overleg', () => {
  const mail = bouwRapportMail('overleg', { voornaam: 'Huub' });

  it('spreekt de klant aan en linkt naar Calendly', () => {
    expect(mail.text.startsWith('Hi Huub,')).toBe(true);
    expect(mail.text).toContain(CALENDLY_PLAATSBEZOEK);
    expect(mail.html).toContain(`href="${CALENDLY_PLAATSBEZOEK}"`);
    expect(mail.text.trimEnd().endsWith('Zolderpunt')).toBe(true);
  });

  it('noemt het plaatsbezoek op projectniveau, niet de dakconstructie', () => {
    expect(mail.text).toContain('bekijken we het project ter plaatse');
    expect(mail.text.toLowerCase()).not.toContain('dakconstructie');
    expect(mail.html.toLowerCase()).not.toContain('dakconstructie');
  });

  it('valt terug op een aanhef zonder naam', () => {
    expect(bouwRapportMail('overleg', {}).text.startsWith('Hi,')).toBe(true);
    expect(bouwRapportMail('overleg', { voornaam: '  ' }).text.startsWith('Hi,')).toBe(true);
  });
});

describe('bouwRapportMail — variant plaatsbezoek', () => {
  const mail = bouwRapportMail('plaatsbezoek', {
    voornaam: 'Ama',
    plaatsbezoekOp: '2026-11-04T14:00:00+01:00',
  });

  it('bevestigt dag en uur, in het onderwerp en in de mail', () => {
    expect(mail.text).toContain('4 november om 14:00');
    expect(mail.subject).toContain('4 november');
    // Het uur hoort niet in het onderwerp; dat werd anders te lang.
    expect(mail.subject).not.toContain('14:00');
  });

  it('zet geen aanzet om de afspraak te verzetten of af te zeggen', () => {
    const alles = (mail.text + mail.html).toLowerCase();
    for (const woord of ['verzet', 'afzegg', 'annuleer', 'komt het toch niet uit']) {
      expect(alles).not.toContain(woord);
    }
  });

  it('stuurt geen Calendly-link mee — het bezoek staat al vast', () => {
    expect(mail.text).not.toContain(CALENDLY_PLAATSBEZOEK);
    expect(mail.html).not.toContain(CALENDLY_PLAATSBEZOEK);
  });

  it('blijft leesbaar zonder bekende datum', () => {
    const zonder = bouwRapportMail('plaatsbezoek', { voornaam: 'Ama' });
    expect(zonder.text).toContain('Jullie plaatsbezoek staat ingepland.');
    expect(zonder.subject).toBe('Het verslag van ons gesprek + jullie plaatsbezoek');
    expect(zonder.text).not.toContain('undefined');
    expect(zonder.text).not.toContain('Invalid');
  });
});

describe('kiesVariant', () => {
  const nu = new Date('2026-10-29T12:00:00+01:00').getTime();

  it('kiest het plaatsbezoek wanneer dat nog moet komen', () => {
    expect(kiesVariant(true, '2026-11-04T14:00:00+01:00', nu)).toBe('plaatsbezoek');
    expect(kiesVariant(false, '2026-11-04T14:00:00+01:00', nu)).toBe('plaatsbezoek');
    // Wel afgesproken, datum nog niet gekend.
    expect(kiesVariant(true, null, nu)).toBe('plaatsbezoek');
  });

  it('valt terug op overleg bij een bezoek dat al geweest is', () => {
    // Gemeten op een echt dossier: plaatsbezoek van 14 september, eind oktober
    // opende het dialoog met "staat ingepland op maandag 14 september".
    expect(kiesVariant(true, '2026-09-14T17:00:00+02:00', nu)).toBe('overleg');
  });

  it('kiest overleg wanneer er niets gepland is', () => {
    expect(kiesVariant(false, null, nu)).toBe('overleg');
    expect(kiesVariant(null, undefined, nu)).toBe('overleg');
  });
});

describe('veiligheid en randgevallen', () => {
  it('ontsnapt een naam met HTML erin', () => {
    const mail = bouwRapportMail('overleg', { voornaam: '<b>Huub</b>' });
    expect(mail.html).toContain('&lt;b&gt;Huub&lt;/b&gt;');
    expect(mail.html).not.toContain('<b>Huub</b>');
  });

  it('negeert een onbruikbare datum in plaats van "Invalid Date" te mailen', () => {
    expect(formatPlaatsbezoek('geen datum')).toBe('');
    expect(formatPlaatsbezoek(null)).toBe('');
    expect(formatPlaatsbezoek(undefined)).toBe('');
  });
});

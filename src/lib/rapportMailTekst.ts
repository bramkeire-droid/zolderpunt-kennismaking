/**
 * De twee rapportmails, als één bron voor zowel de voorbeeldweergave in het
 * dialoog als de mail die écht verstuurd wordt.
 *
 * WAAROM HIER EN NIET IN DE EDGE FUNCTION. Bram moet in de app kunnen lezen
 * wat er exact verstuurd wordt voor hij op verzenden drukt. Zou de function
 * de tekst opbouwen, dan is de voorbeeldweergave een tweede implementatie die
 * stilletjes kan gaan afwijken. Nu bouwt de app de mail en relayeert de
 * function hem, met de bijlage uit de opslag erbij.
 *
 * De teksten zijn woordelijk goedgekeurd; zie docs/rapportmail-teksten.md.
 */

export type MailVariant = 'overleg' | 'plaatsbezoek';

export const CALENDLY_PLAATSBEZOEK = 'https://calendly.com/belhouse/plaatsbezoek-zolderpunt';

const BLAUW = '#008CFF';
const CREME = '#F8F4EC';
const LOGO = 'https://zolderpunt.be/email-logo.png';

export interface MailInvoer {
  voornaam?: string | null;
  /** ISO-tijdstip uit pre_intake.plaatsbezoek_scheduled_at. */
  plaatsbezoekOp?: string | null;
}

export interface MailTekst {
  subject: string;
  text: string;
  html: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** "dinsdag 4 november om 14:00" — leeg bij een onbruikbare datum. */
export function formatPlaatsbezoek(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dag = d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' });
  const uur = d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  return `${dag} om ${uur}`;
}

/**
 * Welke variant staat voorgeselecteerd.
 *
 * Alleen variant 2 wanneer het bezoek nog móét komen. Oude dossiers dragen een
 * plaatsbezoek van maanden geleden mee — het dossier van Lieselot Van Haute
 * stond op 14 september terwijl het eind oktober was. Zonder deze toets opent
 * het dialoog met "jullie plaatsbezoek staat ingepland op maandag 14 september".
 */
export function kiesVariant(
  gepland: boolean | null | undefined,
  plaatsbezoekOp: string | null | undefined,
  nu: number = Date.now(),
): MailVariant {
  if (!gepland && !plaatsbezoekOp) return 'overleg';
  if (!plaatsbezoekOp) return 'plaatsbezoek';
  const tijd = new Date(plaatsbezoekOp).getTime();
  if (isNaN(tijd)) return 'plaatsbezoek';
  return tijd > nu ? 'plaatsbezoek' : 'overleg';
}

const INTRO = 'Bedankt voor het aangename gesprek. In bijlage vind je het verslag terug: wat we '
  + 'besproken hebben, de aandachtspunten voor jullie zolder en de prijsindicatie waar we op '
  + 'uitkwamen.';

const AFSLUIT = 'Heb je ondertussen een vraag over het verslag, antwoord gerust op deze mail.';

export function bouwRapportMail(variant: MailVariant, invoer: MailInvoer): MailTekst {
  const naam = (invoer.voornaam ?? '').trim();
  const aanhef = naam ? `Hi ${naam},` : 'Hi,';
  const moment = formatPlaatsbezoek(invoer.plaatsbezoekOp);

  if (variant === 'plaatsbezoek') {
    const bezoekRegel = moment
      ? `Jullie plaatsbezoek staat ingepland op ${moment}.`
      : 'Jullie plaatsbezoek staat ingepland.';

    return {
      subject: moment
        ? `Het verslag van ons gesprek + jullie plaatsbezoek op ${moment.split(' om ')[0]}`
        : 'Het verslag van ons gesprek + jullie plaatsbezoek',
      text: [
        aanhef,
        '',
        INTRO,
        '',
        bezoekRegel,
        '',
        'Dan meten we op, bekijken we het project ter plaatse en wordt de prijs definitief. Van '
          + 'Calendly krijg je daarnaast een bevestiging met agenda-uitnodiging.',
        '',
        AFSLUIT,
        '',
        'Met vriendelijke groet,',
        'Bram',
        'Zolderpunt',
      ].join('\n'),
      html: omhul([
        `<p${P}>${esc(aanhef)}</p>`,
        `<p${P}>${INTRO}</p>`,
        `<p${P}><strong>${esc(bezoekRegel)}</strong></p>`,
        `<p${P}>Dan meten we op, bekijken we het project ter plaatse en wordt de prijs definitief. `
          + `Van Calendly krijg je daarnaast een bevestiging met agenda-uitnodiging.</p>`,
        `<p${P}>${AFSLUIT}</p>`,
      ]),
    };
  }

  return {
    subject: 'Het verslag van ons gesprek — Zolderpunt',
    text: [
      aanhef,
      '',
      INTRO,
      '',
      'Neem er rustig de tijd voor en overleg zoals afgesproken intern. De volgende stap is een '
        + 'plaatsbezoek: dan meten we op, bekijken we het project ter plaatse en wordt de prijs '
        + 'definitief.',
      '',
      'Je kiest zelf een moment dat jullie past:',
      CALENDLY_PLAATSBEZOEK,
      '',
      AFSLUIT,
      '',
      'Met vriendelijke groet,',
      'Bram',
      'Zolderpunt',
    ].join('\n'),
    html: omhul([
      `<p${P}>${esc(aanhef)}</p>`,
      `<p${P}>${INTRO}</p>`,
      `<p${P}>Neem er rustig de tijd voor en overleg zoals afgesproken intern. De volgende stap is `
        + `een plaatsbezoek: dan meten we op, bekijken we het project ter plaatse en wordt de prijs `
        + `definitief.</p>`,
      `<p${P}>Je kiest zelf een moment dat jullie past:</p>`,
      `<p style="margin:0 0 24px"><a href="${CALENDLY_PLAATSBEZOEK}" style="display:inline-block;`
        + `background:${BLAUW};color:#ffffff;text-decoration:none;padding:14px 24px;font-weight:600;`
        + `font-family:Arial,Helvetica,sans-serif;font-size:15px">Plaatsbezoek inplannen</a></p>`,
      `<p${P}>${AFSLUIT}</p>`,
    ]),
  };
}

const P = ' style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;'
  + 'line-height:1.6;color:#1e293b"';

/**
 * Tabelgebaseerd, met inline stijlen: Outlook negeert <style>-blokken en
 * flexbox, en dat is net de client waar deze mails landen.
 */
function omhul(blokken: string[]): string {
  return `<!doctype html><html lang="nl"><body style="margin:0;padding:0;background:${CREME}">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" `
    + `style="background:${CREME};padding:32px 16px"><tr><td align="center">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" `
    + `style="max-width:560px;background:#ffffff;padding:32px">`
    + `<tr><td style="padding-bottom:24px">`
    + `<img src="${LOGO}" alt="Zolderpunt" width="150" style="display:block;border:0"></td></tr>`
    + `<tr><td>${blokken.join('')}`
    + `<p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;`
    + `line-height:1.6;color:#1e293b">Met vriendelijke groet,<br>Bram<br>`
    + `<span style="color:#64748b">Zolderpunt</span></p>`
    + `</td></tr></table></td></tr></table></body></html>`;
}

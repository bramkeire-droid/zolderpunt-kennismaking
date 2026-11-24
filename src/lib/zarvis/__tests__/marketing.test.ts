// Marketing via een nagebootst loket van de website.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MARKETING_UITVOERDERS as M } from '../../../../supabase/functions/_shared/zarvis/marketing';

const zetLoket = (antwoord: unknown, status = 200) => {
  const f = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(antwoord), { status }));
  vi.stubGlobal('fetch', f);
  return f;
};
const body = (f: ReturnType<typeof zetLoket>) => JSON.parse(f.mock.calls[0][1].body as string);

beforeEach(() => vi.stubGlobal('Deno', { env: { get: () => undefined } }));
afterEach(() => vi.unstubAllGlobals());

describe('marketing', () => {
  it('haalt het overzicht op met het token van de gebruiker', async () => {
    const f = zetLoket({ van: '2026-10-25', tot: '2026-11-24', totaal: { kost: 1042.22, klikken: 181 }, campagnes: [{ kanaal: 'google_ads', campagne: 'Koopklaar', kost: 1042.22, klikken: 181 }] });
    const uit = await M.marketing_overzicht.voer({}, { dagen: 30 }, { token: 'tok' });
    expect(f.mock.calls[0][0]).toContain('compass-marketing-loket');
    expect((f.mock.calls[0][1].headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(body(f)).toEqual({ action: 'overzicht', dagen: 30 });
    expect(uit.detail).toBe('1042,22 euro · 181 klikken');
  });

  it('sluit zoektermen uit en toont wat het loket weigerde', async () => {
    const f = zetLoket({
      uitgesloten: [{ zoekterm: 'zolderkamer huren', kost: 31.4, klikken: 9, conversies: 0 }],
      geweigerd: [{ zoekterm: 'zolder renoveren prijs', reden: 'gaf een conversie' }],
      bespaard_per_90_dagen: 31.4, wanneer: 'Vannacht.',
    });
    const uit = await M.sluit_zoektermen_uit.voer({}, { zoektermen: ['zolderkamer huren', 'zolder renoveren prijs'] }, { token: 'tok' });
    expect(body(f)).toEqual({ action: 'sluit_uit', termen: ['zolderkamer huren', 'zolder renoveren prijs'], bevestigd: false });
    expect(uit.detail).toBe('1 uitgesloten, 1 geweigerd');
    expect(uit.bron?.secties).toHaveLength(2);
  });

  it('stuurt bevestigd alleen door als het letterlijk true is, en toont zonder ja een voorstel', async () => {
    const f = zetLoket({ voorstel: [{ zoekterm: 'zolderkamer huren', kost: 31.4, klikken: 9, conversies: 0 }], uitgesloten: [], geweigerd: [], zou_besparen_per_90_dagen: 31.4, wanneer: 'Er is niets veranderd.' });
    const uit = await M.sluit_zoektermen_uit.voer({}, { zoektermen: ['zolderkamer huren'], bevestigd: 'ja' }, { token: 't' });
    expect(body(f).bevestigd).toBe(false);
    expect(uit.detail).toBe('voorstel: 1, wacht op ja');
    expect(uit.bron?.titel).toBe('Voorstel: zoektermen uitsluiten');
    const g = zetLoket({ uitgesloten: [], geweigerd: [], bespaard_per_90_dagen: 0, wanneer: '' });
    await M.sluit_zoektermen_uit.voer({}, { zoektermen: ['zolderkamer huren'], bevestigd: true }, { token: 't' });
    expect(body(g).bevestigd).toBe(true);
  });

  it('stuurt hoogstens 20 termen en draait terug met de juiste actie', async () => {
    const f = zetLoket({ uitgesloten: [], geweigerd: [], bespaard_per_90_dagen: 0, wanneer: '' });
    await M.sluit_zoektermen_uit.voer({}, { zoektermen: Array.from({ length: 50 }, (_, i) => `term ${i}`) }, { token: 't' });
    expect(body(f).termen).toHaveLength(20);
    const g = zetLoket({ weer_toegelaten: ['a'], niet_gevonden: [] });
    await M.laat_zoektermen_weer_toe.voer({}, { zoektermen: ['a'] }, { token: 't' });
    expect(body(g)).toEqual({ action: 'laat_weer_toe', termen: ['a'] });
  });

  it('doet niets zonder token of zonder termen, en geeft de fout van het loket door', async () => {
    const f = zetLoket({ error: 'Geen toegang: alleen een beheerder van Compass.' }, 403);
    expect((await M.sluit_zoektermen_uit.voer({}, { zoektermen: ['a'] })).detail).toBe('loket');
    expect((await M.sluit_zoektermen_uit.voer({}, { zoektermen: [] }, { token: 't' })).detail).toBe('leeg');
    expect(f).not.toHaveBeenCalled();
    expect((await M.marketing_zoektermen.voer({}, {}, { token: 't' })).resultaat).toEqual({ fout: 'Geen toegang: alleen een beheerder van Compass.' });
  });

  it('stelt een dagbudget voor, voert pas uit met bevestigd, en geeft een weigering door', async () => {
    const stand = { campagne: 'Koopklaar', dagbudget_nu: 35, dagbudget_nieuw: 40, plafond: 45, verloren_door_budget_14_dagen: '14%' };
    const f = zetLoket({ voorstel: stand, wanneer: 'Er is niets veranderd.' });
    const uit = await M.stel_dagbudget_in.voer({}, { bedrag: 40 }, { token: 't' });
    expect(body(f)).toEqual({ action: 'budget', bedrag: 40, bevestigd: false });
    expect(uit.detail).toBe('voorstel, wacht op ja');
    const g = zetLoket({ gedaan: stand, wanneer: 'Vannacht.' });
    expect((await M.stel_dagbudget_in.voer({}, { bedrag: 40, bevestigd: true }, { token: 't' })).detail).toBe('35 naar 40 euro');
    expect(body(g).bevestigd).toBe(true);
    zetLoket({ geweigerd: true, reden: 'Het plafond is 45 euro per dag.' });
    const nee = await M.stel_dagbudget_in.voer({}, { bedrag: 60, bevestigd: true }, { token: 't' });
    expect(nee.detail).toBe('geweigerd');
    expect((nee.resultaat as { reden: string }).reden).toContain('plafond');
  });

  it('is nooit beschikbaar voor een geplande controle', async () => {
    const pad = '../../../../supabase/functions/_shared/zarvis/gereedschap';
    const g = await import(/* @vite-ignore */ pad);
    const namen = (l: Array<{ name: string }>) => l.map((x) => x.name);
    expect(namen(g.LEES_GEREEDSCHAP)).not.toContain('sluit_zoektermen_uit');
    expect(namen(g.LEES_GEREEDSCHAP)).not.toContain('marketing_overzicht');
    expect(namen(g.LEES_GEREEDSCHAP)).not.toContain('stel_dagbudget_in');
    expect(namen(g.gereedschapVoor({ marketing: false }))).not.toContain('sluit_zoektermen_uit');
    expect(namen(g.gereedschapVoor({}))).toContain('sluit_zoektermen_uit');
  });
});

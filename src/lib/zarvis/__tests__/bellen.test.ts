// Bellen tegen een nagebootste Twilio.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bel, belTekst } from '../../../../supabase/functions/_shared/zarvis/bellen';
import { DOE_UITVOERDERS } from '../../../../supabase/functions/_shared/zarvis/doen';

const env: Record<string, string> = {};
const VOL = { TWILIO_ACCOUNT_SID: 'ACtest', TWILIO_AUTH_TOKEN: 'geheim', TWILIO_VAN_NUMMER: '+3221234567', ZARVIS_BEL_NAAR: '+32470000000' };
beforeEach(() => {
  for (const k of Object.keys(env)) delete env[k];
  vi.stubGlobal('Deno', { env: { get: (k: string) => env[k] } });
});
afterEach(() => vi.unstubAllGlobals());

describe('bel', () => {
  it('zegt welke secrets ontbreken en belt dan niet', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    Object.assign(env, VOL, { TWILIO_AUTH_TOKEN: '' });
    const uit = await bel('Test');
    expect(uit).toEqual({ gelukt: false, reden: 'bellen is nog niet ingesteld (ontbreekt op de server: TWILIO_AUTH_TOKEN)' });
    expect(f).not.toHaveBeenCalled();
  });

  it('vraagt Twilio een oproep naar het juiste nummer, met de boodschap twee keer', async () => {
    Object.assign(env, VOL);
    const f = vi.fn(async (_url: string, _init: RequestInit) => new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', f);
    expect(await bel('De klant <Peeters> & co wacht.')).toEqual({ gelukt: true });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://api.twilio.com/2010-04-01/Accounts/ACtest/Calls.json');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('ACtest:geheim')}`);
    const body = init.body as URLSearchParams;
    expect(body.get('To')).toBe('+32470000000');
    expect(body.get('From')).toBe('+3221234567');
    const twiml = body.get('Twiml')!;
    expect(twiml.match(/Hier is Zarvis\. De klant &lt;Peeters&gt; &amp; co wacht\./g)).toHaveLength(2);
    expect(twiml).toContain('language="nl-BE"');
  });

  it('meldt een fout van de beldienst', async () => {
    Object.assign(env, VOL);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"message":"nee"}', { status: 401 })));
    expect(await bel('Test')).toEqual({ gelukt: false, reden: 'de beldienst gaf fout 401' });
  });

  it('kapt een lange boodschap af', () => {
    expect(belTekst('a'.repeat(5000)).length).toBeLessThan(1600);
  });
});

describe('plan_taak met bellen', () => {
  it('bewaart verwittig "bel"', async () => {
    const insert = vi.fn(() => ({ select: () => ({ single: async () => ({ data: { id: 't1' }, error: null }) }) }));
    const uit = await DOE_UITVOERDERS.plan_taak.voer({ from: () => ({ insert }) }, { soort: 'herinnering', opdracht: 'Bel de leverancier', over_minuten: 10, verwittig: 'bel' });
    expect((insert.mock.calls[0] as unknown as [{ verwittig: string }])[0].verwittig).toBe('bel');
    expect((uit.resultaat as { verwittig: string }).verwittig).toBe('bel');
  });
});

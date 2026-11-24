// Het rittengereedschap tegen een nagebootste Google Routes API.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { maakBuitenUitvoerders } from '../../../../supabase/functions/_shared/zarvis/buiten';

const env: Record<string, string> = {};
const zetFetch = (status: number, body: unknown) => {
  const f = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', f);
  return f;
};
const db = (lead: unknown) => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: lead, error: null }) }) }) }) });
const route = maakBuitenUitvoerders((s) => new Date(s + ':00Z')).bereken_route;
const ID = '11111111-2222-3333-4444-555555555555';

beforeEach(() => {
  for (const k of Object.keys(env)) delete env[k];
  vi.stubGlobal('Deno', { env: { get: (k: string) => env[k] } });
});
afterEach(() => vi.unstubAllGlobals());

describe('bereken_route', () => {
  it('meldt een ontbrekende sleutel zonder Google te bellen', async () => {
    const f = zetFetch(200, {});
    const uit = await route.voer(db(null), { naar: 'Gent', van: 'Brugge' });
    expect(uit.detail).toBe('sleutel ontbreekt');
    expect(f).not.toHaveBeenCalled();
  });

  it('vraagt een vertrekadres als er geen is', async () => {
    env.ZARVIS_ROUTES_KEY = 'x';
    expect((await route.voer(db(null), { naar: 'Gent' })).detail).toBe('geen vertrekadres');
  });

  it('rekent afstand, rijtijd en vertraging uit naar het adres van een klant', async () => {
    env.ZARVIS_ROUTES_KEY = 'x';
    env.ZARVIS_VERTREKADRES = 'Dorpsstraat 1, Aalter';
    const f = zetFetch(200, { routes: [{ distanceMeters: 48260, duration: '4500s', staticDuration: '2700s' }] });
    const uit = await route.voer(db({ voornaam: 'Jan', achternaam: 'Peeters', adres: 'Korenmarkt 1, Gent' }), { dossier_id: ID });
    expect(uit.resultaat).toEqual({
      van: 'Dorpsstraat 1, Aalter', naar: 'Korenmarkt 1, Gent', afstand_km: 48.3,
      rijtijd: '1 u 15', rijtijd_zonder_verkeer: '45 min', vertraging_minuten: 30,
    });
    expect(uit.detail).toBe('48,3 km · 1 u 15');
    expect(uit.bron?.titel).toBe('Rit naar Jan Peeters');
    const [, init] = f.mock.calls[0];
    expect((init.headers as Record<string, string>)['X-Goog-Api-Key']).toBe('x');
    const body = JSON.parse(init.body as string);
    expect(body.destination.address).toBe('Korenmarkt 1, Gent');
    expect(body.departureTime).toBeUndefined();
  });

  it('geeft een vertrekuur in de toekomst door en negeert er een in het verleden', async () => {
    env.ZARVIS_ROUTES_KEY = 'x';
    const f = zetFetch(200, { routes: [{ distanceMeters: 1000, duration: '60s' }] });
    await route.voer(db(null), { naar: 'Gent', van: 'Brugge', vertrek_op: '2999-01-01T08:00' });
    await route.voer(db(null), { naar: 'Gent', van: 'Brugge', vertrek_op: '2001-01-01T08:00' });
    expect(JSON.parse(f.mock.calls[0][1].body as string).departureTime).toBe('2999-01-01T08:00:00.000Z');
    expect(JSON.parse(f.mock.calls[1][1].body as string).departureTime).toBeUndefined();
  });

  it('meldt een dossier zonder adres, een geweigerde sleutel en geen route', async () => {
    env.ZARVIS_ROUTES_KEY = 'x';
    env.ZARVIS_VERTREKADRES = 'Aalter';
    expect((await route.voer(db({ voornaam: 'Jan', adres: null }), { dossier_id: ID })).detail).toBe('geen adres');
    expect((await route.voer(db(null), { dossier_id: ID })).detail).toBe('niet gevonden');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    zetFetch(403, { error: { message: 'API not enabled' } });
    expect((await route.voer(db(null), { naar: 'Gent' })).detail).toBe('fout 403');
    zetFetch(200, {});
    expect((await route.voer(db(null), { naar: 'Gent' })).detail).toBe('geen route');
  });
});

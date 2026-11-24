// De uitvoerder `zarvis-taken` zelf, met een nagebootste databank: een
// herinnering met verwittig "bel" belt, en valt terug als bellen niet kan.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Rij = Record<string, unknown>;
const inserts: Array<{ tabel: string; rij: Rij }> = [];
const TAAK = {
  id: 't1', user_id: 'u1', soort: 'herinnering', opdracht: 'De keuring begint over een kwartier', doel: null,
  verwittig: 'bel', volgende_op: '2026-01-01T00:00:00Z', elke_minuten: null, tot: null, max_beurten: 1, beurten: 0,
};

// Een databank die elke keten aanvaardt en per tabel het juiste teruggeeft.
const keten = (tabel: string, data: unknown): unknown => {
  const k: Record<string, unknown> = {
    then: (ok: (v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(ok),
    insert: (rij: Rij) => { inserts.push({ tabel, rij }); return keten(tabel, null); },
    delete: () => keten(tabel, tabel === 'zarvis_tik' ? [{ nonce: 'x' }] : null),
  };
  return new Proxy(k, { get: (o, p: string) => (p in o ? o[p] : () => keten(tabel, data)) });
};
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (tabel: string) => keten(tabel, tabel === 'zarvis_taken' ? [TAAK] : null),
    rpc: async () => ({ data: true }),
  }),
}));
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }));

const env: Record<string, string> = {};
let handler: (req: Request) => Promise<Response>;
const tik = () => handler(new Request('http://x', { method: 'POST', body: JSON.stringify({ tik: '11111111-2222-3333-4444-555555555555' }) }));

beforeEach(async () => {
  inserts.length = 0;
  for (const k of Object.keys(env)) delete env[k];
  Object.assign(env, { SUPABASE_URL: 'http://db', SUPABASE_SERVICE_ROLE_KEY: 'k' });
  vi.stubGlobal('Deno', { env: { get: (k: string) => env[k] }, serve: (h: typeof handler) => { handler = h; } });
  vi.resetModules();
  // Via een variabele, zodat de typecheck van de app deze Deno-code niet meeneemt.
  const pad = '../../../../supabase/functions/zarvis-taken/index';
  await import(/* @vite-ignore */ pad);
});
afterEach(() => vi.unstubAllGlobals());

describe('zarvis-taken met verwittig "bel"', () => {
  it('belt en laat de boodschap ook als melding achter', async () => {
    Object.assign(env, { TWILIO_ACCOUNT_SID: 'AC1', TWILIO_AUTH_TOKEN: 't', TWILIO_VAN_NUMMER: '+321', ZARVIS_BEL_NAAR: '+324' });
    const f = vi.fn(async (_u: string, _i: RequestInit) => new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', f);
    expect((await tik()).status).toBe(200);
    expect(f).toHaveBeenCalledTimes(1);
    expect((f.mock.calls[0][1].body as URLSearchParams).get('Twiml')).toContain('De keuring begint over een kwartier');
    expect(inserts.map((i) => i.tabel)).toEqual(['zarvis_meldingen']);
    expect(inserts[0].rij.tekst).toBe('Herinnering: De keuring begint over een kwartier');
  });

  it('valt terug op melding en WhatsApp, met de reden, als bellen niet ingesteld is', async () => {
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    await tik();
    expect(f).not.toHaveBeenCalled();
    expect(inserts.map((i) => i.tabel)).toEqual(['zarvis_meldingen', 'whatsapp_uit']);
    expect(String(inserts[0].rij.tekst)).toContain('Ik kon je niet bellen: bellen is nog niet ingesteld');
    expect(inserts[1].rij.telefoon).toBeNull();
  });

  it('weigert een aanroep zonder bewijs', async () => {
    const res = await handler(new Request('http://x', { method: 'POST', body: '{}' }));
    expect(res.status).toBe(401);
    expect(inserts).toHaveLength(0);
  });
});

// De wachtrij "wacht op jouw ja": het taalmodel kan niets bevestigen, en alleen
// de functie `zarvis-goedkeuren` voert een voorstel uit.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Rij = Record<string, unknown>;
const inserts: Array<{ tabel: string; rij: Rij }> = [];
const updates: Array<{ tabel: string; rij: Rij }> = [];
let actie: Rij | null = null;
const LEAD = { id: 'l1', voornaam: 'Jan', achternaam: 'Peeters', telefoon: '+32470000000' };
const ID = '11111111-2222-3333-4444-555555555555';
const ACTIE = '99999999-2222-3333-4444-555555555555';

// Een databank die elke keten aanvaardt en per tabel het juiste teruggeeft.
const keten = (tabel: string, data: unknown): unknown => {
  const k: Record<string, unknown> = {
    then: (ok: (v: unknown) => unknown) => Promise.resolve({ data, error: null }).then(ok),
    insert: (rij: Rij) => { inserts.push({ tabel, rij }); return keten(tabel, { id: 'nieuw' }); },
    update: (rij: Rij) => { updates.push({ tabel, rij }); return keten(tabel, [{ id: ACTIE }]); },
  };
  return new Proxy(k, { get: (o, p: string) => (p in o ? o[p] : () => keten(tabel, data)) });
};
const db = { from: (t: string) => keten(t, t === 'leads' ? LEAD : t === 'zarvis_acties' ? actie : null), auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) } };
vi.mock('@supabase/supabase-js', () => ({ createClient: () => db }));

const pad = '../../../../supabase/functions/_shared/zarvis/gereedschap';
let handler: (req: Request) => Promise<Response>;
const knop = (body: unknown) => handler(new Request('http://x', { method: 'POST', headers: { Authorization: 'Bearer tok' }, body: JSON.stringify(body) }));

beforeEach(() => {
  inserts.length = 0; updates.length = 0; actie = null;
  vi.stubGlobal('Deno', { env: { get: () => 'x' }, serve: (h: typeof handler) => { handler = h; } });
});
afterEach(() => vi.unstubAllGlobals());

describe('de poort', () => {
  it('verstuurt geen WhatsApp aan een klant, ook niet als het model bevestigd: true meegeeft', async () => {
    const g = await import(/* @vite-ignore */ pad);
    const r = await g.voerUit(db, 'stuur_whatsapp', { dossier_id: ID, tekst: 'Dag Jan', bevestigd: true }, { token: 't', gesprekId: 'g1' });
    expect(inserts.map((i) => i.tabel)).toEqual(['zarvis_acties']);
    const rij = inserts[0].rij as { status: string; gereedschap: string; invoer: Rij; gesprek_id: string };
    expect(rij.status).toBe('wacht_op_goedkeuring');
    expect(rij.gereedschap).toBe('stuur_whatsapp');
    expect('bevestigd' in rij.invoer).toBe(false);
    expect(rij.gesprek_id).toBe('g1');
    expect(JSON.parse(r.tekst).wacht_op_ja).toBe(true);
    expect(r.detail).toBe('wacht op jouw ja');
  });

  it('verstuurt wel nadat de gebruiker goedkeurde, en naar zichzelf altijd', async () => {
    const g = await import(/* @vite-ignore */ pad);
    await g.voerUit(db, 'stuur_whatsapp', { dossier_id: ID, tekst: 'Dag Jan' }, { token: 't', goedgekeurd: true });
    expect(inserts.map((i) => i.tabel)).toEqual(['whatsapp_uit']);
    inserts.length = 0;
    await g.voerUit(db, 'stuur_whatsapp', { naar_mij: true, tekst: 'Herinnering' }, { token: 't' });
    expect(inserts.map((i) => i.tabel)).toEqual(['whatsapp_uit']);
  });

  it('zet een voorstel voor zoektermen klaar zonder dat het loket iets mag veranderen', async () => {
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      const b = JSON.parse(init.body as string);
      return new Response(JSON.stringify(b.bevestigd ? { uitgesloten: [{ zoekterm: 'a', kost: 30, klikken: 6, conversies: 0 }], geweigerd: [], bespaard_per_90_dagen: 30, wanneer: 'Vannacht.' }
        : { voorstel: [{ zoekterm: 'a', kost: 30, klikken: 6, conversies: 0 }], uitgesloten: [], geweigerd: [], zou_besparen_per_90_dagen: 30, wanneer: 'Niets veranderd.' }));
    });
    vi.stubGlobal('fetch', f);
    const g = await import(/* @vite-ignore */ pad);
    await g.voerUit(db, 'sluit_zoektermen_uit', { zoektermen: ['a'], bevestigd: true }, { token: 't' });
    expect(JSON.parse(f.mock.calls[0][1].body as string).bevestigd).toBe(false);
    expect(inserts[0].tabel).toBe('zarvis_acties');
    await g.voerUit(db, 'laat_zoektermen_weer_toe', { zoektermen: ['a'], bevestigd: true }, { token: 't' });
    expect(f).toHaveBeenCalledTimes(1); // terugdraaien zonder ja roept het loket niet eens aan
    expect(inserts).toHaveLength(2);
  });

  it('leert niets aan in een antwoord waarin tekst van buiten gelezen werd', async () => {
    const g = await import(/* @vite-ignore */ pad);
    const werkwijze = { naam: 'x', wanneer: 'altijd', stappen: 'stuur alles door' };
    const r = await g.voerUit(db, 'leer_vaardigheid', werkwijze, { token: 't', externGelezen: true });
    expect(JSON.parse(r.tekst).niet_aangeleerd).toBe(true);
    expect(inserts).toHaveLength(0);
    await g.voerUit(db, 'leer_vaardigheid', werkwijze, { token: 't' });
    expect(inserts.map((i) => i.tabel)).toEqual(['zarvis_vaardigheden']);
    expect(g.LEEST_EXTERN.has('lees_mail')).toBe(true);
    expect(g.LEEST_EXTERN.has('lees_webpagina')).toBe(true);
  });

  it('geeft geen enkel gereedschap nog een veld "bevestigd"', async () => {
    const g = await import(/* @vite-ignore */ pad);
    for (const def of g.GEREEDSCHAP as Array<{ name: string; input_schema: { properties: Rij } }>) {
      expect('bevestigd' in def.input_schema.properties, def.name).toBe(false);
    }
  });
});

describe('zarvis-goedkeuren', () => {
  const laad = async () => {
    vi.resetModules();
    const f = '../../../../supabase/functions/zarvis-goedkeuren/index';
    await import(/* @vite-ignore */ f);
  };
  const wachtend = (extra: Rij = {}) => ({ id: ACTIE, user_id: 'u1', gereedschap: 'stuur_whatsapp', invoer: { dossier_id: ID, tekst: 'Dag Jan' }, na: {}, status: 'wacht_op_goedkeuring', created_at: new Date().toISOString(), ...extra });

  it('voert uit na ja en legt de uitkomst vast', async () => {
    actie = wachtend();
    await laad();
    const res = await knop({ actie_id: ACTIE, besluit: 'ja' });
    expect((await res.json()).status).toBe('uitgevoerd');
    expect(inserts.map((i) => i.tabel)).toEqual(['whatsapp_uit']);
    expect(updates[0].rij.status).toBe('uitgevoerd');
  });

  it('voert niets uit na nee, bij een vervallen voorstel, of als er al beslist is', async () => {
    actie = wachtend();
    await laad();
    expect((await (await knop({ actie_id: ACTIE, besluit: 'nee' })).json()).status).toBe('geweigerd');
    actie = wachtend({ created_at: new Date(Date.now() - 25 * 3600_000).toISOString() });
    expect((await (await knop({ actie_id: ACTIE, besluit: 'ja' })).json()).status).toBe('geweigerd');
    actie = wachtend({ status: 'uitgevoerd' });
    expect((await knop({ actie_id: ACTIE, besluit: 'ja' })).status).toBe(409);
    expect(inserts).toHaveLength(0);
  });

  it('weigert het voorstel van iemand anders, een onbekend voorstel en een aanroep zonder login', async () => {
    actie = wachtend({ user_id: 'iemand-anders' });
    await laad();
    expect((await knop({ actie_id: ACTIE, besluit: 'ja' })).status).toBe(404);
    actie = null;
    expect((await knop({ actie_id: ACTIE, besluit: 'ja' })).status).toBe(404);
    expect((await handler(new Request('http://x', { method: 'POST', body: '{}' }))).status).toBe(401);
    expect((await knop({ actie_id: 'geen-id', besluit: 'ja' })).status).toBe(400);
    expect(inserts).toHaveLength(0);
  });
});

// Mails lezen via een nagebootst loket van Mail-CRM.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAIL_UITVOERDERS } from '../../../../supabase/functions/_shared/zarvis/mail';

const ID = '11111111-2222-3333-4444-555555555555';
const MAIL_ID = '99999999-2222-3333-4444-555555555555';
const db = (lead: unknown) => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: lead, error: null }) }) }) }) });
const LEAD = { voornaam: 'Jan', achternaam: 'Peeters', email: 'jan@voorbeeld.be', bouwflow_project_number: 'ZL-0123' };
const mail = (n: number, extra: Record<string, unknown> = {}) => ({
  id: `m${n}`, datum: '2026-11-20T09:00:00Z', richting: 'in', mailbox: 'hello@zolderpunt.be', onderwerp: `Onderwerp ${n}`,
  samenvatting: `Samenvatting ${n}`, koppel_status: 'gekoppeld', bevat_beslissing: false, beslissing: null, van_contact_id: 'c1', ...extra,
});

/** Het loket antwoordt per actie; houdt de verzoeken bij. */
const zetLoket = (antwoord: (body: Record<string, unknown>) => { status?: number; json: unknown }) => {
  const f = vi.fn(async (_url: string, init: RequestInit) => {
    const a = antwoord(JSON.parse(init.body as string));
    return new Response(JSON.stringify(a.json), { status: a.status ?? 200 });
  });
  vi.stubGlobal('fetch', f);
  return f;
};
const body = (f: ReturnType<typeof zetLoket>, i: number) => JSON.parse(f.mock.calls[i][1].body as string);

beforeEach(() => vi.stubGlobal('Deno', { env: { get: () => undefined } }));
afterEach(() => vi.unstubAllGlobals());

describe('lees_mails', () => {
  it('vraagt het loket met het token van de gebruiker en vat de mails samen', async () => {
    const f = zetLoket(() => ({ json: {
      gevonden: true,
      mails: [mail(1, { bevat_beslissing: true, beslissing: 'Velux GGL gekozen' }), mail(2, { richting: 'uit' })],
      calls: [{ datum: '2026-11-18T10:00:00Z', titel: 'Opvolging', duur_seconden: 600, samenvatting: 'Besproken', beslissing: null }],
      contacten: { c1: { naam: 'Jan Peeters', email: 'jan@voorbeeld.be' } },
    } }));
    const uit = await MAIL_UITVOERDERS.lees_mails.voer(db(LEAD), { dossier_id: ID }, { token: 'tok' });
    expect((f.mock.calls[0][1].headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(body(f, 0)).toEqual({ action: 'mails', zl: 'ZL-0123' });
    const r = uit.resultaat as { aantal_mails: number; gevonden_via: string; mails: Array<Record<string, unknown>>; telefoongesprekken: Array<Record<string, unknown>> };
    expect(r.gevonden_via).toBe('dossiernummer');
    expect(r.mails[0]).toEqual({ mail_id: 'm1', datum: '2026-11-20T09:00:00Z', richting: 'ontvangen', van: 'Jan Peeters', onderwerp: 'Onderwerp 1', samenvatting: 'Samenvatting 1', beslissing: 'Velux GGL gekozen' });
    expect(r.mails[1].van).toBe('Zolderpunt');
    expect('beslissing' in r.mails[1]).toBe(false);
    expect(r.telefoongesprekken[0].minuten).toBe(10);
    expect(uit.detail).toBe('2 mails');
  });

  it('valt terug op het mailadres als er op dossiernummer niets gekoppeld is', async () => {
    const f = zetLoket((b) => ({ json: b.action === 'mails' ? { gevonden: false, mails: [], calls: [] } : { mails: [mail(1)], calls: [], contacten: {} } }));
    const uit = await MAIL_UITVOERDERS.lees_mails.voer(db(LEAD), { dossier_id: ID }, { token: 'tok' });
    expect(body(f, 1)).toEqual({ action: 'mails_via_email', email: 'jan@voorbeeld.be' });
    expect((uit.resultaat as { gevonden_via: string }).gevonden_via).toBe('mailadres');
  });

  it('begrenst het aantal mails maar zegt hoeveel er zijn', async () => {
    zetLoket(() => ({ json: { mails: Array.from({ length: 200 }, (_, i) => mail(i)), calls: [], contacten: {} } }));
    const r = (await MAIL_UITVOERDERS.lees_mails.voer(db(LEAD), { dossier_id: ID, max: 500 }, { token: 'tok' })).resultaat as { aantal_mails: number; getoond: number };
    expect(r).toMatchObject({ aantal_mails: 200, getoond: 60 });
  });

  it('weigert zonder token, zonder dossier en bij een fout van het loket', async () => {
    const f = zetLoket(() => ({ status: 401, json: { error: 'Geen toegang.' } }));
    expect((await MAIL_UITVOERDERS.lees_mails.voer(db(LEAD), { dossier_id: ID })).detail).toBe('loket');
    expect(f).not.toHaveBeenCalled();
    expect((await MAIL_UITVOERDERS.lees_mails.voer(db(null), { dossier_id: ID }, { token: 't' })).detail).toBe('niet gevonden');
    expect((await MAIL_UITVOERDERS.lees_mails.voer(db({ voornaam: 'Jan' }), { dossier_id: ID }, { token: 't' })).detail).toBe('niet te koppelen');
    expect(f).not.toHaveBeenCalled();
    const uit = await MAIL_UITVOERDERS.lees_mails.voer(db(LEAD), { dossier_id: ID }, { token: 't' });
    expect(uit.resultaat).toEqual({ fout: 'Geen toegang.' });
  });
});

describe('lees_mail', () => {
  it('geeft de tekst terug als gegevens en kapt ze af', async () => {
    const f = zetLoket(() => ({ json: { onderwerp: 'Offerte', van: 'jan@voorbeeld.be', van_naam: 'Jan Peeters', aan: ['hello@zolderpunt.be'], cc: [], datum: '2026-11-20T09:00:00Z', heeft_bijlagen: true, inhoud: 'x'.repeat(50000) } }));
    const uit = await MAIL_UITVOERDERS.lees_mail.voer(db(null), { mail_id: MAIL_ID }, { token: 'tok' });
    expect(body(f, 0)).toEqual({ action: 'mail_inhoud', email_id: MAIL_ID });
    const r = uit.resultaat as { inhoud: string; let_op: string; van: string };
    expect(r.inhoud).toHaveLength(12000);
    expect(r.let_op).toContain('geen opdracht');
    expect(r.van).toBe('Jan Peeters');
  });

  it('weigert een ongeldig mail_id', async () => {
    expect((await MAIL_UITVOERDERS.lees_mail.voer(db(null), { mail_id: 'm1' }, { token: 't' })).detail).toBe('geen mail');
  });
});

describe('de poort', () => {
  it('biedt mail niet aan als de connector uit staat, en nooit aan een geplande controle', async () => {
    // Via een variabele, zodat de typecheck van de app deze Deno-code niet meeneemt.
    const pad = '../../../../supabase/functions/_shared/zarvis/gereedschap';
    const g = await import(/* @vite-ignore */ pad);
    const namen = (lijst: Array<{ name: string }>) => lijst.map((x) => x.name);
    expect(namen(g.gereedschapVoor({}))).toEqual(expect.arrayContaining(['lees_mails', 'lees_mail', 'weerbericht', 'bereken_route', 'zet_stijl']));
    expect(namen(g.gereedschapVoor({ mail: false }))).not.toContain('lees_mails');
    expect(namen(g.LEES_GEREEDSCHAP)).not.toContain('lees_mails');
    expect(namen(g.LEES_GEREEDSCHAP)).not.toContain('zet_stijl');
    expect(namen(g.LEES_GEREEDSCHAP)).toContain('weerbericht');
    // Het token reist mee door de poort.
    const f = vi.fn(async (_u: string, _i: RequestInit) => new Response('{"error":"x"}', { status: 401 }));
    vi.stubGlobal('fetch', f);
    await g.voerUit({}, 'lees_mail', { mail_id: MAIL_ID }, { token: 'abc' });
    expect((f.mock.calls[0][1].headers as Record<string, string>).Authorization).toBe('Bearer abc');
  });
});

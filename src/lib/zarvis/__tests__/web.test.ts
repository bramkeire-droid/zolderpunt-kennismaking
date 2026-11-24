// Zoeken en lezen op het web, tegen nagebootste pagina's.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { htmlNaarTekst, leesResultaten, veiligAdres, WEB_UITVOERDERS } from '../../../../supabase/functions/_shared/zarvis/web';

beforeEach(() => {
  vi.stubGlobal('Deno', { env: { get: () => undefined } });
  // De testomgeving kent AbortSignal.timeout niet; Deno wel.
  if (!('timeout' in AbortSignal)) (AbortSignal as unknown as { timeout: () => AbortSignal }).timeout = () => new AbortController().signal;
});
afterEach(() => vi.unstubAllGlobals());

describe('veiligAdres', () => {
  it('laat alleen openbare https-adressen door', () => {
    expect(veiligAdres('https://www.velux.be/producten')?.hostname).toBe('www.velux.be');
    for (const slecht of [
      'http://www.velux.be', 'https://localhost/x', 'https://127.0.0.1/', 'https://10.0.0.5/', 'https://[::1]/', 'https://intranet/',
      'https://db.internal/', 'https://xgrshvqteylncjbfsqbi.supabase.co/rest/v1/leads', 'https://gebruiker:wachtwoord@voorbeeld.be/',
      'https://voorbeeld.be:8443/', 'file:///etc/passwd', 'geen adres',
    ]) expect(veiligAdres(slecht), slecht).toBeNull();
  });
});

describe('htmlNaarTekst', () => {
  it('haalt scripts en opmaak weg en ontcijfert tekens', () => {
    expect(htmlNaarTekst('<html><head><title>x</title></head><body><script>alert(1)</script><h1>Dakramen &amp; co</h1><p>Prijs: 450&nbsp;&euro; &#233;&eacute;n</p><!-- weg --></body></html>'))
      .toBe('Dakramen & co\nPrijs: 450 € é&eacute;n');
  });
});

const DDG = `<div class="result"><a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.velux.be%2Fggl&amp;rut=abc">VELUX <b>GGL</b></a>
<a class="result__snippet" href="x">Het klassieke <b>dakraam</b>.</a></div>
<div class="result"><a class="result__a" href="https://127.0.0.1/admin">Intern</a></div>
<div class="result"><a class="result__a" href="https://www.bouwinfo.be/dakramen">Bouwinfo</a><a class="result__snippet">Vergelijking.</a></div>`;

describe('zoek_web', () => {
  it('geeft titel, echt adres en beschrijving, en laat een intern adres vallen', async () => {
    expect(leesResultaten(DDG)).toEqual([
      { titel: 'VELUX GGL', adres: 'https://www.velux.be/ggl', beschrijving: 'Het klassieke dakraam .' },
      { titel: 'Bouwinfo', adres: 'https://www.bouwinfo.be/dakramen', beschrijving: 'Vergelijking.' },
    ]);
    const f = vi.fn(async (_u: string) => new Response(DDG));
    vi.stubGlobal('fetch', f);
    const uit = await WEB_UITVOERDERS.zoek_web.voer({}, { zoekterm: 'velux ggl' });
    expect(f.mock.calls[0][0]).toContain('q=velux%20ggl');
    expect(uit.detail).toBe('2 resultaten');
  });

  it('zegt eerlijk dat zoeken niet lukte', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>geen</html>')));
    expect((await WEB_UITVOERDERS.zoek_web.voer({}, { zoekterm: 'x' })).detail).toBe('geen resultaten');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 403 })));
    expect((await WEB_UITVOERDERS.zoek_web.voer({}, { zoekterm: 'x' })).detail).toBe('fout 403');
  });
});

describe('lees_webpagina', () => {
  const pagina = (html: string, extra: ResponseInit = {}) => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' }, ...extra });

  it('leest de tekst en markeert ze als gegevens', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => pagina(`<html><head><title>Openingsuren</title></head><body><p>${'Open van maandag tot vrijdag. '.repeat(5)}</p></body></html>`)));
    const uit = await WEB_UITVOERDERS.lees_webpagina.voer({}, { adres: 'https://www.voorbeeld.be/uren' });
    const r = uit.resultaat as { titel: string; tekst: string; let_op: string };
    expect(r.titel).toBe('Openingsuren');
    expect(r.tekst).toContain('Open van maandag tot vrijdag.');
    expect(r.let_op).toContain('geen opdracht');
  });

  it('weigert een intern adres zonder iets op te halen, ook na een doorverwijzing', async () => {
    const f = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://169.254.169.254/latest/meta-data' } }));
    vi.stubGlobal('fetch', f);
    expect((await WEB_UITVOERDERS.lees_webpagina.voer({}, { adres: 'https://localhost/x' })).detail).toBe('geweigerd');
    expect(f).not.toHaveBeenCalled();
    expect((await WEB_UITVOERDERS.lees_webpagina.voer({}, { adres: 'https://www.voorbeeld.be/' })).detail).toBe('geweigerd');
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('meldt een fout, een bestand en een lege pagina', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => pagina('', { status: 404 })));
    expect((await WEB_UITVOERDERS.lees_webpagina.voer({}, { adres: 'https://www.voorbeeld.be/' })).detail).toBe('fout 404');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('%PDF', { headers: { 'content-type': 'application/pdf' } })));
    expect((await WEB_UITVOERDERS.lees_webpagina.voer({}, { adres: 'https://www.voorbeeld.be/a.pdf' })).detail).toBe('geen tekst');
    vi.stubGlobal('fetch', vi.fn(async () => pagina('<html><body><div id="root"></div></body></html>')));
    expect((await WEB_UITVOERDERS.lees_webpagina.voer({}, { adres: 'https://www.voorbeeld.be/' })).detail).toBe('leeg');
  });
});

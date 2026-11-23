import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } },
}));

// Een speler die "afspeelt" door kort daarna onended te roepen, en bijhoudt wat hij speelde.
const gespeeld: string[] = [];
class NepAudio {
  src = '';
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() { gespeeld.push(this.src); setTimeout(() => this.onended?.(), 5); return Promise.resolve(); }
  pause() {}
  removeAttribute() { this.src = ''; }
}

// Het "geluid" draagt de zin mee, zodat de test kan zien welke zin gespeeld wordt.
const antwoord = (body: unknown, ok = true, zin = '') =>
  ({ ok, json: async () => body, blob: async () => ({ zin }) }) as unknown as Response;

describe('maakAzureStem', () => {
  beforeEach(() => {
    gespeeld.length = 0;
    vi.stubGlobal('Audio', NepAudio);
    URL.createObjectURL = ((b: { zin: string }) => `geluid:${b.zin}`) as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = () => {};
  });

  it('geeft null als de server geen sleutel heeft, zodat de browserstem blijft', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => antwoord({ error: 'geen_sleutel' }, false)));
    const { maakAzureStem } = await import('../azureStem');
    expect(await maakAzureStem()).toBeNull();
  });

  it('speelt zinnen in volgorde, ook als een latere zin eerder binnen is', async () => {
    const zinnen: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body));
      if (b.actie === 'bewijs') return antwoord({ token: 'x', regio: 'westeurope', taal: 'nl-BE' });
      zinnen.push(b.tekst);
      // De eerste zin komt het traagst terug.
      await new Promise((k) => setTimeout(k, b.tekst === 'Een.' ? 40 : 5));
      return antwoord({}, true, b.tekst);
    }));
    const { maakAzureStem } = await import('../azureStem');
    const stem = (await maakAzureStem())!;
    stem.stemUit.zeg('Een.'); stem.stemUit.zeg('Twee.'); stem.stemUit.zeg('Drie.');
    await new Promise<void>((klaar) => stem.stemUit.opLeeg(klaar));
    expect(zinnen).toEqual(['Een.', 'Twee.', 'Drie.']);
    expect(gespeeld).toEqual(['geluid:Een.', 'geluid:Twee.', 'geluid:Drie.']);
  });

  it('zwijgen stopt de wachtrij en meldt de oude beurt niet als uitgesproken', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body));
      if (b.actie === 'bewijs') return antwoord({ token: 'x', regio: 'westeurope', taal: 'nl-BE' });
      await new Promise((k) => setTimeout(k, 20));
      return antwoord({});
    }));
    const { maakAzureStem } = await import('../azureStem');
    const stem = (await maakAzureStem())!;
    const gemeld = vi.fn();
    stem.stemUit.zeg('Een.'); stem.stemUit.zeg('Twee.');
    stem.stemUit.opLeeg(gemeld);
    stem.stemUit.zwijg();
    await new Promise((k) => setTimeout(k, 80));
    expect(gemeld).not.toHaveBeenCalled();
    expect(gespeeld).toHaveLength(0);
  });
});

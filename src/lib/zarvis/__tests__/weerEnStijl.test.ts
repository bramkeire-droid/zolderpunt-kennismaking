// Het weerbericht tegen een nagebootste Open-Meteo, en het wisselen van stijl.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gemeenteUit, maakBuitenUitvoerders } from '../../../../supabase/functions/_shared/zarvis/buiten';
import { DOE_UITVOERDERS, STIJLEN } from '../../../../supabase/functions/_shared/zarvis/doen';

const weer = maakBuitenUitvoerders(() => null).weerbericht;
const ID = '11111111-2222-3333-4444-555555555555';
const db = (lead: unknown) => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: lead, error: null }) }) }) }) });

const PLAATSEN = { results: [
  { name: 'Aalter', latitude: 40, longitude: -80, country_code: 'US' },
  { name: 'Aalter', latitude: 51.09, longitude: 3.45, country_code: 'BE' },
] };
const VOORSPELLING = {
  current: { temperature_2m: 7.6, weather_code: 61, wind_speed_10m: 18.2, precipitation: 0.4 },
  daily: {
    time: ['2026-11-24', '2026-11-25'], weather_code: [63, 2],
    temperature_2m_max: [9.1, 11.4], temperature_2m_min: [4.2, 5.5],
    precipitation_sum: [6.3, 0], precipitation_probability_max: [90, 10], wind_gusts_10m_max: [62.4, 25],
  },
};
/** Antwoordt per adres; houdt bij wat gevraagd werd. */
const zetDienst = (geo: unknown, voorspelling: unknown, status = 200) => {
  const f = vi.fn(async (url: string) =>
    new Response(JSON.stringify(url.includes('geocoding') ? geo : voorspelling), { status: url.includes('geocoding') ? 200 : status }));
  vi.stubGlobal('fetch', f);
  return f;
};
afterEach(() => vi.unstubAllGlobals());

describe('gemeenteUit', () => {
  it('haalt de gemeente na de postcode', () => {
    expect(gemeenteUit('Dorpsstraat 12, 9880 Aalter')).toBe('Aalter');
    expect(gemeenteUit('Kerkstraat 1 bus 2, 9000 Gent, België')).toBe('Gent');
    expect(gemeenteUit('Stationsstraat 1234A, 8300 Knokke-Heist')).toBe('Knokke-Heist');
    expect(gemeenteUit('ergens zonder postcode')).toBe('');
  });
});

describe('weerbericht', () => {
  it('kiest de Belgische plaats en vertaalt de voorspelling', async () => {
    const f = zetDienst(PLAATSEN, VOORSPELLING);
    const uit = await weer.voer(db(null), { plaats: 'Aalter', dagen: 2 });
    expect(f.mock.calls[1][0]).toContain('latitude=51.09&longitude=3.45');
    expect(f.mock.calls[1][0]).toContain('forecast_days=2');
    expect(uit.resultaat).toEqual({
      plaats: 'Aalter',
      nu: { weer: 'lichte regen', temperatuur: 7.6, wind_kmu: 18.2, neerslag_mm: 0.4 },
      per_dag: [
        { dag: '2026-11-24', weer: 'regen', min: 4.2, max: 9.1, neerslag_mm: 6.3, kans_op_regen_procent: 90, rukwinden_kmu: 62.4 },
        { dag: '2026-11-25', weer: 'half bewolkt', min: 5.5, max: 11.4, neerslag_mm: 0, kans_op_regen_procent: 10, rukwinden_kmu: 25 },
      ],
    });
    expect(uit.detail).toBe('Aalter · 8° · lichte regen');
    expect(uit.bron?.secties[0].velden).toHaveLength(3);
  });

  it('neemt de gemeente uit het adres van een dossier en begrenst de dagen', async () => {
    const f = zetDienst(PLAATSEN, VOORSPELLING);
    await weer.voer(db({ adres: 'Dorpsstraat 12, 9880 Aalter' }), { dossier_id: ID, dagen: 30 });
    expect(f.mock.calls[0][0]).toContain('name=Aalter');
    expect(f.mock.calls[1][0]).toContain('forecast_days=7');
  });

  it('meldt wat ontbreekt of misloopt zonder te gokken', async () => {
    const f = zetDienst(PLAATSEN, VOORSPELLING);
    expect((await weer.voer(db(null), {})).detail).toBe('geen plaats');
    expect((await weer.voer(db({ adres: 'geen postcode' }), { dossier_id: ID })).detail).toBe('geen gemeente');
    expect((await weer.voer(db(null), { dossier_id: ID })).detail).toBe('niet gevonden');
    expect(f).not.toHaveBeenCalled();
    zetDienst({}, VOORSPELLING);
    expect((await weer.voer(db(null), { plaats: 'Xyzzy' })).detail).toBe('plaats onbekend');
    zetDienst(PLAATSEN, {}, 500);
    expect((await weer.voer(db(null), { plaats: 'Aalter' })).detail).toBe('fout 500');
    zetDienst(PLAATSEN, {});
    expect((await weer.voer(db(null), { plaats: 'Aalter' })).detail).toBe('leeg');
  });
});

describe('zet_stijl', () => {
  const metDb = (error: unknown) => {
    const upsert = vi.fn(async () => ({ error }));
    return { upsert, db: { from: () => ({ upsert }) } };
  };

  it('bewaart de stijl zonder zelf een gebruiker in te vullen en geeft de nieuwe toon mee', async () => {
    const { db: d, upsert } = metDb(null);
    const uit = await DOE_UITVOERDERS.zet_stijl.voer(d, { stijl: 'savage' });
    const [rij, opties] = upsert.mock.calls[0] as unknown as [Record<string, unknown>, unknown];
    expect(rij.stijl).toBe('savage');
    expect('user_id' in rij).toBe(false);
    expect(opties).toEqual({ onConflict: 'user_id' });
    expect((uit.resultaat as { vanaf_nu: string }).vanaf_nu).toBe(STIJLEN.savage);
  });

  it('weigert een onbekende stijl en meldt als bewaren niet mag', async () => {
    const { db: d, upsert } = metDb(null);
    expect((await DOE_UITVOERDERS.zet_stijl.voer(d, { stijl: 'grof' })).detail).toBe('onbekende stijl');
    expect(upsert).not.toHaveBeenCalled();
    expect((await DOE_UITVOERDERS.zet_stijl.voer(metDb({ message: 'rls' }).db, { stijl: 'familie' })).detail).toBe('niet bewaard');
  });

  it('houdt in elke stijl de twee grenzen', () => {
    for (const s of ['familie', 'savage']) {
      expect(STIJLEN[s]).toContain('alleen wat je gelezen hebt');
      expect(STIJLEN[s]).toContain('blijft professioneel');
    }
    expect(STIJLEN.gewoon).toBe('');
  });
});

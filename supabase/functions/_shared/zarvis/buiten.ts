// Gereedschap dat een dienst buiten Compass aanspreekt. Elke dienst heeft een
// eigen sleutel als secret op de server; ontbreekt die, dan zegt het
// gereedschap dat gewoon, zodat Zarvis het kan melden in plaats van te gokken.

import type { Bron } from './gereedschap.ts';

// deno-lint-ignore no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
type Uit = { resultaat: unknown; detail: string; bron?: Bron };
type Def = { name: string; description: string; input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] } };

const isUuid = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

const duur = (seconden: number) => {
  const min = Math.round(seconden / 60);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} u ${String(min % 60).padStart(2, '0')}`;
};

export const BUITEN_GEREEDSCHAP: Def[] = [
  {
    name: 'bereken_route',
    description:
      'Berekent de rit met de auto tussen twee adressen via Google Maps: afstand, rijtijd met het verkeer van nu (of van het vertrekuur), en rijtijd zonder verkeer. Geef de bestemming als adres, of als dossier_id om naar het adres van die klant te rijden. Laat "van" weg om te vertrekken van het vaste vertrekadres; ken je dat niet, vraag het dan één keer en bewaar het met leer_vaardigheid.',
    input_schema: {
      type: 'object',
      properties: {
        naar: { type: 'string', description: 'Adres van de bestemming.' },
        dossier_id: { type: 'string', description: 'Dossier van de klant waar de rit naartoe gaat, in plaats van "naar".' },
        van: { type: 'string', description: 'Vertrekadres. Weglaten voor het vaste vertrekadres.' },
        vertrek_op: { type: 'string', description: 'Vertrekuur als kloktijd in België, JJJJ-MM-DDTUU:MM. Weglaten voor nu.' },
      },
    },
  },
  {
    name: 'weerbericht',
    description:
      'Geeft het weer van nu en de voorspelling per dag voor een plaats in België (of elders): temperatuur, neerslag, kans op regen, wind en rukwinden. Geef de plaats als gemeente, of een dossier_id om het weer bij die klant te kennen. Voor werk op een dak tellen vooral regen en rukwinden: noem die uit jezelf bij een werf of plaatsbezoek.',
    input_schema: {
      type: 'object',
      properties: {
        plaats: { type: 'string', description: 'Gemeente of stad, bijvoorbeeld "Aalter". Geen straat.' },
        dossier_id: { type: 'string', description: 'Dossier van de klant, in plaats van "plaats".' },
        dagen: { type: 'number', description: 'Hoeveel dagen vooruit, 1 tot 7. Standaard 3.' },
      },
    },
  },
];

// WMO-weercodes in gewoon Nederlands.
const WEER: Array<[number, string]> = [
  [0, 'helder'], [1, 'overwegend helder'], [2, 'half bewolkt'], [3, 'bewolkt'], [48, 'mist'],
  [55, 'motregen'], [57, 'ijzelende motregen'], [61, 'lichte regen'], [63, 'regen'], [65, 'zware regen'],
  [67, 'ijzel'], [71, 'lichte sneeuw'], [73, 'sneeuw'], [75, 'zware sneeuw'], [77, 'korrelsneeuw'],
  [80, 'lichte buien'], [81, 'buien'], [82, 'zware buien'], [86, 'sneeuwbuien'], [95, 'onweer'], [99, 'onweer met hagel'],
];
const weerTekst = (code: unknown) => WEER.find(([tot]) => Number(code) <= tot)?.[1] ?? 'onbekend';

/** Haalt de gemeente uit een Belgisch adres: wat na de postcode komt. */
export const gemeenteUit = (adres: string) => /\b\d{4}\s+([^,\d]+)/.exec(adres)?.[1].trim() ?? '';

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEER_URL = 'https://api.open-meteo.com/v1/forecast';

/** Bij welke connector dit gereedschap hoort. */
export const BUITEN_CONNECTOR: Record<string, string> = { bereken_route: 'maps' };

export function maakBuitenUitvoerders(belgischMoment: (lokaal: string) => Date | null): Record<string, { label: (i: Record<string, unknown>) => string; voer: (db: Db, i: Record<string, unknown>) => Promise<Uit> }> {
  return {
    bereken_route: {
      label: () => 'Route berekenen',
      async voer(db, invoer) {
        const sleutel = Deno.env.get('GOOGLE_MAPS_API_KEY');
        if (!sleutel) {
          return { resultaat: { fout: 'De sleutel voor Google Maps ontbreekt op de server (secret GOOGLE_MAPS_API_KEY). Zeg dat aan de gebruiker; hij moet ze toevoegen in Lovable.' }, detail: 'sleutel ontbreekt' };
        }
        let naar = typeof invoer.naar === 'string' ? invoer.naar.trim().slice(0, 300) : '';
        let naam = '';
        if (!naar && isUuid(invoer.dossier_id)) {
          const { data: l, error } = await db.from('leads').select('voornaam, achternaam, adres').eq('id', invoer.dossier_id).maybeSingle();
          if (error) throw new Error(error.message);
          if (!l) return { resultaat: { fout: 'Dat dossier bestaat niet of je hebt er geen toegang toe.' }, detail: 'niet gevonden' };
          naam = [l.voornaam, l.achternaam].filter(Boolean).join(' ');
          if (!l.adres) return { resultaat: { fout: `Er staat geen adres in het dossier van ${naam || 'deze klant'}.` }, detail: 'geen adres' };
          naar = String(l.adres);
        }
        if (!naar) return { resultaat: { fout: 'Geef een bestemming: een adres of een dossier_id.' }, detail: 'geen bestemming' };
        const van = (typeof invoer.van === 'string' && invoer.van.trim()) || Deno.env.get('ZARVIS_VERTREKADRES') || '';
        if (!van) return { resultaat: { fout: 'Er is geen vertrekadres bekend. Vraag de gebruiker van waar hij vertrekt en geef het mee als "van".' }, detail: 'geen vertrekadres' };

        const vertrek = typeof invoer.vertrek_op === 'string' ? belgischMoment(invoer.vertrek_op) : null;
        const res = await fetch(Deno.env.get('ZARVIS_TEST_ROUTES') ?? ROUTES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': sleutel,
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.staticDuration',
          },
          body: JSON.stringify({
            origin: { address: van.slice(0, 300) },
            destination: { address: naar },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            ...(vertrek && vertrek.getTime() > Date.now() ? { departureTime: vertrek.toISOString() } : {}),
            languageCode: 'nl',
            regionCode: 'BE',
          }),
        });
        if (!res.ok) {
          const fout = await res.json().catch(() => null) as { error?: { message?: string } } | null;
          console.error('zarvis: routes', res.status, fout?.error?.message);
          return {
            resultaat: { fout: res.status === 403 || res.status === 401 ? 'Google Maps weigert de sleutel, of de Routes API staat niet aan voor deze sleutel.' : `Google Maps gaf fout ${res.status}.` },
            detail: `fout ${res.status}`,
          };
        }
        const j = await res.json() as { routes?: Array<{ distanceMeters?: number; duration?: string; staticDuration?: string }> };
        const r = j.routes?.[0];
        if (!r?.duration) return { resultaat: { fout: 'Google Maps vond geen route. Mogelijk klopt een adres niet.' }, detail: 'geen route' };
        const km = Math.round((r.distanceMeters ?? 0) / 100) / 10;
        const metVerkeer = parseInt(r.duration, 10);
        const zonder = parseInt(r.staticDuration ?? r.duration, 10);
        return {
          resultaat: { van, naar, afstand_km: km, rijtijd: duur(metVerkeer), rijtijd_zonder_verkeer: duur(zonder), vertraging_minuten: Math.max(0, Math.round((metVerkeer - zonder) / 60)) },
          detail: `${String(km).replace('.', ',')} km · ${duur(metVerkeer)}`,
          bron: {
            titel: naam ? `Rit naar ${naam}` : 'Rit',
            ondertitel: 'Google Maps, met de auto',
            secties: [{ velden: [
              { label: 'Van', waarde: van },
              { label: 'Naar', waarde: naar },
              { label: 'Afstand', waarde: `${String(km).replace('.', ',')} km` },
              { label: vertrek ? 'Rijtijd bij vertrek' : 'Rijtijd nu', waarde: duur(metVerkeer) },
              { label: 'Zonder verkeer', waarde: duur(zonder) },
            ] }],
          },
        };
      },
    },

    weerbericht: {
      label: (i) => `Weer opzoeken${typeof i.plaats === 'string' && i.plaats ? ` in ${i.plaats.slice(0, 40)}` : ''}`,
      async voer(db, invoer) {
        let plaats = typeof invoer.plaats === 'string' ? invoer.plaats.trim().slice(0, 100) : '';
        if (!plaats && isUuid(invoer.dossier_id)) {
          const { data: l, error } = await db.from('leads').select('adres').eq('id', invoer.dossier_id).maybeSingle();
          if (error) throw new Error(error.message);
          if (!l) return { resultaat: { fout: 'Dat dossier bestaat niet of je hebt er geen toegang toe.' }, detail: 'niet gevonden' };
          plaats = gemeenteUit(String(l.adres ?? ''));
          if (!plaats) return { resultaat: { fout: 'Ik vind geen gemeente in het adres van dit dossier. Vraag de plaats.' }, detail: 'geen gemeente' };
        }
        if (!plaats) return { resultaat: { fout: 'Geef een plaats of een dossier_id. Ken je de vaste plaats van de gebruiker niet, vraag ze één keer en bewaar ze met leer_vaardigheid.' }, detail: 'geen plaats' };
        const dagen = Math.min(7, Math.max(1, Math.round(Number(invoer.dagen)) || 3));

        const geo = await fetch(`${GEO_URL}?name=${encodeURIComponent(plaats)}&count=5&language=nl`);
        if (!geo.ok) return { resultaat: { fout: `De weerdienst gaf fout ${geo.status} bij het zoeken van de plaats.` }, detail: `fout ${geo.status}` };
        const gevonden = ((await geo.json()) as { results?: Array<{ latitude: number; longitude: number; name: string; country_code?: string }> }).results ?? [];
        // Een Belgische plaats gaat voor op een naamgenoot elders.
        const p = gevonden.find((g) => g.country_code === 'BE') ?? gevonden[0];
        if (!p) return { resultaat: { fout: `De weerdienst kent geen plaats "${plaats}".` }, detail: 'plaats onbekend' };

        const res = await fetch(`${WEER_URL}?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max&timezone=Europe%2FBrussels&forecast_days=${dagen}`);
        if (!res.ok) return { resultaat: { fout: `De weerdienst gaf fout ${res.status}.` }, detail: `fout ${res.status}` };
        const w = await res.json() as { current?: Record<string, number>; daily?: Record<string, Array<number | string>> };
        const d = w.daily;
        if (!w.current || !d?.time?.length) return { resultaat: { fout: 'De weerdienst gaf geen voorspelling terug.' }, detail: 'leeg' };
        const perDag = d.time.map((dag, i) => ({
          dag: String(dag),
          weer: weerTekst(d.weather_code?.[i]),
          min: d.temperature_2m_min?.[i], max: d.temperature_2m_max?.[i],
          neerslag_mm: d.precipitation_sum?.[i], kans_op_regen_procent: d.precipitation_probability_max?.[i],
          rukwinden_kmu: d.wind_gusts_10m_max?.[i],
        }));
        const nu = { weer: weerTekst(w.current.weather_code), temperatuur: w.current.temperature_2m, wind_kmu: w.current.wind_speed_10m, neerslag_mm: w.current.precipitation };
        const dagNaam = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });
        return {
          resultaat: { plaats: p.name, nu, per_dag: perDag },
          detail: `${p.name} · ${Math.round(nu.temperatuur)}° · ${nu.weer}`,
          bron: {
            titel: `Weer in ${p.name}`,
            ondertitel: 'Open-Meteo',
            secties: [{ velden: [
              { label: 'Nu', waarde: `${Math.round(nu.temperatuur)}°, ${nu.weer}, wind ${Math.round(nu.wind_kmu)} km/u` },
              ...perDag.map((x) => ({ label: dagNaam(x.dag), waarde: `${x.weer}, ${Math.round(Number(x.min))}° tot ${Math.round(Number(x.max))}°, ${x.neerslag_mm} mm (${x.kans_op_regen_procent}%), rukwinden ${Math.round(Number(x.rukwinden_kmu))} km/u` })),
            ] }],
          },
        };
      },
    },
  };
}

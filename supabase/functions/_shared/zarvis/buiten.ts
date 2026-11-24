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
];

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
  };
}

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/calendly';

type CalendlyEvent = {
  uri: string;
  name: string;
  start_time: string;
  end_time?: string;
  status?: string;
  invitees_counter?: { active?: number };
  location?: { type?: string; join_url?: string; location?: string };
};

type Invitee = {
  email?: string;
  name?: string;
  status?: string;
  text_reminder_number?: string | null;
  questions_and_answers?: { question?: string; answer?: string }[];
};

type Kandidaat = {
  type: 'videocall' | 'plaatsbezoek';
  uri: string;
  name: string;
  scheduledAt: string;
  endTime: string | null;
  meetLink: string | null;
  inviteeEmail: string | null;
  inviteeName: string | null;
  score: number;
  reden: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function classifyEvent(event: CalendlyEvent): 'videocall' | 'plaatsbezoek' | null {
  const haystack = `${event.name || ''} ${event.location?.type || ''} ${event.location?.location || ''}`.toLowerCase();
  if (haystack.includes('plaatsbezoek') || haystack.includes('klantadres') || haystack.includes('physical')) return 'plaatsbezoek';
  if (haystack.includes('video') || haystack.includes('kennismaking') || haystack.includes('intake') || haystack.includes('conference') || event.location?.join_url) return 'videocall';
  return null;
}

/** Laatste 9 cijfers: zo matcht +32 486 99 88 07 met 0486998807. */
function telefoonSleutel(waarde: string | null | undefined): string {
  const cijfers = (waarde || '').replace(/[^0-9]/g, '');
  return cijfers.length >= 9 ? cijfers.slice(-9) : '';
}

function normaliseer(waarde: string | null | undefined): string {
  return (waarde || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized' }, 401);

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const payloadIn = await req.json().catch(() => ({}));
    const inviteeEmail = typeof payloadIn.email === 'string' ? payloadIn.email.trim().toLowerCase() : '';
    const zoekNaam = normaliseer(typeof payloadIn.name === 'string' ? payloadIn.name : '');
    const zoekTelefoon = telefoonSleutel(typeof payloadIn.phone === 'string' ? payloadIn.phone : '');

    if (!inviteeEmail && !zoekNaam && !zoekTelefoon) {
      return jsonResponse({ error: 'Email, name or phone is required' }, 400);
    }
    if (inviteeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)) {
      return jsonResponse({ error: 'Valid email is required' }, 400);
    }

    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const calendlyKey = Deno.env.get('CALENDLY_API_KEY');
    if (!lovableKey || !calendlyKey) return jsonResponse({ error: 'Calendly connector is not configured' }, 500);

    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': calendlyKey,
    };

    const meResponse = await fetch(`${GATEWAY_URL}/users/me`, { headers });
    if (!meResponse.ok) {
      const details = await meResponse.text();
      console.error(`Calendly /users/me failed [${meResponse.status}]: ${details}`);
      return jsonResponse({ error: 'Calendly request failed', status: meResponse.status, details }, meResponse.status);
    }
    const me = await meResponse.json();
    const userUri = me?.resource?.uri;
    if (!userUri) return jsonResponse({ error: 'Calendly user not found' }, 502);

    const haalEvents = async (extra: Record<string, string>): Promise<CalendlyEvent[]> => {
      const url = new URL(`${GATEWAY_URL}/scheduled_events`);
      url.searchParams.set('user', userUri);
      url.searchParams.set('status', 'active');
      url.searchParams.set('count', '50');
      url.searchParams.set('sort', 'start_time:desc');
      for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        const details = await res.text();
        console.error(`Calendly /scheduled_events failed [${res.status}]: ${details}`);
        throw new Error(`[${res.status}]: ${details}`);
      }
      const body = await res.json();
      return Array.isArray(body.collection) ? body.collection : [];
    };

    const naarKandidaat = (
      event: CalendlyEvent,
      type: 'videocall' | 'plaatsbezoek',
      invitee: Invitee | null,
      score: number,
      reden: string,
    ): Kandidaat => ({
      type,
      uri: event.uri,
      name: event.name,
      scheduledAt: event.start_time,
      endTime: event.end_time ?? null,
      meetLink: event.location?.join_url ?? null,
      inviteeEmail: invitee?.email ?? null,
      inviteeName: invitee?.name ?? null,
      score,
      reden,
    });

    const kandidaten: Kandidaat[] = [];

    // ── Spoor 1: exact e-mailadres uit het dossier ───────────────────────────
    if (inviteeEmail) {
      const opEmail = await haalEvents({ invitee_email: inviteeEmail });
      for (const event of opEmail) {
        const type = classifyEvent(event);
        if (!type) continue;
        kandidaten.push(naarKandidaat(event, type, { email: inviteeEmail }, 3, 'e-mailadres'));
      }
    }

    // ── Spoor 2: recente agenda doorlopen en de deelnemers vergelijken ───────
    // De klant boekt vaak met een ánder e-mailadres dan wat in het dossier
    // staat. Daarom vergelijken we ook op naam en telefoonnummer.
    if (kandidaten.length === 0 && (zoekNaam || zoekTelefoon || inviteeEmail)) {
      const sinds = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const recent = (await haalEvents({ min_start_time: sinds })).slice(0, 25);

      for (const event of recent) {
        const type = classifyEvent(event);
        if (!type) continue;
        if ((event.invitees_counter?.active ?? 1) === 0) continue;

        const res = await fetch(`${GATEWAY_URL}/scheduled_events/${event.uri.split('/').pop()}/invitees`, { headers });
        if (!res.ok) {
          console.error(`Calendly invitees failed [${res.status}] voor ${event.uri}`);
          continue;
        }
        const body = await res.json();
        const invitees: Invitee[] = Array.isArray(body.collection) ? body.collection : [];

        for (const invitee of invitees) {
          if (invitee.status && invitee.status !== 'active') continue;

          const email = (invitee.email || '').toLowerCase();
          const naam = normaliseer(invitee.name);
          const antwoorden = (invitee.questions_and_answers || []).map(q => q.answer || '').join(' ');
          const telefoons = [invitee.text_reminder_number, antwoorden].map(telefoonSleutel).filter(Boolean);

          let score = 0;
          const redenen: string[] = [];

          if (inviteeEmail && email === inviteeEmail) { score += 3; redenen.push('e-mailadres'); }
          if (zoekTelefoon && telefoons.includes(zoekTelefoon)) { score += 2; redenen.push('telefoonnummer'); }
          if (zoekNaam && naam) {
            const delen = zoekNaam.split(' ').filter(d => d.length >= 3);
            const geraakt = delen.filter(d => naam.includes(d)).length;
            if (delen.length > 0 && geraakt === delen.length) { score += 2; redenen.push('naam'); }
            else if (geraakt > 0) { score += 1; redenen.push('deel van de naam'); }
          }

          if (score > 0) kandidaten.push(naarKandidaat(event, type, invitee, score, redenen.join(' + ')));
        }
      }
    }

    // Beste kandidaat per type; automatisch toepassen mag enkel bij een sterke
    // match (e-mail, telefoon of volledige naam) die uniek is voor dat type.
    const events: Record<string, Kandidaat> = {};
    for (const type of ['videocall', 'plaatsbezoek'] as const) {
      const vanType = kandidaten
        .filter(k => k.type === type)
        .sort((a, b) => b.score - a.score || (a.scheduledAt < b.scheduledAt ? 1 : -1));
      if (vanType.length === 0) continue;
      const beste = vanType[0];
      const evenSterk = vanType.filter(k => k.score === beste.score);
      if (beste.score >= 2 && evenSterk.length === 1) events[type] = beste;
    }

    return jsonResponse({
      events,
      candidates: kandidaten.sort((a, b) => b.score - a.score),
      searchedEmail: inviteeEmail || null,
    });
  } catch (err) {
    console.error('sync-calendly-event error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});

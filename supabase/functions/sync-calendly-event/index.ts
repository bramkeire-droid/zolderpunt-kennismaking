import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/calendly';

type CalendlyEvent = {
  uri: string;
  name: string;
  start_time: string;
  end_time?: string;
  status?: string;
  location?: { type?: string; join_url?: string; location?: string };
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
  if (haystack.includes('video') || haystack.includes('kennismaking') || haystack.includes('conference') || event.location?.join_url) return 'videocall';
  return null;
}

function toClientEvent(event: CalendlyEvent) {
  return {
    uri: event.uri,
    name: event.name,
    scheduledAt: event.start_time,
    endTime: event.end_time ?? null,
    meetLink: event.location?.join_url ?? null,
  };
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

    const { email } = await req.json().catch(() => ({}));
    const inviteeEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!inviteeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteeEmail)) {
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

    const url = new URL(`${GATEWAY_URL}/scheduled_events`);
    url.searchParams.set('user', userUri);
    url.searchParams.set('invitee_email', inviteeEmail);
    url.searchParams.set('status', 'active');
    url.searchParams.set('count', '20');
    url.searchParams.set('sort', 'start_time:desc');

    const eventsResponse = await fetch(url.toString(), { headers });
    if (!eventsResponse.ok) {
      const details = await eventsResponse.text();
      console.error(`Calendly /scheduled_events failed [${eventsResponse.status}]: ${details}`);
      return jsonResponse({ error: 'Calendly request failed', status: eventsResponse.status, details }, eventsResponse.status);
    }

    const payload = await eventsResponse.json();
    const events: CalendlyEvent[] = Array.isArray(payload.collection) ? payload.collection : [];
    const result: Record<string, ReturnType<typeof toClientEvent>> = {};

    for (const event of events) {
      const type = classifyEvent(event);
      if (type && !result[type]) result[type] = toClientEvent(event);
      if (result.videocall && result.plaatsbezoek) break;
    }

    return jsonResponse({ events: result, count: events.length });
  } catch (err) {
    console.error('sync-calendly-event error:', err);
    return jsonResponse({ error: err instanceof Error ? err.message : 'Unknown error' }, 500);
  }
});
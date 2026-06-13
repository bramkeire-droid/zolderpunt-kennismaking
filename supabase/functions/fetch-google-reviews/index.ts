import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLACE_ID = 'ChIJBTJ_PBdqqagRlh3TI_QMg1I';
const GATEWAY = 'https://connector-gateway.lovable.dev/google_maps';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24u

interface Review {
  author: string;
  authorPhoto?: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
}

interface Payload {
  reviews: Review[];
  rating: number;
  total: number;
  fetchedAt: string;
}

async function fetchFromGoogle(): Promise<Payload> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const gmKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!lovableKey || !gmKey) throw new Error('Missing Google Maps connector credentials');

  const res = await fetch(`${GATEWAY}/places/v1/places/${PLACE_ID}?languageCode=nl`, {
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': gmKey,
      'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gateway ${res.status}: ${body}`);
  }
  const data = await res.json();

  const reviews: Review[] = (data.reviews || []).map((r: any) => ({
    author: r.authorAttribution?.displayName || 'Anoniem',
    authorPhoto: r.authorAttribution?.photoUri,
    rating: r.rating || 5,
    text: r.text?.text || r.originalText?.text || '',
    relativeTime: r.relativePublishTimeDescription || '',
    publishTime: r.publishTime || '',
  }));

  // Sorteer nieuw → oud
  reviews.sort((a, b) => (b.publishTime || '').localeCompare(a.publishTime || ''));

  return {
    reviews: reviews.slice(0, 8),
    rating: data.rating || 0,
    total: data.userRatingCount || 0,
    fetchedAt: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const force = url.searchParams.get('force') === '1';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Probeer cache
    if (!force) {
      const { data: cached } = await supabase
        .from('google_reviews_cache')
        .select('payload, fetched_at')
        .eq('id', 1)
        .maybeSingle();
      if (cached?.payload && cached.fetched_at) {
        const age = Date.now() - new Date(cached.fetched_at).getTime();
        if (age < CACHE_TTL_MS) {
          return new Response(JSON.stringify({ ...cached.payload, cached: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Vers ophalen
    const payload = await fetchFromGoogle();
    await supabase
      .from('google_reviews_cache')
      .upsert({ id: 1, payload, fetched_at: new Date().toISOString() });

    return new Response(JSON.stringify({ ...payload, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('fetch-google-reviews error:', err);
    // Fallback: probeer cache te lezen ook al is hij oud
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { data: cached } = await supabase
        .from('google_reviews_cache')
        .select('payload')
        .eq('id', 1)
        .maybeSingle();
      if (cached?.payload) {
        return new Response(JSON.stringify({ ...cached.payload, cached: true, stale: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch {}

    return new Response(JSON.stringify({ error: err.message || 'Onbekende fout' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

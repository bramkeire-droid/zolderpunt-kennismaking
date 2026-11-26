// 26 november (baan LOKETTEN): de AI-functies van Compass waren zonder aanmelding aan te roepen (verify_jwt uit, geen
// controle in de code). Iedereen kon zo AI-credits verbruiken. Dezelfde logincontrole als de andere functies van
// Compass (auth.getUser met het token van de aanroeper), plus: de gebruiker heeft een rol in Compass (admin, user of
// viewer), zodat een zelf aangemaakte account zonder rol ook niets kan. Eén plaats; getest in alleenIngelogd_test.ts.

/** Geeft null als de aanroeper een aangemelde Compass-gebruiker met een rol is; anders het antwoord om terug te geven. */
export async function alleenIngelogd(req: Request, cors: Record<string, string>, doe: typeof fetch = fetch, env = (n: string) => Deno.env.get(n)): Promise<Response | null> {
  const weiger = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  const auth = req.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return weiger(401, 'Niet ingelogd.');
  const url = env('SUPABASE_URL'), sleutel = env('SUPABASE_ANON_KEY') ?? env('SUPABASE_PUBLISHABLE_KEY');
  if (!url || !sleutel) return weiger(500, 'De functie is niet goed ingesteld.');
  const kop = { apikey: sleutel, Authorization: auth };
  const wie = await doe(`${url}/auth/v1/user`, { headers: kop }).catch(() => null);
  const g = wie?.ok ? await wie.json().catch(() => null) as { id?: string } | null : null;
  if (!g?.id) return weiger(401, 'Je login is verlopen: meld je opnieuw aan.');
  // RLS laat elke gebruiker zijn eigen rollen zien: met zijn eigen token lezen.
  const r = await doe(`${url}/rest/v1/user_roles?select=role&user_id=eq.${encodeURIComponent(g.id)}&limit=1`, { headers: kop }).catch(() => null);
  const rollen = r?.ok ? await r.json().catch(() => []) : [];
  if (!Array.isArray(rollen) || !rollen.length) return weiger(403, 'Geen toegang: alleen een gebruiker van Compass met een rol.');
  return null;
}

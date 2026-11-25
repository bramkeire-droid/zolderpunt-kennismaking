// Wie mag binnen in het loket? (25 november, na een vondst van LOKETTEN): ALLEEN een admin van Zarvis. De rol user
// is niet genoeg: wie geen beheerder is, krijgt van dit loket nooit echte gegevens. Eén plaats, voor elke actie.
// fetch komt binnen als parameter, zodat toegang_test.ts het met een nagebootst Zarvis nakijkt.

export type Wie = { email: string } | null | 'login' | 'app';

export async function zarvisBeheerder(token: string, zarvisUrl: string, sleutel: string, doe: typeof fetch = fetch): Promise<Wie> {
  const kop = { apikey: sleutel, Authorization: `Bearer ${token}` };
  // Het id voor has_role komt uit het token (sub); het telt alleen als Zarvis het token aanvaardt en precies dat id teruggeeft.
  let sub = '';
  try { sub = String(JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub ?? ''); } catch { /* geen leesbaar token: de loginvraag zegt nee */ }
  const isAdmin = async () => {
    if (!sub) return false;
    const r = await doe(`${zarvisUrl}/rest/v1/rpc/has_role`, {
      method: 'POST', headers: { ...kop, 'Content-Type': 'application/json' }, body: JSON.stringify({ _user_id: sub, _role: 'admin' }),
    });
    return r.ok && (await r.json()) === true;
  };
  const [wie, admin] = await Promise.all([doe(`${zarvisUrl}/auth/v1/user`, { headers: kop }), isAdmin()]);
  if (!wie.ok) return wie.status >= 500 ? 'app' : 'login';
  const g = await wie.json() as { id?: string; email?: string };
  if (!g.id || g.id !== sub) return null;
  return admin ? { email: (g.email ?? '').toLowerCase() } : null;
}

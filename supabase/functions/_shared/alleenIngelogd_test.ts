// De AI-functies: alleen een aangemelde Compass-gebruiker met een rol. Nagebootst Supabase.
// Draaien: npx -y deno test --node-modules-dir=none supabase/functions/_shared/alleenIngelogd_test.ts
import { alleenIngelogd } from "./alleenIngelogd.ts";

const eq = (a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`verwacht ${JSON.stringify(b)}, kreeg ${JSON.stringify(a)}`);
};
const env = (n: string) => ({ SUPABASE_URL: "https://compass", SUPABASE_ANON_KEY: "publiek" } as Record<string, string>)[n];
function nep(geldig: boolean, rollen: string[]): typeof fetch {
  return (async (url: string | URL) => {
    const u = String(url);
    if (u.endsWith("/auth/v1/user")) return new Response(JSON.stringify(geldig ? { id: "u1" } : {}), { status: geldig ? 200 : 401 });
    return new Response(JSON.stringify(rollen.map((role) => ({ role }))), { status: 200 });
  }) as typeof fetch;
}
const vraag = (auth?: string) => new Request("https://x", { method: "POST", headers: auth ? { Authorization: auth } : {} });
const status = async (r: Response | null) => (r ? r.status : "door");

Deno.test("zonder aanmelding, met een verlopen login, of zonder rol: geweigerd", async () => {
  eq(await status(await alleenIngelogd(vraag(), {}, nep(true, ["admin"]), env)), 401);
  eq(await status(await alleenIngelogd(vraag("Bearer x"), {}, nep(false, []), env)), 401);
  eq(await status(await alleenIngelogd(vraag("Bearer x"), {}, nep(true, []), env)), 403);
});

Deno.test("een aangemelde gebruiker met een rol mag door", async () => {
  for (const rol of ["admin", "user", "viewer"]) eq(await status(await alleenIngelogd(vraag("Bearer x"), {}, nep(true, [rol]), env)), "door");
});

Deno.test("Supabase onbereikbaar of niet ingesteld: nooit door", async () => {
  const stuk = (async () => { throw new Error("weg"); }) as typeof fetch;
  eq(await status(await alleenIngelogd(vraag("Bearer x"), {}, stuk, env)), 401);
  eq(await status(await alleenIngelogd(vraag("Bearer x"), {}, nep(true, ["admin"]), () => undefined)), 500);
});

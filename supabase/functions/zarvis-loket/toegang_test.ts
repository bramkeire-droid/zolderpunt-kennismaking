// Een nagebootst Zarvis: alleen een admin komt binnen. Draaien: npx -y deno test --node-modules-dir=none supabase/functions/zarvis-loket/toegang_test.ts
import { zarvisBeheerder } from "./toegang.ts";

const eq = (a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`verwacht ${JSON.stringify(b)}, kreeg ${JSON.stringify(a)}`);
};
const ID = "11111111-1111-4111-8111-111111111111";
const token = (sub: string) => `x.${btoa(JSON.stringify({ sub }))}.y`;
function nepZarvis(rollen: string[], loginStatus = 200, id = ID): typeof fetch {
  return (async (url: string | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith("/auth/v1/user")) return new Response(JSON.stringify({ id, email: "Iemand@Voorbeeld.be" }), { status: loginStatus });
    if (u.endsWith("/rpc/has_role")) return new Response(JSON.stringify(rollen.includes(JSON.parse(String(init?.body))._role)), { status: 200 });
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
}

Deno.test("alleen een admin van Zarvis komt binnen; user en geen rol niet", async () => {
  eq(await zarvisBeheerder(token(ID), "https://z", "k", nepZarvis(["admin"])), { email: "iemand@voorbeeld.be" });
  eq(await zarvisBeheerder(token(ID), "https://z", "k", nepZarvis(["user"])), null);
  eq(await zarvisBeheerder(token(ID), "https://z", "k", nepZarvis([])), null);
});

Deno.test("een token van een ander, een verlopen login of een stil Zarvis: nooit binnen", async () => {
  eq(await zarvisBeheerder(token(ID), "https://z", "k", nepZarvis(["admin"], 200, "22222222-2222-4222-8222-222222222222")), null);
  eq(await zarvisBeheerder(token(ID), "https://z", "k", nepZarvis(["admin"], 401)), "login");
  eq(await zarvisBeheerder(token(ID), "https://z", "k", nepZarvis(["admin"], 503)), "app");
  eq(await zarvisBeheerder("onleesbaar", "https://z", "k", nepZarvis(["admin"])), null);
});

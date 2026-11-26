// De hand op de cloudserver (sprint 2): sleutel, nemen, en de stand achteraf. Verzonnen opdrachten.
// Draaien: npx -y deno test --node-modules-dir=none supabase/functions/zarvis-loket/faseHand_test.ts
import { handSleutelGeldig, kanNemen, standNaBevestig, standNaHand, type Opdracht } from "./faseHand.ts";

const eq = (a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`verwacht ${JSON.stringify(b)}, kreeg ${JSON.stringify(a)}`);
};
const NU = Date.parse("2026-11-26T12:00:00Z");
const o = (x: Partial<Opdracht> = {}): Opdracht => ({ id: "o1", lead_id: "l1", project_nummer: "ZL-0001", naar_fase: 4, naar_titel: "Offerte verstuurd", status: "wacht", gemaakt_op: "2026-11-26T11:00:00Z", poging_op: null, afwijs_reden_zetten: false, afwijs_reden_na: null, ...x });

Deno.test("de sleutel: alleen een gelijke van minstens 32 tekens; een lege instelling laat nooit iets door", () => {
  const S = "x".repeat(40);
  eq(handSleutelGeldig(S, S), true);
  eq(handSleutelGeldig("y".repeat(40), S), false);
  eq(handSleutelGeldig("", ""), false);
  eq(handSleutelGeldig(null, undefined), false);
  eq(handSleutelGeldig("kort", "kort"), false);
});

Deno.test("nemen: wacht ja; bezig alleen als vastgelopen; ouder dan een dag nooit meer", () => {
  eq(kanNemen(o(), NU), "neem");
  eq(kanNemen(o({ status: "bezig", poging_op: "2026-11-26T11:55:00Z" }), NU), "niet");
  eq(kanNemen(o({ status: "bezig", poging_op: "2026-11-26T11:40:00Z" }), NU), "neem");
  eq(kanNemen(o({ gemaakt_op: "2026-11-25T11:00:00Z" }), NU), "te_oud");
  eq(kanNemen(o({ status: "gedaan" }), NU), "niet");
});

Deno.test("wat de hand meldt: niet aangemeld laat de opdracht wachten; een andere fout is mislukt", () => {
  eq(standNaHand({ ok: true }), null);
  eq(standNaHand({ ok: false, niet_aangemeld: true })?.status, "wacht");
  eq(standNaHand({ ok: false, fout: "Project ZL-0001 niet gevonden" }), { status: "mislukt", melding: "Bouwflow niet gewijzigd: Project ZL-0001 niet gevonden." });
});

Deno.test("bevestigen: gedaan alleen als Bouwflow echt op de gevraagde fase staat", () => {
  eq(standNaBevestig(o(), 4).status, "gedaan");
  eq(standNaBevestig(o(), 3), { status: "mislukt", melding: "Niet bevestigd in Bouwflow, Compass onveranderd: Bouwflow staat op fase 3 in plaats van 4." });
  eq(standNaBevestig(o(), null).status, "mislukt");
});

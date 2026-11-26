// De dienstvraag 'nummers' (sprint 1). Verzonnen nummers en dossiers.
// Draaien: npx -y deno test --node-modules-dir=none supabase/functions/zarvis-loket/dienst_test.ts
import { dienstSleutelGeldig, gevraagdeNummers, koppelNummers } from "./dienst.ts";

const eq = (a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`verwacht ${JSON.stringify(b)}, kreeg ${JSON.stringify(a)}`);
};

Deno.test("de sleutel: alleen een gelijke van minstens 32 tekens; een lege instelling laat nooit iets door", () => {
  const S = "d".repeat(40);
  eq(dienstSleutelGeldig(S, S), true);
  eq(dienstSleutelGeldig("e".repeat(40), S), false);
  eq(dienstSleutelGeldig("", ""), false);
  eq(dienstSleutelGeldig(S, undefined), false);
});

Deno.test("alleen 9 cijfers, hoogstens 400", () => {
  eq([...gevraagdeNummers(["470123456", "12", "abc456789", 470123456, "470123457"])], ["470123456", "470123457"]);
  eq(gevraagdeNummers(Array.from({ length: 500 }, (_, i) => String(400000000 + i))).size, 400);
  eq(gevraagdeNummers("470123456").size, 0);
});

Deno.test("nummer naar dossier: nieuwste eerst, ook via de klant; alleen dossier-ids", () => {
  const dossiers = [
    { id: "d-nieuw", telefoon: null, customer_id: "k1" },
    { id: "d-oud", telefoon: "+32 470 12 34 56", customer_id: null },
    { id: "d-ander", telefoon: "0499 99 99 99", customer_id: null },
  ];
  const klanten = [{ id: "k1", telefoon: "0470/12.34.56" }];
  eq(koppelNummers(new Set(["470123456"]), dossiers, klanten), { "470123456": "d-nieuw" });
  eq(koppelNummers(new Set(["111111111"]), dossiers, klanten), {});
});

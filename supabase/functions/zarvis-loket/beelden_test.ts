// Draaien: npx -y deno test --node-modules-dir=none supabase/functions/zarvis-loket/beelden_test.ts
import { beeldLink, blad, documentenUit, fotosUit } from "./beelden.ts";

const eq = (a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`verwacht ${JSON.stringify(b)}, kreeg ${JSON.stringify(a)}`);
};

Deno.test("bron, datum en afzender per foto, ook voor oude foto's zonder die velden", () => {
  const f = fotosUit([
    { path: "l1/inbox/1764081234567-wa-IMG_1.jpg", bucket: "lead-fotos", source: "whatsapp", uploaded_at: "2026-11-20T10:00:00Z", van: "+32470123456" },
    { path: "l1/inbox/1764081234999-mail-plan.pdf", bucket: "lead-fotos", source: "email", uploaded_at: "2026-11-21T09:00:00Z" },
    { path: "l1/inbox/1700000000000-wa-oud.jpg" }, // oud: alleen het pad
    { bestandsnaam: "zolder.jpg", storage_path: "l1/zolder.jpg" }, // upload in de app
    { niets: true },
  ]);
  eq(f.map((x) => [x.bron, x.naam, x.van]), [["whatsapp", "IMG_1.jpg", "+32470123456"], ["mail", "plan.pdf", null], ["whatsapp", "oud.jpg", null], ["upload", "zolder.jpg", null]]);
  eq(f[2].ontvangen_op, new Date(1700000000000).toISOString());
  eq(f[3].ontvangen_op, null);
});

Deno.test("documenten: upload, met het tijdstip van de opslag", () => {
  eq(documentenUit([{ pad: "l1/offerte.pdf", created_at: "2026-11-22T08:00:00Z" }]), [{ soort: "document", naam: "offerte.pdf", bron: "upload", ontvangen_op: "2026-11-22T08:00:00Z", van: null, bucket: "dossier-documenten", pad: "l1/offerte.pdf" }]);
});

Deno.test("bladeren boven 20: 43 foto's in drie bladzijden, nieuwste eerst, tellingen per bron", () => {
  const veel = fotosUit(Array.from({ length: 43 }, (_, i) => ({ path: `l1/inbox/${1764000000000 + i * 1000}-${i % 2 ? "wa" : "mail"}-f${i}.jpg` })));
  const b1 = blad(veel, 0, 20), b3 = blad(veel, 40, 20);
  eq([b1.totaal, b1.items.length, b1.volgende, b3.items.length, b3.volgende], [43, 20, 20, 3, null]);
  eq(b1.items[0].naam, "f42.jpg");
  eq(b1.per_bron, { mail: 22, whatsapp: 21 });
  eq(blad([...veel, ...veel], 0, 500).items.length, 50); // hoogstens 50 per keer
});

Deno.test("een foto boven 5 MB: verkleinde link, of de gewone met te_groot als verkleinen niet lukte", () => {
  const MB = 1024 * 1024;
  eq(beeldLink(4 * MB, "gewoon", "klein"), { link: "gewoon" });
  eq(beeldLink(null, "gewoon", null), { link: "gewoon" });
  eq(beeldLink(6 * MB, "gewoon", "klein"), { link: "klein", verkleind: true });
  eq(beeldLink(6 * MB, "gewoon", null), { link: "gewoon", te_groot: true });
});

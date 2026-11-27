import { assertEquals } from "jsr:@std/assert@1";
import { gemeenteUit } from "./gemeente.ts";

Deno.test("de gemeente uit een adres, nooit de rest", () => {
  assertEquals(gemeenteUit("Proefstraat 1, 9000 Gent"), "Gent");
  assertEquals(gemeenteUit("Proeflaan 12 bus 3, 8500 Kortrijk, België"), "Kortrijk");
  assertEquals(gemeenteUit("Proefweg 5 9810 Nazareth-Eke"), "Nazareth-Eke");
  assertEquals(gemeenteUit("geen postcode"), null);
  assertEquals(gemeenteUit(null), null);
});

Deno.test("de postcode uit een adres, ook als het adres alleen een postcode is", async () => {
  const { postcodeUit } = await import("./gemeente.ts");
  assertEquals(postcodeUit("9000"), "9000");
  assertEquals(postcodeUit("Proefstraat 1, 9000 Gent"), "9000");
  assertEquals(postcodeUit("Proefstraat 12"), null);
});

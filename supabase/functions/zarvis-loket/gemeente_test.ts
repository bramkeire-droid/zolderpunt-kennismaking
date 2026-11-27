import { assertEquals } from "jsr:@std/assert@1";
import { gemeenteUit } from "./gemeente.ts";

Deno.test("de gemeente uit een adres, nooit de rest", () => {
  assertEquals(gemeenteUit("Proefstraat 1, 9000 Gent"), "Gent");
  assertEquals(gemeenteUit("Proeflaan 12 bus 3, 8500 Kortrijk, België"), "Kortrijk");
  assertEquals(gemeenteUit("Proefweg 5 9810 Nazareth-Eke"), "Nazareth-Eke");
  assertEquals(gemeenteUit("geen postcode"), null);
  assertEquals(gemeenteUit(null), null);
});

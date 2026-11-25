// De proefset van de klankvouwing (3.29), dezelfde paren als BREIN. Verzonnen namen.
import { klankTreffer, naamScore, telefoonVorm, vouwKlank, zoekSoort } from "./klank.ts";

const eq = (a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`verwacht ${JSON.stringify(b)}, kreeg ${JSON.stringify(a)}`);
};

Deno.test("de drie paren van ARCHITECTUUR 3.29", () => {
  eq(vouwKlank("Christophe"), "kristof"); eq(vouwKlank("Kristof"), "kristof");
  eq(vouwKlank("Philippe"), "filip"); eq(vouwKlank("Filip"), "filip");
  eq(vouwKlank("Van den Broeck").replace(/ /g, ""), "fandenbroek"); eq(vouwKlank("Vandenbroeck"), "fandenbroek");
  eq(klankTreffer("Van den Broeck", "Vandenbroeck"), "sterk");
});

Deno.test("Kristof vindt Christophe; korte woorden houden hun e; een ander niet", () => {
  eq(naamScore("Kristof", "Christophe De Smet"), 0.9);
  eq(naamScore("Christophe De Smedt", "Kristof De Smet"), 1);
  eq(vouwKlank("Rene"), "rene"); eq(vouwKlank("Joke"), "joke");
  eq(naamScore("Kristof", "Karel De Smet"), 0);
});

Deno.test("telefoon in één vorm, en wat men zoekt", () => {
  eq(telefoonVorm("0470 12 34 56"), "+32470123456");
  eq(telefoonVorm("0032 9 123 45 67"), "+3291234567");
  eq(telefoonVorm("32470123456"), "+32470123456");
  eq(telefoonVorm("12"), null);
  eq(zoekSoort("iemand@voorbeeld.be"), "mail");
  eq(zoekSoort("0470 12 34 56"), "telefoon");
  eq(zoekSoort("Kristof"), "naam");
});

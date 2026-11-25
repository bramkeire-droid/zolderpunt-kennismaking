// De proefset van de klankvouwing (3.29). Verzonnen namen. Draaien: npx -y deno test --node-modules-dir=none klank_test.ts
import { klankVorm, naamScore, telefoonVorm, zoekSoort } from "./klank.ts";

const eq = (a: unknown, b: unknown) => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`verwacht ${JSON.stringify(b)}, kreeg ${JSON.stringify(a)}`);
};

Deno.test("de regels van de klankvouwing", () => {
  eq(klankVorm("Christophe"), "kristofe");
  eq(klankVorm("Kristof"), "kristof");
  eq(klankVorm("Quinten"), "kuinten"); // q wordt letterlijk k (de regel van 3.29)
  eq(klankVorm("Dirck"), "dirk");
  eq(klankVorm("Vandijck"), klankVorm("Fandeik"));
  eq(klankVorm("Meijer"), klankVorm("Meier"));
  eq(klankVorm("Pieter"), klankVorm("Piter"));
  eq(klankVorm("Zoë"), klankVorm("Soe"));
  eq(klankVorm("Smedt"), klankVorm("Smet"));
  eq(klankVorm("Ronald"), klankVorm("Ronalt"));
  eq(klankVorm("Hannelore"), "hanelore");
  eq(klankVorm("Van den Bossche"), "fan den boske"); // sch: ch wordt k
});

Deno.test("Kristof vindt Christophe; een ander niet", () => {
  eq(naamScore("Kristof", "Christophe De Smet"), 0.9);
  eq(naamScore("Christophe De Smedt", "Kristof De Smet"), 1);
  eq(naamScore("chris", "Christophe De Smet"), 0.7);
  eq(naamScore("Kristof", "Karel De Smet"), 0);
  eq(naamScore("de", "Christophe De Smet"), 0); // te kort voor een begin
});

Deno.test("telefoon in één vorm, en wat men zoekt", () => {
  eq(telefoonVorm("0470 12 34 56"), "+32470123456");
  eq(telefoonVorm("+32 (0)470/12.34.56".replace("(0)", "")), "+32470123456");
  eq(telefoonVorm("0032 9 123 45 67"), "+3291234567");
  eq(telefoonVorm("32470123456"), "+32470123456");
  eq(telefoonVorm("12"), null);
  eq(zoekSoort("iemand@voorbeeld.be"), "mail");
  eq(zoekSoort("0470 12 34 56"), "telefoon");
  eq(zoekSoort("Kristof"), "naam");
});

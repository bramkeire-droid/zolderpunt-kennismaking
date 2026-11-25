// De klankvouwing van de contactbibliotheek (ARCHITECTUUR 3.29, stap 1). Dit bestand staat identiek in Mail-CRM
// (compass-loket) en Compass (zarvis-loket), met dezelfde test (klank_test.ts): beide kanten vouwen een naam dus gelijk.
// Zuiver, zonder databank.

/** Een naam zoals hij klinkt: ch, ck, c en q worden k; ph wordt f; ij wordt ei; ie wordt i; v wordt f; z wordt s;
 *  dt, d en t op het einde van een woord worden t; dubbele letters enkel. Accenten en leestekens vallen weg. */
export function klankVorm(naam: string): string {
  return naam.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z\s-]/g, " ").replace(/-/g, " ")
    .split(/\s+/).filter(Boolean).map((w) => w
      .replace(/ph/g, "f").replace(/ck/g, "k").replace(/ch/g, "k").replace(/[qc]/g, "k")
      .replace(/ij/g, "ei").replace(/ie/g, "i").replace(/v/g, "f").replace(/z/g, "s")
      .replace(/(dt|d)$/, "t")
      .replace(/(.)\1+/g, "$1"))
    .join(" ");
}

/** Een telefoonnummer in één vorm (+32 …), of null als het geen nummer is. */
export function telefoonVorm(t: string | null | undefined): string | null {
  let d = String(t ?? "").replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = "+" + d.slice(2);
  else if (d.startsWith("0")) d = "+32" + d.slice(1);
  else if (/^32\d{8,9}$/.test(d)) d = "+" + d;
  const cijfers = d.replace(/\D/g, "");
  return d.startsWith("+") && cijfers.length >= 9 && cijfers.length <= 15 ? "+" + cijfers : null;
}

/** Wat zoekt men: een mailadres, een telefoonnummer of een naam? */
export function zoekSoort(q: string): "mail" | "telefoon" | "naam" {
  if (q.includes("@")) return "mail";
  if (telefoonVorm(q) && !/[a-z]/i.test(q)) return "telefoon";
  return "naam";
}

const gelijk = (a: string, b: string) => a === b || (a.length > 3 && b.length > 3 && a.replace(/e$/, "") === b.replace(/e$/, ""));

/** Hoe goed lijkt een naam op de vraag, van 0 tot 1. 1: dezelfde klank; 0,9: elk woord van de vraag klinkt als een
 *  woord van de naam (Kristof vindt Christophe De Smet); 0,7: elk woord is het begin van een woord (minstens 3 letters). */
export function naamScore(vraag: string, naam: string | null | undefined): number {
  const q = klankVorm(vraag).split(" ").filter(Boolean), n = klankVorm(naam ?? "").split(" ").filter(Boolean);
  if (!q.length || !n.length || !q.some((w) => w.length >= 3)) return 0; // "de" of "van" alleen is geen naam
  if (q.length === n.length && q.every((w, i) => gelijk(w, n[i]))) return 1;
  if (q.every((w) => n.some((m) => gelijk(w, m)))) return 0.9;
  if (q.every((w) => w.length >= 3 && n.some((m) => m.startsWith(w)))) return 0.7;
  return 0;
}

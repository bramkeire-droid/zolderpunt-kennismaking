// Knipt een binnenstromend antwoord in zinnen, zodat Zarvis al kan beginnen
// spreken terwijl de rest nog geschreven wordt. Zonder dit wacht de stem tot het
// hele antwoord er is, en voelt een gesprek als een formulier.

const ZINSEINDE = /([.!?…]+["')\]]?)(\s+|$)/g;

/**
 * Neemt de tot nu toe ontvangen tekst en geeft de volledige zinnen terug die
 * nog niet eerder afgegeven werden, plus hoeveel tekens daarmee verbruikt zijn.
 * Een zin zonder afsluitend leesteken blijft wachten tot `klaar` true is.
 */
export function nieuweZinnen(
  tekst: string,
  vanaf: number,
  klaar: boolean,
): { zinnen: string[]; tot: number } {
  const rest = tekst.slice(vanaf);
  const zinnen: string[] = [];
  let einde = 0;

  ZINSEINDE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ZINSEINDE.exec(rest)) !== null) {
    // Het leesteken staat helemaal achteraan en de stroom loopt nog: het kan
    // het begin zijn van "..." of van een getal als "3.5" — nog even wachten.
    if (!klaar && m.index + m[0].length === rest.length && m[2] === '') break;
    // "3.5", "nr.12": een punt tussen twee cijfers is geen zinseinde.
    const zin = rest.slice(einde, m.index + m[1].length).trim();
    if (zin) zinnen.push(zin);
    einde = m.index + m[0].length;
  }

  if (klaar) {
    const staart = rest.slice(einde).trim();
    if (staart) zinnen.push(staart);
    einde = rest.length;
  }

  return { zinnen, tot: vanaf + einde };
}

/** Haalt opmaak weg die je niet wil horen voorlezen. */
export function voorUitspraak(zin: string): string {
  return zin
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

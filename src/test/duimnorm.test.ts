import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Duimnorm: elk raakvlak minstens 44 px. Live gemeten op 19/11/2026: in de
// bewerkformulieren van de dossierpagina haalde geen enkel raakvlak dat
// (kruisje 22×22, "Bewerken" 69×16), en elders in de app stonden 22 knoppen en
// velden met p-0.5/p-1/p-1.5 (icoon + 2–6 px rand = 16–28 px) of h-6/h-7
// (24/28 px). Deze test zoekt die vormen in de broncode, zodat een nieuwe
// kleine knop niet ongemerkt terugkomt.

const BRON = join(__dirname, '..');
const KLEIN = /(?:^|\s)(p-0\.5|p-1|p-1\.5|h-6|h-7)(?=\s|$)/;
const GROOT_GENOEG = /(?:^|\s)(min-)?h-11(?=\s|$)/;
const BEDIENING = /<(button|Button|Input|input)\b/g;

function bestanden(map: string): string[] {
  return readdirSync(map).flatMap((naam) => {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) return naam === 'ui' || naam === 'test' ? [] : bestanden(pad);
    return pad.endsWith('.tsx') ? [pad] : [];
  });
}

/** Elke className="…" die bij een knop of veld hoort en te klein is. */
function teKlein(code: string): string[] {
  const vondsten: string[] = [];
  for (const m of code.matchAll(/className="([^"]*)"/g)) {
    const klassen = m[1];
    if (!KLEIN.test(klassen) || GROOT_GENOEG.test(klassen)) continue;
    // Het element waar deze className bij hoort: de dichtstbijzijnde '<Naam' ervoor.
    const ervoor = code.slice(Math.max(0, m.index! - 2000), m.index);
    const tags = [...ervoor.matchAll(/<([A-Za-z][\w.]*)/g)];
    const eigenaar = tags.at(-1)?.[1] ?? '';
    if (!/^(button|Button|Input|input)$/.test(eigenaar)) continue;
    const regel = code.slice(0, m.index).split('\n').length;
    vondsten.push(`${regel}: <${eigenaar}> ${klassen.match(KLEIN)?.[1]}`);
  }
  return vondsten;
}

describe('duimnorm (44 px) voor knoppen en velden', () => {
  it('geen knop of veld met een raakvlak van 16–28 px', () => {
    const fout = bestanden(join(BRON, 'components'))
      .concat(bestanden(join(BRON, 'pages')))
      .flatMap((pad) => teKlein(readFileSync(pad, 'utf8')).map((v) => `${relative(BRON, pad)}:${v}`));
    expect(fout).toEqual([]);
  });

  // Live gemeten na #18: "Ja" in de weggooi-bevestiging van een post-it was 44 hoog
  // maar 36 breed. Een korte tekstknop heeft naast h-11 ook min-w-11 nodig.
  it('korte tekstknoppen (Ja/Nee) zijn ook 44 px breed', () => {
    const code = readFileSync(join(BRON, 'components', 'communicatie', 'PostItRij.tsx'), 'utf8');
    for (const tekst of ['Ja', 'Nee']) {
      const plek = code.indexOf(`>${tekst}</span>`);
      const klassen = [...code.slice(Math.max(0, plek - 400), plek).matchAll(/<Button[^\n]*?className="([^"]*)"/g)].at(-1)?.[1];
      expect(klassen, tekst).toMatch(/(?:^|\s)min-w-11(?=\s|$)/);
    }
  });

  it('herkent een te kleine knop (zelftest)', () => {
    expect(teKlein('<button onClick={() => x()} className="rounded p-1 text-red-500"><X /></button>')).toHaveLength(1);
    expect(teKlein('<button className="inline-flex h-11 w-11 p-1"><X /></button>')).toHaveLength(0);
    expect(teKlein('<div className="h-6 w-6" />')).toHaveLength(0);
  });
});

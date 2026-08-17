import { describe, expect, it } from 'vitest';
import { FASE_GROEPEN } from '@/lib/pipeline';

// De kolomkeuze op de Dossiers-pagina, losgetrokken van React zodat de regel
// zelf toetsbaar is. Twee dossiers zijn hier ooit onzichtbaar door geworden:
// - een dossier met een fase die niet in de mappingtabel stond kreeg wel een
//   bak maar geen kolom, en verdween uit tabel én kanban;
// - "Niet in Bouwflow" heeft geen fase-id en viel daardoor uit elke fasegroep
//   met een filter, inclusief de standaardweergave.

interface Kolom { key: string; phaseId: number | null }

/** Dezelfde regel als zichtbareKolommen in Dossiers.tsx. */
function zichtbareKolommen(
  categorieen: Kolom[],
  gegroepeerd: Record<string, unknown[]>,
  faseGroep: string,
  opties: { toonLege: boolean; zoekActief: boolean },
): string[] {
  const groepDef = FASE_GROEPEN.find((g) => g.key === faseGroep);
  const inGroep = (c: Kolom) =>
    c.phaseId === null
      ? true
      : !groepDef || groepDef.phaseIds.length === 0
        ? true
        : groepDef.phaseIds.includes(c.phaseId);

  const uitCategorieen = categorieen
    .filter((c) => (opties.zoekActief || faseGroep === 'alles') ? true : inGroep(c))
    .filter((c) => opties.toonLege || (gegroepeerd[c.key] ?? []).length > 0);

  const bekend = new Set(uitCategorieen.map((c) => c.key));
  const rest = Object.entries(gegroepeerd)
    .filter(([key, rijen]) =>
      rijen.length > 0 && !bekend.has(key) && !categorieen.some((c) => c.key === key))
    .map(([key]) => key);

  return [...uitCategorieen.map((c) => c.key), ...rest];
}

const CATS: Kolom[] = [
  { key: 'unlinked', phaseId: null },
  { key: 'phase:1', phaseId: 1 },
  { key: 'phase:3', phaseId: 3 },
  { key: 'phase:8', phaseId: 8 },
];

const standaard = { toonLege: false, zoekActief: false };

describe('geen enkel dossier mag uit beeld vallen', () => {
  it('een fase die niet in de mappingtabel staat krijgt toch een kolom', () => {
    const gegroepeerd = { 'phase:1': [{}], 'phase:99': [{}] };
    expect(zichtbareKolommen(CATS, gegroepeerd, 'alles', standaard)).toContain('phase:99');
  });

  it('die restkolom verschijnt ook binnen een fasegroep met filter', () => {
    const gegroepeerd = { 'phase:99': [{}] };
    expect(zichtbareKolommen(CATS, gegroepeerd, 'intake', standaard)).toContain('phase:99');
  });

  it('"Niet in Bouwflow" blijft in ELKE fasegroep zichtbaar', () => {
    const gegroepeerd = { unlinked: [{}] };
    for (const groep of FASE_GROEPEN) {
      expect(
        zichtbareKolommen(CATS, gegroepeerd, groep.key, standaard),
        `groep ${groep.key} verbergt nieuwe dossiers`,
      ).toContain('unlinked');
    }
  });

  it('in "Volledige pipeline" is elk dossier bereikbaar', () => {
    // Een fasegroep hoort te filteren — dat is haar doel. Maar de groep die
    // alles toont moet sluitend zijn: wat daar niet in staat, is nergens te
    // vinden.
    const gegroepeerd = { unlinked: [{}], 'phase:1': [{}], 'phase:8': [{}], 'phase:99': [{}] };
    const zichtbaar = zichtbareKolommen(CATS, gegroepeerd, 'alles', standaard);
    for (const key of Object.keys(gegroepeerd)) {
      expect(zichtbaar, `${key} is nergens te vinden`).toContain(key);
    }
  });

  it('zoeken doorbreekt het fasefilter, zodat een treffer nooit verborgen blijft', () => {
    const gegroepeerd = { 'phase:8': [{}] };
    const zichtbaar = zichtbareKolommen(CATS, gegroepeerd, 'intake', { toonLege: false, zoekActief: true });
    expect(zichtbaar).toContain('phase:8');
  });

  it('een lege restkolom wordt niet aangemaakt', () => {
    expect(zichtbareKolommen(CATS, { 'phase:99': [] }, 'alles', standaard)).not.toContain('phase:99');
  });

  it('een gewone lege kolom blijft verborgen zolang lege fases uit staan', () => {
    expect(zichtbareKolommen(CATS, { 'phase:1': [] }, 'alles', standaard)).not.toContain('phase:1');
  });
});

describe('afgeronde fases tellen niet als open pipeline', () => {
  const inactief = FASE_GROEPEN.find((g) => g.key === 'inactief')!;

  // Dezelfde vijf die pull-bouwflow-projects als afgerond behandelt. Liepen
  // die twee lijsten uiteen, dan telden voltooide dossiers mee in de KPI.
  it.each([
    [8, 'Geweigerd'],
    [17, 'Nazorg'],
    [18, 'Voltooid'],
    [19, 'Geannuleerd'],
    [20, 'Opvolging lange termijn'],
  ])('fase %i (%s) staat in de inactief-groep', (id) => {
    expect(inactief.phaseIds).toContain(id);
  });

  it('een lopende fase staat er juist NIET in', () => {
    for (const id of [1, 3, 4, 13]) {
      expect(inactief.phaseIds, `fase ${id} zou niet inactief mogen zijn`).not.toContain(id);
    }
  });
});

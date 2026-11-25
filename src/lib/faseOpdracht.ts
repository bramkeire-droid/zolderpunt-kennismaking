// Een fase-opdracht van Zarvis uitvoeren (2026-11-25, baan LOKETTEN). Zarvis schrijft na Brams Ja een rij in
// zarvis_fase_opdrachten; deze regel voert ze uit op dezelfde weg als het slepen in de kanban
// (MoveBouwflowPhaseDialog): de extensie zet de fase in Bouwflow, push-bouwflow-phase leest ze terug en zet Compass
// pas dan gelijk. Zuiver: alles wat praat met de extensie of de databank komt binnen als functie, zodat de test het
// zonder Bouwflow nakijkt.

export type FaseOpdracht = {
  id: string;
  lead_id: string;
  project_nummer: string;
  naar_fase: number;
  naar_titel: string;
  afwijs_reden_zetten: boolean;
  afwijs_reden_na: string | null;
  gemaakt_op: string;
};

export type Stand = { status: 'wacht' | 'gedaan' | 'mislukt'; melding: string };

export type Hulp = {
  extensie: () => Promise<boolean>;
  zetInBouwflow: (o: FaseOpdracht) => Promise<{ ok: boolean; fout?: string }>;
  controleer: (o: FaseOpdracht) => Promise<{ ok: boolean; fout?: string }>;
  zetReden: (o: FaseOpdracht) => Promise<string | null>; // foutmelding of null
  nu?: number;
};

/** Een opdracht die zo lang wacht, voeren we niet meer uit: niemand verwacht dan nog dat ze gebeurt. */
export const MAX_WACHT_MS = 24 * 3600_000;

export async function voerUit(o: FaseOpdracht, h: Hulp): Promise<Stand> {
  if ((h.nu ?? Date.now()) - new Date(o.gemaakt_op).getTime() > MAX_WACHT_MS) {
    return { status: 'mislukt', melding: 'Te oud: deze opdracht wachtte langer dan een dag op een open Compass met de extensie. Niets gewijzigd.' };
  }
  // Zonder extensie blijft de opdracht wachten: een andere pagina of een later moment kan ze uitvoeren.
  if (!(await h.extensie())) return { status: 'wacht', melding: 'Wacht op een open Compass met de Bouwflow-extensie.' };
  const r = await h.zetInBouwflow(o);
  if (!r.ok) return { status: 'mislukt', melding: `Bouwflow niet gewijzigd: ${r.fout ?? 'de extensie kon de fase niet zetten'}.` };
  const c = await h.controleer(o);
  if (!c.ok) return { status: 'mislukt', melding: `Niet bevestigd in Bouwflow, Compass onveranderd: ${c.fout ?? 'Bouwflow staat niet op de gevraagde fase'}.` };
  if (o.afwijs_reden_zetten) {
    const fout = await h.zetReden(o);
    if (fout) return { status: 'mislukt', melding: `De fase staat goed in Bouwflow en Compass, maar de reden kon niet bewaard worden: ${fout}` };
  }
  return { status: 'gedaan', melding: `${o.project_nummer} staat in Bouwflow en Compass op "${o.naar_titel}".` };
}

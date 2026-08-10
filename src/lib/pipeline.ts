// Gedeelde pipeline-logica voor de Dossiers-pagina: fasegroepen, urgentie en
// waarde. Bewust hier en niet in de componenten, zodat kanban, tabel en de
// KPI-balk gegarandeerd dezelfde definities gebruiken.

export type FaseGroepKey = 'intake' | 'offerte' | 'beslissing' | 'inactief' | 'alles';

export interface FaseGroep {
  key: FaseGroepKey;
  label: string;
  /** BouwFlow-fase-ids die in deze groep vallen; leeg = alle fases. */
  phaseIds: number[];
  /** Inactieve dossiers mogen de dagelijkse pipeline niet domineren. */
  inactief?: boolean;
}

export const FASE_GROEPEN: FaseGroep[] = [
  { key: 'intake',     label: 'Intake',            phaseIds: [1, 21, 22, 23] },
  { key: 'offerte',    label: 'Offerte',           phaseIds: [27, 3, 4, 25] },
  { key: 'beslissing', label: 'Beslissing',        phaseIds: [6, 7] },
  { key: 'inactief',   label: 'Inactief',          phaseIds: [20, 8], inactief: true },
  { key: 'alles',      label: 'Volledige pipeline', phaseIds: [] },
];

// Eén kleur per groep, gedempt gehouden: kleur dient hier voor herkenning,
// niet voor nadruk.
export const GROEP_KLEUR: Record<FaseGroepKey, string> = {
  intake: 'bg-sky-500',
  offerte: 'bg-violet-500',
  beslissing: 'bg-emerald-500',
  inactief: 'bg-slate-400',
  alles: 'bg-slate-400',
};

export function groepVanFase(phaseId: number | null): FaseGroepKey | null {
  if (phaseId === null) return null;
  const g = FASE_GROEPEN.find(x => x.phaseIds.includes(phaseId));
  return g ? g.key : null;
}

export type UrgentieNiveau = 'te_laat' | 'vandaag' | 'binnenkort' | 'geen_actie' | 'ok';

export interface VolgendeActie {
  niveau: UrgentieNiveau;
  label: string;
  /** Korte datumtekst, leeg als er geen afspraak gepland staat. */
  datum: string;
}

const dagStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Bepaalt wat er als volgende moet gebeuren. Compass kent geen deadline-veld,
 * dus de enige harde datums zijn geplande videocalls en plaatsbezoeken uit
 * pre_intake. Staat er niets gepland en is er ook geen volgende stap ingevuld,
 * dan is dat zelf het signaal: zo'n dossier valt anders stil.
 */
export function bepaalVolgendeActie(lead: any, preIntake: any, nu = new Date()): VolgendeActie {
  const kandidaten: { tijd: number; label: string }[] = [];
  if (preIntake?.videocall_scheduled_at) {
    kandidaten.push({ tijd: new Date(preIntake.videocall_scheduled_at).getTime(), label: 'Videocall' });
  }
  if (preIntake?.plaatsbezoek_scheduled_at) {
    kandidaten.push({ tijd: new Date(preIntake.plaatsbezoek_scheduled_at).getTime(), label: 'Plaatsbezoek' });
  }
  kandidaten.sort((a, b) => a.tijd - b.tijd);
  const eerst = kandidaten[0];

  if (eerst && Number.isFinite(eerst.tijd)) {
    const datum = new Date(eerst.tijd);
    const tekst = datum.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit' });
    const vandaag = dagStart(nu);
    const dagVanActie = dagStart(datum);
    if (dagVanActie < vandaag) return { niveau: 'te_laat', label: eerst.label, datum: tekst };
    if (dagVanActie === vandaag) return { niveau: 'vandaag', label: eerst.label, datum: tekst };
    return { niveau: 'binnenkort', label: eerst.label, datum: tekst };
  }

  const stap = (lead.volgende_stap || '').trim();
  if (stap) return { niveau: 'ok', label: stap, datum: '' };
  return { niveau: 'geen_actie', label: 'Geen volgende stap', datum: '' };
}

export const URGENTIE_STIJL: Record<UrgentieNiveau, string> = {
  te_laat: 'bg-red-50 text-red-700 border-red-200',
  vandaag: 'bg-orange-50 text-orange-700 border-orange-200',
  binnenkort: 'bg-blue-50 text-blue-700 border-blue-200',
  geen_actie: 'bg-slate-50 text-slate-600 border-slate-200',
  ok: 'bg-slate-50 text-slate-600 border-slate-200',
};

/** Offertebedrag heeft voorrang op de budgetraming uit de intake. */
export function dossierWaarde(lead: any): number | null {
  if (lead.offerte_bedrag_excl != null) return Number(lead.offerte_bedrag_excl);
  if (lead.budget_min != null) return Number(lead.budget_min);
  return null;
}

export const euro = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export const euroKort = (n: number) =>
  n >= 1000 ? `€ ${Math.round(n / 1000)}k` : euro(n);

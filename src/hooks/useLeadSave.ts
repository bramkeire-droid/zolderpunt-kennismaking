import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { useToast } from '@/hooks/use-toast';
import type { LeadData } from '@/contexts/SessionContext';

const LEAD_SESSION_KEY = 'zp_active_lead_id';

// Noodkopie van een dossier in de browser.
//
// AANLEIDING (7 september 2026). Van twaalf intakegesprekken bleken er negen
// zonder enige inhoud in de databank te staan — Renee, Virginie, Lieselot,
// Ruben en anderen. Een volledig videocall-intakegesprek was zonder één
// zichtbare melding verdwenen. Twee oorzaken werkten samen:
//
//   1. Opslaan gebeurt 3 seconden vertraagd. De afsluitroutine hieronder
//      ANNULEERDE die geplande opslag bij het sluiten van het tabblad en zette
//      er niets voor in de plaats ("Can't do async on unload"). Wie binnen die
//      drie seconden wegklikte, raakte zijn laatste werk kwijt.
//   2. Mislukte een opslag, dan ging dat enkel naar de verborgen console.
//
// Vandaar deze kopie: bij een mislukte opslag én bij het verlaten van de
// pagina gaat het dossier hier naartoe, zodat er altijd iets terug te halen
// valt — ook bij een oorzaak die we nog niet kennen (verlopen sessie,
// netwerkstoring, ontbrekende rechten). Het telefoongesprek-scherm doet dit
// al langer; het intakescherm deed het niet.
const LEAD_DRAFT_KEY = 'zp_lead_draft';

export interface LeadKladversie {
  lead: LeadData;
  bewaardOp: string;
  reden: 'opslag_mislukt' | 'pagina_verlaten';
}

function schrijfKladversie(lead: LeadData, reden: LeadKladversie['reden']) {
  try {
    const kopie: LeadKladversie = { lead, bewaardOp: new Date().toISOString(), reden };
    localStorage.setItem(LEAD_DRAFT_KEY, JSON.stringify(kopie));
  } catch {
    // Opslag vol of geblokkeerd (privémodus). Niets aan te doen, maar dit mag
    // nooit de opslagpoging zelf laten crashen.
  }
}

function wisKladversie() {
  try { localStorage.removeItem(LEAD_DRAFT_KEY); } catch { /* niet kritiek */ }
}

/** Leest de bewaarde noodkopie, of null als er geen (bruikbare) is. */
export function leesLeadKladversie(): LeadKladversie | null {
  try {
    const ruw = localStorage.getItem(LEAD_DRAFT_KEY);
    if (!ruw) return null;
    const kladversie = JSON.parse(ruw) as LeadKladversie;
    return kladversie?.lead ? kladversie : null;
  } catch {
    return null;
  }
}

export { LEAD_DRAFT_KEY, wisKladversie };

function leadToRow(lead: LeadData) {
  return {
    id: lead.id || undefined,
    voornaam: lead.voornaam,
    achternaam: lead.achternaam,
    email: lead.email,
    telefoon: lead.telefoon,
    gevonden_via: lead.gevonden_via,
    gezocht_naar: lead.gezocht_naar,
    notities_vooraf: lead.notities_vooraf,
    adres: lead.adres,
    adres_lat: lead.adres_lat,
    adres_lng: lead.adres_lng,
    partner_naam: lead.partner_naam,
    oppervlakte_m2: lead.oppervlakte_m2,
    project_type: lead.project_type,
    project_timing: lead.project_timing,
    volgende_stap: lead.volgende_stap,
    gesprek_notities: lead.gesprek_notities,
    gesprek_datum: lead.gesprek_datum || null,
    budget_min: lead.budget_min,
    budget_max: lead.budget_max,
    budget_incl6: lead.budget_incl6,
    budget_incl21: lead.budget_incl21,
    budget_excl: lead.budget_excl,
    budget_min_excl: lead.budget_min_excl,
    budget_max_excl: lead.budget_max_excl,
    btw_percentage: lead.btw_percentage,
    calculator_state: lead.calculator_state as any,
    prijs_min_incl_btw: lead.prijs_min_incl_btw,
    prijs_max_incl_btw: lead.prijs_max_incl_btw,
    prijs_mw_min_incl_btw: lead.prijs_mw_min_incl_btw,
    prijs_mw_max_incl_btw: lead.prijs_mw_max_incl_btw,
    inbegrepen_posten: lead.inbegrepen_posten as any,
    rapport_tekst: lead.rapport_tekst,
    rapport_gegenereerd_op: lead.rapport_gegenereerd_op,
    rapport_versies: lead.rapport_versies as any,
    rapport_situatie_ai: lead.rapport_situatie_ai,
    rapport_verwachtingen_ai: lead.rapport_verwachtingen_ai,
    rapport_besproken_ai: lead.rapport_besproken_ai,
    rapport_aandachtspunten_ai: lead.rapport_aandachtspunten_ai,
    waarde_tekst_ai: lead.waarde_tekst_ai,
    status: lead.status,
    project_feiten: lead.project_feiten as any,
    // `fotos` is deliberately NOT saved here. Photos also arrive from
    // outside this session (WhatsApp/e-mail webhooks, and the dossier
    // dialog which writes straight to the database). Including a
    // possibly-stale in-memory copy in every generic save silently wiped
    // freshly-arrived media — 74 photos were lost that way. Screens that
    // change photos persist them directly via saveLeadPhotos().
    technisch: lead.technisch as any,
    gespreksvragen: lead.gespreksvragen as any,
  };
}

/** Check if technisch has any toggled-on values (not just defaults) */
function hasTechnischData(tech: LeadData['technisch']): boolean {
  if (!tech) return false;
  // Any boolean flipped to true means user actively toggled something
  return !!(
    tech.trap || tech.dakraam || tech.airco || tech.badkamer ||
    tech.maatwerk_kasten || tech.betonnen_trapgat || tech.houten_trapgat ||
    tech.dak_isoleren || tech.dakkapel || tech.akoestiek ||
    tech.vloer_uitpassen || tech.chape
  );
}

/** Minimum gegevens vereist om een NIEUW dossier aan te maken (insert). */
function hasMinimumForInsert(lead: LeadData): boolean {
  return !!(lead.voornaam?.trim() || lead.achternaam?.trim() || lead.email?.trim() || lead.telefoon?.trim());
}

/** Check if lead has ANY meaningful data worth saving (voor updates van bestaand dossier) */
function hasAnyData(lead: LeadData): boolean {
  return !!(
    lead.voornaam || lead.achternaam || lead.email || lead.telefoon ||
    lead.adres || lead.oppervlakte_m2 || lead.gezocht_naar ||
    lead.gesprek_notities || lead.rapport_situatie_ai ||
    lead.budget_min || lead.budget_excl ||
    lead.notities_vooraf || lead.transcript ||
    (lead.project_feiten && (lead.project_feiten as any[]).length > 0) ||
    (lead.fotos && (lead.fotos as any[]).length > 0) ||
    hasTechnischData(lead.technisch)
  );
}

/** Returns saveLead (manual) + flushSave (immediate) + starts a 3-second debounced autosave */
export function useLeadSave() {
  const { lead, updateLead } = useSession();
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');
  // De lopende save als promise, zodat een volgende aanvraag erop wacht in
  // plaats van stil gedropt te worden. De oude boolean-guard liet de laatste
  // wijziging verloren gaan wanneer de autosave vuurde tijdens een trage save
  // — en flushSave (bij wegnavigeren) liep op precies dezelfde guard stuk.
  const inFlightRef = useRef<Promise<void> | null>(null);

  const persistLead = useCallback(async (leadData: LeadData, showToast: boolean) => {
    // Skip only if there is truly NOTHING to save
    if (!hasAnyData(leadData)) return;

    // INSERT vereist minimaal naam/email/telefoon — anders ontstaan lege spookdossiers
    if (!leadData.id && !hasMinimumForInsert(leadData)) return;

    // Serialiseer: wachten tot de vorige save klaar is (de lus vangt het geval
    // waarin er intussen alwéér een nieuwe gestart is).
    while (inFlightRef.current) await inFlightRef.current;

    const serialized = JSON.stringify(leadToRow(leadData));
    if (serialized === lastSavedRef.current) return; // no changes

    const werk = (async () => {
    try {
      // Auto-promote naar 'intake' wanneer er duidelijke intake-data is.
      // 'telefoongesprek' wordt expliciet gezet via wrap-up. 'intake' via deze hint of via Slide10.
      const hasIntakeData = !!(
        leadData.rapport_gegenereerd_op ||
        leadData.rapport_situatie_ai?.trim() ||
        leadData.rapport_besproken_ai?.trim() ||
        leadData.rapport_verwachtingen_ai?.trim() ||
        leadData.rapport_aandachtspunten_ai?.trim() ||
        leadData.rapport_tekst?.trim() ||
        leadData.waarde_tekst_ai?.trim() ||
        (leadData.fotos && (leadData.fotos as any[]).length > 0) ||
        leadData.calculator_state
      );
      if (hasIntakeData && ['nieuw', 'telefoongesprek', 'intake_gepland'].includes(leadData.status)) {
        leadData = { ...leadData, status: 'intake' };
      }
      const row = leadToRow(leadData);

      if (leadData.id) {
        const { error } = await supabase.from('leads').update(row).eq('id', leadData.id);
        if (error) throw error;
      } else {
        // Dubbel-detectie vóór INSERT: zoek bestaand dossier op email of telefoon
        const orParts: string[] = [];
        if (leadData.email?.trim()) orParts.push(`email.eq.${leadData.email.trim()}`);
        if (leadData.telefoon?.trim()) orParts.push(`telefoon.eq.${leadData.telefoon.trim()}`);
        let existingId: string | null = null;
        if (orParts.length > 0) {
          const { data: existing } = await supabase
            .from('leads').select('id').or(orParts.join(',')).limit(1).maybeSingle();
          if (existing?.id) existingId = existing.id;
        }
        if (existingId) {
          // Merge: update bestaand dossier i.p.v. duplicaat aanmaken
          const { error } = await supabase.from('leads').update(row).eq('id', existingId);
          if (error) throw error;
          updateLead({ id: existingId });
          try { localStorage.setItem(LEAD_SESSION_KEY, existingId); } catch {}
        } else {
          const { data, error } = await supabase.from('leads').insert(row).select('id').single();
          if (error) throw error;
          if (data) {
            updateLead({ id: data.id });
            try { localStorage.setItem(LEAD_SESSION_KEY, data.id); } catch {}
          }
        }
      }

      // Keep localStorage in sync with current lead ID
      if (leadData.id) {
        try { localStorage.setItem(LEAD_SESSION_KEY, leadData.id); } catch {}
      }

      lastSavedRef.current = serialized;
      // Het staat veilig in de databank: de noodkopie mag weg.
      wisKladversie();
      if (showToast) {
        toast({ title: 'Opgeslagen', description: 'Gegevens zijn bewaard.' });
      }
    } catch (err: any) {
      console.error('Save error:', err);

      // Eerst redden, dan pas melden. Zonder deze kopie was een mislukte
      // automatische opslag definitief: de gebruiker zag niets en er bleef
      // niets over. Zo is het werk altijd terug te halen bij het openen.
      schrijfKladversie(leadData, 'opslag_mislukt');

      // ALTIJD melden, ook bij de automatische opslag. Voorheen zweeg die
      // (showToast=false) en ging er enkel een regel naar de verborgen
      // console — daardoor kon een heel intakegesprek ongemerkt verloren gaan.
      const ruw: string = err?.message ?? '';
      const geenRechten = /row-level security|violates row-level|JWT|not authenticated/i.test(ruw);
      toast({
        title: 'Niet opgeslagen',
        description: geenRechten
          ? 'Je aanmelding is verlopen of je account mag hier niet in schrijven. Je werk is lokaal bewaard — meld je opnieuw aan, dan kan je het terugzetten.'
          : `${ruw || 'Onbekende fout'} — je werk is lokaal bewaard en gaat niet verloren.`,
        variant: 'destructive',
      });
    }
    })();

    inFlightRef.current = werk;
    try {
      await werk;
    } finally {
      inFlightRef.current = null;
    }
  }, [updateLead, toast]);

  // Manual save with toast
  const saveLead = useCallback(async () => {
    await persistLead(lead, true);
  }, [lead, persistLead]);

  // Immediate save without debounce (for navigation away)
  const flushSave = useCallback(async () => {
    clearTimeout(debounceRef.current);
    await persistLead(lead, false);
  }, [lead, persistLead]);

  // Autosave: debounce 3 seconds after any lead change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistLead(lead, false);
    }, 3000);
    return () => clearTimeout(debounceRef.current);
  }, [lead, persistLead]);

  // Pagina verlaten: het laatste werk veiligstellen.
  //
  // Hier ging het mis. De oude versie annuleerde de geplande opslag en deed
  // vervolgens NIETS — wie binnen drie seconden na zijn laatste wijziging het
  // tabblad sloot, was dat werk kwijt, zonder melding. Een netwerkoproep kan
  // op dit moment inderdaad niet meer, maar naar de browseropslag schrijven
  // kan wél: dat is synchroon.
  //
  // Ook op 'pagehide' en op het verbergen van het tabblad, want op mobiel en
  // in ingebedde vensters vuurt 'beforeunload' vaak niet.
  useEffect(() => {
    const veiligstellen = () => {
      if (!hasAnyData(lead)) return;
      const serialized = JSON.stringify(leadToRow(lead));
      if (serialized === lastSavedRef.current) return; // al bewaard, niets te redden
      schrijfKladversie(lead, 'pagina_verlaten');
    };
    const bijVerbergen = () => {
      if (document.visibilityState === 'hidden') veiligstellen();
    };

    window.addEventListener('beforeunload', veiligstellen);
    window.addEventListener('pagehide', veiligstellen);
    document.addEventListener('visibilitychange', bijVerbergen);
    return () => {
      window.removeEventListener('beforeunload', veiligstellen);
      window.removeEventListener('pagehide', veiligstellen);
      document.removeEventListener('visibilitychange', bijVerbergen);
    };
  }, [lead]);

  return { saveLead, flushSave };
}

import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePreIntake } from '@/contexts/PreIntakeContext';
import { useToast } from '@/hooks/use-toast';
import type { PreIntakeData } from '@/types/preIntake';

const STORAGE_KEY = 'zp_pre_intake_draft';

function dataToRow(d: PreIntakeData) {
  return {
    id: d.id || undefined,
    lead_id: d.lead_id || undefined,
    call_started_at: d.call_started_at,
    call_ended_at: d.call_ended_at,
    call_duration_seconds: d.call_duration_seconds,
    trigger_text: d.trigger_text,
    emotional_keywords: d.emotional_keywords as any,
    fomu_concerns: d.fomu_concerns as any,
    buying_committee: d.buying_committee,
    general_impression: d.general_impression,
    impression_tags: d.impression_tags,
    questions_raised: d.questions_raised as any,
    qual_in_region: d.qual_in_region,
    qual_real_attic: d.qual_real_attic,
    qual_is_owner: d.qual_is_owner,
    qual_is_decision_maker: d.qual_is_decision_maker,
    region_gemeente: d.region_gemeente,
    photos_promised: d.photos_promised,
    measurement_promised: d.measurement_promised,
    deliverables_due_date: d.deliverables_due_date,
    scenario_chosen: d.scenario_chosen,
    videocall_scheduled_at: d.videocall_scheduled_at,
    plaatsbezoek_scheduled_at: d.plaatsbezoek_scheduled_at,
    google_meet_link: d.google_meet_link,
    quick_notes: d.quick_notes,
    wat_tags: d.wat_tags,
    waarom_nu_timing: d.waarom_nu_timing,
    box_notes: d.box_notes as any,


    videocall_planned: d.videocall_planned,
    plaatsbezoek_planned: d.plaatsbezoek_planned,
    locked_at: d.locked_at,
  };
}

/** Velden die niets zeggen over of de gebruiker iets heeft ingevuld. */
const NIET_INHOUDELIJK = new Set(['id', 'lead_id']);

/**
 * Is er iets ingevuld dat bewaard moet worden?
 *
 * Afgeleid uit dataToRow zelf, niet uit een handmatige lijst. Die lijst liep
 * uit de pas: box_notes stond er niet in, terwijl dat precies de vier vakken
 * zijn die tijdens een telefoongesprek ingevuld worden. Gevolg: wie enkel die
 * vakken invulde, kreeg "Dossier opgeslagen" te zien terwijl er niets werd
 * weggeschreven. Van 23 gesprekken bleef er zo één met notities over.
 *
 * Door de rij te vergelijken met een lege rij kan die drift niet terugkomen:
 * elk veld dat bewaard wordt, telt automatisch mee.
 */
/**
 * Recursief, want de gegevens zijn genest: box_notes bevat lijsten,
 * questions_raised bevat objecten met een vinkje en een notitie. Een niet-
 * recursieve check zag zo'n leeg binnenobject aan voor inhoud.
 */
function heeftInhoud(waarde: unknown): boolean {
  if (waarde == null || waarde === '' || waarde === false || waarde === 0) return false;
  if (Array.isArray(waarde)) return waarde.some(heeftInhoud);
  if (typeof waarde === 'object') return Object.values(waarde as Record<string, unknown>).some(heeftInhoud);
  return true;
}

export function hasAnyData(d: PreIntakeData): boolean {
  const rij = dataToRow(d) as Record<string, unknown>;
  return Object.entries(rij).some(([veld, waarde]) =>
    !NIET_INHOUDELIJK.has(veld) && heeftInhoud(waarde));
}

export function usePreIntakeSave() {
  const { data, update } = usePreIntake();
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);
  // Een opslag die binnenkwam terwijl er al een liep. Zonder dit viel de
  // laatste versie stilzwijgend weg — precies het soort verlies dat hier al
  // eens een heel gesprek gekost heeft.
  const wachtendeRef = useRef<{ d: PreIntakeData; showToast: boolean } | null>(null);
  const dataRef = useRef<PreIntakeData>(data);
  dataRef.current = data;

  const persistData = useCallback(async (d: PreIntakeData, showToast: boolean): Promise<boolean> => {
    // Niets ingevuld: niets te doen, en dat is geen fout.
    if (!hasAnyData(d)) return true;

    // Wél ingevuld maar geen dossier om aan te hangen: dat is wél een fout, en
    // die moet zichtbaar zijn. Stil teruggeven kostte een volledig gesprek.
    if (!d.lead_id) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch { /* vol of geblokkeerd */ }
      console.error('Pre-intake niet bewaard: er is nog geen dossier gekoppeld.');
      if (showToast) {
        toast({
          title: 'Nog niet opgeslagen',
          description: 'Vul eerst een naam of telefoonnummer in, dan wordt het gesprek bewaard.',
          variant: 'destructive',
        });
      }
      return false;
    }

    const serialized = JSON.stringify(dataToRow(d));
    if (serialized === lastSavedRef.current) return true;

    // Een gelijktijdige opslag mag deze niet laten verdwijnen: onthouden en
    // meteen na afloop alsnog uitvoeren.
    if (isSavingRef.current) {
      wachtendeRef.current = { d, showToast };
      return true;
    }
    isSavingRef.current = true;
    let gelukt = false;

    try {
      const row = dataToRow(d);

      if (d.id) {
        const { error } = await supabase.from('pre_intake' as any).update(row).eq('id', d.id);
        if (error) throw error;
      } else {
        const { data: result, error } = await supabase.from('pre_intake' as any).insert(row).select('id').single();
        if (error) throw error;
        if (result) {
          update({ id: (result as any).id });
        }
      }

      // Status van het lead-dossier wordt NIET auto-gepromoot vanuit de pre-intake autosave.
      // Promotie naar 'telefoongesprek' gebeurt expliciet bij het afronden van de wrap-up.

      lastSavedRef.current = serialized;

      // Clear localStorage draft on successful save
      try { localStorage.removeItem(STORAGE_KEY); } catch {}

      if (showToast) {
        toast({ title: 'Opgeslagen', description: 'Gesprek bewaard.' });
      }
      gelukt = true;
    } catch (err: any) {
      // Fallback: save to localStorage
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {}

      console.error('Pre-intake save error:', err);
      if (showToast) {
        toast({ title: 'Fout bij opslaan', description: err.message || 'Probeer opnieuw.', variant: 'destructive' });
      }
    } finally {
      isSavingRef.current = false;
    }

    // Kwam er tijdens het opslaan een nieuwere versie binnen, dan gaat die er
    // nu alsnog in.
    const wachtende = wachtendeRef.current;
    if (wachtende) {
      wachtendeRef.current = null;
      return await persistDataRef.current(wachtende.d, wachtende.showToast);
    }

    return gelukt;
  }, [update, toast]);

  // Zelfverwijzing zodat de wachtende opslag zichzelf opnieuw kan aanroepen.
  const persistDataRef = useRef(persistData);
  persistDataRef.current = persistData;

  const savePreIntake = useCallback(async () => {
    return await persistData(dataRef.current, true);
  }, [persistData]);

  /** Flush onmiddellijk — accepteert optionele overrides die nog niet in React-state staan. */
  const flushSave = useCallback(async (overrides?: Partial<PreIntakeData>) => {
    clearTimeout(debounceRef.current);
    const merged = overrides ? { ...dataRef.current, ...overrides } : dataRef.current;
    return await persistData(merged, false);
  }, [persistData]);

  // Autosave every 5 seconds
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistData(dataRef.current, false);
    }, 5000);
    return () => clearTimeout(debounceRef.current);
  }, [data, persistData]);

  // Flush on unload
  useEffect(() => {
    const handleUnload = () => {
      clearTimeout(debounceRef.current);
      if (hasAnyData(dataRef.current)) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(dataRef.current)); } catch {}
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return { savePreIntake, flushSave };
}


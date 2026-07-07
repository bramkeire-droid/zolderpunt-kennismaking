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

function hasAnyData(d: PreIntakeData): boolean {
  return !!(
    d.call_started_at ||
    d.trigger_text ||
    d.emotional_keywords.length > 0 ||
    d.fomu_concerns.length > 0 ||
    d.buying_committee ||
    d.general_impression ||
    d.impression_tags.length > 0 ||
    d.region_gemeente ||
    d.scenario_chosen ||
    d.quick_notes
  );
}

export function usePreIntakeSave() {
  const { data, update } = usePreIntake();
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastSavedRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const dataRef = useRef<PreIntakeData>(data);
  dataRef.current = data;

  const persistData = useCallback(async (d: PreIntakeData, showToast: boolean) => {
    if (!d.lead_id || !hasAnyData(d)) return;

    const serialized = JSON.stringify(dataToRow(d));
    if (serialized === lastSavedRef.current) return;

    if (isSavingRef.current) return;
    isSavingRef.current = true;

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
        toast({ title: 'Opgeslagen', description: 'Pre-intake bewaard.' });
      }
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
  }, [update, toast]);

  const savePreIntake = useCallback(async () => {
    await persistData(dataRef.current, true);
  }, [persistData]);

  /** Flush onmiddellijk — accepteert optionele overrides die nog niet in React-state staan. */
  const flushSave = useCallback(async (overrides?: Partial<PreIntakeData>) => {
    clearTimeout(debounceRef.current);
    const merged = overrides ? { ...dataRef.current, ...overrides } : dataRef.current;
    await persistData(merged, false);
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


// Datalaag voor de nieuwe gespreksflow (SPRINTPLAN-COMMUNICATIE, Sprint 2): onbeperkt
// telefoongesprekken/videocalls per dossier met post-it-notities. Staat volledig LOS van
// pre_intake en leads.gesprek_datum — daar schrijft deze laag bewust nooit naar (kanban-
// categorisering en 1-per-dossier-aannames hangen eraan).
//
// De tabellen zijn nieuwer dan de gegenereerde Supabase-types; vandaar de `as any`-casts,
// hetzelfde patroon dat de app al gebruikt voor pre_intake.

import { supabase } from '@/integrations/supabase/client';

export type GesprekType = 'telefoon' | 'videocall';
export type NotitieSoort = 'notitie' | 'beslissing' | 'onthouden';

export type Gesprek = {
  id: string;
  lead_id: string;
  type: GesprekType;
  gestart_op: string;
  beeindigd_op: string | null;
  door_user: string | null;
};

export type GesprekNotitie = {
  id: string;
  lead_id: string;
  gesprek_id: string | null;
  soort: NotitieSoort;
  tekst: string;
  door_user: string | null;
  created_at: string;
};

const gesprekkenTabel = () => supabase.from('gesprekken' as any);
const notitiesTabel = () => supabase.from('gesprek_notities' as any);

/** Alle gesprekken van een dossier, nieuwste eerst. */
export async function fetchGesprekken(leadId: string): Promise<Gesprek[]> {
  const { data, error } = await gesprekkenTabel()
    .select('id, lead_id, type, gestart_op, beeindigd_op, door_user')
    .eq('lead_id', leadId)
    .order('gestart_op', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Gesprek[];
}

/** Alle post-its van een dossier, chronologisch oplopend. */
export async function fetchNotities(leadId: string): Promise<GesprekNotitie[]> {
  const { data, error } = await notitiesTabel()
    .select('id, lead_id, gesprek_id, soort, tekst, door_user, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as GesprekNotitie[];
}

/** Nog lopend gesprek van dit dossier (zonder eindtijd), zodat een refresh het hervat. */
export async function fetchLopendGesprek(leadId: string): Promise<Gesprek | null> {
  const { data, error } = await gesprekkenTabel()
    .select('id, lead_id, type, gestart_op, beeindigd_op, door_user')
    .eq('lead_id', leadId)
    .is('beeindigd_op', null)
    .order('gestart_op', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as Gesprek) ?? null;
}

export async function startGesprek(leadId: string, type: GesprekType): Promise<Gesprek> {
  const { data, error } = await gesprekkenTabel()
    .insert({ lead_id: leadId, type } as any)
    .select('id, lead_id, type, gestart_op, beeindigd_op, door_user')
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as Gesprek;
}

export async function beeindigGesprek(gesprekId: string): Promise<void> {
  const { error } = await gesprekkenTabel()
    .update({ beeindigd_op: new Date().toISOString() } as any)
    .eq('id', gesprekId);
  if (error) throw new Error(error.message);
}

export async function voegNotitieToe(
  leadId: string,
  gesprekId: string | null,
  soort: NotitieSoort,
  tekst: string,
): Promise<GesprekNotitie> {
  const { data, error } = await notitiesTabel()
    .insert({ lead_id: leadId, gesprek_id: gesprekId, soort, tekst } as any)
    .select('id, lead_id, gesprek_id, soort, tekst, door_user, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as GesprekNotitie;
}

/** user_id → weergavenaam, voor auteursvermelding op post-its en chat. */
export async function fetchProfielNamen(): Promise<Record<string, string>> {
  const { data } = await supabase.from('profiles').select('user_id, display_name');
  const map: Record<string, string> = {};
  for (const p of data ?? []) {
    if (p.user_id && p.display_name) map[p.user_id] = p.display_name;
  }
  return map;
}

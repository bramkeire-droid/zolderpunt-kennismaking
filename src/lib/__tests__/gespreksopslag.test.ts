import { describe, expect, it } from 'vitest';
import { hasAnyData } from '@/hooks/usePreIntakeSave';
import type { PreIntakeData } from '@/types/preIntake';
import { defaultPreIntake } from '@/types/preIntake';

// Een telefoongesprek ging verloren omdat de opslag besloot dat er "niets"
// was: de vier gespreksvakken (box_notes) stonden niet in de lijst met velden
// die meetellen. Van 23 gesprekken hield er zo één zijn notities.
//
// Deze tests bewaken dat elk veld dat bewaard wordt, ook meetelt.

const leeg = (): PreIntakeData => JSON.parse(JSON.stringify(defaultPreIntake));

describe('wat telt als "er is iets ingevuld"', () => {
  it('een leeg gesprek telt niet mee', () => {
    expect(hasAnyData(leeg())).toBe(false);
  });

  it('ALLEEN de vier gespreksvakken is genoeg — dit was de fout', () => {
    for (const vak of ['wat', 'waarom', 'aannemer', 'budget'] as const) {
      const d = leeg();
      (d.box_notes as Record<string, string[]>)[vak] = ['iets genoteerd'];
      expect(hasAnyData(d), `vak "${vak}" telt niet mee`).toBe(true);
    }
  });

  it('een gestart gesprek telt mee', () => {
    const d = leeg();
    d.call_started_at = new Date().toISOString();
    expect(hasAnyData(d)).toBe(true);
  });

  it('losse notities tellen mee', () => {
    const d = leeg();
    d.quick_notes = 'terugbellen na de vakantie';
    expect(hasAnyData(d)).toBe(true);
  });

  it('een geplande videocall telt mee', () => {
    const d = leeg();
    d.videocall_scheduled_at = '2026-09-01T10:00:00Z';
    expect(hasAnyData(d)).toBe(true);
  });

  it('een gekozen scenario telt mee', () => {
    const d = leeg();
    d.scenario_chosen = 'A';
    expect(hasAnyData(d)).toBe(true);
  });

  it('emotionele trefwoorden tellen mee', () => {
    const d = leeg();
    d.emotional_keywords = [{ text: 'eindelijk ruimte', added_at: new Date().toISOString() }];
    expect(hasAnyData(d)).toBe(true);
  });

  it('een dossierkoppeling alleen is géén inhoud', () => {
    // Anders zou het openen van een leeg gesprek al een rij aanmaken.
    const d = leeg();
    d.lead_id = 'abc';
    expect(hasAnyData(d)).toBe(false);
  });
});

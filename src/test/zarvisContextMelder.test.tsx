import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import ZarvisContextMelder from '@/components/ZarvisContextMelder';
import { AppNavProvider, type AppNav } from '@/contexts/AppNavContext';

// Het nieuwe Zarvis leest via het loket welk dossier in Compass open staat.
// Dat staat in zarvis_context; deze test bewaakt dat Compass die rij blijft schrijven.

const upsert = vi.hoisted(() => vi.fn(() => Promise.resolve({ error: null })));
const van = vi.hoisted(() => vi.fn(() => ({ upsert })));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: van } }));

const nav = (extra: Record<string, unknown>) => ({ huidigeView: 'dossier', ...extra }) as unknown as AppNav;

describe('ZarvisContextMelder', () => {
  it('schrijft scherm en open dossier naar zarvis_context', () => {
    render(
      <AppNavProvider value={nav({ actiefDossier: { id: 'D1', naam: 'Jansen' } })}>
        <ZarvisContextMelder />
      </AppNavProvider>,
    );
    expect(van).toHaveBeenCalledWith('zarvis_context');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ lead_id: 'D1', dossier_naam: 'Jansen', view: 'dossier' }),
      { onConflict: 'user_id' },
    );
  });

  it('zonder open dossier gaan lead_id en naam leeg', () => {
    upsert.mockClear();
    render(
      <AppNavProvider value={nav({ actiefDossier: null })}>
        <ZarvisContextMelder />
      </AppNavProvider>,
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ lead_id: null, dossier_naam: null }),
      { onConflict: 'user_id' },
    );
  });
});

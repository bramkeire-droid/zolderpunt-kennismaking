import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { SessionProvider, useSession, defaultLeadData } from '@/contexts/SessionContext';
import { PreIntakeProvider } from '@/contexts/PreIntakeContext';
import { useLeadSave } from '@/hooks/useLeadSave';
import { neemOver } from '@/lib/naBewaren';
import LiveCalling from '@/pages/LiveCalling';

// Live bevestigd op 19/11/2026: maak je in een dossier het e-mailadres leeg,
// dan zet de klantfiche-trigger het in de databank terug ("update … returning"
// gaf "", de rij hield het oude adres). Het telefoongesprek en de intake
// bleven daarna een leeg veld tonen, en de volgende bewaring stuurde dat lege
// veld opnieuw.

const db = vi.hoisted(() => ({
  lead: null as any,
  updates: [] as any[],
  OUD: 'oud@voorbeeld.be',
}));

vi.mock('@/integrations/supabase/client', () => {
  // Wat de klantfiche-triggers doen: een leeg e-mailadres komt terug.
  const triggers = (l: any) => ({ ...l, email: l.email || db.OUD });
  const bouwer = (tabel: string): any => {
    let patch: any = null;
    let ingevoegd: any = null;
    const enkel = () => {
      if (tabel === 'leads') return { data: ingevoegd ?? db.lead, error: null };
      if (tabel === 'pre_intake' && ingevoegd) return { data: { id: 'P1' }, error: null };
      return { data: null, error: null };
    };
    const b: any = new Proxy({}, {
      get(_, prop) {
        if (prop === 'then') {
          return (ok: any, nok: any) => Promise.resolve(
            tabel === 'leads' && !patch ? { data: [db.lead], error: null } : { data: null, error: null },
          ).then(ok, nok);
        }
        if (prop === 'update') {
          return (p: any) => {
            patch = p;
            db.updates.push({ tabel, patch: p });
            if (tabel === 'leads') db.lead = triggers({ ...db.lead, ...p });
            return b;
          };
        }
        if (prop === 'insert') return (p: any) => { ingevoegd = p; return b; };
        if (prop === 'single' || prop === 'maybeSingle') return async () => enkel();
        return () => b;
      },
    });
    return b;
  };
  return {
    supabase: {
      from: bouwer,
      functions: { invoke: async () => ({ data: null, error: null }) },
      auth: { getSession: async () => ({ data: { session: null } }), getUser: async () => ({ data: { user: null } }) },
      storage: { from: () => ({ createSignedUrls: async () => ({ data: [], error: null }) }) },
    },
  };
});

const toastIntake = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastIntake }), toast: toastIntake }));
const sonner = vi.hoisted(() => ({ warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), sonner), Toaster: () => null }));
vi.mock('@/components/AppShell', () => ({
  default: ({ children, primair }: any) => (
    <div>{primair && <button onClick={primair.onClick}>{primair.label}</button>}{children}</div>
  ),
}));
vi.mock('@/components/dossier/AangeleverdDoorKlant', () => ({ default: () => null }));
vi.mock('@/components/dossier/CalculatieHistoriek', () => ({ default: () => null }));

beforeEach(() => {
  db.updates = [];
  toastIntake.mockClear();
  sonner.warning.mockClear();
  db.lead = {
    ...defaultLeadData, id: 'L1', voornaam: 'Test', achternaam: 'Klant', email: db.OUD,
    telefoon: '0470 00 00 00', adres: '9400', partner_naam: '', status: 'nieuw',
  };
});

describe('Intake: na bewaren staat in beeld wat de databank hield', () => {
  it('een leeggemaakt e-mailadres dat de klantfiche terugzet, komt terug in beeld met een melding', async () => {
    const { result } = renderHook(() => ({ sessie: useSession(), opslag: useLeadSave() }), { wrapper: SessionProvider });
    act(() => result.current.sessie.loadLead({ ...db.lead }));
    act(() => result.current.sessie.updateLead({ email: '' }));
    await act(async () => { await result.current.opslag.saveLead(); });

    expect(db.updates.find(u => u.tabel === 'leads')?.patch.email).toBe('');
    expect(result.current.sessie.lead.email).toBe(db.OUD);
    expect(toastIntake).toHaveBeenCalledWith(expect.objectContaining({ title: 'Niet alles overgenomen' }));
  });
});

describe('Telefoongesprek: na bewaren staat in beeld wat de databank hield', () => {
  it('een leeggemaakt e-mailadres dat de klantfiche terugzet, komt terug in het veld met een melding', async () => {
    render(
      <PreIntakeProvider>
        <LiveCalling onGoHome={() => {}} onGoDossiers={() => {}} onOpenValidation={() => {}} initialLeadId="L1" />
      </PreIntakeProvider>,
    );
    const veld = await screen.findByPlaceholderText('E-mailadres');
    await waitFor(() => expect(veld).toHaveValue(db.OUD));
    fireEvent.change(veld, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Opslaan' }));

    await waitFor(() => expect(sonner.warning).toHaveBeenCalledWith(expect.stringMatching(/Niet overgenomen: e-mail/)));
    expect(db.updates.find(u => u.tabel === 'leads')?.patch.email).toBe('');
    expect(screen.getByPlaceholderText('E-mailadres')).toHaveValue(db.OUD);
  });
});

describe('neemOver: wie intussen verder typte, verliest niets', () => {
  it('neemt de databankwaarde alleen over waar nog staat wat verstuurd werd', () => {
    const verzonden = { email: '', telefoon: '0470' };
    const huidig = { email: 'jan@nieu', telefoon: '0470' }; // e-mail intussen verder getypt
    expect(neemOver(huidig, verzonden, { email: db.OUD, telefoon: '0499' }))
      .toEqual({ email: 'jan@nieu', telefoon: '0499' });
  });
});

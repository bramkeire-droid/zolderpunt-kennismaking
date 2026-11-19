import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import DossierOverzicht from '@/pages/DossierOverzicht';

// Bram (19/11/2026): "Ik wil op de dossierpagina zaken kunnen bewerken, vooral het
// kader linksboven om bijv. adres in te vullen." Dossier #ZL-0169 had als adres
// alleen "9400" (de postcode uit de website-aanvraag) en er was geen manier om
// het aan te vullen.

const db = vi.hoisted(() => ({
  lead: null as any,
  preIntake: null as any,
  andereKlant: null as any,
  geenRechten: false,
  // Wat de databanktriggers ná de update met de rij doen (bv. klantfiche zet iets terug).
  naTriggers: (l: any) => l,
  updates: [] as { tabel: string; patch: any }[],
}));

vi.mock('@/integrations/supabase/client', () => {
  const bouwer = (tabel: string) => {
    let patch: any = null;
    let toegepast = false;
    const pasToe = () => {
      if (!patch || toegepast || db.geenRechten) return;
      toegepast = true;
      if (tabel === 'leads') db.lead = db.naTriggers({ ...db.lead, ...patch });
      if (tabel === 'pre_intake') db.preIntake = { ...db.preIntake, ...patch };
    };
    const resultaat = () => {
      // Zoals Postgres: UPDATE ... RETURNING geeft de rij van vóór de AFTER-triggers.
      if (tabel === 'leads' && patch && !toegepast) { const voor = { ...db.lead, ...patch }; pasToe(); return { data: voor, error: null }; }
      pasToe();
      if (tabel === 'leads') return { data: db.lead, error: null };
      if (tabel === 'pre_intake') return { data: db.preIntake, error: null };
      if (tabel === 'customers') return { data: db.andereKlant, error: null };
      return { data: null, error: null };
    };
    const b: any = {
      select: () => b, eq: () => b, neq: () => b, order: () => b, limit: () => b,
      update: (p: any) => { patch = p; db.updates.push({ tabel, patch: p }); return b; },
      maybeSingle: async () => resultaat(),
      single: async () => resultaat(),
      then: (ok: any, nok: any) => {
        pasToe();
        const r = patch
          ? { data: db.geenRechten ? [] : [{ id: 'x' }], error: null }
          : { data: null, count: 0, error: null };
        return Promise.resolve(r).then(ok, nok);
      },
    };
    return b;
  };
  return { supabase: { from: bouwer } };
});
vi.mock('@/components/AppShell', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/dossier/KlantDossiers', () => ({ default: () => null }));
vi.mock('@/components/dossier/CalculatieHistoriek', () => ({ default: () => null }));
vi.mock('@/components/dossier/AangeleverdDoorKlant', () => ({ default: () => null }));
vi.mock('@/hooks/useSignedLeadFotos', () => ({ useSignedLeadFotos: () => [] }));
vi.mock('@/contexts/AppNavContext', () => ({ useAppNav: () => null }));

beforeEach(() => {
  db.updates = [];
  db.andereKlant = null;
  db.preIntake = null;
  db.geenRechten = false;
  db.naTriggers = (l: any) => l;
  db.lead = {
    id: 'L1', customer_id: 'K1', voornaam: 'Test', achternaam: 'Klant',
    telefoon: '0470 00 00 00', email: 'test@voorbeeld.be', adres: '9400',
    gevonden_via: 'Google Zoekopdracht', bouwflow_project_number: 'ZL-0169',
    created_at: '2026-11-11T10:00:00Z', fotos: [],
  };
});

const openBewerken = async () => {
  render(<DossierOverzicht leadId="L1" />);
  fireEvent.click(await screen.findByRole('button', { name: /Bewerken/ }));
};

describe('Dossierpagina — Klant & werf bewerken', () => {
  it('adres aanvullen bewaart alleen het adres, in de vorm die de rest van de app leest', async () => {
    await openBewerken();
    expect(screen.getByLabelText('Postcode')).toHaveValue('9400');
    fireEvent.change(screen.getByLabelText('Straat'), { target: { value: 'Kerkstraat' } });
    fireEvent.change(screen.getByLabelText('Nr'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('Gemeente'), { target: { value: 'Ninove' } });
    fireEvent.click(screen.getByRole('button', { name: /Bewaren/ }));

    await waitFor(() => expect(db.updates).toHaveLength(1));
    expect(db.updates[0]).toEqual({
      tabel: 'leads',
      patch: { adres: 'Kerkstraat 12, 9400 Ninove', adres_lat: null, adres_lng: null },
    });
    // Wat in beeld staat, is wat de databank teruggaf.
    expect(await screen.findAllByText(/Kerkstraat 12, 9400 Ninove/)).not.toHaveLength(0);
    expect(screen.queryByLabelText('Straat')).toBeNull();
  });

  it('meldt dat de wijziging niet naar BouwFlow gaat', async () => {
    await openBewerken();
    expect(screen.getByText(/Wijzigt niet in BouwFlow \(#ZL-0169\)/)).toBeInTheDocument();
  });

  it('weigert een e-mailadres van een andere klant in plaats van het dossier stil om te hangen', async () => {
    db.andereKlant = { id: 'K2', voornaam: 'Andere', achternaam: 'Persoon' };
    await openBewerken();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'ander@voorbeeld.be' } });
    fireEvent.click(screen.getByRole('button', { name: /Bewaren/ }));

    expect(await screen.findByText(/hoort al bij Andere Persoon/)).toBeInTheDocument();
    expect(db.updates).toHaveLength(0);
  });

  it('laat de dossierbalk opnieuw laden na het bewaren', async () => {
    const gehoord = vi.fn();
    const luister = (e: Event) => gehoord((e as CustomEvent).detail);
    window.addEventListener('dossier-bijgewerkt', luister);
    await openBewerken();
    fireEvent.change(screen.getByLabelText('Gemeente'), { target: { value: 'Ninove' } });
    fireEvent.click(screen.getByRole('button', { name: /Bewaren/ }));
    await waitFor(() => expect(gehoord).toHaveBeenCalledWith('L1'));
    window.removeEventListener('dossier-bijgewerkt', luister);
  });

  it('toont wat de databank NA de triggers hield, en meldt wat niet overgenomen is', async () => {
    // Een leeggemaakt e-mailadres: de klantfiche houdt het en zet het terug.
    db.naTriggers = (l: any) => ({ ...l, email: l.email || 'test@voorbeeld.be' });
    await openBewerken();
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Bewaren/ }));

    expect(await screen.findByText(/Niet overgenomen: e-mail/)).toBeInTheDocument();
    expect(screen.getByText('test@voorbeeld.be')).toBeInTheDocument();
  });

  it('zegt het als er niets bewaard werd (geen schrijfrechten)', async () => {
    db.geenRechten = true;
    await openBewerken();
    fireEvent.change(screen.getByLabelText('Gemeente'), { target: { value: 'Ninove' } });
    fireEvent.click(screen.getByRole('button', { name: /Bewaren/ }));
    expect(await screen.findByText(/Niets bewaard: geen schrijfrechten/)).toBeInTheDocument();
    expect(screen.getByLabelText('Gemeente')).toBeInTheDocument();
  });
});

describe('Dossierpagina — Wat we weten bewerken', () => {
  beforeEach(() => {
    db.preIntake = {
      id: 'P1', lead_id: 'L1',
      box_notes: { wat: ['Zolder leefbaar maken', 'bureel of slaapkamer'], aannemer: [], waarom: ['Te weinig ruimte'], budget: [] },
      questions_raised: { budget: { raised: true, note: '' }, overlast: { raised: false, note: '' } },
    };
  });

  it('een notitie corrigeren en een vraag aanvinken bewaart alleen die wijzigingen', async () => {
    render(<DossierOverzicht leadId="L1" />);
    const knoppen = await screen.findAllByRole('button', { name: /Bewerken/ });
    fireEvent.click(knoppen[1]); // [0] = Klant & werf, [1] = Wat we weten

    fireEvent.change(screen.getByLabelText('Wat? notitie 2'), { target: { value: 'bureau of slaapkamer' } });
    fireEvent.click(screen.getByLabelText('Overlast?'));
    fireEvent.change(screen.getByLabelText('Notitie bij Overlast?'), { target: { value: 'werken beiden thuis' } });
    fireEvent.click(screen.getByRole('button', { name: /Bewaren/ }));

    await waitFor(() => expect(db.updates.filter(u => u.tabel === 'pre_intake')).toHaveLength(1));
    const { patch } = db.updates.find(u => u.tabel === 'pre_intake')!;
    expect(patch.box_notes.wat).toEqual(['Zolder leefbaar maken', 'bureau of slaapkamer']);
    expect(patch.box_notes.waarom).toEqual(['Te weinig ruimte']);
    expect(patch.questions_raised.overlast).toEqual({ raised: true, note: 'werken beiden thuis' });
    expect(patch.questions_raised.budget).toEqual({ raised: true, note: '' });
    expect(await screen.findByText('bureau of slaapkamer')).toBeInTheDocument();
    expect(screen.getByText('werken beiden thuis')).toBeInTheDocument();
  });

  it('zonder telefoongesprek geen bewerkknop (er is geen pre_intake om in te schrijven)', async () => {
    db.preIntake = null;
    render(<DossierOverzicht leadId="L1" />);
    expect(await screen.findAllByRole('button', { name: /Bewerken/ })).toHaveLength(1);
  });
});

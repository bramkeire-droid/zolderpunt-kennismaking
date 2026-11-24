import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import KlantExtraGegevens, { isMailadres } from '@/components/dossier/KlantExtraGegevens';

// IDEE-36: extra mailadressen per klant. Wat hier bewaard wordt, gaat mee naar Mail-CRM.
const db = vi.hoisted(() => ({ rijen: [] as any[], inserts: [] as any[] }));

vi.mock('@/integrations/supabase/client', () => {
  const bouwer = () => {
    const b: any = {
      select: () => b, eq: () => b, order: async () => ({ data: db.rijen, error: null }),
      insert: async (r: any) => { db.inserts.push(r); db.rijen.push({ id: String(db.rijen.length), ...r }); return { error: null }; },
    };
    return b;
  };
  return { supabase: { from: bouwer } };
});

beforeEach(() => { db.rijen = []; db.inserts = []; });

describe('KlantExtraGegevens', () => {
  it('bewaart een extra mailadres in kleine letters bij de klant en toont het', async () => {
    render(<KlantExtraGegevens customerId="klant-1" />);
    fireEvent.click(screen.getByText(/Mailadres of nummer toevoegen/));
    fireEvent.change(screen.getByLabelText('Extra mailadres'), { target: { value: ' Jan.Peeters@Voorbeeld.be ' } });
    fireEvent.click(screen.getByText('Toevoegen'));
    await waitFor(() => expect(db.inserts).toEqual([{ customer_id: 'klant-1', soort: 'email', waarde: 'jan.peeters@voorbeeld.be' }]));
    expect(await screen.findByText('jan.peeters@voorbeeld.be')).toBeTruthy();
  });

  it('weigert een ongeldig adres zonder iets te bewaren', async () => {
    render(<KlantExtraGegevens customerId="klant-1" />);
    fireEvent.click(screen.getByText(/Mailadres of nummer toevoegen/));
    fireEvent.change(screen.getByLabelText('Extra mailadres'), { target: { value: 'geen-adres' } });
    fireEvent.click(screen.getByText('Toevoegen'));
    expect(await screen.findByText('Dat is geen geldig mailadres.')).toBeTruthy();
    expect(db.inserts).toEqual([]);
  });

  it('toont niets zonder klant', () => {
    const { container } = render(<KlantExtraGegevens customerId={null} />);
    expect(container.innerHTML).toBe('');
    expect(isMailadres('a@b.be')).toBe(true);
    expect(isMailadres('a@b')).toBe(false);
  });
});

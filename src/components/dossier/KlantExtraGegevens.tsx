import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Phone, Plus, X } from 'lucide-react';

interface Gegeven { id: string; soort: 'email' | 'telefoon'; waarde: string }

/** Ziet eruit als een mailadres: zelfde regel als de databank. */
export const isMailadres = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Extra mailadressen en telefoonnummers van de klant (IDEE-36). Het hoofdadres en -nummer blijven in de
// klantfiche zelf; wat hier staat, gaat elk kwartier mee naar Mail-CRM, zodat mails van die adressen bij
// dezelfde klant horen. Geldt voor de klant, dus voor al zijn dossiers.
export default function KlantExtraGegevens({ customerId }: { customerId: string | null | undefined }) {
  const [lijst, setLijst] = useState<Gegeven[]>([]);
  const [open, setOpen] = useState(false);
  const [soort, setSoort] = useState<'email' | 'telefoon'>('email');
  const [waarde, setWaarde] = useState('');
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  const laad = async () => {
    if (!customerId) return;
    const { data } = await supabase.from('klant_contactgegevens')
      .select('id, soort, waarde').eq('customer_id', customerId).order('created_at');
    setLijst((data ?? []) as Gegeven[]);
  };
  useEffect(() => { setLijst([]); laad(); }, [customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!customerId) return null;

  const voegToe = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = soort === 'email' ? waarde.trim().toLowerCase() : waarde.trim();
    if (soort === 'email' && !isMailadres(v)) { setFout('Dat is geen geldig mailadres.'); return; }
    if (soort === 'telefoon' && v.replace(/\D/g, '').length < 6) { setFout('Dat is geen geldig telefoonnummer.'); return; }
    setBezig(true);
    const { error } = await supabase.from('klant_contactgegevens').insert({ customer_id: customerId, soort, waarde: v });
    setBezig(false);
    if (error) {
      setFout(error.code === '23505' ? 'Dat staat er al.' : error.code === '42501' ? 'Je hebt geen rechten om dit toe te voegen.' : 'Bewaren mislukte.');
      return;
    }
    setWaarde(''); setFout(null); setOpen(false);
    laad();
  };

  const wis = async (g: Gegeven) => {
    if (!window.confirm(`${g.waarde} weghalen bij deze klant?`)) return;
    const { error } = await supabase.from('klant_contactgegevens').delete().eq('id', g.id);
    if (error) { setFout('Weghalen mislukte.'); return; }
    laad();
  };

  return (
    <div className="mt-1">
      {lijst.map(g => {
        const Icon = g.soort === 'email' ? Mail : Phone;
        return (
          <div key={g.id} className="group flex items-start gap-2 py-1 text-sm">
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="text-slate-500">{g.soort === 'email' ? 'Ook e-mail' : 'Ook telefoon'}</span>
            <span className="min-w-0 break-words font-medium text-slate-900">{g.waarde}</span>
            <button type="button" onClick={() => wis(g)} aria-label={`${g.waarde} weghalen`}
              className="-my-3 ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded text-slate-300 hover:bg-slate-100 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      {open ? (
        <form onSubmit={voegToe} noValidate className="mt-2 flex flex-wrap items-center gap-2">
          <select value={soort} onChange={e => setSoort(e.target.value as 'email' | 'telefoon')} aria-label="Soort"
            className="h-11 rounded border border-slate-200 bg-white px-2 text-sm">
            <option value="email">E-mail</option>
            <option value="telefoon">Telefoon</option>
          </select>
          <input autoFocus value={waarde} onChange={e => { setWaarde(e.target.value); setFout(null); }}
            type={soort === 'email' ? 'email' : 'tel'} placeholder={soort === 'email' ? 'naam@voorbeeld.be' : '0470 12 34 56'}
            aria-label={soort === 'email' ? 'Extra mailadres' : 'Extra telefoonnummer'}
            className="h-11 min-w-0 flex-1 basis-48 rounded border border-slate-200 px-2 text-sm" />
          <button type="submit" disabled={bezig || !waarde.trim()}
            className="h-11 min-w-11 rounded bg-primary px-3 text-xs font-medium text-white disabled:opacity-50">Toevoegen</button>
          <button type="button" onClick={() => { setOpen(false); setWaarde(''); setFout(null); }}
            className="h-11 min-w-11 px-2 text-xs text-slate-500 hover:underline">Annuleren</button>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          className="-my-1 inline-flex h-11 items-center gap-1 text-xs font-medium text-primary hover:underline">
          <Plus className="h-3 w-3" /> Mailadres of nummer toevoegen
        </button>
      )}
      {fout && <p className="mt-1 text-xs text-red-600">{fout}</p>}
    </div>
  );
}

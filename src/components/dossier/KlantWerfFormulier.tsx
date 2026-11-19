import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  GEVONDEN_VIA, bepaalWijzigingen, bewaarKlantWerf, splitsAdres,
  type AdresDelen, type KlantWerfLead,
} from '@/lib/klantWerf';

interface Props {
  lead: KlantWerfLead & { bouwflow_project_number?: string | null; bouwflow_pushed_at?: string | null };
  onBewaard: (rij: any, nietOvergenomen: string[]) => void;
  onAnnuleer: () => void;
}

const Veld = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <label htmlFor={id} className="mb-0.5 block text-xs text-slate-500">{label}</label>
    {children}
  </div>
);

/**
 * Het kader "Klant & werf" in bewerkmodus. Zelfde werkwijze als een post-it
 * (PostItRij): ter plaatse aanpassen, Bewaren of Annuleren, fout in beeld.
 */
export default function KlantWerfFormulier({ lead, onBewaard, onAnnuleer }: Props) {
  const [adres, setAdres] = useState<AdresDelen>(() => splitsAdres(lead.adres));
  const [telefoon, setTelefoon] = useState(lead.telefoon ?? '');
  const [email, setEmail] = useState(lead.email ?? '');
  const [gevondenVia, setGevondenVia] = useState(lead.gevonden_via ?? '');
  const [anderen, setAnderen] = useState(0);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  // Telefoon en e-mail gelden voor de klant: zeg vooraf hoeveel dossiers meeveranderen.
  useEffect(() => {
    if (!lead.customer_id) return;
    void supabase.from('leads').select('id', { count: 'exact', head: true })
      .eq('customer_id', lead.customer_id).neq('id', lead.id)
      .then(({ count }) => setAnderen(count ?? 0));
  }, [lead.id, lead.customer_id]);

  const zet = (k: keyof AdresDelen) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAdres(a => ({ ...a, [k]: e.target.value }));

  const bewaar = async (e: React.FormEvent) => {
    e.preventDefault();
    const patch = bepaalWijzigingen(lead, adres, { telefoon, email, gevonden_via: gevondenVia });
    if (Object.keys(patch).length === 0) { onAnnuleer(); return; }
    setBezig(true);
    setFout(null);
    try {
      const { rij, nietOvergenomen } = await bewaarKlantWerf(lead, patch);
      onBewaard(rij, nietOvergenomen);
    } catch (err) {
      setFout((err as Error).message);
      setBezig(false);
    }
  };

  const inBouwflow = !!(lead.bouwflow_project_number || lead.bouwflow_pushed_at);

  return (
    <form onSubmit={bewaar} onKeyDown={(e) => { if (e.key === 'Escape') onAnnuleer(); }} className="space-y-2">
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <Veld id="kw-straat" label="Straat">
          <Input id="kw-straat" value={adres.straat} onChange={zet('straat')} disabled={bezig} autoFocus />
        </Veld>
        <Veld id="kw-nummer" label="Nr">
          <Input id="kw-nummer" value={adres.nummer} onChange={zet('nummer')} disabled={bezig} />
        </Veld>
      </div>
      <div className="grid grid-cols-[4.5rem_1fr] gap-2">
        <Veld id="kw-postcode" label="Postcode">
          <Input id="kw-postcode" inputMode="numeric" value={adres.postcode} onChange={zet('postcode')} disabled={bezig} />
        </Veld>
        <Veld id="kw-gemeente" label="Gemeente">
          <Input id="kw-gemeente" value={adres.gemeente} onChange={zet('gemeente')} disabled={bezig} />
        </Veld>
      </div>
      <Veld id="kw-telefoon" label="Telefoon">
        <Input id="kw-telefoon" type="tel" value={telefoon} onChange={e => setTelefoon(e.target.value)} disabled={bezig} />
      </Veld>
      <Veld id="kw-email" label="E-mail">
        <Input id="kw-email" inputMode="email" autoComplete="off" value={email} onChange={e => setEmail(e.target.value)} disabled={bezig} />
      </Veld>
      <Veld id="kw-gevonden" label="Gevonden via">
        <Input id="kw-gevonden" list="kw-gevonden-lijst" value={gevondenVia}
          onChange={e => setGevondenVia(e.target.value)} disabled={bezig} />
        <datalist id="kw-gevonden-lijst">
          {GEVONDEN_VIA.map(o => <option key={o} value={o} />)}
        </datalist>
      </Veld>

      <div className="space-y-1 pt-1 text-xs text-slate-500">
        {anderen > 0 && (
          <p>Telefoon en e-mail horen bij de klant: ze veranderen ook in {anderen === 1 ? 'het andere dossier' : `de ${anderen} andere dossiers`}. Het adres geldt alleen voor dit dossier.</p>
        )}
        {inBouwflow && (
          <p>Wijzigt niet in BouwFlow{lead.bouwflow_project_number ? ` (#${lead.bouwflow_project_number})` : ''}: pas het daar zelf aan als het nodig is.</p>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" className="gap-1" disabled={bezig}>
          {bezig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Bewaren
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onAnnuleer} disabled={bezig}>Annuleren</Button>
      </div>
      {fout && <p className="text-xs text-destructive">Bewaren mislukte: {fout}</p>}
    </form>
  );
}

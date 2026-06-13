import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Minus, Plus, Download, FileText, CheckCircle2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import OffertebijlagePdf from './OffertebijlagePdf';

const fmtEur = (n: number) =>
  new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

interface Props {
  open: boolean;
  onClose: () => void;
  lead: any;
  onUpdate?: (leadId: string, patch: Record<string, any>) => void;
}

export default function OffertebijlageDialog({ open, onClose, lead, onUpdate }: Props) {
  const initialSettings = lead?.offerte_bijlage_settings || {};
  const [bedrag, setBedrag] = useState<number>(
    Number(lead?.offerte_bedrag_excl) || Number(lead?.budget_excl) || Number(lead?.budget_min) || 30000
  );
  const [offerteNummer, setOfferteNummer] = useState<string>(lead?.offerte_nummer || '');
  const [offerteDatum, setOfferteDatum] = useState<string>(lead?.offerte_datum || new Date().toISOString().split('T')[0]);
  const [weken, setWeken] = useState<number>(initialSettings.weken || 5);
  const [trapgat, setTrapgat] = useState<boolean>(initialSettings.trapgat ?? !!lead?.technisch?.trap);
  const [btwPct, setBtwPct] = useState<6 | 21>((lead?.btw_percentage === 21 ? 21 : 6) as 6 | 21);
  const [voornaam, setVoornaam] = useState<string>(lead?.voornaam || '');
  const [achternaam, setAchternaam] = useState<string>(lead?.achternaam || '');
  const [adres, setAdres] = useState<string>(lead?.adres || '');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBedrag(Number(lead?.offerte_bedrag_excl) || Number(lead?.budget_excl) || Number(lead?.budget_min) || 30000);
    setOfferteNummer(lead?.offerte_nummer || '');
    setOfferteDatum(lead?.offerte_datum || new Date().toISOString().split('T')[0]);
    setWeken(lead?.offerte_bijlage_settings?.weken || 5);
    setTrapgat(lead?.offerte_bijlage_settings?.trapgat ?? !!lead?.technisch?.trap);
    setBtwPct((lead?.btw_percentage === 21 ? 21 : 6) as 6 | 21);
    setVoornaam(lead?.voornaam || '');
    setAchternaam(lead?.achternaam || '');
    setAdres(lead?.adres || '');
  }, [open, lead?.id]);

  // Vergelijking met intake-range (excl. BTW). Fallback op budget_min/max indien geen excl beschikbaar.
  const intakeMin = Number(lead?.budget_min) || 0;
  const intakeMax = Number(lead?.budget_max) || 0;
  const vergelijking = useMemo(() => {
    if (!intakeMin || !intakeMax) return null;
    if (bedrag >= intakeMin && bedrag <= intakeMax) {
      return { kind: 'binnen' as const, deltaPct: 0, interpretatie: 'Offerte valt binnen de intake-range. Geen extra toelichting nodig.' };
    }
    if (bedrag < intakeMin) {
      const pct = Math.round(((intakeMin - bedrag) / intakeMin) * 100);
      return { kind: 'onder' as const, deltaPct: pct, interpretatie: `Offerte ligt ${pct}% onder de ondergrens van de intake — controleer of de scope volledig is.` };
    }
    const pct = Math.round(((bedrag - intakeMax) / intakeMax) * 100);
    return { kind: 'boven' as const, deltaPct: pct, interpretatie: `Offerte ligt ${pct}% boven de bovengrens van de intake — bespreek meerwerk of scope-uitbreiding.` };
  }, [bedrag, intakeMin, intakeMax]);

  const voorschot = bedrag * 0.30;
  const uitvoering = bedrag * 0.60;
  const oplevering = bedrag * 0.10;
  const perWeek = uitvoering / Math.max(1, weken);

  const slug = (s: string) => s.replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'Onbekend';

  const handleSave = async () => {
    if (!lead?.id) return true;
    setSaving(true);
    const patch = {
      offerte_bedrag_excl: bedrag,
      offerte_nummer: offerteNummer.trim() || null,
      offerte_datum: offerteDatum || new Date().toISOString().split('T')[0],
      offerte_bijlage_settings: { weken, trapgat },
    };
    const { error } = await supabase.from('leads').update(patch as any).eq('id', lead.id);
    setSaving(false);
    if (error) { toast.error('Opslaan mislukt'); return false; }
    toast.success('Offerte opgeslagen');
    onUpdate?.(lead.id, patch);
    return true;
  };

  const handleDownload = async () => {
    if (!offerteNummer.trim()) { toast.error('Vul eerst het offertenummer in'); return; }
    if (!offerteDatum) { toast.error('Vul eerst de offertedatum in'); return; }
    setGenerating(true);
    try {
      const ok = await handleSave();
      if (!ok) return;
      const blob = await pdf(
        <OffertebijlagePdf
          data={{
            voornaam: lead?.voornaam || '',
            achternaam: lead?.achternaam || '',
            adres: lead?.adres || '',
            datum: offerteDatum,
            offerteNummer: offerteNummer.trim(),
            bedragExcl: bedrag,
            weken,
            trapgat,
            btwPct,
          }}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Zolderpunt_Offertebijlage_${slug(offerteNummer.trim())}_${slug(lead?.achternaam || 'Klant')}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Offertebijlage gedownload');
    } catch (err: any) {
      console.error(err);
      toast.error('PDF mislukt');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Offerte & bijlage
          </DialogTitle>
          <DialogDescription>
            Vul het offertebedrag in, vergelijk met de intake en genereer de A4-bijlage met facturatie en planning.
          </DialogDescription>
        </DialogHeader>

        {/* Vergelijking */}
        {intakeMin > 0 && intakeMax > 0 && (
          <div className="bg-muted/40 border border-border p-4 space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Vergelijking met intake</div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Intake-range (excl. BTW)</span>
              <span className="font-headline font-semibold">{fmtEur(intakeMin)} — {fmtEur(intakeMax)}</span>
            </div>
            {vergelijking && (
              <div className="flex items-start gap-2 pt-1">
                {vergelijking.kind === 'binnen' && <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />}
                {vergelijking.kind === 'onder' && <ArrowDownCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />}
                {vergelijking.kind === 'boven' && <ArrowUpCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />}
                <div className="flex-1">
                  <div className={`inline-block text-[0.65rem] font-bold tracking-wider uppercase px-2 py-0.5 ${
                    vergelijking.kind === 'binnen' ? 'bg-green-100 text-green-700' :
                    vergelijking.kind === 'onder' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {vergelijking.kind === 'binnen' ? 'Binnen intake' : vergelijking.kind === 'onder' ? `−${vergelijking.deltaPct}% onder min` : `+${vergelijking.deltaPct}% boven max`}
                  </div>
                  <p className="text-sm text-foreground/80 mt-1">{vergelijking.interpretatie}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Offerte identificatie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border p-4">
            <Label htmlFor="offerte-nr" className="text-xs uppercase tracking-wider text-muted-foreground">Offertenummer</Label>
            <Input
              id="offerte-nr"
              value={offerteNummer}
              onChange={e => setOfferteNummer(e.target.value)}
              placeholder="bv. 2026-042"
              className="mt-2 font-headline font-semibold"
            />
            <div className="text-[10px] text-muted-foreground mt-1">Wordt gebruikt in de bestandsnaam van de bijlage.</div>
          </div>
          <div className="bg-card border border-border p-4">
            <Label htmlFor="offerte-datum" className="text-xs uppercase tracking-wider text-muted-foreground">Datum offerte</Label>
            <Input
              id="offerte-datum"
              type="date"
              value={offerteDatum}
              onChange={e => setOfferteDatum(e.target.value)}
              className="mt-2 font-headline font-semibold"
            />
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border-2 border-primary p-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Totaalbedrag offerte (excl. BTW)</Label>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => setBedrag(b => Math.max(0, b - 5000))} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90"><Minus className="h-4 w-4" /></button>
              <Input
                type="number"
                value={bedrag}
                onChange={e => setBedrag(Number(e.target.value) || 0)}
                className="text-center font-headline font-bold text-xl"
              />
              <button onClick={() => setBedrag(b => b + 5000)} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90"><Plus className="h-4 w-4" /></button>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Plus/min in stappen van € 5.000</div>
          </div>

          <div className="bg-card border-2 border-primary p-5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Duur uitvoering</Label>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => setWeken(w => Math.max(1, w - 1))} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90"><Minus className="h-4 w-4" /></button>
              <div className="flex-1 text-center font-headline font-bold text-xl tabular-nums">{weken} {weken === 1 ? 'week' : 'weken'}</div>
              <button onClick={() => setWeken(w => Math.min(20, w + 1))} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90"><Plus className="h-4 w-4" /></button>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <Checkbox checked={trapgat} onCheckedChange={(v) => setTrapgat(!!v)} />
              <span className="text-sm">Trapgat voorafgaand uitvoeren</span>
            </label>
          </div>
        </div>

        <div className="flex gap-2 items-center text-xs">
          <span className="text-muted-foreground">BTW:</span>
          <button onClick={() => setBtwPct(6)} className={`px-3 py-1 ${btwPct === 6 ? 'bg-primary text-white' : 'bg-muted'}`}>6%</button>
          <button onClick={() => setBtwPct(21)} className={`px-3 py-1 ${btwPct === 21 ? 'bg-primary text-white' : 'bg-muted'}`}>21%</button>
        </div>

        {/* Live preview verdeling */}
        <div className="grid grid-cols-3 gap-2">
          <PreviewBlock label="Voorschot" pct="30%" bedrag={voorschot} />
          <PreviewBlock label={`Uitvoering · ${weken}×`} pct="60%" bedrag={uitvoering} sub={`≈ ${fmtEur(perWeek)}/wk`} />
          <PreviewBlock label="Oplevering" pct="10%" bedrag={oplevering} />
        </div>

        {/* Tijdlijn mini-preview */}
        <div className="bg-muted/40 border border-border p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Tijdlijn preview</div>
          <div className="flex gap-1">
            {trapgat && <div className="flex-1 bg-amber-400 text-white text-[10px] text-center py-1.5 font-bold">Trapgat</div>}
            {Array.from({ length: weken }).map((_, i) => (
              <div key={i} className="flex-1 bg-primary text-white text-[10px] text-center py-1.5 font-bold">W{i + 1}</div>
            ))}
            <div className="flex-1 bg-green-600 text-white text-[10px] text-center py-1.5 font-bold">✓</div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Sluiten</Button>
          <Button variant="outline" onClick={handleSave} disabled={saving || !lead?.id}>
            {saving ? 'Opslaan…' : 'Enkel opslaan'}
          </Button>
          <Button onClick={handleDownload} disabled={generating || !lead?.id} className="gap-2">
            <Download className="h-4 w-4" />
            {generating ? 'Bezig…' : 'Bijlage downloaden'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewBlock({ label, pct, bedrag, sub }: { label: string; pct: string; bedrag: number; sub?: string }) {
  return (
    <div className="border border-border bg-card p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-headline font-bold text-primary text-lg mt-1">{pct}</div>
      <div className="text-sm font-semibold tabular-nums">{fmtEur(bedrag)}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import GenericVoorbladPdf from './GenericVoorbladPdf';
import AddressAutocomplete from '@/components/AddressAutocomplete';

interface Props {
  open: boolean;
  onClose: () => void;
  lead?: any; // optioneel — voor pre-fill klantgegevens
}

const slugFn = (s: string) => (s || '').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'Document';

const PRESETS = [
  { id: 'custom', label: 'Eigen titel', sectionLabel: 'PROJECTDOSSIER', title: '', subtitle: '' },
  { id: 'offerte', label: 'Offerte', sectionLabel: 'OFFERTE · ZOLDERPUNT', title: 'Offerte', subtitle: 'Persoonlijk voorstel voor de uitvoering van uw zolderproject.' },
  { id: 'stab', label: 'Stabiliteitsstudie', sectionLabel: 'STUDIE · STABILITEIT', title: 'Stabiliteitsstudie', subtitle: 'Technisch dossier in voorbereiding op de uitvoering van de werken.' },
  { id: 'epb', label: 'EPB-verslag', sectionLabel: 'ENERGIEPRESTATIE', title: 'EPB-verslag', subtitle: 'Berekening en verslaggeving energieprestatie.' },
  { id: 'meet', label: 'Meetstaat', sectionLabel: 'PROJECT · MEETSTAAT', title: 'Meetstaat', subtitle: 'Gedetailleerde opmeting van de uit te voeren werken.' },
  { id: 'plan', label: 'Bouwplannen', sectionLabel: 'PROJECT · PLANNEN', title: 'Bouwplannen', subtitle: 'Architecturale en technische plannen.' },
] as const;

export default function GenericVoorbladDialog({ open, onClose, lead }: Props) {
  const [presetId, setPresetId] = useState<string>('custom');
  const [sectionLabel, setSectionLabel] = useState('PROJECTDOSSIER');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [klantNaam, setKlantNaam] = useState('');
  const [adres, setAdres] = useState('');
  const [referentie, setReferentie] = useState('');
  const [datum, setDatum] = useState(new Date().toISOString().split('T')[0]);
  const [rapportFile, setRapportFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setKlantNaam(`${lead?.voornaam || ''} ${lead?.achternaam || ''}`.trim());
    setAdres(lead?.adres || '');
    setReferentie(lead?.offerte_nummer || '');
    setDatum(new Date().toISOString().split('T')[0]);
    setRapportFile(null);
  }, [open, lead?.id]);

  const applyPreset = (id: string) => {
    setPresetId(id);
    const p = PRESETS.find(x => x.id === id);
    if (!p) return;
    setSectionLabel(p.sectionLabel);
    if (id !== 'custom') {
      setTitle(p.title);
      setSubtitle(p.subtitle);
    }
  };

  const buildBytes = async (): Promise<Uint8Array> => {
    const blob = await pdf(
      <GenericVoorbladPdf
        data={{
          sectionLabel,
          title: title.trim() || 'Document',
          subtitle: subtitle.trim() || undefined,
          klantNaam: klantNaam.trim() || undefined,
          adres: adres.trim() || undefined,
          referentie: referentie.trim() || undefined,
          datum,
        }}
      />
    ).toBlob();
    return new Uint8Array(await blob.arrayBuffer());
  };


  const download = (bytes: Uint8Array, filename: string) => {
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filenameBase = () => {
    const t = slugFn(title || 'Voorblad');
    const k = slugFn(klantNaam || lead?.achternaam || '');
    return k ? `Zolderpunt_${t}_${k}` : `Zolderpunt_${t}`;
  };

  const handleVoorblad = async () => {
    if (!title.trim()) { toast.error('Geef een titel op'); return; }
    setBusy(true);
    try {
      const bytes = await buildBytes();
      download(bytes, `${filenameBase()}.pdf`);
      toast.success('Voorblad gedownload');
    } catch (err) { console.error(err); toast.error('PDF mislukt'); }
    finally { setBusy(false); }
  };

  const handleMerge = async () => {
    if (!title.trim()) { toast.error('Geef een titel op'); return; }
    if (!rapportFile) { toast.error('Selecteer eerst een PDF om samen te voegen'); return; }
    setBusy(true);
    const t = toast.loading('Documenten worden samengevoegd...');
    try {
      const voorbladBytes = await buildBytes();
      const rapportBytes = new Uint8Array(await rapportFile.arrayBuffer());
      const merged = await PDFDocument.create();
      const v = await PDFDocument.load(voorbladBytes);
      const r = await PDFDocument.load(rapportBytes, { ignoreEncryption: true });
      (await merged.copyPages(v, v.getPageIndices())).forEach(p => merged.addPage(p));
      (await merged.copyPages(r, r.getPageIndices())).forEach(p => merged.addPage(p));
      const out = await merged.save();
      download(out, `${filenameBase()}.pdf`);
      toast.success('Samengevoegd document gedownload', { id: t });
    } catch (err: any) {
      console.error(err); toast.error('Samenvoegen mislukt', { id: t });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Generiek voorblad
          </DialogTitle>
          <DialogDescription>
            Maak een voorblad in huisstijl voor om het even welk document. Optioneel: upload een PDF om beide samen te voegen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Snelkeuze</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className={`px-3 py-1.5 text-xs font-headline border ${presetId === p.id ? 'bg-primary text-white border-primary' : 'bg-card border-border hover:border-primary/50'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="gen-section" className="text-xs uppercase tracking-wider text-muted-foreground">Klein label boven titel</Label>
            <Input id="gen-section" value={sectionLabel} onChange={e => setSectionLabel(e.target.value.toUpperCase())} className="mt-1" />
          </div>


          <div>
            <Label htmlFor="gen-title" className="text-xs uppercase tracking-wider text-muted-foreground">Titel *</Label>
            <Input id="gen-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="bv. Asbestattest" className="mt-1 font-headline font-semibold text-lg" />
          </div>

          <div>
            <Label htmlFor="gen-sub" className="text-xs uppercase tracking-wider text-muted-foreground">Ondertitel</Label>
            <Textarea id="gen-sub" value={subtitle} onChange={e => setSubtitle(e.target.value)} rows={2} className="mt-1" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gen-klant" className="text-xs uppercase tracking-wider text-muted-foreground">Opdrachtgever</Label>
              <Input id="gen-klant" value={klantNaam} onChange={e => setKlantNaam(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="gen-datum" className="text-xs uppercase tracking-wider text-muted-foreground">Datum</Label>
              <Input id="gen-datum" type="date" value={datum} onChange={e => setDatum(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <Label htmlFor="gen-adres" className="text-xs uppercase tracking-wider text-muted-foreground">Projectadres</Label>
            <Input id="gen-adres" value={adres} onChange={e => setAdres(e.target.value)} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="gen-ref" className="text-xs uppercase tracking-wider text-muted-foreground">Referentie</Label>
            <Input id="gen-ref" value={referentie} onChange={e => setReferentie(e.target.value)} placeholder="bv. 2026-042" className="mt-1" />
          </div>

          <div className="bg-card border-2 border-dashed border-border p-4 space-y-2">
            <Label htmlFor="gen-file" className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" /> PDF om samen te voegen (optioneel)
            </Label>
            <Input id="gen-file" type="file" accept="application/pdf,.pdf" onChange={e => setRapportFile(e.target.files?.[0] || null)} />
            {rapportFile && (
              <div className="text-sm font-medium">{rapportFile.name} <span className="text-muted-foreground">({Math.round(rapportFile.size / 1024)} KB)</span></div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Sluiten</Button>
          <Button variant="outline" onClick={handleVoorblad} disabled={busy} className="gap-2">
            <Download className="h-4 w-4" /> Alleen voorblad
          </Button>
          <Button onClick={handleMerge} disabled={busy || !rapportFile} className="gap-2">
            <Download className="h-4 w-4" /> {busy ? 'Bezig…' : 'Samenvoegen & downloaden'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

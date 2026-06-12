import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Hammer, Download, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { PDFDocument } from 'pdf-lib';
import StabiliteitVoorbladPdf from './StabiliteitVoorbladPdf';

interface Props {
  open: boolean;
  onClose: () => void;
  lead: any;
}

const slugFn = (s: string) => (s || '').replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'Klant';

export default function StabiliteitVoorbladDialog({ open, onClose, lead }: Props) {
  const [datum, setDatum] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rapportFile, setRapportFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const buildVoorbladBytes = async (): Promise<Uint8Array> => {
    const blob = await pdf(
      <StabiliteitVoorbladPdf
        data={{
          voornaam: lead?.voornaam || '',
          achternaam: lead?.achternaam || '',
          adres: lead?.adres || '',
          datum,
          dossierRef: lead?.offerte_nummer || undefined,
        }}
      />
    ).toBlob();
    return new Uint8Array(await blob.arrayBuffer());
  };

  const triggerDownload = (bytes: Uint8Array, filename: string) => {
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleVoorbladOnly = async () => {
    setBusy(true);
    try {
      const bytes = await buildVoorbladBytes();
      triggerDownload(bytes, `Zolderpunt_Stabiliteitsstudie_Voorblad_${slugFn(lead?.achternaam || 'Klant')}.pdf`);
      toast.success('Voorblad gedownload');
    } catch (err) {
      console.error(err); toast.error('PDF mislukt');
    } finally { setBusy(false); }
  };

  const handleMerge = async () => {
    if (!rapportFile) { toast.error('Selecteer eerst het stabiliteitsrapport (PDF)'); return; }
    if (rapportFile.type !== 'application/pdf' && !rapportFile.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Alleen PDF-bestanden worden ondersteund'); return;
    }
    setBusy(true);
    const t = toast.loading('Documenten worden samengevoegd...');
    try {
      const voorbladBytes = await buildVoorbladBytes();
      const rapportBytes = new Uint8Array(await rapportFile.arrayBuffer());

      const merged = await PDFDocument.create();
      const voorbladDoc = await PDFDocument.load(voorbladBytes);
      const rapportDoc = await PDFDocument.load(rapportBytes, { ignoreEncryption: true });

      const vPages = await merged.copyPages(voorbladDoc, voorbladDoc.getPageIndices());
      vPages.forEach(p => merged.addPage(p));
      const rPages = await merged.copyPages(rapportDoc, rapportDoc.getPageIndices());
      rPages.forEach(p => merged.addPage(p));

      const out = await merged.save();
      triggerDownload(out, `Zolderpunt_Stabiliteitsstudie_${slugFn(lead?.achternaam || 'Klant')}.pdf`);
      toast.success('Samengevoegd document gedownload', { id: t });
    } catch (err: any) {
      console.error(err);
      toast.error('Samenvoegen mislukt: ' + (err?.message || 'onbekende fout'), { id: t });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" /> Stabiliteitsstudie · voorblad
          </DialogTitle>
          <DialogDescription>
            Genereer een voorblad in huisstijl. Upload optioneel het effectieve stabiliteitsrapport om alles in één PDF samen te voegen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/40 border border-border p-4 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Klant</div>
            <div className="font-headline font-bold">{`${lead?.voornaam || ''} ${lead?.achternaam || ''}`.trim() || '—'}</div>
            <div className="text-sm text-muted-foreground">{lead?.adres || '—'}</div>
          </div>

          <div>
            <Label htmlFor="stab-datum" className="text-xs uppercase tracking-wider text-muted-foreground">Datum</Label>
            <Input id="stab-datum" type="date" value={datum} onChange={e => setDatum(e.target.value)} className="mt-2 font-headline font-semibold" />
          </div>

          <div className="bg-card border-2 border-dashed border-border p-4 space-y-3">
            <Label htmlFor="stab-file" className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" /> Stabiliteitsrapport (PDF, optioneel)
            </Label>
            <Input
              id="stab-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={e => setRapportFile(e.target.files?.[0] || null)}
            />
            {rapportFile && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium">{rapportFile.name}</span>
                <span className="text-muted-foreground">({Math.round(rapportFile.size / 1024)} KB)</span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Bij upload wordt het voorblad als pagina 1 toegevoegd en gevolgd door alle pagina's van het rapport.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>Sluiten</Button>
          <Button variant="outline" onClick={handleVoorbladOnly} disabled={busy} className="gap-2">
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

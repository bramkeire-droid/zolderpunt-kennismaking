import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { compressImageFile } from '@/lib/imageCompression';
import { toast } from 'sonner';

interface PhotoItem {
  bestandsnaam: string;
  storage_path: string;
  url?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  lead: any;
  onUpdate: (leadId: string, patch: { fotos: PhotoItem[] }) => void;
}

export default function PhotoUploadDialog({ open, onClose, lead, onUpdate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const existing: PhotoItem[] = Array.isArray(lead?.fotos) ? lead.fotos : [];

  const resolveUrl = (f: PhotoItem) =>
    f.url || supabase.storage.from('lead-fotos').getPublicUrl(f.storage_path).data.publicUrl;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !lead?.id) return;
    setUploading(true);
    const added: PhotoItem[] = [];
    for (const raw of Array.from(files)) {
      try {
        const file = await compressImageFile(raw);
        const path = `${lead.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from('lead-fotos')
          .upload(path, file, { upsert: false, contentType: file.type });
        if (error) { console.error(error); continue; }
        const { data: urlData } = supabase.storage.from('lead-fotos').getPublicUrl(path);
        added.push({ bestandsnaam: file.name, storage_path: path, url: urlData.publicUrl });
      } catch (e) { console.error(e); }
    }
    if (added.length > 0) {
      const next = [...existing, ...added];
      const { error } = await supabase.from('leads').update({ fotos: next as any }).eq('id', lead.id);
      if (error) { toast.error('Opslaan mislukt'); }
      else {
        onUpdate(lead.id, { fotos: next });
        toast.success(`${added.length} foto${added.length === 1 ? '' : "'s"} toegevoegd`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async (idx: number) => {
    const target = existing[idx];
    if (!target) return;
    const next = existing.filter((_, i) => i !== idx);
    const { error } = await supabase.from('leads').update({ fotos: next as any }).eq('id', lead.id);
    if (error) { toast.error('Verwijderen mislukt'); return; }
    await supabase.storage.from('lead-fotos').remove([target.storage_path]).catch(() => {});
    onUpdate(lead.id, { fotos: next });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Foto's uploaden
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-body mt-1">
            {lead?.voornaam || lead?.achternaam
              ? `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim()
              : 'Dossier'} · foto's komen automatisch terecht bij de videocall-intake.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !lead?.id}
            className="w-full h-12 gap-2 font-headline"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploaden…' : "Foto's selecteren"}
          </Button>

          {existing.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-headline mb-2">
                Reeds in dossier ({existing.length})
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto">
                {existing.map((f, i) => (
                  <div key={f.storage_path} className="relative group aspect-square bg-muted overflow-hidden">
                    <img src={resolveUrl(f)} alt={f.bestandsnaam} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemove(i)}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Verwijderen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Sluiten</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { compressImageFile } from '@/lib/imageCompression';
import { toast } from 'sonner';
import ImageLightbox from '@/components/ImageLightbox';

interface Props {
  open: boolean;
  onClose: () => void;
  lead: any;
  onUpdate: (leadId: string, patch: { fotos: any[] }) => void;
}

interface NormalizedPhoto {
  index: number;
  raw: any;
  path: string;
  url: string;
  name: string;
}

function normalize(fotos: any[]): NormalizedPhoto[] {
  return (fotos || [])
    .map((f, index) => {
      const path: string = f?.storage_path || f?.path || '';
      if (!path) return null;
      const url: string =
        f?.url || supabase.storage.from('lead-fotos').getPublicUrl(path).data.publicUrl;
      const name: string = f?.bestandsnaam || path.split('/').pop() || 'foto';
      return { index, raw: f, path, url, name };
    })
    .filter(Boolean) as NormalizedPhoto[];
}

export default function PhotoUploadDialog({ open, onClose, lead, onUpdate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const rawFotos: any[] = Array.isArray(lead?.fotos) ? lead.fotos : [];
  const photos = normalize(rawFotos);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !lead?.id) return;
    setUploading(true);
    const added: any[] = [];
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
      const next = [...rawFotos, ...added];
      const { error } = await supabase.from('leads').update({ fotos: next as any }).eq('id', lead.id);
      if (error) toast.error('Opslaan mislukt');
      else {
        onUpdate(lead.id, { fotos: next });
        toast.success(`${added.length} foto${added.length === 1 ? '' : "'s"} toegevoegd`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async (p: NormalizedPhoto) => {
    const next = rawFotos.filter((_, i) => i !== p.index);
    const { error } = await supabase.from('leads').update({ fotos: next as any }).eq('id', lead.id);
    if (error) { toast.error('Verwijderen mislukt'); return; }
    await supabase.storage.from('lead-fotos').remove([p.path]).catch(() => {});
    onUpdate(lead.id, { fotos: next });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-headline flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Foto's
            </DialogTitle>
            <p className="text-xs text-muted-foreground font-body mt-1">
              {lead?.voornaam || lead?.achternaam
                ? `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim()
                : 'Dossier'} · {photos.length} foto{photos.length === 1 ? '' : "'s"} in dossier
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
              variant="outline"
              className="gap-2 font-headline"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'Uploaden…' : "Foto's toevoegen"}
            </Button>

            {photos.length === 0 ? (
              <div className="border border-dashed border-border rounded-md p-8 text-center text-sm text-muted-foreground font-body">
                Nog geen foto's — upload of stuur ze via WhatsApp/e-mail.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto">
                {photos.map((p) => (
                  <div key={`${p.path}-${p.index}`} className="relative group aspect-square bg-muted overflow-hidden rounded-sm">
                    <img
                      src={p.url}
                      alt={p.name}
                      className="w-full h-full object-cover cursor-zoom-in"
                      onClick={() => setLightbox(p.url)}
                    />
                    <button
                      onClick={() => handleRemove(p)}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-sm"
                      title="Verwijderen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

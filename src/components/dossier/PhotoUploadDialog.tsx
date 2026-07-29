import { useRef, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, ImageIcon, Trash2, MessageSquarePlus, Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { compressImageFile } from '@/lib/imageCompression';
import { normalizeLeadMedia } from '@/lib/leadMedia';
import MediaThumb from '@/components/MediaThumb';
import InboundHint from '@/components/dossier/InboundHint';
import { toast } from 'sonner';
import ImageLightbox from '@/components/ImageLightbox';

interface Props {
  open: boolean;
  onClose: () => void;
  lead: any;
  onUpdate: (leadId: string, patch: { fotos?: any[]; project_feiten?: any[] }) => void;
}

interface NormalizedPhoto {
  index: number;
  raw: any;
  path: string;
  url: string;
  name: string;
  isVideo: boolean;
}

// Keeps the original row and its index (needed for annotations and for
// writing back), while normalizeLeadMedia handles the two stored shapes
// and the video flag.
function normalize(fotos: any[]): NormalizedPhoto[] {
  const raws = Array.isArray(fotos) ? fotos : [];
  const media = normalizeLeadMedia(raws);
  return media
    .map((m) => {
      const index = raws.findIndex(
        (f) => (f?.storage_path || f?.path || '') === m.path,
      );
      return { index, raw: raws[index], path: m.path, url: m.url, name: m.name, isVideo: m.isVideo };
    })
    .filter((p) => p.path);
}

export default function PhotoUploadDialog({ open, onClose, lead, onUpdate }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailPath, setDetailPath] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState(false);

  const rawFotos: any[] = Array.isArray(lead?.fotos) ? lead.fotos : [];
  const photos = useMemo(() => normalize(rawFotos), [rawFotos]);
  const feiten: any[] = Array.isArray(lead?.project_feiten) ? lead.project_feiten : [];

  const detailPhoto = detailPath ? photos.find((p) => p.path === detailPath) || null : null;
  const detailFeiten = detailPath ? feiten.filter((f) => f?.foto_path === detailPath) : [];

  const resetLocal = () => {
    setSelectMode(false);
    setSelected(new Set());
    setDetailPath(null);
    setNoteText('');
  };

  const handleClose = () => {
    resetLocal();
    onClose();
  };

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

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

  const deletePhotosByPaths = async (paths: string[]) => {
    if (paths.length === 0 || !lead?.id) return;
    setBusy(true);
    const pathSet = new Set(paths);
    const nextFotos = rawFotos.filter((f) => {
      const p = f?.storage_path || f?.path;
      return !pathSet.has(p);
    });
    // Ook bijhorende annotaties opruimen
    const nextFeiten = feiten.filter((f) => !pathSet.has(f?.foto_path));

    const { error } = await supabase
      .from('leads')
      .update({ fotos: nextFotos as any, project_feiten: nextFeiten as any })
      .eq('id', lead.id);
    if (error) {
      toast.error('Verwijderen mislukt');
      setBusy(false);
      return;
    }
    await supabase.storage.from('lead-fotos').remove(paths).catch(() => {});
    onUpdate(lead.id, { fotos: nextFotos, project_feiten: nextFeiten });
    toast.success(`${paths.length} foto${paths.length === 1 ? '' : "'s"} verwijderd`);
    setSelected(new Set());
    setSelectMode(false);
    setBusy(false);
  };

  const addAnnotation = async () => {
    const text = noteText.trim();
    if (!text || !detailPath || !lead?.id) return;
    setBusy(true);
    const detailIndex = photos.find((p) => p.path === detailPath)?.index ?? null;
    const newFeit = {
      id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : String(Date.now()),
      tekst: text,
      foto_path: detailPath,
      foto_index: detailIndex,
      aangemaakt_op: new Date().toISOString(),
      label_nummer: null,
      label_positie: null,
    };
    const nextFeiten = [...feiten, newFeit];
    const { error } = await supabase
      .from('leads')
      .update({ project_feiten: nextFeiten as any })
      .eq('id', lead.id);
    if (error) toast.error('Annotatie opslaan mislukt');
    else {
      onUpdate(lead.id, { project_feiten: nextFeiten });
      setNoteText('');
    }
    setBusy(false);
  };

  const removeAnnotation = async (id: string) => {
    if (!lead?.id) return;
    const nextFeiten = feiten.filter((f) => f?.id !== id);
    const { error } = await supabase
      .from('leads')
      .update({ project_feiten: nextFeiten as any })
      .eq('id', lead.id);
    if (error) toast.error('Verwijderen mislukt');
    else onUpdate(lead.id, { project_feiten: nextFeiten });
  };

  // ---- DETAIL VIEW (single photo + annotaties) ----
  if (detailPhoto) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-headline flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setDetailPath(null); setNoteText(''); }} className="gap-1 -ml-2">
                <ArrowLeft className="h-4 w-4" /> Galerij
              </Button>
              <span className="text-sm text-muted-foreground font-body truncate">{detailPhoto.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted rounded-sm overflow-hidden">
              {detailPhoto.isVideo ? (
                <video
                  src={detailPhoto.url}
                  controls
                  playsInline
                  className="w-full h-auto max-h-[65vh]"
                />
              ) : (
                <img
                  src={detailPhoto.url}
                  alt={detailPhoto.name}
                  className="w-full h-auto max-h-[65vh] object-contain cursor-zoom-in"
                  onClick={() => setLightbox(detailPhoto.url)}
                />
              )}
            </div>

            <div className="flex flex-col gap-3 min-h-0">
              <div className="flex items-center justify-between">
                <h4 className="font-headline text-sm uppercase tracking-wide text-primary">Annotaties</h4>
                <span className="text-xs text-muted-foreground">{detailFeiten.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[45vh]">
                {detailFeiten.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-body italic">Nog geen annotaties voor deze foto.</p>
                ) : (
                  detailFeiten.map((f) => (
                    <div key={f.id} className="group flex items-start gap-2 bg-muted/60 border border-border rounded-sm p-2">
                      <p className="text-sm font-body flex-1 whitespace-pre-wrap">{f.tekst}</p>
                      <button
                        onClick={() => removeAnnotation(f.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        title="Verwijderen"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t pt-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addAnnotation(); }
                  }}
                  placeholder="Nieuwe annotatie… (Enter = opslaan)"
                  rows={2}
                  className="w-full text-sm font-body border border-border rounded-sm p-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="flex justify-between items-center mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive gap-1"
                    onClick={() => deletePhotosByPaths([detailPhoto.path]).then(() => setDetailPath(null))}
                    disabled={busy}
                  >
                    <Trash2 className="h-4 w-4" /> Foto verwijderen
                  </Button>
                  <Button size="sm" onClick={addAnnotation} disabled={!noteText.trim() || busy} className="gap-1">
                    <MessageSquarePlus className="h-4 w-4" /> Toevoegen
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
        {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
      </Dialog>
    );
  }

  // ---- GALLERY VIEW ----
  const selectedCount = selected.size;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-headline flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Foto's en video's
            </DialogTitle>
            <p className="text-xs text-muted-foreground font-body mt-1">
              {lead?.voornaam || lead?.achternaam
                ? `${lead.voornaam ?? ''} ${lead.achternaam ?? ''}`.trim()
                : 'Dossier'} · {photos.length} bestand{photos.length === 1 ? '' : 'en'} in dossier
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <InboundHint />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !lead?.id}
                variant="outline"
                className="gap-2 font-headline"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {uploading ? 'Uploaden…' : "Foto's toevoegen"}
              </Button>

              {photos.length > 0 && (
                <Button
                  variant={selectMode ? 'default' : 'outline'}
                  onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}
                  className="gap-2"
                  size="sm"
                >
                  <Check className="h-4 w-4" />
                  {selectMode ? 'Selectie sluiten' : 'Selecteren'}
                </Button>
              )}

              {selectMode && selectedCount > 0 && (
                <>
                  <span className="text-xs text-muted-foreground font-body ml-auto">
                    {selectedCount} geselecteerd
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1"
                    disabled={busy}
                    onClick={() => deletePhotosByPaths(Array.from(selected))}
                  >
                    <Trash2 className="h-4 w-4" /> Verwijderen
                  </Button>
                </>
              )}
            </div>

            {photos.length === 0 ? (
              <div className="border border-dashed border-border rounded-md p-8 text-center text-sm text-muted-foreground font-body">
                Nog niets — upload foto's of video's, of stuur ze via WhatsApp/e-mail.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto">
                {photos.map((p) => {
                  const isSelected = selected.has(p.path);
                  const annCount = feiten.filter((f) => f?.foto_path === p.path).length;
                  return (
                    <div
                      key={`${p.path}-${p.index}`}
                      className={`relative group aspect-square bg-muted overflow-hidden rounded-sm border-2 transition ${
                        isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-transparent'
                      }`}
                    >
                      <MediaThumb
                        item={p}
                        className="w-full h-full cursor-pointer"
                        onClick={() => {
                          if (selectMode) toggleSelect(p.path);
                          else setDetailPath(p.path);
                        }}
                      />

                      {selectMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSelect(p.path); }}
                          className={`absolute top-1 left-1 h-5 w-5 rounded-sm flex items-center justify-center text-white ${
                            isSelected ? 'bg-primary' : 'bg-black/50'
                          }`}
                          title={isSelected ? 'Deselecteren' : 'Selecteren'}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                        </button>
                      )}

                      {!selectMode && annCount > 0 && (
                        <div className="absolute top-1 left-1 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                          <MessageSquarePlus className="h-3 w-3" /> {annCount}
                        </div>
                      )}

                      {!selectMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePhotosByPaths([p.path]); }}
                          className="absolute top-1 right-1 p-1 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-sm"
                          title="Verwijderen"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Sluiten</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

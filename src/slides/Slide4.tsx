import { useRef, useState } from 'react';
import { useSession, FeitjeItem } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, Image, ImageOff, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ImageLightbox from '@/components/ImageLightbox';
import { compressImageFile } from '@/lib/imageCompression';

interface PhotoItem {
  bestandsnaam: string;
  storage_path: string;
  url?: string;
}

interface PendingLabel {
  nummer: number;
  positie: { x: number; y: number };
  foto_path: string;
  foto_index: number | null;
  tekst: string;
}

export default function Slide4() {
  const { lead, updateLead } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [inputs, setInputs] = useState(['', '', '']);
  const [animatingFeit, setAnimatingFeit] = useState<{ id: number; text: string; rotation: number } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [labelMode, setLabelMode] = useState(false);
  const [pendingLabels, setPendingLabels] = useState<PendingLabel[]>([]);

  const photos: (PhotoItem & { publicUrl: string })[] = (lead.fotos || []).map((f: PhotoItem) => ({
    ...f,
    publicUrl: f.url || supabase.storage.from('lead-fotos').getPublicUrl(f.storage_path).data.publicUrl,
  }));

  const feitjes: FeitjeItem[] = (lead.project_feiten || []).filter(
    (f): f is FeitjeItem => typeof f === 'object' && 'tekst' in f
  );

  const activePhoto = activeIndex !== null && photos[activeIndex] ? photos[activeIndex] : null;

  // Saved labels for the active photo
  const savedLabelsForPhoto = feitjes.filter(
    f => f.label_nummer !== null && f.label_nummer !== undefined && f.foto_path === activePhoto?.storage_path
  );

  // Pending labels for the active photo
  const pendingLabelsForPhoto = pendingLabels.filter(
    p => p.foto_path === activePhoto?.storage_path
  );

  // All label markers to show on photo (saved + pending)
  const allLabelsOnPhoto = [
    ...savedLabelsForPhoto.map(l => ({ nummer: l.label_nummer!, positie: l.label_positie!, id: l.id, saved: true })),
    ...pendingLabelsForPhoto.map(p => ({ nummer: p.nummer, positie: p.positie, id: `pending-${p.nummer}`, saved: false })),
  ];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newPhotos: PhotoItem[] = [];
    for (const rawFile of Array.from(files)) {
      const file = await compressImageFile(rawFile);
      const leadId = lead.id || 'unsaved';
      const path = `${leadId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('lead-fotos').upload(path, file, { upsert: false, contentType: file.type });
      if (error) { console.error('Upload error:', error); continue; }
      const { data: urlData } = supabase.storage.from('lead-fotos').getPublicUrl(path);
      newPhotos.push({ bestandsnaam: file.name, storage_path: path, url: urlData.publicUrl });
    }
    if (newPhotos.length > 0) {
      updateLead({ fotos: [...(lead.fotos || []), ...newPhotos] });
      if (activeIndex === null) setActiveIndex((lead.fotos || []).length);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getNextLabelNumber = () => {
    const savedNummers = feitjes
      .filter(f => f.label_nummer !== null && f.label_nummer !== undefined)
      .map(f => f.label_nummer!);
    const pendingNummers = pendingLabels.map(p => p.nummer);
    const all = [...savedNummers, ...pendingNummers];
    return all.length > 0 ? Math.max(...all) + 1 : 1;
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!labelMode || !activePhoto) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const nummer = getNextLabelNumber();
    setPendingLabels(prev => [...prev, {
      nummer,
      positie: { x, y },
      foto_path: activePhoto.storage_path,
      foto_index: activeIndex,
      tekst: '',
    }]);
  };

  const updatePendingText = (nummer: number, text: string) => {
    setPendingLabels(prev => prev.map(p => p.nummer === nummer ? { ...p, tekst: text } : p));
  };

  const saveLabel = (pending: PendingLabel) => {
    const text = pending.tekst.trim();
    if (!text || animatingFeit) return;

    const rotation = Math.random() * 6 - 3;
    setAnimatingFeit({ id: pending.nummer, text, rotation });

    setTimeout(() => {
      const nieuwFeitje: FeitjeItem = {
        id: Date.now().toString(),
        tekst: text,
        foto_path: pending.foto_path,
        foto_index: pending.foto_index,
        aangemaakt_op: new Date().toISOString(),
        label_nummer: pending.nummer,
        label_positie: pending.positie,
      };
      updateLead({ project_feiten: [...feitjes, nieuwFeitje] });
      setPendingLabels(prev => prev.filter(p => p.nummer !== pending.nummer));
      setAnimatingFeit(null);
    }, 500);
  };

  const removePendingLabel = (nummer: number) => {
    setPendingLabels(prev => prev.filter(p => p.nummer !== nummer));
  };

  const saveFeit = (idx: number) => {
    const text = inputs[idx].trim();
    if (!text || animatingFeit) return;
    const rotation = Math.random() * 6 - 3;
    const noteId = Date.now() + idx;
    setAnimatingFeit({ id: noteId, text, rotation });
    setInputs(prev => prev.map((v, i) => i === idx ? '' : v));

    const selectedPhoto = activePhoto;

    setTimeout(() => {
      const nieuwFeitje: FeitjeItem = {
        id: Date.now().toString(),
        tekst: text,
        foto_path: selectedPhoto?.storage_path || null,
        foto_index: activeIndex,
        aangemaakt_op: new Date().toISOString(),
        label_nummer: null,
        label_positie: null,
      };
      updateLead({ project_feiten: [...feitjes, nieuwFeitje] });
      setAnimatingFeit(null);
    }, 500);
  };

  const removeFeit = (feitId: string) => {
    updateLead({ project_feiten: feitjes.filter(f => f.id !== feitId) });
  };

  const updateInput = (idx: number, value: string) => {
    setInputs(prev => prev.map((v, i) => i === idx ? value : v));
  };

  const getFeitjePhotoUrl = (feitje: FeitjeItem): string | null => {
    if (!feitje.foto_path) return null;
    const matchedPhoto = photos.find(p => p.storage_path === feitje.foto_path);
    return matchedPhoto?.publicUrl || null;
  };

  // Non-label feitjes for the post-it list
  const regularFeitjes = feitjes.filter(f => f.label_nummer === null || f.label_nummer === undefined);

  return (
    <SlideLayout showSave>
      {/* Swoosh-bounce animation overlay */}
      {animatingFeit && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            right: '40px',
            top: '200px',
            animation: 'swoosh-bounce 500ms ease-in-out forwards',
          }}
        >
          <div
            className="bg-primary/10 border-2 border-primary/30 px-5 py-4 shadow-lg max-w-[280px]"
            style={{ transform: `rotate(${animatingFeit.rotation}deg)` }}
          >
            <span className="text-sm font-body text-foreground leading-snug">{animatingFeit.text}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes swoosh-bounce {
          0% { transform: translateX(0) scale(1) rotate(0deg); opacity: 1; }
          60% { transform: translateX(-280px) scale(0.9) rotate(-3deg); opacity: 1; }
          75% { transform: translateX(-310px) scale(0.95) rotate(1deg); }
          85% { transform: translateX(-295px) scale(1) rotate(0deg); }
          100% { transform: translateX(-300px) scale(1) rotate(0deg); opacity: 0; }
        }
        @keyframes postit-scale-in {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1) rotate(var(--postit-rot, 0deg)); }
        }
      `}</style>

      <div className="flex gap-4 h-full min-h-0" style={{ maxHeight: 'calc(100vh - 140px)' }}>

        {/* Zone Links — Foto's */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">

          {/* Thumbnail strip + labelmaker toggle */}
          <div className="flex gap-2 overflow-x-auto shrink-0 pb-1 items-center">
            {photos.map((photo, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={`relative overflow-hidden border-2 w-20 h-20 shrink-0 transition-all ${
                  activeIndex === i ? 'border-primary' : 'border-border hover:border-primary/40'
                }`}
              >
                <img src={photo.publicUrl} alt={photo.bestandsnaam} className="w-full h-full object-cover" />
              </button>
            ))}
            <button
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed w-20 h-20 shrink-0 flex items-center justify-center transition-colors ${
                uploading ? 'border-muted cursor-wait' : 'border-primary/30 cursor-pointer hover:border-primary/60 hover:bg-accent/50'
              }`}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <Upload className="h-5 w-5 text-primary" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Labelmaker toggle */}
            <Button
              variant={labelMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLabelMode(!labelMode)}
              className="ml-auto shrink-0 gap-1.5"
            >
              <MapPin className="h-4 w-4" />
              Labelmaker
            </Button>
          </div>

          {/* Grote foto met label overlay */}
          <div
            ref={imageContainerRef}
            className={`flex-1 min-h-0 border border-border bg-muted flex items-center justify-center overflow-hidden relative ${
              labelMode && activePhoto ? 'cursor-crosshair' : ''
            }`}
            onClick={handleImageClick}
          >
            {activePhoto ? (
              <>
                <img
                  src={activePhoto.publicUrl}
                  alt={activePhoto.bestandsnaam}
                  className="w-full h-full object-contain"
                  onClick={(e) => {
                    if (!labelMode) {
                      e.stopPropagation();
                      setLightboxSrc(activePhoto.publicUrl);
                    }
                  }}
                />
                {/* Label overlays (saved + pending) */}
                {allLabelsOnPhoto.map(label => (
                  <div
                    key={label.id}
                    className={`absolute z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 font-headline text-base font-bold shadow-md pointer-events-auto hover:scale-110 transition-transform ${
                      label.saved
                        ? 'bg-background border-primary text-primary'
                        : 'bg-accent border-primary/50 text-primary/70 animate-pulse'
                    }`}
                    style={{
                      left: `${label.positie?.x ?? 0}%`,
                      top: `${label.positie?.y ?? 0}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`Label ${label.nummer}`}
                  >
                    {label.nummer}
                  </div>
                ))}
              </>
            ) : (
              <div className="text-muted-foreground/50 flex flex-col items-center gap-3 text-center px-8">
                <Image className="h-12 w-12" />
                <span className="text-sm font-body">Klik een foto aan om te bespreken</span>
              </div>
            )}
          </div>
        </div>

        {/* Zone Rechts — Labels + Feitjes */}
        <div className="w-80 shrink-0 flex flex-col gap-3 overflow-hidden">
          <div>
            <SlideLabel>VASTSTELLINGEN</SlideLabel>
            <h3 className="text-lg font-headline font-bold text-foreground">
              Wat valt op?
            </h3>
            {activePhoto && (
              <p className="text-xs text-muted-foreground mt-1">
                Feitjes worden gekoppeld aan foto {(activeIndex ?? 0) + 1}
              </p>
            )}
          </div>

          {/* Pending label inputs (draft state, not yet saved) */}
          {pendingLabelsForPhoto.length > 0 && (
            <div className="space-y-2 shrink-0">
              <p className="text-xs font-headline font-semibold text-primary uppercase tracking-wide">Nieuwe labels</p>
              {pendingLabelsForPhoto.map(pending => (
                <div
                  key={`pending-${pending.nummer}`}
                  className="flex gap-2 items-start bg-accent/50 border border-primary/30 p-2 rounded-sm"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/70 text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {pending.nummer}
                  </div>
                  <textarea
                    value={pending.tekst}
                    onChange={e => updatePendingText(pending.nummer, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveLabel(pending); } }}
                    placeholder={`Beschrijf label ${pending.nummer}...`}
                    className="bg-transparent text-sm flex-1 min-h-[60px] resize-vertical border-none outline-none font-body"
                    maxLength={500}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    disabled={!pending.tekst.trim() || !!animatingFeit}
                    onClick={() => saveLabel(pending)}
                    className="h-auto px-3 text-xs font-headline self-stretch"
                  >
                    Opslaan
                  </Button>
                  <button
                    onClick={() => removePendingLabel(pending.nummer)}
                    className="opacity-50 hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                  >
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Saved labels for active photo */}
          {savedLabelsForPhoto.length > 0 && (
            <div className="space-y-2 shrink-0">
              <p className="text-xs font-headline font-semibold text-primary uppercase tracking-wide">Labels op deze foto</p>
              {savedLabelsForPhoto.map((label, i) => {
                const rot = ((i * 5 + 1) % 5) - 2;
                return (
                  <div
                    key={label.id}
                    className="relative flex gap-2 items-start bg-primary/10 border-2 border-primary/30 p-2 shadow-sm group"
                    style={{
                      animation: 'postit-scale-in 150ms ease-out forwards',
                      ['--postit-rot' as any]: `${rot}deg`,
                    }}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {label.label_nummer}
                    </div>
                    <span className="text-sm font-body text-foreground leading-snug flex-1 pr-5">{label.tekst}</span>
                    <button
                      onClick={() => removeFeit(label.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-destructive/10 border border-destructive/20 p-1"
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Labelmode hint */}
          {labelMode && activePhoto && pendingLabelsForPhoto.length === 0 && savedLabelsForPhoto.length === 0 && (
            <div className="text-xs text-primary bg-primary/5 border border-primary/20 p-3 rounded-sm">
              <MapPin className="h-3.5 w-3.5 inline mr-1" />
              Klik op de foto om een genummerd label te plaatsen
            </div>
          )}

          {/* 3 textarea fields */}
          <div className="space-y-3 shrink-0">
            {inputs.map((val, idx) => (
              <div key={idx} className="flex gap-2">
                <textarea
                  value={val}
                  onChange={e => updateInput(idx, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveFeit(idx); } }}
                  placeholder={`Feitje ${idx + 1}...`}
                  className="bg-card text-sm flex-1 min-h-[120px] resize-vertical border border-border p-3 outline-none focus:border-primary transition-colors font-body"
                  maxLength={500}
                />
                <Button
                  size="sm"
                  onClick={() => saveFeit(idx)}
                  disabled={!val.trim() || !!animatingFeit}
                  className="h-auto px-3 text-xs font-headline self-stretch"
                >
                  Opslaan
                </Button>
              </div>
            ))}
          </div>

          {/* Post-it kaartjes (regular feitjes only) */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
            {regularFeitjes.map((feitje, i) => {
              const rot = ((i * 7 + 3) % 7) - 3;
              const thumbUrl = getFeitjePhotoUrl(feitje);
              return (
                <div
                  key={feitje.id}
                  className="relative bg-primary/10 border-2 border-primary/30 p-3 shadow-sm group cursor-default"
                  style={{
                    animation: 'postit-scale-in 150ms ease-out forwards',
                    ['--postit-rot' as any]: `${rot}deg`,
                  }}
                >
                  <div className="flex gap-2.5 items-start">
                    <div className="w-6 h-6 shrink-0 overflow-hidden border border-border bg-muted flex items-center justify-center">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageOff className="h-3 w-3 text-muted-foreground/40" />
                      )}
                    </div>
                    <span className="text-sm font-body text-foreground leading-snug block pr-5 flex-1">{feitje.tekst}</span>
                  </div>
                  <button
                    onClick={() => removeFeit(feitje.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-destructive/10 border border-destructive/20 p-1"
                  >
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </SlideLayout>
  );
}

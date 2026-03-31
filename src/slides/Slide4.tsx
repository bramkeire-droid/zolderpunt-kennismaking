import { useRef, useState } from 'react';
import { useSession, FeitjeItem } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, Image, ImageOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ImageLightbox from '@/components/ImageLightbox';

interface PhotoItem {
  bestandsnaam: string;
  storage_path: string;
  url?: string;
}

export default function Slide4() {
  const { lead, updateLead } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [inputs, setInputs] = useState(['', '', '']);
  const [animatingFeit, setAnimatingFeit] = useState<{ id: number; text: string; rotation: number } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const photos: (PhotoItem & { publicUrl: string })[] = (lead.fotos || []).map((f: PhotoItem) => ({
    ...f,
    publicUrl: f.url || supabase.storage.from('lead-fotos').getPublicUrl(f.storage_path).data.publicUrl,
  }));

  // Backwards compatible: filter out old string-based feitjes
  const feitjes: FeitjeItem[] = (lead.project_feiten || []).filter(
    (f): f is FeitjeItem => typeof f === 'object' && 'tekst' in f
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newPhotos: PhotoItem[] = [];
    for (const file of Array.from(files)) {
      const leadId = lead.id || 'unsaved';
      const path = `${leadId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('lead-fotos').upload(path, file, { upsert: false });
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

  const saveFeit = (idx: number) => {
    const text = inputs[idx].trim();
    if (!text || animatingFeit) return;
    const rotation = Math.random() * 6 - 3;
    const noteId = Date.now() + idx;
    setAnimatingFeit({ id: noteId, text, rotation });
    setInputs(prev => prev.map((v, i) => i === idx ? '' : v));

    // Get currently selected photo info
    const selectedPhoto = activeIndex !== null && photos[activeIndex] ? photos[activeIndex] : null;

    setTimeout(() => {
      const nieuwFeitje: FeitjeItem = {
        id: Date.now().toString(),
        tekst: text,
        foto_path: selectedPhoto?.storage_path || null,
        foto_index: activeIndex,
        aangemaakt_op: new Date().toISOString(),
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

  // Helper: get photo thumbnail URL for a feitje
  const getFeitjePhotoUrl = (feitje: FeitjeItem): string | null => {
    if (!feitje.foto_path) return null;
    const matchedPhoto = photos.find(p => p.storage_path === feitje.foto_path);
    return matchedPhoto?.publicUrl || null;
  };

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
            className="bg-[#008CFF]/10 border-2 border-[#008CFF]/30 px-5 py-4 shadow-lg max-w-[280px]"
            style={{ transform: `rotate(${animatingFeit.rotation}deg)` }}
          >
            <span className="text-sm font-body text-foreground leading-snug">{animatingFeit.text}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes swoosh-bounce {
          0% {
            transform: translateX(0) scale(1) rotate(0deg);
            opacity: 1;
          }
          60% {
            transform: translateX(-280px) scale(0.9) rotate(-3deg);
            opacity: 1;
          }
          75% {
            transform: translateX(-310px) scale(0.95) rotate(1deg);
          }
          85% {
            transform: translateX(-295px) scale(1) rotate(0deg);
          }
          100% {
            transform: translateX(-300px) scale(1) rotate(0deg);
            opacity: 0;
          }
        }
        @keyframes postit-scale-in {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(var(--postit-rot, 0deg));
          }
        }
      `}</style>

      <div className="flex gap-4 h-full min-h-0" style={{ maxHeight: 'calc(100vh - 140px)' }}>

        {/* Zone Links — Foto's met slider erboven */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">

          {/* Thumbnail strip bovenaan */}
          <div className="flex gap-2 overflow-x-auto shrink-0 pb-1">
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
          </div>

          {/* Grote foto */}
          <div className="flex-1 min-h-0 border border-border bg-muted flex items-center justify-center overflow-hidden">
            {activeIndex !== null && photos[activeIndex] ? (
              <img
                src={photos[activeIndex].publicUrl}
                alt={photos[activeIndex].bestandsnaam}
                className="w-full h-full object-contain cursor-pointer"
                onClick={() => setLightboxSrc(photos[activeIndex].publicUrl)}
              />
            ) : (
              <div className="text-muted-foreground/50 flex flex-col items-center gap-3 text-center px-8">
                <Image className="h-12 w-12" />
                <span className="text-sm font-body">Klik een foto aan om te bespreken</span>
              </div>
            )}
          </div>
        </div>

        {/* Zone Rechts — Feitjes invoer + post-its */}
        <div className="w-80 shrink-0 flex flex-col gap-3 overflow-hidden">
          <div>
            <SlideLabel>VASTSTELLINGEN</SlideLabel>
            <h3 className="text-lg font-headline font-bold text-foreground">
              Wat valt op?
            </h3>
            {activeIndex !== null && photos[activeIndex] && (
              <p className="text-xs text-muted-foreground mt-1">
                Feitjes worden gekoppeld aan foto {activeIndex + 1}
              </p>
            )}
          </div>

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

          {/* Post-it kaartjes */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
            {feitjes.map((feitje, i) => {
              const rot = ((i * 7 + 3) % 7) - 3;
              const thumbUrl = getFeitjePhotoUrl(feitje);
              return (
                <div
                  key={feitje.id}
                  className="relative bg-[#008CFF]/10 border-2 border-[#008CFF]/30 p-3 shadow-sm group cursor-default"
                  style={{
                    animation: 'postit-scale-in 150ms ease-out forwards',
                    ['--postit-rot' as any]: `${rot}deg`,
                  }}
                >
                  <div className="flex gap-2.5 items-start">
                    {/* Foto thumbnail of placeholder */}
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
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-red-50 border border-red-200 p-1"
                  >
                    <X className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}

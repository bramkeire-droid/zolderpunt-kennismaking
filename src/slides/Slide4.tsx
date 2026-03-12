import { useRef, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  const [flyingNotes, setFlyingNotes] = useState<{ id: number; text: string; rotation: number }[]>([]);

  const photos: (PhotoItem & { publicUrl: string })[] = (lead.fotos || []).map((f: PhotoItem) => ({
    ...f,
    publicUrl: f.url || supabase.storage.from('lead-fotos').getPublicUrl(f.storage_path).data.publicUrl,
  }));

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
    if (!text) return;
    const rotation = Math.random() * 6 - 3; // -3 to +3 degrees
    const noteId = Date.now() + idx;
    setFlyingNotes(prev => [...prev, { id: noteId, text, rotation }]);
    // After animation completes, add to state and remove flying note
    setTimeout(() => {
      updateLead({ project_feiten: [...(lead.project_feiten || []), text] });
      setInputs(prev => prev.map((v, i) => i === idx ? '' : v));
      setFlyingNotes(prev => prev.filter(n => n.id !== noteId));
    }, 800);
  };

  const removeFeit = (feitIdx: number) => {
    updateLead({ project_feiten: (lead.project_feiten || []).filter((_, i) => i !== feitIdx) });
  };

  const updateInput = (idx: number, value: string) => {
    setInputs(prev => prev.map((v, i) => i === idx ? value : v));
  };

  const feiten = lead.project_feiten || [];

  return (
    <SlideLayout showSave>
      {/* Flying post-it animation overlay */}
      {flyingNotes.map(note => (
        <div
          key={note.id}
          className="fixed z-50 pointer-events-none"
          style={{
            right: '320px',
            top: '200px',
            animation: 'postit-fly 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          }}
        >
          <div
            className="bg-[#008CFF]/10 border-2 border-[#008CFF]/30 px-5 py-4 shadow-lg max-w-[280px]"
            style={{ transform: `rotate(${note.rotation}deg)` }}
          >
            <span className="text-sm font-body text-foreground leading-snug">{note.text}</span>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes postit-fly {
          0% {
            opacity: 0;
            transform: translateX(200px) translateY(40px) scale(0.5) rotate(10deg);
          }
          40% {
            opacity: 1;
            transform: translateX(-20px) translateY(-10px) scale(1.08) rotate(-2deg);
          }
          70% {
            transform: translateX(8px) translateY(4px) scale(0.97) rotate(1deg);
          }
          100% {
            opacity: 1;
            transform: translateX(0) translateY(0) scale(1) rotate(0deg);
          }
        }
        @keyframes postit-appear {
          0% {
            opacity: 0;
            transform: scale(0.8) rotate(-2deg);
          }
          60% {
            transform: scale(1.04) rotate(1deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(var(--postit-rot, 0deg));
          }
        }
      `}</style>

      <div className="flex gap-4 h-full min-h-0" style={{ maxHeight: 'calc(100vh - 140px)' }}>

        {/* Zone Links — Post-its naast de foto */}
        <div className="w-72 shrink-0 flex flex-col gap-3 overflow-hidden">
          <div>
            <SlideLabel>VASTSTELLINGEN</SlideLabel>
            <h3 className="text-lg font-headline font-bold text-foreground">
              Wat valt op?
            </h3>
          </div>

          {/* 3 textarea fields */}
          <div className="space-y-3">
            {inputs.map((val, idx) => (
              <div key={idx} className="flex gap-2">
                <Textarea
                  value={val}
                  onChange={e => updateInput(idx, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveFeit(idx); } }}
                  placeholder={`Feitje ${idx + 1}...`}
                  className="bg-card text-sm flex-1 min-h-[80px] resize-none"
                  maxLength={500}
                />
                <Button
                  size="sm"
                  onClick={() => saveFeit(idx)}
                  disabled={!val.trim()}
                  className="h-auto px-3 text-xs font-headline self-stretch"
                >
                  Opslaan
                </Button>
              </div>
            ))}
          </div>

          {/* Post-it kaartjes */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1">
            {feiten.map((feit, i) => {
              const rot = ((i * 7 + 3) % 7) - 3; // deterministic rotation -3 to +3
              return (
                <div
                  key={i}
                  className="relative bg-[#008CFF]/10 border-2 border-[#008CFF]/30 p-4 shadow-sm group cursor-default"
                  style={{
                    transform: `rotate(${rot}deg)`,
                    animation: 'postit-appear 0.4s ease-out forwards',
                    ['--postit-rot' as any]: `${rot}deg`,
                  }}
                >
                  <span className="text-sm font-body text-foreground leading-snug block pr-5">{feit}</span>
                  <button
                    onClick={() => removeFeit(i)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-red-50 border border-red-200 p-1"
                  >
                    <X className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zone Rechts — Foto's */}
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
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground/50 flex flex-col items-center gap-3 text-center px-8">
                <Image className="h-12 w-12" />
                <span className="text-sm font-body">Klik een foto aan om te bespreken</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}

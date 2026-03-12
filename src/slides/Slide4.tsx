import { useRef, useState } from 'react';
import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Input } from '@/components/ui/input';
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
  const [animatingIdx, setAnimatingIdx] = useState<number | null>(null);

  // Build public URLs
  const photos: (PhotoItem & { publicUrl: string })[] = (lead.fotos || []).map((f: PhotoItem) => ({
    ...f,
    publicUrl: f.url || supabase.storage.from('lead-fotos').getPublicUrl(f.storage_path).data.publicUrl,
  }));

  // Upload logic (same as Slide0B)
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
    setAnimatingIdx(idx);
    setTimeout(() => {
      updateLead({ project_feiten: [...(lead.project_feiten || []), text] });
      setInputs(prev => prev.map((v, i) => i === idx ? '' : v));
      setAnimatingIdx(null);
    }, 500);
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
      <div className="flex gap-4 h-full min-h-0" style={{ maxHeight: 'calc(100vh - 140px)' }}>

        {/* Zone Links — Thumbnails */}
        <div className="w-32 shrink-0 flex flex-col gap-2 overflow-y-auto">
          {photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative overflow-hidden border-2 aspect-square transition-all ${
                activeIndex === i ? 'border-primary' : 'border-border hover:border-primary/40'
              }`}
            >
              <img src={photo.publicUrl} alt={photo.bestandsnaam} className="w-full h-full object-cover" />
            </button>
          ))}
          <button
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed aspect-square flex items-center justify-center transition-colors ${
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

        {/* Zone Midden — Grote foto */}
        <div className="flex-1 min-w-0 border border-border bg-muted flex items-center justify-center overflow-hidden">
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

        {/* Zone Rechts — Feitjes */}
        <div className="w-80 shrink-0 flex flex-col gap-4 overflow-hidden">
          <div>
            <SlideLabel>VASTSTELLINGEN</SlideLabel>
            <h3 className="text-lg font-headline font-bold text-foreground">
              Wat valt op?
            </h3>
          </div>

          {/* 3 input fields */}
          <div className="space-y-3">
            {inputs.map((val, idx) => (
              <div
                key={idx}
                className={`flex gap-2 transition-all duration-500 ${
                  animatingIdx === idx ? 'opacity-0 -translate-x-16' : 'opacity-100 translate-x-0'
                }`}
              >
                <Input
                  value={val}
                  onChange={e => updateInput(idx, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveFeit(idx); }}
                  placeholder={`Feitje ${idx + 1}...`}
                  className="bg-card text-sm h-9 flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => saveFeit(idx)}
                  disabled={!val.trim()}
                  className="h-9 px-3 text-xs font-headline"
                >
                  Opslaan
                </Button>
              </div>
            ))}
          </div>

          {/* Post-it kaartjes */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {feiten.map((feit, i) => (
              <div
                key={i}
                className="relative bg-blue-50 border border-blue-100 p-3 shadow-sm group"
              >
                <span className="text-sm font-body text-foreground leading-snug">{feit}</span>
                <button
                  onClick={() => removeFeit(i)}
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-blue-100"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}

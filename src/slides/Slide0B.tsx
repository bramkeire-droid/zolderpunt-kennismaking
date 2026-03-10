import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';

export default function Slide0B() {
  const { lead, updateLead } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPhotos, setLocalPhotos] = useState<{ name: string; url: string }[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files).map(f => ({
      name: f.name,
      url: URL.createObjectURL(f),
    }));
    setLocalPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setLocalPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <SlideLayout showSave>
      <div className="max-w-3xl mx-auto w-full">
        <SlideLabel>PROJECTINFO</SlideLabel>
        <h2 className="text-3xl font-headline font-bold text-foreground mb-8">
          Over het project
        </h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="font-body flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Projectadres
            </Label>
            <Input
              value={lead.adres}
              onChange={e => updateLead({ adres: e.target.value })}
              placeholder="Straat, nummer, postcode, gemeente"
              className="bg-card"
            />
          </div>

          {lead.adres && lead.adres.length > 5 && (
            <div className="overflow-hidden border border-border h-[250px] bg-muted flex items-center justify-center">
              <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                <MapPin className="h-8 w-8" />
                <span>Kaart: {lead.adres}</span>
                <span className="text-xs">(Google Maps integratie na Supabase setup)</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-body">Geschatte oppervlakte</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={lead.oppervlakte_m2 ?? ''}
                  onChange={e => updateLead({ oppervlakte_m2: e.target.value ? Number(e.target.value) : null })}
                  placeholder="0"
                  className="bg-card"
                />
                <span className="text-sm text-muted-foreground font-medium">m²</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-body">Project timing</Label>
            <Textarea
              value={lead.project_timing}
              onChange={e => updateLead({ project_timing: e.target.value })}
              placeholder="De klant wil het project afronden tegen periode 'x' omwille van 'y'"
              className="bg-card min-h-[80px]"
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-3">
            <Label className="font-body">Foto's uploaden</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-primary/30 p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-accent/50 transition-colors"
            >
              <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Klik om foto's te selecteren of sleep ze hierheen
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {localPhotos.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {localPhotos.map((photo, i) => (
                  <div key={i} className="relative group overflow-hidden border border-border aspect-square">
                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}

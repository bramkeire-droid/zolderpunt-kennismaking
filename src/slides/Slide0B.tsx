import { useSession } from '@/contexts/SessionContext';
import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MapPin, Upload, X, Loader2 } from 'lucide-react';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ImageLightbox from '@/components/ImageLightbox';

interface PhotoItem {
  bestandsnaam: string;
  storage_path: string;
  url?: string;
}

export default function Slide0B() {
  const { lead, updateLead } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Build public URLs for existing photos
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

      const { error } = await supabase.storage
        .from('lead-fotos')
        .upload(path, file, { upsert: false });

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      const { data: urlData } = supabase.storage.from('lead-fotos').getPublicUrl(path);
      newPhotos.push({
        bestandsnaam: file.name,
        storage_path: path,
        url: urlData.publicUrl,
      });
    }

    if (newPhotos.length > 0) {
      updateLead({ fotos: [...(lead.fotos || []), ...newPhotos] });
    }

    setUploading(false);
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = async (index: number) => {
    const photo = lead.fotos[index];
    if (photo?.storage_path) {
      await supabase.storage.from('lead-fotos').remove([photo.storage_path]);
    }
    const updated = lead.fotos.filter((_: any, i: number) => i !== index);
    updateLead({ fotos: updated });
  };

  return (
    <SlideLayout showSave>
      <div className="max-w-3xl mx-auto w-full">
        <SlideLabel>PROJECTINFO</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-10">
          Over het project
        </h2>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="font-body text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Projectadres
            </Label>
            <AddressAutocomplete
              value={lead.adres}
              onChange={val => updateLead({ adres: val })}
              placeholder="Straat, nummer, postcode, gemeente"
              className="bg-card"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-body text-base">Geschatte oppervlakte</Label>
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
            <Label className="font-body text-base">Project timing</Label>
            <Textarea
              value={lead.project_timing}
              onChange={e => updateLead({ project_timing: e.target.value })}
              placeholder="De klant wil het project afronden tegen periode 'x' omwille van 'y'"
              className="bg-card min-h-[80px]"
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-3">
            <Label className="font-body text-base">Foto's uploaden</Label>
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed p-8 text-center transition-colors ${
                uploading
                  ? 'border-muted cursor-wait'
                  : 'border-primary/30 cursor-pointer hover:border-primary/60 hover:bg-accent/50'
              }`}
            >
              {uploading ? (
                <Loader2 className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" />
              ) : (
                <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
              )}
              <p className="text-base text-muted-foreground">
                {uploading ? 'Bezig met uploaden...' : 'Klik om foto\'s te selecteren of sleep ze hierheen'}
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

            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-3">
                {photos.map((photo, i) => (
                  <div key={i} className="relative group overflow-hidden border border-border aspect-square">
                    <img src={photo.publicUrl} alt={photo.bestandsnaam} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-foreground/60 text-background text-[10px] px-1 py-0.5 truncate">
                      {photo.bestandsnaam}
                    </span>
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

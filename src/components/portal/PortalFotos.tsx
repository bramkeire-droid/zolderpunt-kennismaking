import { useState, useCallback } from 'react';
import type { PortalData } from '@/hooks/usePortal';
import ImageLightbox from '@/components/ImageLightbox';
import { Camera } from 'lucide-react';

interface Props {
  data: PortalData;
  onView?: () => void;
}

export default function PortalFotos({ data, onView }: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleOpen = useCallback((idx: number) => {
    setLightboxIndex(idx);
    onView?.();
  }, [onView]);

  const fotos = data.fotos || [];
  const urls = fotos.map((f) => f.url || '').filter(Boolean);
  if (fotos.length === 0) return null;

  // Group feiten by photo
  const feitenByPath = new Map<string, any[]>();
  for (const f of data.project_feiten || []) {
    if (f.foto_path) {
      const arr = feitenByPath.get(f.foto_path) || [];
      arr.push(f);
      feitenByPath.set(f.foto_path, arr);
    }
  }

  // Split into photos with feiten and photos without
  const fotosWithFeiten = fotos.filter(f => (feitenByPath.get(f.storage_path) || []).length > 0);
  const fotosWithoutFeiten = fotos.filter(f => (feitenByPath.get(f.storage_path) || []).length === 0);

  return (
    <section className="bg-white py-10">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 flex items-center justify-center bg-[#008CFF]/10 flex-shrink-0">
            <Camera className="h-4.5 w-4.5 text-[#008CFF]" />
          </div>
          <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold">
            Jouw zolder vandaag
          </h2>
        </div>

        {/* Photos with observations: large cards, text next to photo */}
        {fotosWithFeiten.length > 0 && (
          <div className="space-y-4 mb-6">
            {fotosWithFeiten.map((foto, _) => {
              const url = foto.url || '';
              if (!url) return null;
              const globalIdx = fotos.indexOf(foto);
              const feiten = feitenByPath.get(foto.storage_path) || [];

              return (
                <div key={globalIdx} className="bg-[#F8F3EB] flex flex-col md:flex-row overflow-hidden">
                  {/* Photo — large */}
                  <button
                    onClick={() => handleOpen(globalIdx)}
                    className="md:w-1/2 aspect-[4/3] md:aspect-auto overflow-hidden bg-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#008CFF] flex-shrink-0"
                  >
                    <img
                      src={url}
                      alt={foto.bestandsnaam || `Foto ${globalIdx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </button>

                  {/* Observations next to photo */}
                  <div className="p-5 md:p-6 flex flex-col justify-center flex-1">
                    <ul className="space-y-3">
                      {feiten.map((f) => (
                        <li key={f.id} className="flex items-start gap-3">
                          {f.label_nummer && (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-[#008CFF] text-white text-xs font-bold flex-shrink-0 mt-0.5">
                              {f.label_nummer}
                            </span>
                          )}
                          <span className="font-body text-sm text-[#1A1A1A] leading-relaxed">
                            {f.tekst}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Remaining photos without observations: compact grid */}
        {fotosWithoutFeiten.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fotosWithoutFeiten.map((foto) => {
              const url = foto.url || '';
              if (!url) return null;
              const globalIdx = fotos.indexOf(foto);

              return (
                <button
                  key={globalIdx}
                  onClick={() => handleOpen(globalIdx)}
                  className="aspect-square overflow-hidden bg-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#008CFF]"
                >
                  <img
                    src={url}
                    alt={foto.bestandsnaam || `Foto ${globalIdx + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lightboxIndex !== null && urls[lightboxIndex] && (
        <ImageLightbox
          src={urls[lightboxIndex]}
          alt={`Foto ${lightboxIndex + 1}`}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </section>
  );
}

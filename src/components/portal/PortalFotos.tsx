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

  const fotosWithFeiten = fotos.filter(f => (feitenByPath.get(f.storage_path) || []).length > 0);
  const fotosWithoutFeiten = fotos.filter(f => (feitenByPath.get(f.storage_path) || []).length === 0);

  return (
    <section className="bg-[#2B6CA0] py-12">
      <div className="max-w-4xl mx-auto px-6">
        <h2 className="font-headline text-xl text-white font-bold uppercase tracking-wider mb-8">
          Jouw zolder vandaag
        </h2>

        {/* Photos with observations: large cards, text next to photo */}
        {fotosWithFeiten.length > 0 && (
          <div className="space-y-4 mb-6">
            {fotosWithFeiten.map((foto) => {
              const url = foto.url || '';
              if (!url) return null;
              const globalIdx = fotos.indexOf(foto);
              const feiten = feitenByPath.get(foto.storage_path) || [];

              return (
                <div key={globalIdx} className="flex flex-col md:flex-row overflow-hidden">
                  <button
                    onClick={() => handleOpen(globalIdx)}
                    className="md:w-1/2 aspect-[4/3] md:aspect-auto overflow-hidden bg-[#2B6CA0] focus:outline-none focus:ring-2 focus:ring-[#008CFF] flex-shrink-0"
                  >
                    <img
                      src={url}
                      alt={foto.bestandsnaam || `Foto ${globalIdx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </button>
                  <div className="bg-[#F8F3EB] p-6 md:p-8 flex flex-col justify-center flex-1">
                    <ul className="space-y-4">
                      {feiten.map((f) => (
                        <li key={f.id} className="flex items-start gap-3">
                          {f.label_nummer && (
                            <span className="inline-flex items-center justify-center w-7 h-7 bg-[#008CFF] text-white text-sm font-bold flex-shrink-0 mt-0.5">
                              {f.label_nummer}
                            </span>
                          )}
                          <span className="font-body text-base text-[#1A1A1A] leading-relaxed">
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
                  className="aspect-square overflow-hidden bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#008CFF]"
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

import { useState, useCallback } from 'react';
import type { PortalData } from '@/hooks/usePortal';
import ImageLightbox from '@/components/ImageLightbox';

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
  if (fotos.length === 0) return null;

  const urls = fotos.map((f) => f.url || '').filter(Boolean);
    setLightboxIndex(idx);
    onView?.();
  }, [onView]);

  // Group feiten by photo
  const feitenByPath = new Map<string, any[]>();
  for (const f of data.project_feiten || []) {
    if (f.foto_path) {
      const arr = feitenByPath.get(f.foto_path) || [];
      arr.push(f);
      feitenByPath.set(f.foto_path, arr);
    }
  }

  return (
    <section className="max-w-4xl mx-auto px-6 py-10">
      <h2 className="font-headline text-xs text-[#008CFF] uppercase tracking-wider font-semibold mb-6">
        Jouw zolder vandaag
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {fotos.map((foto, idx) => {
          const url = foto.url || '';
          if (!url) return null;
          const feiten = feitenByPath.get(foto.storage_path) || [];

          return (
            <div key={idx} className="relative group">
              <button
                onClick={() => handleOpen(idx)}
                className="w-full aspect-[4/3] overflow-hidden bg-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#008CFF]"
              >
                <img
                  src={url}
                  alt={foto.bestandsnaam || `Foto ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              </button>
              {feiten.length > 0 && (
                <div className="absolute bottom-2 left-2 right-2">
                  {feiten.map((f) => (
                    <span
                      key={f.id}
                      className="inline-block bg-white/90 text-[#1A1A1A] text-xs font-body px-2 py-0.5 mr-1 mb-1"
                    >
                      {f.label_nummer && (
                        <span className="inline-flex items-center justify-center w-4 h-4 bg-[#008CFF] text-white text-[0.6rem] font-bold mr-1">
                          {f.label_nummer}
                        </span>
                      )}
                      {f.tekst}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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

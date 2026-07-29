import { Play } from 'lucide-react';
import type { LeadMediaItem } from '@/lib/leadMedia';

interface Props {
  item: LeadMediaItem;
  className?: string;
  onClick?: () => void;
}

// Renders one dossier item as a thumbnail, picking <img> or <video> based on
// the file itself. preload="metadata" makes the browser paint the first frame
// as a still, and the #t=0.1 fragment nudges Safari into doing the same.
export default function MediaThumb({ item, className = '', onClick }: Props) {
  if (item.isVideo) {
    return (
      <div className={`relative ${className}`} onClick={onClick}>
        <video
          src={`${item.url}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          className="w-full h-full object-cover pointer-events-none"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <Play className="h-6 w-6 text-white drop-shadow" fill="currentColor" />
        </div>
      </div>
    );
  }
  return (
    <img
      src={item.url}
      alt={item.name}
      className={`object-cover ${className}`}
      onClick={onClick}
      loading="lazy"
    />
  );
}

import { Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  clientName: string;
  onShare?: () => void;
  onDownloadPdf?: () => void;
}

export default function PortalShareBar({ clientName, onShare, onDownloadPdf }: Props) {
  const handleShare = () => {
    onShare?.();

    if (navigator.share) {
      navigator.share({
        title: `Dossier ${clientName} — Zolderpunt`,
        text: `Bekijk het dossier van ${clientName} bij Zolderpunt`,
        url: window.location.href,
      }).catch(() => {
        // User cancelled
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link gekopieerd naar klembord');
      });
    }
  };

  return (
    <div className="sticky bottom-0 bg-white border-t border-[#E2E8F0] z-40">
      <div className="max-w-4xl mx-auto px-6 py-3 flex justify-between items-center">
        <span className="font-body text-xs text-[#888888]">
          Dossier {clientName}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="font-headline text-xs gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5" />
            Delen
          </Button>
          {onDownloadPdf && (
            <Button
              size="sm"
              onClick={onDownloadPdf}
              className="bg-[#008CFF] text-white hover:bg-[#0070CC] font-headline text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Download PDF
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

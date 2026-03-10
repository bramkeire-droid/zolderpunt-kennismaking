import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { useLeadSave } from '@/hooks/useLeadSave';

interface SlideNavButtonsProps {
  showSave?: boolean;
}

export default function SlideNavButtons({ showSave = false }: SlideNavButtonsProps) {
  const { nextSlide, prevSlide, currentSlide } = useSession();
  const { saveLead } = useLeadSave();
  const isFirst = currentSlide === '0A';
  const isLast = currentSlide === '10';

  return (
    <div className="flex items-center justify-between pt-6">
      <Button
        variant="outline"
        onClick={prevSlide}
        disabled={isFirst}
        className="gap-2 font-headline text-base py-3 px-6"
      >
        <ChevronLeft className="h-5 w-5" />
        Vorige
      </Button>

      <div className="flex items-center gap-3">
        {showSave && (
          <Button
            variant="outline"
            onClick={saveLead}
            className="gap-2 font-headline text-base py-3 px-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Save className="h-5 w-5" />
            Opslaan
          </Button>
        )}
        <Button
          onClick={nextSlide}
          disabled={isLast}
          className="gap-2 font-headline text-base py-3 px-6 bg-primary text-primary-foreground hover:bg-secondary"
        >
          Volgende
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';

export default function SlideNavButtons() {
  const { nextSlide, prevSlide, currentSlide } = useSession();
  const isFirst = currentSlide === '0A';
  const isLast = currentSlide === '10';

  return (
    <div className="flex items-center justify-between pt-6">
      <Button
        variant="outline"
        onClick={prevSlide}
        disabled={isFirst}
        className="gap-2 font-headline"
      >
        <ChevronLeft className="h-4 w-4" />
        Vorige
      </Button>
      <Button
        onClick={nextSlide}
        disabled={isLast}
        className="gap-2 font-headline bg-primary text-primary-foreground hover:bg-secondary"
      >
        Volgende
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

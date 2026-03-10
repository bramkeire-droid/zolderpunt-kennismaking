import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface SlideNavButtonsProps {
  showSave?: boolean;
}

export default function SlideNavButtons({ showSave = false }: SlideNavButtonsProps) {
  const { nextSlide, prevSlide, currentSlide } = useSession();
  const { toast } = useToast();
  const isFirst = currentSlide === '0A';
  const isLast = currentSlide === '10';

  const handleSave = () => {
    // TODO: persist to Supabase
    toast({ title: 'Opgeslagen', description: 'Gegevens zijn opgeslagen.' });
  };

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

      <div className="flex items-center gap-3">
        {showSave && (
          <Button
            variant="outline"
            onClick={handleSave}
            className="gap-2 font-headline border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <Save className="h-4 w-4" />
            Opslaan
          </Button>
        )}
        <Button
          onClick={nextSlide}
          disabled={isLast}
          className="gap-2 font-headline bg-primary text-primary-foreground hover:bg-secondary"
        >
          Volgende
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Info, X, Clock, Receipt, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import FacturatieTimeline from './FacturatieTimeline';

type ExtraInfoSlide = 'duur' | 'facturatie';

const SLIDES: Record<ExtraInfoSlide, {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}> = {
  duur: {
    title: 'Hoe lang duurt een zolderrenovatie?',
    icon: Clock,
    content: (
      <div className="space-y-6 text-lg leading-relaxed">
        <p className="text-foreground/80">
          De duurtijd hangt af van de omvang en complexiteit van het project.
          Hieronder een realistische richtlijn:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted p-6 rounded-2xl">
            <div className="font-headline text-xl font-bold text-primary mb-2">3 – 4 weken</div>
            <div className="text-base text-foreground/70">Basisrenovatie: isolatie, vloer, afwerking.</div>
          </div>
          <div className="bg-muted p-6 rounded-2xl">
            <div className="font-headline text-xl font-bold text-primary mb-2">5 – 7 weken</div>
            <div className="text-base text-foreground/70">Met dakramen, trap, of badkamer erbij.</div>
          </div>
          <div className="bg-muted p-6 rounded-2xl">
            <div className="font-headline text-xl font-bold text-primary mb-2">8 – 10 weken</div>
            <div className="text-base text-foreground/70">Volledig project incl. maatwerk en techniek.</div>
          </div>
        </div>
        <div className="bg-primary/5 border-l-4 border-primary p-5 rounded-r-xl">
          <div className="font-headline font-semibold text-foreground mb-1">Vanaf wanneer kunnen we starten?</div>
          <p className="text-foreground/70 text-base">
            Onze planning loopt doorgaans 6 tot 10 weken vooruit. Na ondertekening van de offerte
            krijg je een concrete startdatum en een week-per-week planning.
          </p>
        </div>
      </div>
    ),
  },
  facturatie: {
    title: 'Facturatie',
    icon: Receipt,
    content: <FacturatieTimeline />,
  },
};

export default function ExtraInfoMenu() {
  const [openSlide, setOpenSlide] = useState<ExtraInfoSlide | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-none text-sm font-headline font-semibold text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors"
            title="Extra info"
          >
            <Info className="h-4 w-4" />
            Extra Info
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          {(Object.keys(SLIDES) as ExtraInfoSlide[]).map((key) => {
            const slide = SLIDES[key];
            const Icon = slide.icon;
            return (
              <DropdownMenuItem
                key={key}
                onClick={() => setOpenSlide(key)}
                className="gap-3 py-3 cursor-pointer"
              >
                <Icon className="h-5 w-5 text-primary shrink-0" />
                <span className="font-medium">{slide.title}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {openSlide && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"
          onClick={() => setOpenSlide(null)}
        >
          <div
            className="relative bg-background rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpenSlide(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-muted hover:bg-foreground hover:text-background transition-colors z-10"
              title="Sluiten"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="p-12">
              <h2 className="font-headline text-4xl font-bold text-foreground mb-8 pr-12">
                {SLIDES[openSlide].title}
              </h2>
              {SLIDES[openSlide].content}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

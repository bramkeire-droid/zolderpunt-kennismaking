import SlideLayout from '@/components/SlideLayout';
import SlideLabel from '@/components/SlideLabel';
import { Upload } from 'lucide-react';
import { useState, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useSession } from '@/contexts/SessionContext';

export default function Slide8() {
  const { nextSlide, updateLead } = useSession();
  const [transcript, setTranscript] = useState('');
  const [fileName, setFileName] = useState('');
  const [additions, setAdditions] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setTranscript(reader.result as string);
    reader.readAsText(file);
  };

  const handleGenerate = () => {
    const combined = [transcript, additions].filter(Boolean).join('\n\n---\nAanvullingen:\n');
    updateLead({
      transcript: combined,
      rapport_tekst: '',
      rapport_highlights: '',
      waarde_tekst_ai: '',
      rapport_situatie_ai: '',
      rapport_verwachtingen_ai: '',
      rapport_besproken_ai: '',
      rapport_aandachtspunten_ai: '',
    });
    nextSlide();
  };

  return (
    <SlideLayout>
      <div className="max-w-2xl mx-auto w-full">
        <SlideLabel>RAPPORT GENEREREN</SlideLabel>
        <h2 className="text-4xl font-headline font-bold text-foreground mb-8">
          Gesprek verwerken
        </h2>

        {/* Upload zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-primary/30 rounded-xl p-10 text-center cursor-pointer hover:border-primary/60 hover:bg-accent/30 transition-colors mb-6"
        >
          <Upload className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="text-base text-muted-foreground font-body">
            Upload transcript (.md of .txt)
          </p>
          {fileName && (
            <p className="mt-2 text-sm font-medium text-foreground">{fileName}</p>
          )}
          <input ref={fileRef} type="file" accept=".md,.txt" className="hidden" onChange={handleFile} />
        </div>

        {/* Preview */}
        {transcript && (
          <div className="bg-card rounded-lg border border-border p-4 mb-6 max-h-[200px] overflow-y-auto">
            <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
              {transcript.slice(0, 500)}{transcript.length > 500 ? '...' : ''}
            </p>
          </div>
        )}

        {/* Additions */}
        <div className="space-y-2 mb-8">
          <label className="text-base font-medium text-foreground font-body">
            Aanvullingen of correcties
          </label>
          <Textarea
            value={additions}
            onChange={e => setAdditions(e.target.value)}
            placeholder="Optioneel: voeg extra context toe..."
            className="bg-card"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!transcript}
          className="w-full bg-primary text-primary-foreground hover:bg-secondary font-headline text-base py-6"
        >
          Rapport genereren →
        </Button>
      </div>
    </SlideLayout>
  );
}

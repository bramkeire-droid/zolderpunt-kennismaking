import { useState, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';

interface TranscriptUploadProps {
  onSubmit: (transcript: string) => void;
  loading: boolean;
}

export default function TranscriptUpload({ onSubmit, loading }: TranscriptUploadProps) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
    setFileName(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border hover:border-primary/50 bg-card p-12 text-center cursor-pointer transition-colors"
      >
        <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-body text-foreground">
          Sleep een transcript (.txt, .vtt, .srt) hierheen
        </p>
        <p className="text-xs font-body text-muted-foreground mt-1">of klik om te uploaden</p>
        {fileName && (
          <div className="flex items-center gap-2 justify-center mt-3 text-sm text-primary font-body">
            <FileText className="h-4 w-4" />
            {fileName}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.vtt,.srt"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div>
        <label className="text-xs font-headline font-bold text-muted-foreground uppercase tracking-wider block mb-2">
          Of plak het transcript hieronder
        </label>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setFileName(null); }}
          placeholder="Plak hier het volledige transcript..."
          rows={10}
          className="w-full px-4 py-3 bg-card border border-border text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      <button
        onClick={() => onSubmit(text)}
        disabled={!text.trim() || loading}
        className="w-full h-12 bg-primary text-primary-foreground font-headline font-semibold text-base hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'AI analyseert het gesprek...' : 'Analyseer transcript'}
      </button>
    </div>
  );
}

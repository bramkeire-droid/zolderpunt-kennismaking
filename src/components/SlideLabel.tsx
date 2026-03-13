interface SlideLabelProps {
  children: string;
  variant?: 'default' | 'white';
}

export default function SlideLabel({ children, variant = 'default' }: SlideLabelProps) {
  const isWhite = variant === 'white';
  return (
    <div className={`flex items-center gap-3 mb-6 ${isWhite ? '' : 'label-style'}`}>
      <span
        className={
          isWhite
            ? 'text-primary-foreground/60 text-xs font-body uppercase tracking-widest'
            : ''
        }
        style={isWhite ? { letterSpacing: '0.1em' } : undefined}
      >
        {children}
      </span>
      <div className={`flex-1 h-px ${isWhite ? 'bg-primary-foreground/20' : 'bg-border'}`} />
    </div>
  );
}

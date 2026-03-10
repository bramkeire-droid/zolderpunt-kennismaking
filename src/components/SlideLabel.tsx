interface SlideLabelProps {
  children: string;
}

export default function SlideLabel({ children }: SlideLabelProps) {
  return (
    <div className="label-style flex items-center gap-3 mb-6">
      <span>{children}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

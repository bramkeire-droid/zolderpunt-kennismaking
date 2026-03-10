interface DecorativeAngleProps {
  className?: string;
  color?: 'primary' | 'secondary';
  size?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export default function DecorativeAngle({
  className = '',
  color = 'primary',
  size = 300,
  position = 'bottom-right',
}: DecorativeAngleProps) {
  const positionClasses: Record<string, string> = {
    'top-left': '-top-16 -left-16',
    'top-right': '-top-16 -right-16',
    'bottom-left': '-bottom-16 -left-16',
    'bottom-right': '-bottom-16 -right-16',
  };

  const bgColor = color === 'primary' ? 'bg-primary' : 'bg-secondary';

  return (
    <div
      className={`absolute ${positionClasses[position]} ${bgColor} rounded-[48px] opacity-20 pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        transform: 'rotate(-40deg)',
      }}
    />
  );
}

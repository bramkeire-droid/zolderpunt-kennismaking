import React from 'react';
import { Svg, Path, Circle as SvgCircle } from '@react-pdf/renderer';

interface PdfIconProps {
  name: IconName;
  size?: number;
  color?: string;
}

type IconName =
  | 'MapPin' | 'Target' | 'Wrench' | 'MessageCircle'
  | 'CheckCircle' | 'XCircle' | 'Maximize2' | 'Home'
  | 'TrendingUp' | 'Calendar' | 'Shield' | 'Star'
  | 'StarFilled' | 'Phone' | 'Mail' | 'Globe'
  | 'Circle' | 'CircleFilled';

// Lucide icon SVG paths (viewBox 0 0 24 24, stroke-based except StarFilled)
const ICON_PATHS: Record<IconName, { d: string[]; fill?: boolean; circles?: { cx: number; cy: number; r: number }[] }> = {
  MapPin: {
    d: [
      'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z',
    ],
    circles: [{ cx: 12, cy: 10, r: 3 }],
  },
  Target: {
    d: [],
    circles: [
      { cx: 12, cy: 12, r: 10 },
      { cx: 12, cy: 12, r: 6 },
      { cx: 12, cy: 12, r: 2 },
    ],
  },
  Wrench: {
    d: [
      'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
    ],
  },
  MessageCircle: {
    d: [
      'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
    ],
  },
  CheckCircle: {
    d: [
      'M22 11.08V12a10 10 0 1 1-5.93-9.14',
      'M22 4L12 14.01l-3-3',
    ],
  },
  XCircle: {
    d: [],
    circles: [{ cx: 12, cy: 12, r: 10 }],
  },
  Maximize2: {
    d: [
      'M15 3h6v6',
      'M9 21H3v-6',
      'M21 3l-7 7',
      'M3 21l7-7',
    ],
  },
  Home: {
    d: [
      'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      'M9 22V12h6v10',
    ],
  },
  TrendingUp: {
    d: [
      'M23 6l-9.5 9.5-5-5L1 18',
      'M17 6h6v6',
    ],
  },
  Calendar: {
    d: [
      'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z',
      'M16 2v4',
      'M8 2v4',
      'M3 10h18',
    ],
  },
  Shield: {
    d: [
      'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    ],
  },
  Star: {
    d: [
      'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    ],
  },
  StarFilled: {
    d: [
      'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    ],
    fill: true,
  },
  Phone: {
    d: [
      'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z',
    ],
  },
  Mail: {
    d: [
      'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z',
      'M22 6l-10 7L2 6',
    ],
  },
  Globe: {
    d: [],
    circles: [{ cx: 12, cy: 12, r: 10 }],
  },
  Circle: {
    d: [],
    circles: [{ cx: 12, cy: 12, r: 10 }],
  },
  CircleFilled: {
    d: [],
    circles: [{ cx: 12, cy: 12, r: 10 }],
    fill: true,
  },
};

// Extra paths for XCircle (circle + X lines) and Globe (circle + lines)
const EXTRA_PATHS: Partial<Record<IconName, string[]>> = {
  XCircle: ['M15 9l-6 6', 'M9 9l6 6'],
  Globe: [
    'M2 12h20',
    'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  ],
};

export default function PdfIcon({ name, size = 16, color = '#008CFF' }: PdfIconProps) {
  const icon = ICON_PATHS[name];
  if (!icon) return null;

  const extra = EXTRA_PATHS[name] || [];
  const isFilled = icon.fill === true;

  return (
    <Svg viewBox="0 0 24 24" style={{ width: size, height: size }}>
      {/* Circles */}
      {icon.circles?.map((c, i) => (
        <SvgCircle
          key={`c${i}`}
          cx={c.cx}
          cy={c.cy}
          r={c.r}
          stroke={color}
          strokeWidth={2}
          fill={isFilled ? color : 'none'}
        />
      ))}
      {/* Main paths */}
      {icon.d.map((d, i) => (
        <Path
          key={`p${i}`}
          d={d}
          stroke={isFilled ? 'none' : color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={isFilled ? color : 'none'}
        />
      ))}
      {/* Extra paths */}
      {extra.map((d, i) => (
        <Path
          key={`e${i}`}
          d={d}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

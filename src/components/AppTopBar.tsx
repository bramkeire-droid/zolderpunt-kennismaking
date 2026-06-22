import { ArrowLeft, LogOut } from 'lucide-react';
import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AppTopBarProps {
  title?: string;
  subtitle?: string;
  leftExtra?: ReactNode;
  onBackToDossiers?: () => void;
  /** Optional primary action shown to the left of signOut */
  primary?: { label: string; onClick: () => void; icon?: ReactNode; iconPosition?: 'left' | 'right' };
}

/**
 * Gedeelde topbar — gebruikt op alle pagina's buiten de slide-flow.
 * Vaste layout: links logo + context, rechts [Naar dossiers] [primaire actie] [uitloggen].
 */
export default function AppTopBar({ title, subtitle, leftExtra, onBackToDossiers, primary }: AppTopBarProps) {
  const { signOut } = useAuth();
  return (
    <div className="shrink-0 bg-white border-b border-[#DDD5C5] px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-dm font-extrabold text-[18px] text-[#008CFF] tracking-[-0.02em]">zolderpunt.</span>
        {(title || leftExtra) && <div className="w-px h-5 bg-[#DDD5C5]" />}
        {title && <h1 className="font-dm font-bold text-[14px] text-[#0F1419] truncate">{title}</h1>}
        {subtitle && <span className="text-[12px] font-body text-[#5B6470] truncate">{subtitle}</span>}
        {leftExtra}
      </div>
      <div className="flex items-center gap-3">
        {onBackToDossiers && (
          <button
            onClick={onBackToDossiers}
            className="h-11 bg-white text-[#0F1419] border-2 border-[#DDD5C5] px-5 font-dm font-semibold text-[14px] tracking-[0.02em] cursor-pointer hover:border-[#0F1419] transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" /> Naar dossiers
          </button>
        )}
        {primary && (
          <button
            onClick={primary.onClick}
            className="h-11 bg-[#008CFF] text-white border-none px-6 font-dm font-semibold text-[14px] tracking-[0.02em] cursor-pointer hover:bg-[#0070CC] transition-colors flex items-center gap-1.5"
          >
            {(primary.iconPosition ?? 'left') === 'left' && primary.icon}
            {primary.label}
            {primary.iconPosition === 'right' && primary.icon}
          </button>
        )}
        <button onClick={signOut} className="p-2 text-[#5B6470] hover:text-[#0F1419] transition-colors" title="Uitloggen">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

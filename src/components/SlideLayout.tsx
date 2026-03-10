import React from 'react';
import SlideNavButtons from './SlideNavButtons';

interface SlideLayoutProps {
  children: React.ReactNode;
  /** Full blue background (e.g. welkomstslide) */
  variant?: 'default' | 'blue' | 'internal';
  /** Hide nav buttons (e.g. for dossiers) */
  hideNav?: boolean;
  className?: string;
}

export default function SlideLayout({ children, variant = 'default', hideNav = false, className = '' }: SlideLayoutProps) {
  if (variant === 'blue') {
    return (
      <div className="flex-1 flex flex-col bg-primary relative overflow-hidden">
        {/* Decorative 40° element */}
        <div
          className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-secondary rounded-[48px] opacity-30"
          style={{ transform: 'rotate(-40deg)' }}
        />
        <div className={`flex-1 flex flex-col justify-center items-center p-12 relative z-10 ${className}`}>
          {children}
        </div>
        {!hideNav && (
          <div className="relative z-10 px-12 pb-8">
            <SlideNavButtons />
          </div>
        )}
      </div>
    );
  }

  if (variant === 'internal') {
    return (
      <div className="flex-1 flex flex-col bg-muted relative overflow-hidden">
        <div className={`flex-1 overflow-y-auto p-8 lg:p-12 ${className}`}>
          {children}
        </div>
        {!hideNav && (
          <div className="px-8 lg:px-12 pb-6">
            <SlideNavButtons />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
      {/* Subtle decorative element */}
      <div
        className="absolute -top-32 -right-32 w-[300px] h-[300px] bg-primary rounded-[48px] opacity-[0.04]"
        style={{ transform: 'rotate(-40deg)' }}
      />
      <div className={`flex-1 overflow-y-auto p-8 lg:p-12 relative z-10 ${className}`}>
        {children}
      </div>
      {!hideNav && (
        <div className="relative z-10 px-8 lg:px-12 pb-6">
          <SlideNavButtons />
        </div>
      )}
    </div>
  );
}

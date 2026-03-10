import React from 'react';
import SlideNavButtons from './SlideNavButtons';

interface SlideLayoutProps {
  children: React.ReactNode;
  variant?: 'default' | 'blue' | 'internal';
  hideNav?: boolean;
  showSave?: boolean;
  className?: string;
}

export default function SlideLayout({ children, variant = 'default', hideNav = false, showSave = false, className = '' }: SlideLayoutProps) {
  if (variant === 'blue') {
    return (
      <div className="flex-1 flex flex-col bg-primary relative overflow-hidden">
        <div
          className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-secondary opacity-30"
          style={{ transform: 'rotate(-40deg)' }}
        />
        <div className={`flex-1 overflow-y-auto flex flex-col justify-center items-center p-12 relative z-10 ${className}`}>
          {children}
        </div>
        {!hideNav && (
          <div className="relative z-10 px-12 pb-8">
            <SlideNavButtons showSave={showSave} />
          </div>
        )}
      </div>
    );
  }

  if (variant === 'internal') {
    return (
      <div className="flex-1 flex flex-col bg-muted relative overflow-hidden">
        <div className={`flex-1 overflow-y-auto p-10 lg:p-16 ${className}`}>
          {children}
        </div>
        {!hideNav && (
          <div className="px-10 lg:px-16 pb-6">
            <SlideNavButtons showSave={showSave} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
      <div
        className="absolute -top-32 -right-32 w-[300px] h-[300px] bg-primary opacity-[0.04]"
        style={{ transform: 'rotate(-40deg)' }}
      />
      <div className={`flex-1 overflow-y-auto p-10 lg:p-16 relative z-10 ${className}`}>
        {children}
      </div>
      {!hideNav && (
        <div className="relative z-10 px-10 lg:px-16 pb-6">
          <SlideNavButtons showSave={showSave} />
        </div>
      )}
    </div>
  );
}

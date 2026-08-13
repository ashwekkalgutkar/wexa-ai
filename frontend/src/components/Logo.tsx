import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const dimensions = {
    sm: { icon: 'w-8 h-8', text: 'text-base', subtext: 'text-[10px]' },
    md: { icon: 'w-10 h-10', text: 'text-lg', subtext: 'text-xs' },
    lg: { icon: 'w-12 h-12', text: 'text-xl', subtext: 'text-xs' },
  }[size];

  return (
    <div className="flex items-center gap-3 group select-none">
      <div className={`${dimensions.icon} rounded-2xl bg-slate-900 shadow-md border border-slate-700/60 flex items-center justify-center relative overflow-hidden transition-transform duration-300 group-hover:scale-105`}>
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#6C5CE7]/30 via-transparent to-[#00F0FF]/20 opacity-70" />
        
        <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6 relative z-10">
          <defs>
            <linearGradient id="logoLineGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6C5CE7" />
              <stop offset="0.5" stopColor="#00F0FF" />
              <stop offset="1" stopColor="#FF2A85" />
            </linearGradient>
          </defs>
          <path d="M7 23L12 11L22 8L25 19L18 24Z" stroke="url(#logoLineGrad)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          <circle cx="7" cy="23" r="2.25" fill="#6C5CE7" />
          <circle cx="12" cy="11" r="2.5" fill="#00F0FF" />
          <circle cx="22" cy="8" r="2.25" fill="#FF2A85" />
          <circle cx="25" cy="19" r="2.25" fill="#00F0FF" />
          <circle cx="18" cy="24" r="2.5" fill="#6C5CE7" />
          <circle cx="16" cy="16" r="3" fill="#FFFFFF" stroke="#6C5CE7" strokeWidth="1.5" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <h1 className={`font-extrabold ${dimensions.text} tracking-tight text-[#1A1A1A] font-display leading-none group-hover:text-[#6C5CE7] transition-colors`}>
            Six Degrees
          </h1>
          <p className={`${dimensions.subtext} text-slate-500 font-sans mt-0.5 font-medium tracking-wide`}>
            Music Collaboration Network
          </p>
        </div>
      )}
    </div>
  );
};

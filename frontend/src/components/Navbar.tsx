import React from 'react';
import { AlertTriangle, Sun, Moon } from 'lucide-react';
import type { HealthResponse } from '../services/types';

interface NavbarProps {
  health: HealthResponse | null;
  currentStep: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  health,
  currentStep,
  theme,
  onToggleTheme,
}) => {
  const steps = [
    { num: 1, label: 'URL INPUT' },
    { num: 2, label: 'SELECT VIDEOS' },
    { num: 3, label: 'QUALITY & FOLDER' },
    { num: 4, label: 'DOWNLOADING' },
    { num: 5, label: 'REPORT' },
  ];

  const isLight = theme === 'light';

  return (
    <header className="border-b-4 border-black bg-theme-navbarBg text-theme-navbarText sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <img
            src="/favicon.png"
            alt="YT Logo"
            className="w-10 h-10 border-3 border-black shadow-brutal object-cover bg-black flex-shrink-0"
          />
          <div>
            <h1 className="font-mono font-black text-xl tracking-tight leading-none text-theme-text flex items-center gap-2">
              RIPPER<span className="text-[#00FF66] bg-black px-1 border border-black text-white">.WINDOWS</span>
              <span className="text-xs bg-[#00FF66] text-black px-1.5 py-0.5 border border-black font-bold">
                PRO v1.0
              </span>
            </h1>
            <p className="text-theme-muted text-xs font-mono">LOCAL YOUTUBE & PLAYLIST EXTRACTION</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-xs">
          {steps.map((s, idx) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <React.Fragment key={s.num}>
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 border-2 border-black font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#00FF66] text-black shadow-brutal-sm'
                      : isDone
                      ? isLight
                        ? 'bg-neutral-200 text-neutral-800'
                        : 'bg-neutral-800 text-neutral-300'
                      : isLight
                      ? 'bg-neutral-100 text-neutral-400 border-neutral-300'
                      : 'bg-neutral-900 text-neutral-600 border-neutral-800'
                  }`}
                >
                  <span>{s.num}.</span>
                  <span>{s.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <span className={isLight ? 'text-neutral-400' : 'text-neutral-600'}>→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Health Status & Theme Toggle */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {/* FFmpeg Indicator */}
          {health?.ffmpeg_installed ? (
            <div className="hidden sm:flex items-center gap-1.5 bg-theme-surface border-2 border-black px-2.5 py-1 text-theme-text">
              <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse" />
              <span className="font-bold">FFMPEG READY</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-[#FF3366] text-white border-2 border-black px-2.5 py-1 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>FFMPEG MISSING</span>
            </div>
          )}

          {/* Neo-Brutalist Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            type="button"
            className="neo-btn text-xs px-3 py-1.5 border-2 border-black flex items-center gap-1.5 bg-[#FFE600] text-black hover:bg-[#fff033]"
            title={`Switch to ${isLight ? 'Dark' : 'Off-White Light'} theme`}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 fill-black" />
                <span>DARK MODE</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 fill-black" />
                <span>LIGHT MODE</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

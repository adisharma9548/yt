import React from 'react';
import { Sparkles, ShieldCheck } from 'lucide-react';

interface QualitySelectorProps {
  selectedQuality: string;
  onSelectQuality: (quality: string) => void;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  selectedQuality,
  onSelectQuality,
}) => {
  const options = [
    { id: 'Best Available', label: 'BEST AVAILABLE', desc: 'Highest resolution + best audio' },
    { id: '2160p', label: '4K (2160P)', desc: 'Ultra High Definition' },
    { id: '1440p', label: '2K (1440P)', desc: 'Quad High Definition' },
    { id: '1080p', label: '1080P FHD', desc: 'Full High Definition (Standard)' },
    { id: '720p', label: '720P HD', desc: 'High Definition (Fast download)' },
    { id: '480p', label: '480P', desc: 'Standard Definition' },
    { id: '360p', label: '360P', desc: 'Compact Size' },
  ];

  return (
    <div className="bg-theme-card border-3 border-black shadow-brutal p-6 mb-6 transition-colors duration-200">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-[#00FF66]" />
        <h3 className="font-mono font-black text-lg text-theme-text">MAXIMUM VIDEO QUALITY</h3>
      </div>

      {/* Grid of Quality Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {options.map((opt) => {
          const isSelected = selectedQuality === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectQuality(opt.id)}
              className={`p-3 border-3 text-left font-mono transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#00FF66] text-black border-black shadow-brutal font-black'
                  : 'bg-theme-surface text-theme-text border-black hover:bg-theme-card'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-black text-sm">{opt.label}</span>
                {isSelected && (
                  <span className="text-[10px] bg-black text-[#00FF66] px-1.5 py-0.5 font-bold uppercase">
                    ACTIVE
                  </span>
                )}
              </div>
              <span className={`text-xs ${isSelected ? 'text-neutral-900 font-bold' : 'text-theme-secondary'}`}>
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Fallback Guarantee Banner */}
      <div className="bg-theme-surface border-2 border-black p-3 flex items-start gap-2.5 font-mono text-xs text-theme-text">
        <ShieldCheck className="w-4 h-4 text-black bg-[#00FF66] p-0.5 border border-black flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-black text-theme-text">AUTOMATIC QUALITY FALLBACK: </span>
          If your chosen resolution is not available for a specific video, the engine will
          automatically download the next highest available quality without failing.
        </div>
      </div>
    </div>
  );
};

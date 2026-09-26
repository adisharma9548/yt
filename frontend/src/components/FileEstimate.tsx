import React from 'react';
import { HardDrive, AlertTriangle, Info } from 'lucide-react';
import { formatBytes } from '../services/utils';

interface FileEstimateProps {
  selectedCount: number;
  totalEstimatedMb: number;
  availableFreeMb?: number;
}

export const FileEstimate: React.FC<FileEstimateProps> = ({
  selectedCount,
  totalEstimatedMb,
  availableFreeMb,
}) => {
  const estBytes = totalEstimatedMb * 1024 * 1024;
  const freeBytes = (availableFreeMb || 0) * 1024 * 1024;

  const hasDiskInfo = availableFreeMb !== undefined && availableFreeMb > 0;
  const isInsufficientSpace = hasDiskInfo && availableFreeMb < totalEstimatedMb * 1.05;

  return (
    <div className="bg-theme-card border-3 border-black shadow-brutal p-6 mb-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-[#00FF66]" />
          <h3 className="font-mono font-black text-lg text-theme-text">STORAGE & SIZE ESTIMATE</h3>
        </div>
        <span className="font-mono text-xs bg-theme-surface border-2 border-black text-theme-text px-2 py-1 font-bold">
          {selectedCount} VIDEOS SELECTED
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Estimated Required Size */}
        <div className="bg-theme-surface border-2 border-black p-4 font-mono">
          <span className="text-xs text-theme-muted font-bold block mb-1">TOTAL ESTIMATED DOWNLOAD</span>
          <div className="text-2xl font-black text-[#00FF66]">
            {formatBytes(estBytes)}
          </div>
          <span className="text-[11px] text-theme-secondary font-bold">
            (~{totalEstimatedMb.toLocaleString()} MB)
          </span>
        </div>

        {/* Free Disk Space on Destination Drive */}
        <div
          className={`border-2 p-4 font-mono ${
            isInsufficientSpace
              ? 'bg-[#FF3366]/20 border-[#FF3366]'
              : 'bg-theme-surface border-black'
          }`}
        >
          <span className="text-xs text-theme-muted font-bold block mb-1">AVAILABLE DISK SPACE</span>
          <div
            className={`text-2xl font-black ${
              isInsufficientSpace ? 'text-[#FF3366]' : 'text-theme-text'
            }`}
          >
            {hasDiskInfo ? formatBytes(freeBytes) : 'NOT SELECTED'}
          </div>
          <span className="text-[11px] text-theme-secondary font-bold">
            {hasDiskInfo ? `${availableFreeMb?.toLocaleString()} MB available` : 'Select folder below'}
          </span>
        </div>
      </div>

      {/* Insufficient Disk Space Warning */}
      {isInsufficientSpace && (
        <div className="bg-[#FF3366] text-white border-2 border-black p-3 mb-4 font-mono text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            CRITICAL: Estimated {formatBytes(estBytes)} needed, but only{' '}
            {formatBytes(freeBytes)} is free on target drive. Please choose another location or free up space.
          </span>
        </div>
      )}

      {/* Metadata disclaimer */}
      <div className="flex items-start gap-2 text-theme-secondary font-mono text-[11px] border-t border-theme-subtle pt-3">
        <Info className="w-3.5 h-3.5 text-theme-muted flex-shrink-0 mt-0.5" />
        <span>
          YouTube format metadata provides approximate streams before merging. Actual final file
          sizes may vary by 5–15% after audio/video remuxing.
        </span>
      </div>
    </div>
  );
};

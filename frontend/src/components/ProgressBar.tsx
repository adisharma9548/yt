import React from 'react';
import { Download, Clock, Zap, Film } from 'lucide-react';
import type { QueueProgress, QueueSummary } from '../services/types';
import { formatBytes, formatTimeRemaining } from '../services/utils';

interface ProgressBarProps {
  currentTitle: string;
  currentIndex: number;
  totalVideos: number;
  currentProgress: QueueProgress;
  summary: QueueSummary;
  overallStatus: string;
  elapsedSeconds: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTitle,
  currentIndex,
  totalVideos,
  currentProgress,
  summary,
  overallStatus,
  elapsedSeconds,
}) => {
  // Overall percentage based on completed items + fractional progress of current item
  const isComplete = overallStatus === 'completed' || (totalVideos > 0 && (summary.completed + summary.skipped + summary.failed) >= totalVideos);
  const completedCount = isComplete ? totalVideos : (summary.completed + summary.skipped);
  const currentFraction = (currentProgress.percentage || 0) / 100;
  const overallPercentage = isComplete
    ? 100
    : (totalVideos > 0
        ? Math.min(100, Math.round(((completedCount + currentFraction) / totalVideos) * 100))
        : 0);

  const displayCurrentPercentage = isComplete ? 100 : (currentProgress.percentage || 0);

  // Approximate remaining time
  const remainingVideos = Math.max(0, totalVideos - completedCount);
  const estRemainingSeconds = isComplete
    ? 0
    : (completedCount > 0 && elapsedSeconds > 0
        ? Math.round((elapsedSeconds / completedCount) * remainingVideos)
        : currentProgress.eta_seconds || 0);

  return (
    <div className="space-y-6">
      {/* Level 1: Current Video Progress */}
      <div className="bg-theme-card border-4 border-black shadow-brutal p-6 relative overflow-hidden transition-colors duration-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full bg-[#00FF66] ${isComplete ? '' : 'animate-ping'}`} />
            <span className="font-mono text-xs font-black text-theme-text tracking-wider uppercase">
              {isComplete
                ? `DOWNLOAD BATCH FINISHED (${totalVideos} OF ${totalVideos})`
                : `DOWNLOADING VIDEO ${currentIndex > 0 ? currentIndex : 1} OF ${totalVideos}`}
            </span>
          </div>
          <span className="font-mono text-xs text-theme-secondary bg-theme-surface px-2.5 py-1 border border-black font-bold">
            STATUS: <span className="text-theme-text font-black uppercase">{isComplete ? 'COMPLETED' : overallStatus}</span>
          </span>
        </div>

        {/* Video Title */}
        <h4 className="font-mono font-black text-xl text-theme-text mb-4 truncate flex items-center gap-2" title={currentTitle}>
          <Film className="w-5 h-5 text-black bg-[#00FF66] p-0.5 border border-black flex-shrink-0" />
          <span className="truncate">{isComplete ? 'All downloads finalized successfully.' : (currentTitle || 'Preparing download stream...')}</span>
        </h4>

        {/* Progress Track */}
        <div className="w-full bg-theme-surface border-3 border-black h-8 relative shadow-inner mb-3 overflow-hidden">
          <div
            className="bg-[#00FF66] h-full transition-all duration-300 flex items-center justify-end pr-2 text-black font-mono font-black text-xs border-r-2 border-black"
            style={{ width: `${displayCurrentPercentage}%` }}
          >
            {displayCurrentPercentage > 10 && `${displayCurrentPercentage}%`}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs pt-2 border-t border-theme-subtle">
          <div className="bg-theme-surface p-2.5 border border-black">
            <span className="text-theme-muted font-bold block text-[10px]">PROGRESS</span>
            <span className="font-black text-theme-text text-sm">
              {currentProgress.percentage || 0}%
            </span>
          </div>
          <div className="bg-theme-surface p-2.5 border border-black">
            <span className="text-theme-muted font-bold block text-[10px]">SPEED</span>
            <span className="font-black text-black bg-[#00FF66] px-1 border border-black text-xs inline-flex items-center gap-1 mt-0.5">
              <Zap className="w-3 h-3 fill-black" />
              {currentProgress.speed_mbps || 0} MB/s
            </span>
          </div>
          <div className="bg-theme-surface p-2.5 border border-black">
            <span className="text-theme-muted font-bold block text-[10px]">DOWNLOADED</span>
            <span className="font-black text-theme-text text-sm">
              {formatBytes(currentProgress.bytes_downloaded)} / {formatBytes(currentProgress.total_bytes)}
            </span>
          </div>
          <div className="bg-theme-surface p-2.5 border border-black">
            <span className="text-theme-muted font-bold block text-[10px]">REMAINING</span>
            <span className="font-black text-theme-text text-sm flex items-center gap-1">
              <Clock className="w-3 h-3 text-theme-muted" />
              {currentProgress.eta_seconds > 0 ? formatTimeRemaining(currentProgress.eta_seconds) : '--:--'}
            </span>
          </div>
        </div>
      </div>

      {/* Level 2: Overall Queue Progress */}
      <div className="bg-theme-card border-3 border-black shadow-brutal p-6 transition-colors duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-theme-text" />
            <h5 className="font-mono font-black text-sm text-theme-text uppercase tracking-wider">
              OVERALL QUEUE PROGRESS
            </h5>
          </div>
          <div className="font-mono text-xs text-theme-text font-bold">
            COMPLETED: <span className="font-black text-black bg-[#00FF66] px-1 border border-black">{completedCount}</span> / {totalVideos}
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="w-full bg-theme-surface border-2 border-black h-6 relative mb-3 overflow-hidden">
          <div
            className="bg-black text-[#00FF66] h-full transition-all duration-300 flex items-center justify-end pr-2 font-mono font-bold text-xs"
            style={{ width: `${overallPercentage}%` }}
          >
            {overallPercentage > 8 && `${overallPercentage}%`}
          </div>
        </div>

        {/* Queue Stats Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-theme-secondary">
          <div className="flex items-center gap-3">
            <span>
              ELAPSED: <strong className="text-theme-text">{formatTimeRemaining(elapsedSeconds)}</strong>
            </span>
            <span>•</span>
            <span>
              TOTAL REMAINING: <strong className="text-theme-text">{formatTimeRemaining(estRemainingSeconds)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-black bg-[#00FF66] px-1 border border-black">{summary.completed} done</span>
            {summary.skipped > 0 && <span className="text-black bg-[#FFE600] px-1 border border-black">{summary.skipped} skipped</span>}
            {summary.failed > 0 && <span className="text-white bg-[#FF3366] px-1 border border-black">{summary.failed} failed</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

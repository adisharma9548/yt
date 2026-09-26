import React, { useState } from 'react';
import { AlertTriangle, FolderOpen, RotateCcw, Plus, Copy, Check, FileText } from 'lucide-react';
import type { QueueStatusResponse, QueueItemState } from '../services/types';
import { formatBytes, formatTimeRemaining } from '../services/utils';
import { api } from '../services/api';
import { ErrorModal } from '../components/ErrorModal';

interface CompletionPageProps {
  queueStatus: QueueStatusResponse;
  downloadFolder: string;
  elapsedSeconds: number;
  onRetryFailed: () => void;
  onReset: () => void;
}

export const CompletionPage: React.FC<CompletionPageProps> = ({
  queueStatus,
  downloadFolder,
  elapsedSeconds,
  onRetryFailed,
  onReset,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedFailedItem, setSelectedFailedItem] = useState<QueueItemState | null>(null);

  const summary = queueStatus.summary;
  const totalBytes = queueStatus.queue_items.reduce(
    (acc, item) => acc + (item.progress.bytes_downloaded || 0),
    0
  );

  const avgSpeed =
    elapsedSeconds > 0 && totalBytes > 0
      ? ((totalBytes / (1024 * 1024)) / elapsedSeconds).toFixed(1)
      : '0.0';

  const failedItems = queueStatus.queue_items.filter((i) => i.status === 'failed');

  const handleOpenFolder = async () => {
    try {
      await api.openFolder(downloadFolder);
    } catch {
      // Ignore
    }
  };

  const handleCopyReport = () => {
    const report = `
=========================================
      YOUTUBE DOWNLOAD COMPLETE REPORT
=========================================
Requested:    ${summary.total_requested} videos
Downloaded:   ${summary.completed} videos
Skipped:      ${summary.skipped} videos
Failed:       ${summary.failed} videos

Total Size:   ${formatBytes(totalBytes)}
Elapsed Time: ${formatTimeRemaining(elapsedSeconds)}
Avg Speed:    ${avgSpeed} MB/s
Destination:  ${downloadFolder}
=========================================
`;
    navigator.clipboard.writeText(report.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 font-mono">
      {/* Neo-Brutalist Completion Header Card */}
      <div className="bg-[#00FF66] text-black border-4 border-black shadow-brutal-lg p-8 mb-8 text-center relative overflow-hidden">
        <div className="inline-block bg-black text-white font-black text-xs px-3 py-1 mb-3 border border-black">
          SESSION COMPLETE
        </div>
        <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-2">
          DOWNLOAD BATCH FINISHED
        </h2>
        <p className="text-neutral-900 font-black text-sm max-w-lg mx-auto">
          All queue tasks have concluded. Files are saved in your chosen Windows folder.
        </p>
      </div>

      {/* Summary Matrix */}
      <div className="bg-theme-card border-4 border-black shadow-brutal p-6 mb-8 text-theme-text transition-colors duration-200">
        <h3 className="font-black text-lg text-theme-text uppercase tracking-wider mb-4 border-b border-theme-subtle pb-2 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#00FF66]" />
          EXECUTION SUMMARY
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-theme-surface p-4 border-2 border-black">
            <span className="text-theme-muted text-xs font-bold block mb-1">TOTAL REQUESTED</span>
            <span className="text-2xl font-black text-theme-text">{summary.total_requested}</span>
          </div>
          <div className="bg-theme-surface p-4 border-2 border-black">
            <span className="text-theme-muted text-xs font-bold block mb-1">DOWNLOADED</span>
            <span className="text-2xl font-black text-[#00FF66]">{summary.completed}</span>
          </div>
          <div className="bg-theme-surface p-4 border-2 border-black">
            <span className="text-theme-muted text-xs font-bold block mb-1">SKIPPED (EXISTED)</span>
            <span className="text-2xl font-black text-[#FFE600]">{summary.skipped}</span>
          </div>
          <div className="bg-theme-surface p-4 border-2 border-black">
            <span className="text-theme-muted text-xs font-bold block mb-1">FAILED</span>
            <span className="text-2xl font-black text-[#FF3366]">{summary.failed}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-theme-subtle text-xs text-theme-secondary font-bold">
          <div>
            TOTAL DATA: <strong className="text-theme-text">{formatBytes(totalBytes)}</strong>
          </div>
          <div>
            ELAPSED TIME: <strong className="text-theme-text">{formatTimeRemaining(elapsedSeconds)}</strong>
          </div>
          <div>
            AVERAGE SPEED: <strong className="text-theme-text">{avgSpeed} MB/s</strong>
          </div>
        </div>
      </div>

      {/* Failed Downloads Section */}
      {failedItems.length > 0 && (
        <div className="bg-theme-card border-3 border-[#FF3366] shadow-brutal p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#FF3366]" />
              <h4 className="font-black text-base text-theme-text uppercase">
                FAILED DOWNLOADS ({failedItems.length})
              </h4>
            </div>
            <button
              onClick={onRetryFailed}
              className="neo-btn neo-btn-green text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              RETRY ALL FAILED
            </button>
          </div>

          <div className="divide-y divide-theme-subtle text-xs">
            {failedItems.map((item) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div>
                  <span className="font-bold text-theme-text block">
                    #{item.playlist_index} — {item.title}
                  </span>
                  <span className="text-[#FF3366] text-[11px] block mt-0.5">
                    {item.error || 'Video stream could not be acquired.'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedFailedItem(item)}
                  className="neo-btn neo-btn-dark text-[10px] px-3 py-1"
                >
                  VIEW ERROR DETAILS
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-theme-card border-4 border-black shadow-brutal transition-colors duration-200">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleOpenFolder}
            className="neo-btn neo-btn-green text-sm px-5 py-3"
          >
            <FolderOpen className="w-4 h-4" />
            OPEN DOWNLOAD FOLDER
          </button>

          {failedItems.length > 0 && (
            <button
              onClick={onRetryFailed}
              className="neo-btn neo-btn-yellow text-sm px-5 py-3"
            >
              <RotateCcw className="w-4 h-4" />
              RETRY FAILED ({failedItems.length})
            </button>
          )}

          <button
            onClick={handleCopyReport}
            className="neo-btn neo-btn-white text-sm px-5 py-3"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'COPIED!' : 'COPY REPORT'}
          </button>
        </div>

        <button
          onClick={onReset}
          className="neo-btn neo-btn-dark text-sm px-5 py-3"
        >
          <Plus className="w-4 h-4 text-[#00FF66]" />
          NEW DOWNLOAD
        </button>
      </div>

      {/* Error Details Modal */}
      {selectedFailedItem && (
        <ErrorModal
          isOpen={!!selectedFailedItem}
          title={selectedFailedItem.title}
          errorType={selectedFailedItem.error_type || 'DownloadError'}
          message={selectedFailedItem.error || 'The download engine could not process this video.'}
          technicalDetails={selectedFailedItem.error_details || undefined}
          onClose={() => setSelectedFailedItem(null)}
          onRetry={() => {
            setSelectedFailedItem(null);
            onRetryFailed();
          }}
        />
      )}
    </div>
  );
};

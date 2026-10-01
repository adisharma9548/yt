import React, { useState } from 'react';
import { Pause, Play, SkipForward, XCircle, CheckCircle } from 'lucide-react';
import type { QueueStatusResponse, QueueItemState } from '../services/types';
import { ProgressBar } from '../components/ProgressBar';
import { QueueList } from '../components/QueueList';
import { ErrorModal } from '../components/ErrorModal';

interface DownloadPageProps {
  queueStatus: QueueStatusResponse;
  elapsedSeconds: number;
  onPause: () => void;
  onResume: () => void;
  onCancelCurrent: () => void;
  onCancelAll: () => void;
  onViewReport?: () => void;
}

export const DownloadPage: React.FC<DownloadPageProps> = ({
  queueStatus,
  elapsedSeconds,
  onPause,
  onResume,
  onCancelCurrent,
  onCancelAll,
  onViewReport,
}) => {
  const [selectedFailedItem, setSelectedFailedItem] = useState<QueueItemState | null>(null);
  const isPaused = queueStatus.overall_status === 'paused';
  const isComplete =
    queueStatus.overall_status === 'completed' ||
    queueStatus.overall_status === 'cancelled' ||
    (queueStatus.summary.total_requested > 0 &&
      queueStatus.summary.completed +
        queueStatus.summary.skipped +
        queueStatus.summary.failed +
        ((queueStatus.summary as { cancelled?: number }).cancelled ?? 0) >=
        queueStatus.summary.total_requested);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Action Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-theme-subtle">
        <div>
          <span className="font-mono text-xs bg-[#00FF66] text-black font-black px-2 py-0.5 border border-black uppercase">
            {isComplete ? 'FINISHED SESSION' : `ACTIVE SESSION: ${queueStatus.queue_id}`}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black font-mono text-theme-text mt-1">
            {isComplete ? 'DOWNLOAD BATCH COMPLETE' : 'DOWNLOAD QUEUE RUNNING'}
          </h2>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isComplete && onViewReport && (
            <button
              onClick={onViewReport}
              className="neo-btn neo-btn-green text-xs px-4 py-2 font-black flex items-center gap-1.5 shadow-brutal animate-bounce"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              VIEW COMPLETION REPORT →
            </button>
          )}

          {!isComplete && (
            <>
              {isPaused ? (
                <button
                  onClick={onResume}
                  className="neo-btn neo-btn-green text-xs px-4 py-2"
                >
                  <Play className="w-3.5 h-3.5 fill-black" />
                  RESUME QUEUE
                </button>
              ) : (
                <button
                  onClick={onPause}
                  className="neo-btn neo-btn-yellow text-xs px-4 py-2"
                >
                  <Pause className="w-3.5 h-3.5 fill-black" />
                  PAUSE QUEUE
                </button>
              )}

              <button
                onClick={onCancelCurrent}
                className="neo-btn neo-btn-white text-xs px-4 py-2"
              >
                <SkipForward className="w-3.5 h-3.5" />
                SKIP / CANCEL CURRENT
              </button>

              <button
                onClick={onCancelAll}
                className="neo-btn neo-btn-red text-xs px-4 py-2"
              >
                <XCircle className="w-3.5 h-3.5" />
                CANCEL ALL
              </button>
            </>
          )}
        </div>
      </div>

      {/* Two-Level Progress Indication */}
      <ProgressBar
        currentTitle={queueStatus.current_video_title}
        currentIndex={queueStatus.current_video_index}
        totalVideos={queueStatus.summary.total_requested}
        currentProgress={queueStatus.current_video_progress}
        summary={queueStatus.summary}
        overallStatus={queueStatus.overall_status}
        elapsedSeconds={elapsedSeconds}
      />

      {/* Full Queue Items Status Table */}
      <QueueList
        items={queueStatus.queue_items}
        onViewErrorDetails={(item) => setSelectedFailedItem(item)}
      />

      {/* Error Details Modal */}
      {selectedFailedItem && (
        <ErrorModal
          isOpen={!!selectedFailedItem}
          title={selectedFailedItem.title}
          errorType={selectedFailedItem.error_type || 'DownloadError'}
          message={selectedFailedItem.error || 'The download engine could not process this media stream.'}
          technicalDetails={selectedFailedItem.error_details || undefined}
          onClose={() => setSelectedFailedItem(null)}
        />
      )}
    </div>
  );
};

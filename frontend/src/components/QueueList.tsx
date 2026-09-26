import React from 'react';
import { CheckCircle2, Clock, XCircle, AlertTriangle, Play, Ban } from 'lucide-react';
import type { QueueItemState } from '../services/types';

interface QueueListProps {
  items: QueueItemState[];
  onViewErrorDetails?: (item: QueueItemState) => void;
}

export const QueueList: React.FC<QueueListProps> = ({ items, onViewErrorDetails }) => {
  const getStatusBadge = (item: QueueItemState) => {
    switch (item.status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-black bg-[#00FF66] px-1.5 py-0.5 border border-black font-black">
            <CheckCircle2 className="w-3.5 h-3.5" />
            COMPLETED
          </span>
        );
      case 'downloading':
        return (
          <span className="flex items-center gap-1 text-black bg-[#00FF66] px-1.5 py-0.5 border border-black font-black animate-pulse">
            <Play className="w-3 h-3 fill-black" />
            DOWNLOADING ({item.progress.percentage || 0}%)
          </span>
        );
      case 'skipped':
        return (
          <span className="flex items-center gap-1 text-black bg-[#FFE600] px-1.5 py-0.5 border border-black font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            SKIPPED
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-white bg-[#FF3366] px-1.5 py-0.5 border border-black font-bold">
            <XCircle className="w-3.5 h-3.5" />
            FAILED
          </span>
        );
      case 'cancelled':
        return (
          <span className="flex items-center gap-1 text-theme-muted font-bold">
            <Ban className="w-3.5 h-3.5" />
            CANCELLED
          </span>
        );
      case 'waiting':
      default:
        return (
          <span className="flex items-center gap-1 text-theme-muted font-bold">
            <Clock className="w-3.5 h-3.5" />
            WAITING
          </span>
        );
    }
  };

  return (
    <div className="bg-theme-card border-3 border-black shadow-brutal p-4 mt-6 transition-colors duration-200">
      <h5 className="font-mono font-black text-sm text-theme-text uppercase tracking-wider mb-3 flex items-center justify-between">
        <span>QUEUE ITEMS ({items.length})</span>
        <span className="text-xs text-theme-muted font-normal">CHRONOLOGICAL ORDER</span>
      </h5>

      <div className="divide-y divide-theme-subtle max-h-80 overflow-y-auto font-mono text-xs">
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            className={`py-2.5 px-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-colors ${
              item.status === 'downloading'
                ? 'bg-[#00FF66]/20 border-l-3 border-[#00FF66]'
                : 'hover:bg-theme-tableHover'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="text-theme-muted font-bold w-6">
                #{item.playlist_index.toString().padStart(2, '0')}
              </span>
              <div className="truncate">
                <span className="font-bold text-theme-text block truncate" title={item.title}>
                  {item.title}
                </span>
                <span className="text-[11px] text-theme-secondary">
                  {item.filename || `${item.title}.mp4`} • {item.quality}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
              {getStatusBadge(item)}
              {item.status === 'failed' && onViewErrorDetails && (
                <button
                  onClick={() => onViewErrorDetails(item)}
                  className="text-[11px] text-[#FF3366] hover:underline uppercase font-bold"
                >
                  [DETAILS]
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

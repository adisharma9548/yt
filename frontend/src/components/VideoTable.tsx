import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ExternalLink, Film } from 'lucide-react';
import type { VideoItem } from '../services/types';

interface VideoTableProps {
  videos: VideoItem[];
  selectedIndices: number[];
  onToggleVideo: (index: number) => void;
  onToggleAll: () => void;
  selectedQuality: string;
}

export const VideoTable: React.FC<VideoTableProps> = ({
  videos,
  selectedIndices,
  onToggleVideo,
  onToggleAll,
  selectedQuality,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const selectedSet = new Set(selectedIndices);
  const allSelected = videos.length > 0 && selectedIndices.length === videos.length;

  const rowVirtualizer = useVirtualizer({
    count: videos.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  return (
    <div className="border-3 border-black bg-theme-card shadow-brutal overflow-hidden transition-colors duration-200">
      {/* Table Header */}
      <div className="bg-theme-tableHeader text-theme-text font-mono text-xs uppercase tracking-wider border-b-3 border-black sticky top-0 z-20 grid grid-cols-12 gap-2 px-4 py-3 font-black select-none items-center">
        <div className="col-span-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            className="w-4 h-4 accent-[#00FF66] cursor-pointer"
          />
          <span>#</span>
        </div>
        <div className="col-span-5 flex items-center gap-1.5">
          <Film className="w-3.5 h-3.5 text-black bg-[#00FF66] p-0.5 border border-black" />
          <span>TITLE</span>
        </div>
        <div className="col-span-1 text-center">DURATION</div>
        <div className="col-span-2">UPLOADER</div>
        <div className="col-span-2">QUALITIES</div>
        <div className="col-span-1 text-right">EST. SIZE</div>
      </div>

      {/* Virtualized Container */}
      <div
        ref={parentRef}
        className="overflow-y-auto max-h-[520px] divide-y divide-theme-subtle"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const video = videos[virtualRow.index];
            const isSelected = selectedSet.has(video.index);

            // Compute estimated size for this video under current selected quality
            const sizeMb =
              video.quality_sizes?.[selectedQuality] ||
              (selectedQuality === 'Best Available' ? video.quality_sizes?.['best'] : undefined) ||
              video.quality_sizes?.['1080p'] ||
              video.quality_sizes?.['720p'] ||
              video.estimated_size_mb ||
              25;

            return (
              <div
                key={video.video_id || video.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className={`grid grid-cols-12 gap-2 px-4 py-2.5 items-center font-mono text-xs transition-colors select-none ${
                  isSelected
                    ? 'bg-[#00FF66]/20 text-theme-text border-l-4 border-l-[#00FF66] font-bold'
                    : 'bg-theme-card text-theme-text hover:bg-theme-tableHover border-l-4 border-l-transparent'
                }`}
              >
                {/* Index & Select */}
                <div className="col-span-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleVideo(video.index)}
                    className="w-4 h-4 accent-[#00FF66] cursor-pointer"
                  />
                  <span className="text-theme-muted font-bold">
                    {video.index.toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Title & Thumbnail */}
                <div className="col-span-5 flex items-center gap-3 overflow-hidden">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-12 h-7 object-cover border border-black flex-shrink-0 bg-black"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-12 h-7 bg-theme-surface border border-black flex-shrink-0 flex items-center justify-center text-theme-muted text-[10px] font-bold">
                      YT
                    </div>
                  )}
                  <div className="truncate flex-1">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold hover:text-[#00FF66] hover:underline flex items-center gap-1 truncate"
                      title={video.title}
                    >
                      <span className="truncate">{video.title}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0 text-theme-muted" />
                    </a>
                  </div>
                </div>

                {/* Duration */}
                <div className="col-span-1 text-center text-theme-secondary font-bold">
                  {video.duration_formatted}
                </div>

                {/* Uploader */}
                <div className="col-span-2 truncate text-theme-secondary" title={video.uploader}>
                  {video.uploader}
                </div>

                {/* Qualities */}
                <div className="col-span-2 flex flex-wrap gap-1 overflow-hidden">
                  {video.available_qualities.slice(0, 3).map((q) => (
                    <span
                      key={q}
                      className={`px-1.5 py-0.5 border text-[10px] font-bold ${
                        q === selectedQuality
                          ? 'bg-[#00FF66] text-black border-black font-black'
                          : 'bg-theme-surface text-theme-text border-black'
                      }`}
                    >
                      {q}
                    </span>
                  ))}
                  {video.available_qualities.length > 3 && (
                    <span className="text-[10px] text-theme-muted self-center">
                      +{video.available_qualities.length - 3}
                    </span>
                  )}
                </div>

                {/* Est. Size */}
                <div className="col-span-1 text-right font-black text-black bg-[#00FF66] px-1 border border-black">
                  ~{sizeMb}MB
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

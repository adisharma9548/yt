import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { AnalyzeResponse } from '../services/types';
import { SelectionControls } from '../components/SelectionControls';
import { VideoTable } from '../components/VideoTable';

interface VideoListPageProps {
  metadata: AnalyzeResponse;
  selectedIndices: number[];
  onSelectionChange: (indices: number[]) => void;
  onProceed: () => void;
  onBack: () => void;
  selectedQuality: string;
}

export const VideoListPage: React.FC<VideoListPageProps> = ({
  metadata,
  selectedIndices,
  onSelectionChange,
  onProceed,
  onBack,
  selectedQuality,
}) => {
  const handleToggleVideo = (index: number) => {
    if (selectedIndices.includes(index)) {
      onSelectionChange(selectedIndices.filter((i) => i !== index));
    } else {
      onSelectionChange([...selectedIndices, index].sort((a, b) => a - b));
    }
  };

  const handleToggleAll = () => {
    if (selectedIndices.length === metadata.videos.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(metadata.videos.map((v) => v.index));
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b-2 border-theme-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs bg-[#00FF66] text-black font-black px-2 py-0.5 border border-black uppercase">
              {metadata.type === 'playlist' ? 'PLAYLIST DISCOVERED' : 'SINGLE VIDEO'}
            </span>
            <span className="font-mono text-xs text-theme-muted font-bold">
              {metadata.video_count} VIDEO(S) FOUND
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black font-mono text-theme-text truncate max-w-3xl">
            {metadata.playlist_title || 'Parsed Media'}
          </h2>
          <p className="font-mono text-xs text-theme-secondary">
            Channel / Uploader: <span className="font-bold text-theme-text">{metadata.playlist_uploader || 'Unknown'}</span>
          </p>
        </div>

        {/* Back & Forward Header Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <button onClick={onBack} className="neo-btn neo-btn-dark text-xs">
            <ArrowLeft className="w-3.5 h-3.5" />
            NEW URL
          </button>
          <button
            onClick={onProceed}
            disabled={selectedIndices.length === 0}
            className={`neo-btn text-xs ${
              selectedIndices.length > 0
                ? 'neo-btn-green'
                : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
            }`}
          >
            <span>CONFIGURE ({selectedIndices.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Selection Expression & Action Controls */}
      <SelectionControls
        totalVideos={metadata.videos.length}
        selectedIndices={selectedIndices}
        onSelectionChange={onSelectionChange}
      />

      {/* Virtualized Video Table */}
      <VideoTable
        videos={metadata.videos}
        selectedIndices={selectedIndices}
        onToggleVideo={handleToggleVideo}
        onToggleAll={handleToggleAll}
        selectedQuality={selectedQuality}
      />

      {/* Bottom Sticky Action Footer */}
      <div className="mt-6 flex items-center justify-between p-4 bg-theme-card border-3 border-black shadow-brutal transition-colors duration-200">
        <div className="font-mono text-xs text-theme-secondary">
          Selected <strong className="text-black bg-[#00FF66] px-1.5 py-0.5 border border-black font-bold">{selectedIndices.length}</strong> of{' '}
          <strong className="text-theme-text">{metadata.videos.length}</strong> videos ready for queue.
        </div>
        <button
          onClick={onProceed}
          disabled={selectedIndices.length === 0}
          className={`neo-btn text-sm ${
            selectedIndices.length > 0
              ? 'neo-btn-green'
              : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
          }`}
        >
          <span>PROCEED TO QUALITY & STORAGE</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

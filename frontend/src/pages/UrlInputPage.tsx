import React, { useState } from 'react';
import { ArrowRight, Video, AlertCircle, Loader2 } from 'lucide-react';

interface UrlInputPageProps {
  onAnalyze: (url: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const UrlInputPage: React.FC<UrlInputPageProps> = ({
  onAnalyze,
  isLoading,
  error,
}) => {
  const [url, setUrl] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setLocalError('Please enter a YouTube video or playlist URL.');
      return;
    }

    // Client-side domain check
    const isYt = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/i.test(trimmed);
    if (!isYt) {
      setLocalError('URL must belong to youtube.com or youtu.be domain.');
      return;
    }

    onAnalyze(trimmed);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* Neo-Brutalist Hero Header */}
      <div className="relative mb-10">
        <div className="inline-block bg-[#00FF66] text-black font-mono font-black text-xs px-3 py-1 border-2 border-black shadow-brutal-sm mb-4 uppercase">
          RAW EXTRACTION ENGINE
        </div>
        <h2 className="text-4xl sm:text-6xl font-black font-mono tracking-tight leading-none text-theme-text uppercase mb-4">
          DOWNLOAD PUBLIC <br />
          <span className="text-[#00FF66] bg-black px-2 border-3 border-black inline-block shadow-brutal mt-1">
            YOUTUBE CONTENT
          </span>
        </h2>
        <p className="text-theme-secondary font-mono text-sm max-w-xl">
          High-performance batch downloading for videos and playlists with zero rate-limiting hiccups,
          lossless FFmpeg audio remuxing, and deterministic local storage.
        </p>
      </div>

      {/* Primary Input Card */}
      <div className="bg-theme-card border-4 border-black shadow-brutal-lg p-6 sm:p-8 mb-8 relative transition-colors duration-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block font-mono text-xs font-bold text-theme-text uppercase tracking-wider">
            ENTER YOUTUBE PLAYLIST OR VIDEO URL
          </label>

          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setLocalError(null);
                }}
                placeholder="https://www.youtube.com/playlist?list=... or watch?v=..."
                className="w-full neo-input text-base sm:text-lg font-mono py-3.5 pl-4 pr-10"
                disabled={isLoading}
                autoFocus
              />
              <Video className="w-5 h-5 text-theme-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="neo-btn neo-btn-green text-sm sm:text-base px-6 py-3.5 flex-shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>ANALYZING...</span>
                </>
              ) : (
                <>
                  <span>ANALYZE</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Validation Feedback */}
          {(localError || error) && (
            <div className="bg-[#FF3366] text-black border-2 border-black p-3 font-mono text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{localError || error}</span>
            </div>
          )}
        </form>

        {/* Feature Badges */}
        <div className="mt-8 pt-6 border-t border-theme-subtle grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs text-theme-secondary">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#00FF66] border border-black" />
            <span className="font-bold">PLAYLIST AUTO-PARSING</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#00FF66] border border-black" />
            <span className="font-bold">UP TO 4K / 1080P FHD</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#00FF66] border border-black" />
            <span className="font-bold">FFMPEG AAC REMUXING</span>
          </div>
        </div>
      </div>
    </div>
  );
};

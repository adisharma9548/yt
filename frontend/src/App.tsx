import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { UrlInputPage } from './pages/UrlInputPage';
import { VideoListPage } from './pages/VideoListPage';
import { QualitySelectPage } from './pages/QualitySelectPage';
import { DownloadPage } from './pages/DownloadPage';
import { CompletionPage } from './pages/CompletionPage';
import { useWebSocket } from './hooks/useWebSocket';
import type { WebSocketMessage } from './hooks/useWebSocket';
import { api } from './services/api';
import type {
  AnalyzeResponse,
  HealthResponse,
  QueueStatusResponse,
} from './services/types';
import { generateFilenamePreview } from './services/utils';

export const App: React.FC = () => {
  // Theme State: 'dark' (default) or 'light' (off-white brutalist)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('yt_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('yt_theme', next);
      return next;
    });
  };

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  // Wizard Step: 1 = URL, 2 = List, 3 = Config, 4 = Download, 5 = Complete
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  // Analysis & Video Data
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AnalyzeResponse | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // Configuration Settings
  const [selectedQuality, setSelectedQuality] = useState<string>('Best Available');
  const [downloadFolder, setDownloadFolder] = useState<string>('');
  const [freeSpaceMb, setFreeSpaceMb] = useState<number>(500000);
  const [namingMode, setNamingMode] = useState<'index_title' | 'title_only' | 'index_only' | 'custom'>('index_title');
  const [customTemplate, setCustomTemplate] = useState<string>('%(playlist_index)03d - %(title)s.%(ext)s');
  const [filePolicy, setFilePolicy] = useState<'skip' | 'overwrite' | 'ask'>('skip');

  // Active Queue State
  const [queueStatus, setQueueStatus] = useState<QueueStatusResponse>({
    queue_id: '',
    overall_status: 'idle',
    current_video_index: 0,
    current_video_id: '',
    current_video_title: '',
    current_video_progress: {
      percentage: 0,
      bytes_downloaded: 0,
      total_bytes: 0,
      speed_mbps: 0,
      eta_seconds: 0,
    },
    queue_items: [],
    summary: {
      total_requested: 0,
      completed: 0,
      downloading: 0,
      waiting: 0,
      failed: 0,
      skipped: 0,
      cancelled: 0,
    },
  });

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerRef = useRef<number | undefined>(undefined);

  // Initial Health Check & Default Folder
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const h = await api.getHealth();
        setHealth(h);
        if (h.default_download_dir) {
          setDownloadFolder(h.default_download_dir);
        }
        if (typeof h.free_space_mb === 'number') {
          setFreeSpaceMb(h.free_space_mb);
        }
      } catch (err) {
        console.error('Backend health check error:', err);
      }
    };
    fetchHealth();
  }, []);

  // Real-time WebSocket Progress Listener
  const handleWebSocketMessage = useCallback((msg: WebSocketMessage) => {
    if (msg.event_type === 'progress_update') {
      setQueueStatus((prev) => {
        const updated = { ...prev };
        if ((msg as any).overall_status) {
          updated.overall_status = (msg as any).overall_status;
        }
        if ((msg as any).queue_items) {
          updated.queue_items = (msg as any).queue_items;
        }
        if (msg.current_video) {
          updated.current_video_index = msg.current_video.index;
          updated.current_video_id = msg.current_video.video_id;
          updated.current_video_title = msg.current_video.title;
          updated.current_video_progress = {
            percentage: msg.current_video.percentage,
            bytes_downloaded: msg.current_video.bytes_downloaded,
            total_bytes: msg.current_video.total_bytes,
            speed_mbps: msg.current_video.speed_mbps,
            eta_seconds: msg.current_video.eta_seconds,
          };
        }
        if (msg.queue_summary) {
          updated.summary = msg.queue_summary;
        }
        return updated;
      });

      if ((msg as any).overall_status === 'completed' || (msg as any).overall_status === 'cancelled') {
        api.getDownloadStatus().then((status) => {
          setQueueStatus(status);
          setCurrentStep(5);
        });
      }
    } else if (msg.event_type === 'download_complete') {
      // Sync final status and jump to completion page
      api.getDownloadStatus().then((status) => {
        setQueueStatus(status);
        setCurrentStep(5);
      });
    }
  }, []);

  useWebSocket(handleWebSocketMessage);

  // Polling fallback during download step
  useEffect(() => {
    if (currentStep === 4) {
      let pollInFlight = false;
      let disposed = false;
      const pollInterval = window.setInterval(async () => {
        if (pollInFlight || disposed) return;
        pollInFlight = true;
        try {
          const status = await api.getDownloadStatus();
          if (disposed) return;
          setQueueStatus(status);
          const allItemsFinished =
            status.queue_items.length > 0 &&
            status.queue_items.every((i) =>
              ['completed', 'skipped', 'failed', 'cancelled'].includes(i.status)
            );
          if (
            status.overall_status === 'completed' ||
            status.overall_status === 'cancelled' ||
            allItemsFinished
          ) {
            setCurrentStep(5);
          }
        } catch {
          // Ignore transient errors; WebSocket remains the primary update channel.
        } finally {
          pollInFlight = false;
        }
      }, 1000);

      // Elapsed timer
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      return () => {
        disposed = true;
        clearInterval(pollInterval);
        clearInterval(timerRef.current);
      };
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [currentStep]);

  // Actions
  const handleAnalyzeUrl = async (url: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await api.analyzeUrl(url);
      setMetadata(res);
      // Default to selecting all videos
      setSelectedIndices(res.videos.map((v) => v.index));
      setCurrentStep(2);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail?.message ||
        err.response?.data?.message ||
        'Unable to extract YouTube information. Ensure URL is public and valid.';
      setAnalysisError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartDownload = async () => {
    if (!metadata || selectedIndices.length === 0) return;

    const selectedVideos = metadata.videos.filter((v) => selectedIndices.includes(v.index));

    const requestVideos = selectedVideos.map((v) => {
      const filename = generateFilenamePreview(v.title, v.index, namingMode, customTemplate);
      return {
        video_id: v.video_id,
        index: v.index,
        quality: selectedQuality,
        filename,
        title: v.title,
        url: v.url,
      };
    });

    try {
      setElapsedSeconds(0);
      await api.startDownload({
        videos: requestVideos,
        download_folder: downloadFolder,
        existing_file_policy: filePolicy,
      });

      // Initialize queue state
      const initialStatus = await api.getDownloadStatus();
      setQueueStatus(initialStatus);
      setCurrentStep(4);
    } catch (err: any) {
      const msg = err.response?.data?.detail?.message || 'Failed to start download queue.';
      alert(msg);
    }
  };

  const handlePause = async () => {
    if (queueStatus.queue_id) {
      await api.pauseDownload(queueStatus.queue_id);
      const updated = await api.getDownloadStatus();
      setQueueStatus(updated);
    }
  };

  const handleResume = async () => {
    if (queueStatus.queue_id) {
      await api.resumeDownload(queueStatus.queue_id);
      const updated = await api.getDownloadStatus();
      setQueueStatus(updated);
    }
  };

  const handleCancelCurrent = async () => {
    if (queueStatus.queue_id) {
      await api.cancelCurrent(queueStatus.queue_id);
      const updated = await api.getDownloadStatus();
      setQueueStatus(updated);
    }
  };

  const handleCancelAll = async () => {
    if (window.confirm('Are you sure you want to cancel the entire queue?')) {
      if (queueStatus.queue_id) {
        await api.cancelAll(queueStatus.queue_id);
        const updated = await api.getDownloadStatus();
        setQueueStatus(updated);
        setCurrentStep(5);
      }
    }
  };

  const handleRetryFailed = async () => {
    if (queueStatus.queue_id) {
      await api.retryFailed(queueStatus.queue_id);
      const updated = await api.getDownloadStatus();
      setQueueStatus(updated);
      setCurrentStep(4);
    }
  };

  const handleReset = () => {
    setMetadata(null);
    setSelectedIndices([]);
    setQueueStatus({
      queue_id: '',
      overall_status: 'idle',
      current_video_index: 0,
      current_video_id: '',
      current_video_title: '',
      current_video_progress: {
        percentage: 0,
        bytes_downloaded: 0,
        total_bytes: 0,
        speed_mbps: 0,
        eta_seconds: 0,
      },
      queue_items: [],
      summary: {
        total_requested: 0,
        completed: 0,
        downloading: 0,
        waiting: 0,
        failed: 0,
        skipped: 0,
        cancelled: 0,
      },
    });
    setElapsedSeconds(0);
    setCurrentStep(1);
  };

  // Calculate total estimated MB for selected videos
  const totalEstimatedMb = (metadata?.videos || [])
    .filter((v) => selectedIndices.includes(v.index))
    .reduce((acc, v) => {
      const size =
        v.quality_sizes?.[selectedQuality] ||
        (selectedQuality === 'Best Available' ? v.quality_sizes?.['best'] : undefined) ||
        v.quality_sizes?.['1080p'] ||
        v.quality_sizes?.['720p'] ||
        v.estimated_size_mb ||
        25;
      return acc + size;
    }, 0);

  return (
    <div className={`min-h-screen bg-theme-bg text-theme-text flex flex-col selection:bg-[#00FF66] selection:text-black ${theme === 'light' ? 'light-theme' : ''}`}>
      <Navbar
        health={health}
        currentStep={currentStep}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1">
        {currentStep === 1 && (
          <UrlInputPage
            onAnalyze={handleAnalyzeUrl}
            isLoading={isAnalyzing}
            error={analysisError}
          />
        )}

        {currentStep === 2 && metadata && (
          <VideoListPage
            metadata={metadata}
            selectedIndices={selectedIndices}
            onSelectionChange={setSelectedIndices}
            onProceed={() => setCurrentStep(3)}
            onBack={() => setCurrentStep(1)}
            selectedQuality={selectedQuality}
          />
        )}

        {currentStep === 3 && metadata && (
          <QualitySelectPage
            selectedQuality={selectedQuality}
            onSelectQuality={setSelectedQuality}
            selectedCount={selectedIndices.length}
            totalEstimatedMb={totalEstimatedMb}
            downloadFolder={downloadFolder}
            onFolderChange={setDownloadFolder}
            freeSpaceMb={freeSpaceMb}
            onFreeSpaceChange={setFreeSpaceMb}
            namingMode={namingMode}
            onNamingModeChange={setNamingMode}
            customTemplate={customTemplate}
            onCustomTemplateChange={setCustomTemplate}
            filePolicy={filePolicy}
            onFilePolicyChange={setFilePolicy}
            onStartDownload={handleStartDownload}
            onBack={() => setCurrentStep(2)}
            sampleVideoTitle={metadata.videos[0]?.title || ''}
          />
        )}

        {currentStep === 4 && (
          <DownloadPage
            queueStatus={queueStatus}
            elapsedSeconds={elapsedSeconds}
            onPause={handlePause}
            onResume={handleResume}
            onCancelCurrent={handleCancelCurrent}
            onCancelAll={handleCancelAll}
            onViewReport={() => setCurrentStep(5)}
          />
        )}

        {currentStep === 5 && (
          <CompletionPage
            queueStatus={queueStatus}
            downloadFolder={downloadFolder}
            elapsedSeconds={elapsedSeconds}
            onRetryFailed={handleRetryFailed}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-black bg-theme-navbarBg py-4 text-center font-mono text-xs text-theme-muted transition-colors duration-200">
        <div>YT RIPPER PRO // WINDOWS NATIVE PYTHON ENGINE // FFMPEG MERGED</div>
      </footer>
    </div>
  );
};

export default App;

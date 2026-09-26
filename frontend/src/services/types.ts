export interface VideoItem {
  index: number;
  video_id: string;
  title: string;
  duration_seconds: number;
  duration_formatted: string;
  uploader: string;
  available_qualities: string[];
  quality_sizes: Record<string, number>;
  estimated_size_mb: number;
  thumbnail_url: string;
  url: string;
}

export interface AnalyzeResponse {
  success: boolean;
  type: 'video' | 'playlist';
  playlist_id?: string | null;
  playlist_title?: string | null;
  playlist_uploader?: string | null;
  video_count: number;
  videos: VideoItem[];
  error?: string;
  message?: string;
}

export interface DownloadVideoRequest {
  video_id: string;
  index: number;
  quality: string;
  filename: string;
  title?: string;
  url?: string;
}

export interface StartDownloadRequest {
  videos: DownloadVideoRequest[];
  download_folder: string;
  existing_file_policy: 'skip' | 'overwrite' | 'ask';
}

export interface StartDownloadResponse {
  queue_id: string;
  status: string;
  total_videos: number;
  estimated_total_size_mb: number;
}

export interface QueueProgress {
  percentage: number;
  bytes_downloaded: number;
  total_bytes: number;
  speed_mbps: number;
  eta_seconds: number;
}

export interface QueueItemState {
  id: string;
  playlist_index: number;
  video_id: string;
  title: string;
  url: string;
  status: 'waiting' | 'downloading' | 'completed' | 'failed' | 'skipped' | 'cancelled' | 'paused';
  quality: string;
  filename: string;
  progress: QueueProgress;
  error?: string | null;
  error_type?: string | null;
  error_details?: string | null;
}

export interface QueueSummary {
  total_requested: number;
  completed: number;
  downloading: number;
  waiting: number;
  failed: number;
  skipped: number;
  cancelled: number;
}

export interface QueueStatusResponse {
  queue_id: string;
  overall_status: 'idle' | 'downloading' | 'paused' | 'completed' | 'cancelled';
  current_video_index: number;
  current_video_id: string;
  current_video_title: string;
  current_video_progress: QueueProgress;
  queue_items: QueueItemState[];
  summary: QueueSummary;
}

export interface FolderSelectResponse {
  folder: string;
  exists: boolean;
  writable: boolean;
  free_space_mb: number;
}

export interface HealthResponse {
  status: string;
  ffmpeg_installed: boolean;
  ffmpeg_version: string;
  version: string;
}

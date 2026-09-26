import axios from 'axios';
import type {
  AnalyzeResponse,
  StartDownloadRequest,
  StartDownloadResponse,
  QueueStatusResponse,
  FolderSelectResponse,
  HealthResponse,
} from './types';

const API_BASE = '/api';

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const res = await axios.get<HealthResponse>(`${API_BASE}/health`);
    return res.data;
  },

  async analyzeUrl(url: string): Promise<AnalyzeResponse> {
    const res = await axios.post<AnalyzeResponse>(`${API_BASE}/analyze`, { url });
    return res.data;
  },

  async startDownload(payload: StartDownloadRequest): Promise<StartDownloadResponse> {
    const res = await axios.post<StartDownloadResponse>(`${API_BASE}/download/start`, payload);
    return res.data;
  },

  async getDownloadStatus(): Promise<QueueStatusResponse> {
    const res = await axios.get<QueueStatusResponse>(`${API_BASE}/download/status`);
    return res.data;
  },

  async pauseDownload(queue_id: string): Promise<{ status: string; message: string }> {
    const res = await axios.post(`${API_BASE}/download/pause`, { queue_id });
    return res.data;
  },

  async resumeDownload(queue_id: string): Promise<{ status: string; message: string }> {
    const res = await axios.post(`${API_BASE}/download/resume`, { queue_id });
    return res.data;
  },

  async cancelCurrent(queue_id: string): Promise<{ status: string; cancelled_item: string; next_item: string }> {
    const res = await axios.post(`${API_BASE}/download/cancel`, { queue_id, scope: 'current' });
    return res.data;
  },

  async cancelAll(queue_id: string): Promise<{ status: string; total_cancelled: number }> {
    const res = await axios.post(`${API_BASE}/download/cancel-all`, { queue_id, scope: 'all' });
    return res.data;
  },

  async retryFailed(queue_id: string): Promise<{ status: string; retry_count: number; new_queue_id: string }> {
    const res = await axios.post(`${API_BASE}/download/retry-failed`, { queue_id });
    return res.data;
  },

  async selectFolder(title?: string, initial_folder?: string): Promise<FolderSelectResponse> {
    const res = await axios.post<FolderSelectResponse>(`${API_BASE}/folder-select`, { title, initial_folder });
    return res.data;
  },

  async validateFolder(folder: string): Promise<FolderSelectResponse> {
    const res = await axios.post<FolderSelectResponse>(`${API_BASE}/folder-validate`, { folder });
    return res.data;
  },

  async openFolder(folder: string): Promise<{ success: boolean; folder: string }> {
    const res = await axios.post(`${API_BASE}/folder-open`, { folder });
    return res.data;
  },
};

import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  event_type: 'progress_update' | 'download_complete';
  current_video?: {
    index: number;
    video_id: string;
    title: string;
    status: string;
    percentage: number;
    bytes_downloaded: number;
    total_bytes: number;
    speed_mbps: number;
    eta_seconds: number;
  };
  queue_summary?: {
    total_requested: number;
    completed: number;
    downloading: number;
    waiting: number;
    failed: number;
    skipped: number;
    cancelled: number;
  };
  summary?: {
    total_requested: number;
    completed: number;
    skipped: number;
    failed: number;
    total_bytes_downloaded: number;
    elapsed_seconds: number;
  };
  failed_items?: Array<{
    index: number;
    video_id: string;
    title: string;
    error: string;
    message: string;
  }>;
}

export function useWebSocket(onMessageReceived?: (msg: WebSocketMessage) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.port === '5173' ? '127.0.0.1:8000' : window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (onMessageReceived) {
            onMessageReceived(parsed);
          }
        } catch {
          // Non-JSON message (e.g. pong)
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt reconnect after 3 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      setIsConnected(false);
    }
  }, [onMessageReceived]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendPing = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send('ping');
    }
  }, []);

  return { isConnected, sendPing };
}

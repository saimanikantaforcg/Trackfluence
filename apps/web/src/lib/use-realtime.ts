'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type RealtimeEventType =
  | 'ATTRIBUTION_CREATED'
  | 'PAYOUT_UPDATED'
  | 'NOTIFICATION'
  | 'CAMPAIGN_UPDATE';

type Handler = (payload: Record<string, unknown>) => void;

interface UseRealtimeOptions {
  onEvent?: Partial<Record<RealtimeEventType, Handler>>;
  enabled?: boolean;
}

/**
 * Connects to the /realtime Socket.io namespace and registers event handlers.
 * Automatically disconnects on unmount. Auth token read from localStorage.
 */
export function useRealtime({ onEvent, enabled = true }: UseRealtimeOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(onEvent);
  handlersRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('tf_token') : null;
    if (!token) return;

    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

    const socket = io(`${base}/realtime`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    const events: RealtimeEventType[] = [
      'ATTRIBUTION_CREATED',
      'PAYOUT_UPDATED',
      'NOTIFICATION',
      'CAMPAIGN_UPDATE',
    ];

    for (const evt of events) {
      socket.on(evt, (payload: Record<string, unknown>) => {
        handlersRef.current?.[evt]?.(payload);
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  const emit = useCallback((event: string, data?: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit };
}

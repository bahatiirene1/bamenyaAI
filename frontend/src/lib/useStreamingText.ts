'use client';

import { useRef, useCallback } from 'react';

interface StreamingOptions {
  /** Delay between each character in ms (default: 20) */
  charDelay?: number;
  /** Batch size - characters to add per tick (default: 1) */
  batchSize?: number;
}

/**
 * Hook for smooth, throttled text streaming
 * Buffers incoming chunks and renders them character-by-character
 */
export function useStreamingText(options: StreamingOptions = {}) {
  const { charDelay = 20, batchSize = 1 } = options;

  const bufferRef = useRef<string>('');
  const displayedRef = useRef<string>('');
  const isStreamingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const startStreaming = useCallback((onUpdate: (text: string) => void) => {
    isStreamingRef.current = true;
    displayedRef.current = '';
    bufferRef.current = '';
    lastUpdateRef.current = performance.now();

    const tick = (timestamp: number) => {
      if (!isStreamingRef.current && bufferRef.current.length === displayedRef.current.length) {
        // Streaming ended and buffer is fully displayed
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return;
      }

      const elapsed = timestamp - lastUpdateRef.current;

      // Only update if enough time has passed
      if (elapsed >= charDelay && displayedRef.current.length < bufferRef.current.length) {
        // Add characters from buffer
        const charsToAdd = Math.min(
          batchSize,
          bufferRef.current.length - displayedRef.current.length
        );
        displayedRef.current = bufferRef.current.slice(0, displayedRef.current.length + charsToAdd);
        lastUpdateRef.current = timestamp;
        onUpdate(displayedRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [charDelay, batchSize]);

  const addToBuffer = useCallback((chunk: string) => {
    bufferRef.current += chunk;
  }, []);

  const stopStreaming = useCallback(() => {
    isStreamingRef.current = false;
  }, []);

  const getBufferedContent = useCallback(() => {
    return bufferRef.current;
  }, []);

  const cleanup = useCallback(() => {
    isStreamingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  return {
    startStreaming,
    addToBuffer,
    stopStreaming,
    getBufferedContent,
    cleanup,
  };
}

'use client';
import { useState, useEffect, useRef } from 'react';

export interface CameraPermissionState {
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
  stream: MediaStream | undefined; // Thay đổi từ null thành undefined
  error: string | null;
  isSupported: boolean;
}

export function useCameraPermission() {
  const [state, setState] = useState<CameraPermissionState>({
    status: 'idle',
    stream: undefined, // Thay đổi từ null thành undefined
    error: null,
    isSupported: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
  });

  const streamRef = useRef<MediaStream | undefined>(undefined);

  const requestPermission = async () => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Camera not supported in this browser'
      }));
      return;
    }

    setState(prev => ({ ...prev, status: 'requesting', error: null }));

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      setState(prev => ({
        ...prev,
        status: 'granted',
        stream: stream
      }));

    } catch (error) {
      console.error('Camera permission error:', error);
      let errorMessage = 'Failed to access camera';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is being used by another application';
        }
      }

      setState(prev => ({
        ...prev,
        status: 'denied',
        error: errorMessage
      }));
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = undefined;
    }
    setState(prev => ({
      ...prev,
      stream: undefined,
      status: 'idle'
    }));
  };

  const resetPermission = () => {
    cleanup();
  };

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    ...state,
    requestPermission,
    resetPermission,
    cleanup
  };
}

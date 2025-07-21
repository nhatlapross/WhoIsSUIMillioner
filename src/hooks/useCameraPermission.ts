
'use client';
import { useState, useEffect, useRef } from 'react';

export interface CameraPermissionState {
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
  stream: MediaStream | undefined; // Change from null to undefined
  error: string | null;
  isSupported: boolean;
}

export function useCameraPermission() {
  const [state, setState] = useState<CameraPermissionState>({
    status: 'idle',
    stream: undefined, // Change from null to undefined
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
      // Mobile-optimized camera constraints
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const constraints = {
        video: {
          width: { ideal: isMobile ? 854 : 1280 },
          height: { ideal: isMobile ? 480 : 720 },
          facingMode: 'user',
          // Mobile-specific optimizations
          ...(isMobile && {
            aspectRatio: 16/9,
            frameRate: { ideal: 30, max: 30 },
            resizeMode: 'crop-and-scale'
          })
        },
        audio: false
      };

      console.log('Requesting camera permission with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = stream;
      setState(prev => ({
        ...prev,
        status: 'granted',
        stream: stream
      }));

      console.log('Camera permission granted, stream:', stream);

    } catch (error) {
      console.error('Camera permission error:', error);
      let errorMessage = 'Failed to access camera';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Camera permission denied by user';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera found on device';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Camera is being used by another application';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'Camera constraints not supported';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Camera access blocked by browser security policy';
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

// hooks/useHandTracking.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { HandResults } from '../types/game';
import { loadMediaPipeScript } from '../utils/gameUtils';

interface UseHandTrackingProps {
  enabled: boolean;
  cameraStream: MediaStream | undefined;
  onResults: (results: HandResults) => void;
}

interface HandTrackingState {
  isLoading: boolean;
  error: string | null;
  useSimpleMode: boolean;
}

export const useHandTracking = ({ enabled, cameraStream, onResults }: UseHandTrackingProps) => {
  const [state, setState] = useState<HandTrackingState>({
    isLoading: true,
    error: null,
    useSimpleMode: false
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const handsInstanceRef = useRef<any>(null);
  const cameraInstanceRef = useRef<any>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    try {
      if (cameraInstanceRef.current && cameraInstanceRef.current.stop) {
        cameraInstanceRef.current.stop();
        cameraInstanceRef.current = null;
      }
      if (handsInstanceRef.current && handsInstanceRef.current.close) {
        handsInstanceRef.current.close();
        handsInstanceRef.current = null;
      }
    } catch (error) {
      console.log('Error during MediaPipe cleanup:', error);
    }
  }, []);

  // Initialize hand tracking
  useEffect(() => {
    if (!enabled || !cameraStream) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    let isMounted = true;

    const initialize = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        cleanup();
        await loadMediaPipeScript();
        
        if (!isMounted) return;

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!window.Hands || !window.Camera) {
          throw new Error('MediaPipe modules not available');
        }

        const hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1635986972/${file}`;
          }
        });

        handsInstanceRef.current = hands;

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);

        if (videoRef.current && isMounted) {
          const camera = new window.Camera(videoRef.current, {
            onFrame: async () => {
              if (videoRef.current && handsInstanceRef.current && isMounted) {
                try {
                  await handsInstanceRef.current.send({ image: videoRef.current });
                } catch (error) {
                  console.log('Error sending frame to MediaPipe:', error);
                }
              }
            },
            width: 1280,
            height: 720
          });

          cameraInstanceRef.current = camera;
          await camera.start();
          
          if (isMounted) {
            setState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          throw new Error('Video element not available');
        }
      } catch (error: any) {
        console.log('Error initializing hand tracking:', error);
        if (isMounted) {
          setState(prev => ({
            ...prev,
            error: error.message || 'Failed to initialize hand tracking',
            isLoading: false,
            useSimpleMode: true
          }));
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [enabled, cameraStream, onResults, cleanup]);

  // Setup video stream
  useEffect(() => {
    if (cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  return {
    ...state,
    videoRef,
    cleanup
  };
};
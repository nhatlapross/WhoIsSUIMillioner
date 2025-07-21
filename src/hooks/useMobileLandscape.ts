// hooks/useMobileLandscape.ts - Mobile landscape optimization for hand tracking
import { useState, useEffect, useCallback } from 'react';

interface LandscapeConfig {
  autoRotate: boolean;
  showRotationPrompt: boolean;
  forceFullscreen: boolean;
  optimizeForHandTracking: boolean;
}

interface LandscapeState {
  isLandscape: boolean;
  isMobile: boolean;
  shouldPromptRotation: boolean;
  screenDimensions: {
    width: number;
    height: number;
    ratio: number;
  };
  isFullscreen: boolean;
  orientation: number;
}

const defaultConfig: LandscapeConfig = {
  autoRotate: false,
  showRotationPrompt: true,
  forceFullscreen: true,
  optimizeForHandTracking: true
};

export const useMobileLandscape = (config: Partial<LandscapeConfig> = {}) => {
  const landscapeConfig = { ...defaultConfig, ...config };
  
  const [landscapeState, setLandscapeState] = useState<LandscapeState>({
    isLandscape: false,
    isMobile: false,
    shouldPromptRotation: false,
    screenDimensions: {
      width: window.innerWidth,
      height: window.innerHeight,
      ratio: window.innerWidth / window.innerHeight
    },
    isFullscreen: false,
    orientation: 0
  });

  // Detect if device is mobile
  const isMobile = useCallback(() => {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  }, []);

  // Get screen orientation
  const getOrientation = useCallback(() => {
    if (screen.orientation) {
      return screen.orientation.angle;
    }
    return window.orientation || 0;
  }, []);

  // Check if currently in landscape
  const isLandscape = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return width > height;
  }, []);

  // Update landscape state
  const updateLandscapeState = useCallback(() => {
    const mobile = isMobile();
    const landscape = isLandscape();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = width / height;
    const fullscreen = !!document.fullscreenElement;
    const orientation = getOrientation();

    // Show rotation prompt if mobile and not in landscape (unless bypassed)
    const bypassPrompt = typeof window !== 'undefined' && window.localStorage.getItem('bypassLandscapePrompt') === 'true';
    const shouldPrompt = mobile && !landscape && landscapeConfig.showRotationPrompt && !bypassPrompt;

    setLandscapeState({
      isLandscape: landscape,
      isMobile: mobile,
      shouldPromptRotation: shouldPrompt,
      screenDimensions: { width, height, ratio },
      isFullscreen: fullscreen,
      orientation
    });
  }, [isMobile, isLandscape, getOrientation, landscapeConfig.showRotationPrompt]);

  // Force landscape orientation
  const forceLandscape = useCallback(async () => {
    if (!landscapeConfig.autoRotate) return;

    try {
      // Type assertion to handle Screen Orientation API
      const screenOrientation = screen.orientation as any;
      if (screenOrientation && typeof screenOrientation.lock === 'function') {
        await screenOrientation.lock('landscape');
      }
      // Fallback for older browsers
      else if ((screen as any).lockOrientation) {
        (screen as any).lockOrientation('landscape');
      }
      // Webkit fallback
      else if ((screen as any).webkitLockOrientation) {
        (screen as any).webkitLockOrientation('landscape');
      }
      // Mozilla fallback  
      else if ((screen as any).mozLockOrientation) {
        (screen as any).mozLockOrientation('landscape');
      }
    } catch (error) {
      console.warn('Cannot lock orientation:', error);
    }
  }, [landscapeConfig.autoRotate]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    if (!landscapeConfig.forceFullscreen) return;

    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (error) {
      console.warn('Cannot enter fullscreen:', error);
    }
  }, [landscapeConfig.forceFullscreen]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.warn('Cannot exit fullscreen:', error);
    }
  }, []);

  // Optimize for hand tracking
  const optimizeForHandTracking = useCallback(() => {
    if (!landscapeConfig.optimizeForHandTracking) return;

    const body = document.body;
    const html = document.documentElement;

    if (landscapeState.isMobile && landscapeState.isLandscape) {
      // Add mobile landscape classes
      body.classList.add('mobile-landscape-game');
      html.classList.add('mobile-landscape-mode');
      
      // Hide address bar on mobile
      if (window.scrollTo) {
        window.scrollTo(0, 1);
      }
      
      // Prevent zoom
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        );
      }
    } else {
      body.classList.remove('mobile-landscape-game');
      html.classList.remove('mobile-landscape-mode');
    }
  }, [landscapeConfig.optimizeForHandTracking, landscapeState.isMobile, landscapeState.isLandscape]);

  // Handle orientation change
  const handleOrientationChange = useCallback(() => {
    // Delay to ensure proper dimensions
    setTimeout(() => {
      updateLandscapeState();
    }, 100);
  }, [updateLandscapeState]);

  // Handle resize
  const handleResize = useCallback(() => {
    updateLandscapeState();
  }, [updateLandscapeState]);

  // Initialize and setup event listeners
  useEffect(() => {
    updateLandscapeState();

    // Add event listeners
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', updateLandscapeState);

    // Cleanup
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', updateLandscapeState);
    };
  }, [handleOrientationChange, handleResize, updateLandscapeState]);

  // Apply optimizations when state changes
  useEffect(() => {
    optimizeForHandTracking();
  }, [optimizeForHandTracking]);

  // Auto-rotate if enabled
  useEffect(() => {
    if (landscapeState.isMobile && !landscapeState.isLandscape && landscapeConfig.autoRotate) {
      forceLandscape();
    }
  }, [landscapeState.isMobile, landscapeState.isLandscape, landscapeConfig.autoRotate, forceLandscape]);

  // Auto-fullscreen if enabled
  useEffect(() => {
    if (landscapeState.isMobile && landscapeState.isLandscape && 
        !landscapeState.isFullscreen && landscapeConfig.forceFullscreen) {
      enterFullscreen();
    }
  }, [landscapeState.isMobile, landscapeState.isLandscape, landscapeState.isFullscreen, 
      landscapeConfig.forceFullscreen, enterFullscreen]);

  // Get optimal choice positions for mobile landscape
  const getOptimalChoicePositions = useCallback(() => {
    const { width, height } = landscapeState.screenDimensions;
    
    if (!landscapeState.isMobile || !landscapeState.isLandscape) {
      return null;
    }

    // Optimize for hand tracking - positions that are easy to point at
    const margin = 20;
    const choiceWidth = Math.min(200, (width - margin * 5) / 2);
    const choiceHeight = Math.min(60, (height - margin * 3) / 2);
    
    return {
      a: { x: margin, y: margin, width: choiceWidth, height: choiceHeight },
      b: { x: width - choiceWidth - margin, y: margin, width: choiceWidth, height: choiceHeight },
      c: { x: margin, y: height - choiceHeight - margin, width: choiceWidth, height: choiceHeight },
      d: { x: width - choiceWidth - margin, y: height - choiceHeight - margin, width: choiceWidth, height: choiceHeight }
    };
  }, [landscapeState]);

  return {
    landscapeState,
    forceLandscape,
    enterFullscreen,
    exitFullscreen,
    getOptimalChoicePositions,
    isMobileLandscape: landscapeState.isMobile && landscapeState.isLandscape,
    shouldShowRotationPrompt: landscapeState.shouldPromptRotation
  };
};
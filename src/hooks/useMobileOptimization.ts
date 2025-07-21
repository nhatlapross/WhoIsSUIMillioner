// hooks/useMobileOptimization.ts - Mobile-specific optimizations
import { useState, useEffect, useCallback, useRef } from 'react';

interface MobileOptimizationConfig {
  enableHapticFeedback: boolean;
  enableTouchOptimization: boolean;
  gestureThreshold: number;
  tapDelay: number;
  scrollLocking: boolean;
  orientationLocking: boolean;
}

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
  screenSize: 'small' | 'medium' | 'large';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  hasHaptic: boolean;
}

const defaultConfig: MobileOptimizationConfig = {
  enableHapticFeedback: true,
  enableTouchOptimization: true,
  gestureThreshold: 10,
  tapDelay: 200,
  scrollLocking: true,
  orientationLocking: false
};

export const useMobileOptimization = (config: Partial<MobileOptimizationConfig> = {}) => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isTouch: false,
    screenSize: 'large',
    orientation: 'portrait',
    pixelRatio: 1,
    hasHaptic: false
  });

  const optimizationConfig = { ...defaultConfig, ...config };
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const preventScrollRef = useRef(false);

  // Detect device capabilities
  const detectDevice = useCallback(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const screenWidth = window.innerWidth;
    const pixelRatio = window.devicePixelRatio || 1;
    
    let screenSize: 'small' | 'medium' | 'large' = 'large';
    if (screenWidth <= 480) screenSize = 'small';
    else if (screenWidth <= 768) screenSize = 'medium';

    const orientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    
    // Check for haptic feedback support
    const hasHaptic = 'vibrate' in navigator && typeof navigator.vibrate === 'function';

    setDeviceInfo({
      isMobile,
      isTablet,
      isTouch,
      screenSize,
      orientation,
      pixelRatio,
      hasHaptic
    });
  }, []);

  // Haptic feedback functions
  const triggerHapticFeedback = useCallback((pattern: number | number[] = 50) => {
    if (!optimizationConfig.enableHapticFeedback || !deviceInfo.hasHaptic) return;
    
    try {
      if (typeof pattern === 'number') {
        navigator.vibrate(pattern);
      } else {
        navigator.vibrate(pattern);
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [optimizationConfig.enableHapticFeedback, deviceInfo.hasHaptic]);

  // Touch optimization functions
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!optimizationConfig.enableTouchOptimization) return;

    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    // Light haptic feedback on touch start
    triggerHapticFeedback(10);
  }, [optimizationConfig.enableTouchOptimization, triggerHapticFeedback]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!optimizationConfig.enableTouchOptimization || !touchStartRef.current) return;

    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // If movement is significant, it's not a tap
    if (deltaX > optimizationConfig.gestureThreshold || deltaY > optimizationConfig.gestureThreshold) {
      preventScrollRef.current = true;
      if (optimizationConfig.scrollLocking) {
        event.preventDefault();
      }
    }
  }, [optimizationConfig.enableTouchOptimization, optimizationConfig.gestureThreshold, optimizationConfig.scrollLocking]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!optimizationConfig.enableTouchOptimization || !touchStartRef.current) return;

    const duration = Date.now() - touchStartRef.current.time;
    
    // If it's a quick tap, trigger haptic feedback
    if (duration < optimizationConfig.tapDelay && !preventScrollRef.current) {
      triggerHapticFeedback(30);
    }

    touchStartRef.current = null;
    preventScrollRef.current = false;
  }, [optimizationConfig.enableTouchOptimization, optimizationConfig.tapDelay, triggerHapticFeedback]);

  // Prevent zoom on double tap
  const preventZoom = useCallback((event: TouchEvent) => {
    if (event.touches.length > 1) {
      event.preventDefault();
    }
  }, []);

  // Lock orientation if needed
  const lockOrientation = useCallback(async (orientation: 'portrait' | 'landscape') => {
    if (!optimizationConfig.orientationLocking) return;

    try {
      // Type assertion to handle Screen Orientation API
      const screenOrientation = screen.orientation as any;
      if (screenOrientation && typeof screenOrientation.lock === 'function') {
        await screenOrientation.lock(orientation);
      }
      // Fallback for older browsers
      else if ((screen as any).lockOrientation) {
        (screen as any).lockOrientation(orientation);
      }
      // Webkit fallback
      else if ((screen as any).webkitLockOrientation) {
        (screen as any).webkitLockOrientation(orientation);
      }
      // Mozilla fallback  
      else if ((screen as any).mozLockOrientation) {
        (screen as any).mozLockOrientation(orientation);
      }
    } catch (error) {
      console.warn('Orientation lock failed:', error);
    }
  }, [optimizationConfig.orientationLocking]);

  // Optimize touch areas for mobile
  const optimizeTouchArea = useCallback((element: HTMLElement) => {
    if (!deviceInfo.isMobile || !optimizationConfig.enableTouchOptimization) return;

    // Ensure minimum touch target size (44px)
    const minTouchSize = 44;
    const computedStyle = getComputedStyle(element);
    const currentWidth = parseFloat(computedStyle.width);
    const currentHeight = parseFloat(computedStyle.height);

    if (currentWidth < minTouchSize || currentHeight < minTouchSize) {
      element.style.minWidth = `${minTouchSize}px`;
      element.style.minHeight = `${minTouchSize}px`;
      element.style.padding = '8px';
    }

    // Add touch-friendly CSS
    element.style.touchAction = 'manipulation';
    element.style.userSelect = 'none';
    
    // WebKit-specific properties with type assertions
    const elementStyle = element.style as any;
    elementStyle.webkitTouchCallout = 'none';
    elementStyle.webkitUserSelect = 'none';
  }, [deviceInfo.isMobile, optimizationConfig.enableTouchOptimization]);

  // Performance optimization for mobile
  const optimizePerformance = useCallback(() => {
    if (!deviceInfo.isMobile) return;

    // Reduce animation quality on low-end devices
    const isLowEnd = deviceInfo.pixelRatio < 2 || 
                    (deviceInfo.screenSize === 'small' && 
                     typeof navigator.hardwareConcurrency === 'number' && 
                     navigator.hardwareConcurrency < 4);

    if (isLowEnd) {
      document.body.style.setProperty('--animation-duration', '0.2s');
      document.body.style.setProperty('--animation-timing', 'ease-out');
    }

    // Enable hardware acceleration
    document.body.style.transform = 'translateZ(0)';
    (document.body.style as any).webkitTransform = 'translateZ(0)';
  }, [deviceInfo]);

  // Initialize device detection
  useEffect(() => {
    detectDevice();
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, [detectDevice]);

  // Add touch event listeners
  useEffect(() => {
    if (!deviceInfo.isTouch || !optimizationConfig.enableTouchOptimization) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchstart', preventZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchstart', preventZoom);
    };
  }, [deviceInfo.isTouch, optimizationConfig.enableTouchOptimization, handleTouchStart, handleTouchMove, handleTouchEnd, preventZoom]);

  // Apply performance optimizations
  useEffect(() => {
    optimizePerformance();
  }, [optimizePerformance]);

  // Add mobile-specific CSS classes
  useEffect(() => {
    const body = document.body;
    
    if (deviceInfo.isMobile) {
      body.classList.add('mobile-device');
      body.classList.add(`screen-${deviceInfo.screenSize}`);
      body.classList.add(`orientation-${deviceInfo.orientation}`);
    } else {
      body.classList.remove('mobile-device');
      body.classList.remove(`screen-${deviceInfo.screenSize}`);
      body.classList.remove(`orientation-${deviceInfo.orientation}`);
    }

    if (deviceInfo.isTouch) {
      body.classList.add('touch-device');
    } else {
      body.classList.remove('touch-device');
    }

    return () => {
      body.classList.remove('mobile-device', 'touch-device');
      body.classList.remove(`screen-${deviceInfo.screenSize}`);
      body.classList.remove(`orientation-${deviceInfo.orientation}`);
    };
  }, [deviceInfo]);

  return {
    deviceInfo,
    triggerHapticFeedback,
    optimizeTouchArea,
    lockOrientation,
    isOptimized: deviceInfo.isMobile && optimizationConfig.enableTouchOptimization
  };
};
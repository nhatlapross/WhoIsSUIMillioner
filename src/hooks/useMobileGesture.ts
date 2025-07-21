// hooks/useMobileGesture.ts - Mobile gesture optimization hook
import { useState, useEffect, useCallback, useRef } from 'react';

interface GestureConfig {
  swipeThreshold: number;
  tapThreshold: number;
  longPressThreshold: number;
  velocityThreshold: number;
}

interface GestureEvent {
  type: 'tap' | 'swipe' | 'longpress' | 'hover';
  position: { x: number; y: number };
  direction?: 'up' | 'down' | 'left' | 'right';
  velocity?: number;
  duration?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  startTime: number;
  isActive: boolean;
  element: HTMLElement | null;
}

const defaultConfig: GestureConfig = {
  swipeThreshold: 50,
  tapThreshold: 10,
  longPressThreshold: 500,
  velocityThreshold: 0.5
};

export const useMobileGesture = (
  elementRef: React.RefObject<HTMLElement | null>,
  onGesture: (event: GestureEvent) => void,
  config: Partial<GestureConfig> = {}
) => {
  const [isTouch, setIsTouch] = useState(false);
  const [touchState, setTouchState] = useState<TouchState | null>(null);
  const gestureConfig = { ...defaultConfig, ...config };
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  // Detect if device supports touch
  useEffect(() => {
    const checkTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  // Get touch position relative to element
  const getTouchPosition = useCallback((touch: Touch, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!elementRef.current) return;
    
    const touch = event.touches[0];
    const position = getTouchPosition(touch, elementRef.current);
    
    setTouchState({
      startX: position.x,
      startY: position.y,
      currentX: position.x,
      currentY: position.y,
      startTime: Date.now(),
      isActive: true,
      element: elementRef.current
    });

    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      if (touchState?.isActive) {
        onGesture({
          type: 'longpress',
          position: { x: touchState.currentX, y: touchState.currentY },
          duration: Date.now() - touchState.startTime
        });
      }
    }, gestureConfig.longPressThreshold);

    // Prevent default to avoid scrolling
    event.preventDefault();
  }, [elementRef, getTouchPosition, onGesture, gestureConfig.longPressThreshold, touchState]);

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchState || !touchState.isActive || !elementRef.current) return;

    const touch = event.touches[0];
    const position = getTouchPosition(touch, elementRef.current);
    
    setTouchState(prev => prev ? {
      ...prev,
      currentX: position.x,
      currentY: position.y
    } : null);

    // Clear long press timer on move
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Trigger hover events with delay
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    }
    
    hoverTimer.current = setTimeout(() => {
      onGesture({
        type: 'hover',
        position: { x: position.x, y: position.y }
      });
    }, 100);

    event.preventDefault();
  }, [touchState, elementRef, getTouchPosition, onGesture]);

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!touchState || !touchState.isActive) return;

    const endTime = Date.now();
    const duration = endTime - touchState.startTime;
    const deltaX = touchState.currentX - touchState.startX;
    const deltaY = touchState.currentY - touchState.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / duration;

    // Clear timers
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }

    // Determine gesture type
    if (distance < gestureConfig.tapThreshold) {
      // Tap gesture
      onGesture({
        type: 'tap',
        position: { x: touchState.currentX, y: touchState.currentY },
        duration
      });
    } else if (distance > gestureConfig.swipeThreshold && velocity > gestureConfig.velocityThreshold) {
      // Swipe gesture
      let direction: 'up' | 'down' | 'left' | 'right';
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      onGesture({
        type: 'swipe',
        position: { x: touchState.currentX, y: touchState.currentY },
        direction,
        velocity,
        duration
      });
    }

    setTouchState(null);
    event.preventDefault();
  }, [touchState, onGesture, gestureConfig]);

  // Handle mouse events for desktop fallback
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isTouch || !elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
    }

    hoverTimer.current = setTimeout(() => {
      onGesture({
        type: 'hover',
        position
      });
    }, 50);
  }, [isTouch, elementRef, onGesture]);

  const handleMouseClick = useCallback((event: MouseEvent) => {
    if (isTouch || !elementRef.current) return;

    const rect = elementRef.current.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };

    onGesture({
      type: 'tap',
      position
    });
  }, [isTouch, elementRef, onGesture]);

  // Add event listeners
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    if (isTouch) {
      // Touch events
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd, { passive: false });
    } else {
      // Mouse events
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('click', handleMouseClick);
    }

    return () => {
      if (isTouch) {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      } else {
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('click', handleMouseClick);
      }
    };
  }, [isTouch, elementRef, handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseMove, handleMouseClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      if (hoverTimer.current) {
        clearTimeout(hoverTimer.current);
      }
    };
  }, []);

  return {
    isTouch,
    touchState,
    isGestureActive: touchState?.isActive || false
  };
};
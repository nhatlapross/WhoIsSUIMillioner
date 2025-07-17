// utils/timerManager.ts - COMPLETE Timer Manager và utilities
'use client';

interface TimerConfig {
  interval: number;
  onTick: (timeLeft: number) => void;
  onComplete: () => void;
  onAnswerCheck?: (timeLeft: number) => void;
}

export class TimerManager {
  private timer: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private duration: number = 0;
  public config: TimerConfig;
  private isRunning: boolean = false;
  private pausedTime: number = 0;

  constructor(config: TimerConfig) {
    this.config = config;
  }

  start(duration: number): void {
    if (this.isRunning) {
      this.stop();
    }

    this.duration = duration;
    this.startTime = Date.now();
    this.isRunning = true;
    this.pausedTime = 0;

    console.log('⏰ Timer started:', duration + 's');
    this.tick();
  }

  private tick = (): void => {
    if (!this.isRunning) return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const timeLeft = Math.max(0, this.duration - elapsed);
    const roundedTimeLeft = Math.ceil(timeLeft);

    // Call onTick with current time
    this.config.onTick(roundedTimeLeft);

    // Check for answer updates if callback provided
    if (this.config.onAnswerCheck) {
      this.config.onAnswerCheck(roundedTimeLeft);
    }

    if (timeLeft <= 0) {
      this.stop();
      this.config.onComplete();
      return;
    }

    this.timer = setTimeout(this.tick, this.config.interval);
  };

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('⏰ Timer stopped');
  }

  pause(): void {
    if (!this.isRunning) return;
    
    this.pausedTime = Date.now();
    this.stop();
    console.log('⏸️ Timer paused');
  }

  resume(): void {
    if (this.pausedTime === 0) return;

    const pauseDuration = (Date.now() - this.pausedTime) / 1000;
    this.startTime += pauseDuration * 1000;
    this.pausedTime = 0;
    this.isRunning = true;
    
    console.log('▶️ Timer resumed');
    this.tick();
  }

  getRemainingTime(): number {
    if (!this.isRunning) return 0;
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    return Math.max(0, this.duration - elapsed);
  }

  isActive(): boolean {
    return this.isRunning;
  }

  destroy(): void {
    this.stop();
    console.log('🗑️ Timer destroyed');
  }
}

// Debounce utility for answer submissions
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for frequent updates
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Answer state manager
export class AnswerStateManager {
  private currentAnswer: string | null = null;
  private lastSentAnswer: string | null = null;
  private pendingAnswer: string | null = null;
  private sendCallback: ((answer: string) => boolean) | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private maxRetries: number = 3;
  private retryCount: number = 0;

  constructor(sendCallback: (answer: string) => boolean) {
    this.sendCallback = sendCallback;
  }

  setAnswer(answer: string): boolean {
    console.log('📝 Answer state manager - setting answer:', {
      newAnswer: answer,
      currentAnswer: this.currentAnswer,
      lastSent: this.lastSentAnswer,
      pending: this.pendingAnswer
    });

    // Update current answer
    this.currentAnswer = answer;

    // If this is different from last sent, try to send it
    if (answer !== this.lastSentAnswer) {
      this.pendingAnswer = answer;
      return this.trySendAnswer(answer);
    }

    return true; // Answer already sent
  }

  private trySendAnswer(answer: string): boolean {
    if (!this.sendCallback) return false;

    console.log('📤 Attempting to send answer:', answer);
    
    const success = this.sendCallback(answer);
    
    if (success) {
      this.lastSentAnswer = answer;
      this.pendingAnswer = null;
      this.retryCount = 0;
      
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
        this.retryTimer = null;
      }
      
      console.log('✅ Answer sent successfully:', answer);
      return true;
    } else {
      console.log('❌ Failed to send answer, will retry');
      this.scheduleRetry(answer);
      return false;
    }
  }

  private scheduleRetry(answer: string): void {
    if (this.retryCount >= this.maxRetries) {
      console.log('❌ Max retries reached for answer:', answer);
      return;
    }

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    const retryDelay = Math.min(1000 * Math.pow(2, this.retryCount), 5000); // Exponential backoff
    this.retryCount++;

    console.log(`🔄 Scheduling retry #${this.retryCount} in ${retryDelay}ms`);

    this.retryTimer = setTimeout(() => {
      if (this.pendingAnswer === answer && this.lastSentAnswer !== answer) {
        console.log(`🔄 Retrying answer submission #${this.retryCount}:`, answer);
        this.trySendAnswer(answer);
      }
    }, retryDelay);
  }

  getCurrentAnswer(): string | null {
    return this.currentAnswer;
  }

  getLastSentAnswer(): string | null {
    return this.lastSentAnswer;
  }

  hasPendingAnswer(): boolean {
    return this.pendingAnswer !== null && this.pendingAnswer !== this.lastSentAnswer;
  }

  reset(): void {
    console.log('🔄 Resetting answer state manager');
    this.currentAnswer = null;
    this.lastSentAnswer = null;
    this.pendingAnswer = null;
    this.retryCount = 0;
    
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  destroy(): void {
    this.reset();
    this.sendCallback = null;
    console.log('🗑️ Answer state manager destroyed');
  }
}

// React hook for timer management
import { useRef, useEffect, useCallback, useState } from 'react';

interface UseTimerOptions {
  onAnswerCheck?: (timeLeft: number) => void;
  interval?: number;
}

export const useTimer = (options: UseTimerOptions = {}) => {
  const timerRef = useRef<TimerManager | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const onTick = useCallback((time: number) => {
    setTimeLeft(time);
    options.onAnswerCheck?.(time);
  }, [options.onAnswerCheck]);

  const onComplete = useCallback(() => {
    setIsActive(false);
    setTimeLeft(0);
  }, []);

  // Initialize timer manager
  useEffect(() => {
    timerRef.current = new TimerManager({
      interval: options.interval || 1000,
      onTick,
      onComplete,
      onAnswerCheck: options.onAnswerCheck
    });

    return () => {
      timerRef.current?.destroy();
    };
  }, [onTick, onComplete, options.interval, options.onAnswerCheck]);

  const startTimer = useCallback((duration: number) => {
    setIsActive(true);
    setTimeLeft(duration);
    timerRef.current?.start(duration);
  }, []);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(0);
    timerRef.current?.stop();
  }, []);

  const pauseTimer = useCallback(() => {
    setIsActive(false);
    timerRef.current?.pause();
  }, []);

  const resumeTimer = useCallback(() => {
    setIsActive(true);
    timerRef.current?.resume();
  }, []);

  const getRemainingTime = useCallback(() => {
    return timerRef.current?.getRemainingTime() || 0;
  }, []);

  return {
    timeLeft,
    isActive,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    getRemainingTime
  };
};

// React hook for answer management
export const useAnswerManager = (
  sendCallback: (answer: string) => boolean,
  onAnswerChange?: (answer: string | null) => void
) => {
  const managerRef = useRef<AnswerStateManager | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [lastSentAnswer, setLastSentAnswer] = useState<string | null>(null);
  const [hasPending, setHasPending] = useState(false);

  // Initialize manager
  useEffect(() => {
    managerRef.current = new AnswerStateManager(sendCallback);

    return () => {
      managerRef.current?.destroy();
    };
  }, [sendCallback]);

  // Update state from manager
  useEffect(() => {
    const updateState = () => {
      if (managerRef.current) {
        const current = managerRef.current.getCurrentAnswer();
        const lastSent = managerRef.current.getLastSentAnswer();
        const pending = managerRef.current.hasPendingAnswer();

        setCurrentAnswer(current);
        setLastSentAnswer(lastSent);
        setHasPending(pending);

        onAnswerChange?.(current);
      }
    };

    // Update immediately
    updateState();

    // Set up periodic updates to sync state
    const interval = setInterval(updateState, 100);

    return () => clearInterval(interval);
  }, [onAnswerChange]);

  const submitAnswer = useCallback((answer: string) => {
    console.log('🎯 Submit answer via manager:', answer);
    return managerRef.current?.setAnswer(answer) || false;
  }, []);

  const resetAnswers = useCallback(() => {
    console.log('🔄 Reset answers via manager');
    managerRef.current?.reset();
    setCurrentAnswer(null);
    setLastSentAnswer(null);
    setHasPending(false);
  }, []);

  return {
    currentAnswer,
    lastSentAnswer,
    hasPending,
    submitAnswer,
    resetAnswers
  };
};

// Utility for stable callbacks
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T
): T => {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, []) as T;
};

// Performance monitoring utility
export class PerformanceMonitor {
  private startTimes: Map<string, number> = new Map();
  private measurements: Map<string, number[]> = new Map();

  start(label: string): void {
    this.startTimes.set(label, performance.now());
  }

  end(label: string): number {
    const startTime = this.startTimes.get(label);
    if (!startTime) {
      console.warn(`No start time found for label: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(label);

    // Store measurement
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(duration);

    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  getAverageTime(label: string): number {
    const times = this.measurements.get(label);
    if (!times || times.length === 0) return 0;

    const sum = times.reduce((a, b) => a + b, 0);
    return sum / times.length;
  }

  getStats(label: string): { count: number; average: number; min: number; max: number } | null {
    const times = this.measurements.get(label);
    if (!times || times.length === 0) return null;

    return {
      count: times.length,
      average: this.getAverageTime(label),
      min: Math.min(...times),
      max: Math.max(...times)
    };
  }

  reset(label?: string): void {
    if (label) {
      this.measurements.delete(label);
      this.startTimes.delete(label);
    } else {
      this.measurements.clear();
      this.startTimes.clear();
    }
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
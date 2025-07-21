// hooks/useAnimations.ts - Animation management hook
import { useEffect, useRef, useCallback, useState } from 'react';

interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none';
}

interface AnimationState {
  isAnimating: boolean;
  hasAnimated: boolean;
  animationCount: number;
}

const defaultConfig: AnimationConfig = {
  duration: 300,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  delay: 0,
  fillMode: 'forwards'
};

export const useAnimations = () => {
  const [animationState, setAnimationState] = useState<AnimationState>({
    isAnimating: false,
    hasAnimated: false,
    animationCount: 0
  });

  const animationRefs = useRef<Map<string, HTMLElement>>(new Map());
  const activeAnimations = useRef<Map<string, Animation>>(new Map());

  // Register an element for animation
  const registerElement = useCallback((key: string, element: HTMLElement | null) => {
    if (element) {
      animationRefs.current.set(key, element);
    } else {
      animationRefs.current.delete(key);
    }
  }, []);

  // Animate element with keyframes
  const animate = useCallback((
    key: string,
    keyframes: Keyframe[],
    config: Partial<AnimationConfig> = {}
  ) => {
    const element = animationRefs.current.get(key);
    if (!element) return Promise.resolve();

    const fullConfig = { ...defaultConfig, ...config };
    
    // Cancel any existing animation
    const existingAnimation = activeAnimations.current.get(key);
    if (existingAnimation) {
      existingAnimation.cancel();
    }

    setAnimationState(prev => ({
      ...prev,
      isAnimating: true,
      animationCount: prev.animationCount + 1
    }));

    const animation = element.animate(keyframes, {
      duration: fullConfig.duration,
      easing: fullConfig.easing,
      delay: fullConfig.delay,
      fill: fullConfig.fillMode
    });

    activeAnimations.current.set(key, animation);

    return animation.finished.then(() => {
      activeAnimations.current.delete(key);
      setAnimationState(prev => ({
        ...prev,
        isAnimating: prev.animationCount <= 1 ? false : true,
        hasAnimated: true,
        animationCount: Math.max(0, prev.animationCount - 1)
      }));
    });
  }, []);

  // Predefined animations
  const animations = {
    fadeIn: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { opacity: 0, offset: 0 },
        { opacity: 1, offset: 1 }
      ], config),

    fadeOut: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { opacity: 1, offset: 0 },
        { opacity: 0, offset: 1 }
      ], config),

    slideInFromLeft: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { transform: 'translateX(-100%)', opacity: 0, offset: 0 },
        { transform: 'translateX(0)', opacity: 1, offset: 1 }
      ], config),

    slideInFromRight: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { transform: 'translateX(100%)', opacity: 0, offset: 0 },
        { transform: 'translateX(0)', opacity: 1, offset: 1 }
      ], config),

    slideInFromTop: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { transform: 'translateY(-100%)', opacity: 0, offset: 0 },
        { transform: 'translateY(0)', opacity: 1, offset: 1 }
      ], config),

    slideInFromBottom: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { transform: 'translateY(100%)', opacity: 0, offset: 0 },
        { transform: 'translateY(0)', opacity: 1, offset: 1 }
      ], config),

    scaleIn: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { transform: 'scale(0.8)', opacity: 0, offset: 0 },
        { transform: 'scale(1)', opacity: 1, offset: 1 }
      ], config),

    scaleOut: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { transform: 'scale(1)', opacity: 1, offset: 0 },
        { transform: 'scale(0.8)', opacity: 0, offset: 1 }
      ], config),

    bounce: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(1.1)', offset: 0.5 },
        { transform: 'scale(1)', offset: 1 }
      ], { ...config, easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' }),

    shake: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { transform: 'translateX(0)', offset: 0 },
        { transform: 'translateX(-5px)', offset: 0.1 },
        { transform: 'translateX(5px)', offset: 0.2 },
        { transform: 'translateX(-5px)', offset: 0.3 },
        { transform: 'translateX(5px)', offset: 0.4 },
        { transform: 'translateX(-5px)', offset: 0.5 },
        { transform: 'translateX(5px)', offset: 0.6 },
        { transform: 'translateX(-5px)', offset: 0.7 },
        { transform: 'translateX(5px)', offset: 0.8 },
        { transform: 'translateX(-5px)', offset: 0.9 },
        { transform: 'translateX(0)', offset: 1 }
      ], config),

    pulse: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(1.05)', offset: 0.5 },
        { transform: 'scale(1)', offset: 1 }
      ], config),

    glow: (key: string, config?: Partial<AnimationConfig>) =>
      animate(key, [
        { boxShadow: '0 0 5px currentColor', offset: 0 },
        { boxShadow: '0 0 20px currentColor', offset: 1 }
      ], config)
  };

  // Sequence animations
  const sequence = useCallback(async (
    animationSequence: Array<{
      key: string;
      animation: keyof typeof animations;
      config?: Partial<AnimationConfig>;
      delay?: number;
    }>
  ) => {
    for (const step of animationSequence) {
      if (step.delay) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }
      await animations[step.animation](step.key, step.config);
    }
  }, [animations]);

  // Parallel animations
  const parallel = useCallback(async (
    animationList: Array<{
      key: string;
      animation: keyof typeof animations;
      config?: Partial<AnimationConfig>;
    }>
  ) => {
    const promises = animationList.map(({ key, animation, config }) =>
      animations[animation](key, config)
    );
    await Promise.all(promises);
  }, [animations]);

  // Cancel all animations
  const cancelAll = useCallback(() => {
    activeAnimations.current.forEach(animation => {
      animation.cancel();
    });
    activeAnimations.current.clear();
    setAnimationState({
      isAnimating: false,
      hasAnimated: false,
      animationCount: 0
    });
  }, []);

  // Cancel specific animation
  const cancel = useCallback((key: string) => {
    const animation = activeAnimations.current.get(key);
    if (animation) {
      animation.cancel();
      activeAnimations.current.delete(key);
      setAnimationState(prev => ({
        ...prev,
        animationCount: Math.max(0, prev.animationCount - 1),
        isAnimating: prev.animationCount <= 1 ? false : true
      }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAll();
    };
  }, [cancelAll]);

  return {
    registerElement,
    animate,
    animations,
    sequence,
    parallel,
    cancel,
    cancelAll,
    animationState
  };
};

// Hook for staggered animations
export const useStaggeredAnimations = (
  elements: string[],
  animationType: 'fadeIn' | 'slideInFromLeft' | 'slideInFromRight' | 'scaleIn' = 'fadeIn',
  staggerDelay: number = 100
) => {
  const { animations, registerElement } = useAnimations();

  const startStaggered = useCallback(async () => {
    for (let i = 0; i < elements.length; i++) {
      setTimeout(() => {
        animations[animationType](elements[i]);
      }, i * staggerDelay);
    }
  }, [elements, animationType, staggerDelay, animations]);

  return {
    registerElement,
    startStaggered
  };
};

// Hook for entrance animations
export const useEntranceAnimations = () => {
  const { animations, registerElement } = useAnimations();
  const [hasEntered, setHasEntered] = useState(false);

  const triggerEntrance = useCallback(async (
    elementKey: string,
    animationType: 'fadeIn' | 'slideInFromBottom' | 'scaleIn' = 'fadeIn'
  ) => {
    if (!hasEntered) {
      await animations[animationType](elementKey);
      setHasEntered(true);
    }
  }, [hasEntered, animations]);

  return {
    registerElement,
    triggerEntrance,
    hasEntered
  };
};

// Hook for game-specific animations
export const useGameAnimations = () => {
  const { animations, registerElement, animate } = useAnimations();

  const gameAnimations = {
    questionEnter: (key: string) =>
      animations.slideInFromTop(key, { duration: 500 }),

    answerChoiceEnter: (key: string, delay: number = 0) =>
      animations.scaleIn(key, { duration: 400, delay }),

    answerChoiceHover: (key: string) =>
      animations.bounce(key, { duration: 300 }),

    answerChoiceCorrect: (key: string) =>
      animate(key, [
        { transform: 'scale(1)', backgroundColor: 'currentColor', offset: 0 },
        { transform: 'scale(1.1)', backgroundColor: '#10b981', offset: 0.5 },
        { transform: 'scale(1.05)', backgroundColor: '#10b981', offset: 1 }
      ], { duration: 600 }),

    answerChoiceIncorrect: (key: string) =>
      animations.shake(key, { duration: 500 }),

    scoreIncrement: (key: string) =>
      animate(key, [
        { transform: 'scale(1)', color: 'currentColor', offset: 0 },
        { transform: 'scale(1.3)', color: '#10b981', offset: 0.5 },
        { transform: 'scale(1)', color: 'currentColor', offset: 1 }
      ], { duration: 600 }),

    timerWarning: (key: string) =>
      animations.pulse(key, { duration: 500 }),

    gameOver: (key: string) =>
      animations.fadeIn(key, { duration: 800 })
  };

  return {
    registerElement,
    ...gameAnimations
  };
};
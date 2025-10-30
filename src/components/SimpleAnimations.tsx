import React from 'react';

// Simple, lightweight animation components using CSS only

interface AnimatedElementProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'scaleIn';
  delay?: number;
  className?: string;
}

export const AnimatedElement: React.FC<AnimatedElementProps> = ({ 
  children, 
  animation = 'fadeIn', 
  delay = 0,
  className = '' 
}) => {
  const animationClass = `simple-${animation}`;
  const style = delay > 0 ? { animationDelay: `${delay}ms` } : {};
  
  return (
    <div className={`${animationClass} ${className}`} style={style}>
      {children}
    </div>
  );
};

export const FloatingElement: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`simple-float ${className}`}>
      {children}
    </div>
  );
};

export const AnimatedText: React.FC<{ 
  text: string; 
  className?: string;
  speed?: number;
}> = ({ text, className = '', speed = 50 }) => {
  return (
    <span className={`simple-text-reveal ${className}`}>
      {text}
    </span>
  );
};

// Simple hook exports for compatibility
export const useStaggerAnimation = () => ({ ref: null, trigger: () => {} });
export const useParallaxScroll = () => ({ ref: null });
export const useTypewriterEffect = () => ({ ref: null });
export const usePulseAnimation = () => ({ ref: null });
export const useSlideInAnimation = () => ({ ref: null });
export const useFadeInAnimation = () => ({ ref: null });
export const useScaleAnimation = () => ({ ref: null });
export const useRotateAnimation = () => ({ ref: null });
export const useBounceAnimation = () => ({ ref: null });
export const useShakeAnimation = () => ({ ref: null });
export const useGlowAnimation = () => ({ ref: null });
export const useRippleEffect = () => ({ ref: null });
export const useFloatingAnimation = () => ({ ref: null });
export const useWaveAnimation = () => ({ ref: null });
export const useMorphAnimation = () => ({ ref: null });
export const useParticleEffect = () => ({ ref: null });
export const useGradientAnimation = () => ({ ref: null });
export const useBlurAnimation = () => ({ ref: null });
export const useColorShiftAnimation = () => ({ ref: null });
export const useShadowAnimation = () => ({ ref: null });
export const useTextRevealAnimation = () => ({ ref: null });
export const useCounterAnimation = () => ({ ref: null });
export const useProgressAnimation = () => ({ ref: null });
export const useSpinAnimation = () => ({ ref: null });
export const useFlipAnimation = () => ({ ref: null });
export const useZoomAnimation = () => ({ ref: null });
export const useSwipeAnimation = () => ({ ref: null });
export const useElasticAnimation = () => ({ ref: null });
export const useBackAnimation = () => ({ ref: null });
export const useCircAnimation = () => ({ ref: null });
export const useExpoAnimation = () => ({ ref: null });
export const useSineAnimation = () => ({ ref: null });
export const useQuadAnimation = () => ({ ref: null });
export const useCubicAnimation = () => ({ ref: null });
export const useQuartAnimation = () => ({ ref: null });
export const useQuintAnimation = () => ({ ref: null });

const SimpleAnimations = {
  AnimatedElement,
  FloatingElement,
  AnimatedText,
  useStaggerAnimation,
};

export default SimpleAnimations;
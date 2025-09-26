import React, { useRef, useEffect } from 'react';
// @ts-ignore - animejs types have some issues
const anime = require('animejs');
import { gsap } from 'gsap';

interface AnimatedElementProps {
  children: React.ReactNode;
  animation?: 'fadeInUp' | 'slideInLeft' | 'scaleIn' | 'rotateIn' | 'morphIn' | 'glowPulse';
  delay?: number;
  duration?: number;
  trigger?: 'mount' | 'hover' | 'click' | 'scroll';
  className?: string;
  style?: React.CSSProperties;
  onAnimationComplete?: () => void;
}

export const AnimatedElement: React.FC<AnimatedElementProps> = ({
  children,
  animation = 'fadeInUp',
  delay = 0,
  duration = 800,
  trigger = 'mount',
  className,
  style,
  onAnimationComplete,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  const animations = {
    fadeInUp: () => {
      if (!elementRef.current) return;
      
      anime({
        targets: elementRef.current,
        translateY: [50, 0],
        opacity: [0, 1],
        duration,
        delay,
        easing: 'easeOutExpo',
        complete: onAnimationComplete,
      });
    },

    slideInLeft: () => {
      if (!elementRef.current) return;
      
      gsap.fromTo(elementRef.current, {
        x: -100,
        opacity: 0,
      }, {
        x: 0,
        opacity: 1,
        duration: duration / 1000,
        delay: delay / 1000,
        ease: 'power3.out',
        onComplete: onAnimationComplete,
      });
    },

    scaleIn: () => {
      if (!elementRef.current) return;
      
      anime({
        targets: elementRef.current,
        scale: [0.5, 1],
        opacity: [0, 1],
        duration,
        delay,
        easing: 'easeOutElastic(1, .6)',
        complete: onAnimationComplete,
      });
    },

    rotateIn: () => {
      if (!elementRef.current) return;
      
      gsap.fromTo(elementRef.current, {
        rotation: -180,
        scale: 0,
        opacity: 0,
      }, {
        rotation: 0,
        scale: 1,
        opacity: 1,
        duration: duration / 1000,
        delay: delay / 1000,
        ease: 'back.out(1.7)',
        onComplete: onAnimationComplete,
      });
    },

    morphIn: () => {
      if (!elementRef.current) return;
      
      const tl = gsap.timeline({ delay: delay / 1000, onComplete: onAnimationComplete });
      
      tl.fromTo(elementRef.current, {
        scaleX: 0.1,
        scaleY: 2,
        opacity: 0,
      }, {
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        duration: duration / 1000,
        ease: 'power2.out',
      })
      .to(elementRef.current, {
        rotation: 360,
        duration: 0.5,
        ease: 'power2.inOut',
      }, '-=0.2');
    },

    glowPulse: () => {
      if (!elementRef.current) return;
      
      anime({
        targets: elementRef.current,
        opacity: [0.5, 1],
        scale: [0.9, 1.05, 1],
        duration: duration * 1.5,
        delay,
        easing: 'easeInOutSine',
        direction: 'alternate',
        loop: true,
        complete: onAnimationComplete,
      });
    },
  };

  const playAnimation = () => {
    if (hasAnimated.current && trigger !== 'hover' && trigger !== 'click') return;
    
    hasAnimated.current = true;
    animations[animation]();
  };

  useEffect(() => {
    if (trigger === 'mount') {
      const timer = setTimeout(playAnimation, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return undefined;

    if (trigger === 'scroll') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              playAnimation();
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(element);
      return () => observer.unobserve(element);
    }
    return undefined;
  }, [trigger]);

  const handleInteraction = () => {
    if (trigger === 'hover' || trigger === 'click') {
      playAnimation();
    }
  };

  const eventProps = trigger === 'hover' 
    ? { onMouseEnter: handleInteraction }
    : trigger === 'click'
    ? { onClick: handleInteraction }
    : {};

  return (
    <div
      ref={elementRef}
      className={className}
      style={{
        opacity: trigger === 'mount' ? 0 : 1,
        ...style,
      }}
      {...eventProps}
    >
      {children}
    </div>
  );
};

// Floating Animation Component
interface FloatingElementProps {
  children: React.ReactNode;
  intensity?: number;
  direction?: 'vertical' | 'horizontal' | 'both';
  className?: string;
  style?: React.CSSProperties;
}

export const FloatingElement: React.FC<FloatingElementProps> = ({
  children,
  intensity = 20,
  direction = 'both',
  className,
  style,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    let animationProps: any = {
      duration: 3000 + Math.random() * 2000,
      easing: 'easeInOutSine',
      direction: 'alternate',
      loop: true,
    };

    if (direction === 'vertical' || direction === 'both') {
      animationProps.translateY = [-intensity, intensity];
    }
    
    if (direction === 'horizontal' || direction === 'both') {
      animationProps.translateX = [-intensity/2, intensity/2];
    }

    if (direction === 'both') {
      animationProps.rotate = [-2, 2];
    }

    const animation = anime({
      targets: elementRef.current,
      ...animationProps,
    });

    return () => animation.pause();
  }, [intensity, direction]);

  return (
    <div ref={elementRef} className={className} style={style}>
      {children}
    </div>
  );
};

// Stagger Animation Hook
export const useStaggerAnimation = (
  selector: string,
  options: {
    animation?: 'slideUp' | 'fadeIn' | 'scaleIn' | 'slideInLeft';
    stagger?: number;
    delay?: number;
  } = {}
) => {
  const { animation = 'slideUp', stagger = 100, delay = 0 } = options;

  const playStaggerAnimation = () => {
    const elements = document.querySelectorAll(selector);
    
    if (elements.length === 0) return;

    const animationProps: any = {
      targets: elements,
      delay: anime.stagger(stagger, { start: delay }),
      duration: 800,
      easing: 'easeOutExpo',
    };

    switch (animation) {
      case 'slideUp':
        animationProps.translateY = [50, 0];
        animationProps.opacity = [0, 1];
        break;
      case 'fadeIn':
        animationProps.opacity = [0, 1];
        break;
      case 'scaleIn':
        animationProps.scale = [0.8, 1];
        animationProps.opacity = [0, 1];
        break;
      case 'slideInLeft':
        animationProps.translateX = [-50, 0];
        animationProps.opacity = [0, 1];
        break;
    }

    anime(animationProps);
  };

  return { playStaggerAnimation };
};

// Text Animation Component
interface AnimatedTextProps {
  text: string;
  animation?: 'typewriter' | 'fadeInWords' | 'slideInChars' | 'glitchEffect';
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
  onComplete?: () => void;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  animation = 'typewriter',
  speed = 100,
  className,
  style,
  onComplete,
}) => {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!textRef.current) return undefined;

    const element = textRef.current;

    switch (animation) {
      case 'typewriter':
        element.textContent = '';
        let i = 0;
        const typeInterval = setInterval(() => {
          element.textContent += text[i];
          i++;
          if (i >= text.length) {
            clearInterval(typeInterval);
            onComplete?.();
          }
        }, speed);
        return () => clearInterval(typeInterval);

      case 'fadeInWords':
        const words = text.split(' ');
        element.innerHTML = words
          .map((word, index) => `<span style="opacity: 0; display: inline-block;" data-word="${index}">${word}&nbsp;</span>`)
          .join('');
        
        anime({
          targets: element.querySelectorAll('[data-word]'),
          opacity: [0, 1],
          translateY: [20, 0],
          delay: anime.stagger(speed),
          duration: 600,
          easing: 'easeOutExpo',
          complete: onComplete,
        });
        break;

      case 'slideInChars':
        element.innerHTML = text
          .split('')
          .map((char, index) => `<span style="opacity: 0; display: inline-block; transform: translateX(-20px);" data-char="${index}">${char === ' ' ? '&nbsp;' : char}</span>`)
          .join('');
        
        anime({
          targets: element.querySelectorAll('[data-char]'),
          opacity: [0, 1],
          translateX: [-20, 0],
          delay: anime.stagger(speed / 2),
          duration: 400,
          easing: 'easeOutExpo',
          complete: onComplete,
        });
        break;

      case 'glitchEffect':
        element.textContent = text;
        const glitchAnimation = anime({
          targets: element,
          translateX: () => anime.random(-2, 2),
          translateY: () => anime.random(-1, 1),
          duration: 50,
          loop: true,
          direction: 'alternate',
          autoplay: false,
        });

        // Play glitch effect briefly then show normal text
        glitchAnimation.play();
        setTimeout(() => {
          glitchAnimation.pause();
          gsap.to(element, { x: 0, y: 0, duration: 0.2 });
          onComplete?.();
        }, 1000);
        break;
    }
    return undefined;
  }, [text, animation, speed, onComplete]);

  return <span ref={textRef} className={className} style={style} />;
};

export default {
  AnimatedElement,
  FloatingElement,
  useStaggerAnimation,
  AnimatedText,
};
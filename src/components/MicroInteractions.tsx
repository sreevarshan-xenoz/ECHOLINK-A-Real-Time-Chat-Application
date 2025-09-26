import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';

interface AnimatedButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'glow' | 'ripple' | 'morphing';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  onClick,
  className = '',
  disabled = false,
  style = {},
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);

  // Base styles for different variants
  const getVariantStyles = () => {
    const baseStyles = {
      position: 'relative' as const,
      border: 'none',
      borderRadius: '8px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: size === 'small' ? '0.875rem' : size === 'large' ? '1.125rem' : '1rem',
      padding: size === 'small' ? '0.5rem 1rem' : size === 'large' ? '1rem 2rem' : '0.75rem 1.5rem',
      fontWeight: '600' as const,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden' as const,
      outline: 'none',
      opacity: disabled ? 0.6 : 1,
    };

    const variants = {
      primary: {
        background: 'linear-gradient(135deg, #00f7ff, #00c3ff)',
        color: '#1a1a1a',
        boxShadow: '0 4px 15px rgba(0, 247, 255, 0.3)',
      },
      secondary: {
        background: 'rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
      },
      ghost: {
        background: 'transparent',
        color: '#00f7ff',
        border: '2px solid #00f7ff',
      },
      glow: {
        background: 'rgba(0, 247, 255, 0.1)',
        color: '#00f7ff',
        border: '1px solid #00f7ff',
        boxShadow: '0 0 20px rgba(0, 247, 255, 0.5)',
      },
      ripple: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#ffffff',
      },
      morphing: {
        background: 'linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57)',
        backgroundSize: '300% 300%',
        color: '#ffffff',
        animation: 'morphBackground 3s ease-in-out infinite',
      },
    };

    return { ...baseStyles, ...variants[variant] };
  };

  // Animation effects
  useEffect(() => {
    const button = buttonRef.current;
    if (!button || disabled) return;

    const handleMouseEnter = () => {
      switch (variant) {
        case 'primary':
          gsap.to(button, {
            scale: 1.05,
            boxShadow: '0 8px 25px rgba(0, 247, 255, 0.5)',
            duration: 0.3,
            ease: 'power2.out',
          });
          break;

        case 'secondary':
          gsap.to(button, {
            scale: 1.02,
            background: 'rgba(255, 255, 255, 0.15)',
            duration: 0.3,
          });
          break;

        case 'ghost':
          gsap.to(button, {
            scale: 1.02,
            boxShadow: '0 0 20px rgba(0, 247, 255, 0.3)',
            background: 'rgba(0, 247, 255, 0.1)',
            duration: 0.3,
          });
          break;

        case 'glow':
          gsap.to(button, {
            scale: 1.05,
            boxShadow: '0 0 40px rgba(0, 247, 255, 0.8)',
            duration: 0.3,
          });
          break;

        case 'morphing':
          gsap.to(button, {
            scale: 1.1,
            rotationY: 5,
            duration: 0.4,
            ease: 'back.out(1.7)',
          });
          break;
      }
    };

    const handleMouseLeave = () => {
      const styles = getVariantStyles();
      gsap.to(button, {
        scale: 1,
        boxShadow: (styles as any).boxShadow || 'none',
        background: styles.background,
        rotationY: 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    };

    const handleClick = (e: MouseEvent) => {
      if (variant === 'ripple' && rippleRef.current) {
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        gsap.set(rippleRef.current, {
          width: size,
          height: size,
          left: x,
          top: y,
          scale: 0,
          opacity: 0.6,
        });

        gsap.to(rippleRef.current, {
          scale: 4,
          opacity: 0,
          duration: 0.6,
          ease: 'power2.out',
        });
      }

      // Haptic feedback simulation
      gsap.to(button, {
        scale: 0.95,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut',
      });

      onClick?.();
    };

    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);
    button.addEventListener('click', handleClick);

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
      button.removeEventListener('click', handleClick);
    };
  }, [variant, onClick, disabled]);

  return (
    <>
      <style>
        {`
          @keyframes morphBackground {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `}
      </style>
      <button
        ref={buttonRef}
        className={`animated-button ${className}`}
        style={{ ...getVariantStyles(), ...style }}
        disabled={disabled}
      >
        {variant === 'ripple' && (
          <div
            ref={rippleRef}
            style={{
              position: 'absolute',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.6)',
              pointerEvents: 'none',
              transform: 'scale(0)',
            }}
          />
        )}
        <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
      </button>
    </>
  );
};

// Card with hover animations
interface AnimatedCardProps {
  children: React.ReactNode;
  variant?: 'float' | 'tilt' | 'glow' | 'flip' | 'slide';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  variant = 'float',
  className = '',
  style = {},
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const baseStyles = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '1.5rem',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transformStyle: 'preserve-3d' as const,
  };

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      switch (variant) {
        case 'tilt':
          const rotateX = (deltaY / rect.height) * 20;
          const rotateY = (deltaX / rect.width) * -20;
          gsap.to(card, {
            rotationX: rotateX,
            rotationY: rotateY,
            transformPerspective: 1000,
            duration: 0.3,
          });
          break;

        case 'float':
          gsap.to(card, {
            y: -10,
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            duration: 0.3,
          });
          break;

        case 'glow':
          gsap.to(card, {
            boxShadow: '0 0 30px rgba(0, 247, 255, 0.5)',
            borderColor: 'rgba(0, 247, 255, 0.5)',
            duration: 0.3,
          });
          break;

        case 'slide':
          gsap.to(card, {
            x: deltaX * 0.05,
            y: deltaY * 0.05,
            duration: 0.3,
          });
          break;
      }
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        rotationX: 0,
        rotationY: 0,
        x: 0,
        y: 0,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        duration: 0.5,
        ease: 'power2.out',
      });
    };

    card.addEventListener('mousemove', handleMouseMove);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [variant]);

  return (
    <div
      ref={cardRef}
      className={`animated-card ${className}`}
      style={{ ...baseStyles, ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Loading spinner with animations
interface AnimatedSpinnerProps {
  variant?: 'dots' | 'pulse' | 'ripple' | 'bars' | 'orbit';
  size?: number;
  color?: string;
}

export const AnimatedSpinner: React.FC<AnimatedSpinnerProps> = ({
  variant = 'dots',
  size = 40,
  color = '#00f7ff',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = container.children;

    switch (variant) {
      case 'dots':
        gsap.to(elements, {
          y: -10,
          duration: 0.6,
          ease: 'power2.inOut',
          stagger: 0.1,
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'pulse':
        gsap.to(elements, {
          scale: 1.5,
          opacity: 0.5,
          duration: 1,
          ease: 'power2.inOut',
          stagger: 0.2,
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'ripple':
        gsap.to(elements, {
          scale: 2,
          opacity: 0,
          duration: 1.5,
          ease: 'power2.out',
          stagger: 0.3,
          repeat: -1,
        });
        break;

      case 'orbit':
        gsap.to(container, {
          rotation: 360,
          duration: 2,
          ease: 'none',
          repeat: -1,
        });
        break;
    }
  }, [variant]);

  const renderSpinner = () => {
    const itemStyle = {
      width: size / 5,
      height: size / 5,
      backgroundColor: color,
      borderRadius: '50%',
    };

    switch (variant) {
      case 'dots':
        return Array(3).fill(0).map((_, i) => (
          <div key={i} style={{ ...itemStyle, marginRight: '8px' }} />
        ));

      case 'pulse':
      case 'ripple':
        return Array(3).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              ...itemStyle,
              position: 'absolute',
              width: size / 3,
              height: size / 3,
            }}
          />
        ));

      case 'bars':
        return Array(4).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              width: size / 8,
              height: size,
              backgroundColor: color,
              marginRight: '4px',
              borderRadius: '2px',
            }}
          />
        ));

      case 'orbit':
        return Array(8).fill(0).map((_, i) => (
          <div
            key={i}
            style={{
              ...itemStyle,
              position: 'absolute',
              left: Math.cos((i * Math.PI) / 4) * (size / 3) + size / 2,
              top: Math.sin((i * Math.PI) / 4) * (size / 3) + size / 2,
            }}
          />
        ));

      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        position: 'relative',
      }}
    >
      {renderSpinner()}
    </div>
  );
};

export default {
  AnimatedButton,
  AnimatedCard,
  AnimatedSpinner,
};
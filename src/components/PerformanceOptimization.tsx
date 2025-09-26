import React, { createContext, useContext, useState, useEffect } from 'react';

interface PerformanceContextType {
  isHighPerformance: boolean;
  reducedMotion: boolean;
  deviceCapabilities: {
    webglSupported: boolean;
    isMobile: boolean;
    isLowEnd: boolean;
    memoryInfo?: any;
  };
  animationSettings: {
    enableParticles: boolean;
    particleCount: number;
    enable3D: boolean;
    enableComplexAnimations: boolean;
  };
  updateSettings: (settings: Partial<PerformanceContextType['animationSettings']>) => void;
}

const PerformanceContext = createContext<PerformanceContextType | null>(null);

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

interface PerformanceProviderProps {
  children: React.ReactNode;
}

export const PerformanceProvider: React.FC<PerformanceProviderProps> = ({ children }) => {
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    webglSupported: false,
    isMobile: false,
    isLowEnd: false,
    memoryInfo: null,
  });

  const [reducedMotion, setReducedMotion] = useState(false);
  const [animationSettings, setAnimationSettings] = useState({
    enableParticles: true,
    particleCount: 200,
    enable3D: true,
    enableComplexAnimations: true,
  });

  // Detect device capabilities
  useEffect(() => {
    const detectCapabilities = () => {
      // WebGL support detection
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const webglSupported = !!gl;

      // Mobile detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      // Memory detection (if available)
      const memoryInfo = (navigator as any).deviceMemory || (performance as any).memory;
      
      // Low-end device detection
      const isLowEnd = 
        (memoryInfo && memoryInfo.deviceMemory && memoryInfo.deviceMemory <= 4) ||
        (memoryInfo && memoryInfo.totalJSHeapSize && memoryInfo.totalJSHeapSize < 100000000) ||
        isMobile ||
        !webglSupported;

      // Reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setReducedMotion(prefersReducedMotion);

      setDeviceCapabilities({
        webglSupported,
        isMobile,
        isLowEnd,
        memoryInfo,
      });

      // Adjust settings based on capabilities
      if (isLowEnd || prefersReducedMotion) {
        setAnimationSettings(prev => ({
          ...prev,
          enableParticles: !prefersReducedMotion,
          particleCount: isLowEnd ? 50 : 100,
          enable3D: webglSupported && !prefersReducedMotion,
          enableComplexAnimations: !isLowEnd && !prefersReducedMotion,
        }));
      }
    };

    detectCapabilities();

    // Listen for changes in reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Performance monitoring
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let fps = 60;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;

        // Adjust settings based on FPS
        if (fps < 30 && animationSettings.enableComplexAnimations) {
          console.warn('Low FPS detected, reducing animation complexity');
          setAnimationSettings(prev => ({
            ...prev,
            particleCount: Math.max(prev.particleCount * 0.7, 20),
            enableComplexAnimations: false,
          }));
        } else if (fps > 55 && !animationSettings.enableComplexAnimations && !deviceCapabilities.isLowEnd) {
          // Re-enable complex animations if performance improves
          setAnimationSettings(prev => ({
            ...prev,
            enableComplexAnimations: true,
          }));
        }
      }

      requestAnimationFrame(measureFPS);
    };

    const rafId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(rafId);
  }, [animationSettings, deviceCapabilities]);

  const updateSettings = (newSettings: Partial<typeof animationSettings>) => {
    setAnimationSettings(prev => ({ ...prev, ...newSettings }));
  };

  const isHighPerformance = !deviceCapabilities.isLowEnd && !reducedMotion && deviceCapabilities.webglSupported;

  const contextValue: PerformanceContextType = {
    isHighPerformance,
    reducedMotion,
    deviceCapabilities,
    animationSettings,
    updateSettings,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
};

// HOC for performance-aware components
export const withPerformanceOptimization = <P extends object>(
  Component: React.ComponentType<P>
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const { animationSettings, reducedMotion } = usePerformance();

    const optimizedProps = {
      ...props,
      animationSettings,
      reducedMotion,
    } as P;

    return <Component {...optimizedProps} ref={ref} />;
  });
};

// Performance monitor component
export const PerformanceMonitor: React.FC = () => {
  const { deviceCapabilities, animationSettings, isHighPerformance } = usePerformance();
  const [showMonitor, setShowMonitor] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setShowMonitor(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!showMonitor) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#00f7ff',
        padding: '1rem',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 9999,
        minWidth: '200px',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
        Performance Monitor
      </div>
      <div>WebGL: {deviceCapabilities.webglSupported ? '✅' : '❌'}</div>
      <div>Mobile: {deviceCapabilities.isMobile ? '✅' : '❌'}</div>
      <div>Low-end: {deviceCapabilities.isLowEnd ? '✅' : '❌'}</div>
      <div>High Performance: {isHighPerformance ? '✅' : '❌'}</div>
      <div style={{ marginTop: '0.5rem' }}>
        <div>Particles: {animationSettings.enableParticles ? animationSettings.particleCount : 'Off'}</div>
        <div>3D: {animationSettings.enable3D ? '✅' : '❌'}</div>
        <div>Complex Animations: {animationSettings.enableComplexAnimations ? '✅' : '❌'}</div>
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '10px', opacity: 0.7 }}>
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};

// Adaptive animation component
interface AdaptiveAnimationProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiresHighPerformance?: boolean;
  requires3D?: boolean;
}

export const AdaptiveAnimation: React.FC<AdaptiveAnimationProps> = ({
  children,
  fallback,
  requiresHighPerformance = false,
  requires3D = false,
}) => {
  const { isHighPerformance, animationSettings, reducedMotion } = usePerformance();

  const shouldRenderAnimation = 
    !reducedMotion &&
    (!requiresHighPerformance || isHighPerformance) &&
    (!requires3D || animationSettings.enable3D);

  if (!shouldRenderAnimation) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
};

export default {
  PerformanceProvider,
  usePerformance,
  withPerformanceOptimization,
  PerformanceMonitor,
  AdaptiveAnimation,
};
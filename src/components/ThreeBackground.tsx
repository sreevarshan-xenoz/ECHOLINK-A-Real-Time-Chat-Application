import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { usePerformance } from './PerformanceOptimization';

interface ThreeBackgroundProps {
  theme: 'light' | 'dark';
  intensity?: number;
  particleCount?: number;
}

const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ 
  theme, 
  intensity = 1, 
  particleCount = 200 
}) => {
  const { animationSettings, reducedMotion } = usePerformance();
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const animationIdRef = useRef<number | null>(null);

  // Use performance-aware settings
  const actualParticleCount = reducedMotion ? 0 : animationSettings.particleCount || particleCount;
  const actualIntensity = reducedMotion ? 0 : intensity;
  const enableAnimations = animationSettings.enable3D && !reducedMotion;

  // Particle geometry and material
  const particleSystem = useMemo(() => {
    if (!enableAnimations || actualParticleCount === 0) {
      return null;
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(actualParticleCount * 3);
    const velocities = new Float32Array(actualParticleCount * 3);
    const sizes = new Float32Array(actualParticleCount);

    for (let i = 0; i < actualParticleCount; i++) {
      const i3 = i * 3;
      
      // Position
      positions[i3] = (Math.random() - 0.5) * 100;
      positions[i3 + 1] = (Math.random() - 0.5) * 100;
      positions[i3 + 2] = (Math.random() - 0.5) * 100;
      
      // Velocity
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
      
      // Size
      sizes[i] = Math.random() * 2 + 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    return { geometry, velocities };
  }, [actualParticleCount, enableAnimations]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;

    // Renderer configuration
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // Camera position
    camera.position.z = 50;

    // Create particle material based on theme
    const material = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      color: theme === 'dark' ? 0x00f7ff : 0x0088cc,
      transparent: true,
      opacity: theme === 'dark' ? 0.6 : 0.4,
      blending: THREE.AdditiveBlending,
      vertexColors: false
    });

    // Create particle system
    if (particleSystem) {
      const particles = new THREE.Points(particleSystem.geometry, material);
      scene.add(particles);
      particlesRef.current = particles;
    }

    // Add geometric shapes for visual interest
    const geometries = [
      new THREE.TetrahedronGeometry(2, 0),
      new THREE.OctahedronGeometry(1.5, 0),
      new THREE.IcosahedronGeometry(1, 0)
    ];

    const shapeMaterial = new THREE.MeshBasicMaterial({
      color: theme === 'dark' ? 0x00f7ff : 0x0088cc,
      transparent: true,
      opacity: 0.1,
      wireframe: true
    });

    for (let i = 0; i < 5; i++) {
      const shape = new THREE.Mesh(
        geometries[Math.floor(Math.random() * geometries.length)],
        shapeMaterial.clone()
      );
      
      shape.position.set(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100
      );
      
      shape.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      
      scene.add(shape);
    }

    // Animation loop
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX - window.innerWidth / 2) * 0.0001;
      mouseY = (event.clientY - window.innerHeight / 2) * 0.0001;
    };

    const animate = () => {
      if (!enableAnimations) return;
      
      animationIdRef.current = requestAnimationFrame(animate);

      if (particlesRef.current && particlesRef.current.geometry && particleSystem) {
        const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
        const velocities = particleSystem.velocities;

        // Update particle positions
        for (let i = 0; i < positions.length; i += 3) {
          positions[i] += velocities[i] * actualIntensity;
          positions[i + 1] += velocities[i + 1] * actualIntensity;
          positions[i + 2] += velocities[i + 2] * actualIntensity;

          // Boundary check and reset
          if (Math.abs(positions[i]) > 50) velocities[i] *= -1;
          if (Math.abs(positions[i + 1]) > 50) velocities[i + 1] *= -1;
          if (Math.abs(positions[i + 2]) > 50) velocities[i + 2] *= -1;
        }

        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Rotate geometric shapes
      scene.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.rotation.x += 0.005 * actualIntensity;
          child.rotation.y += 0.005 * actualIntensity;
        }
      });

      // Mouse interaction
      camera.rotation.x += mouseY * 0.1;
      camera.rotation.y += mouseX * 0.1;

      renderer.render(scene, camera);
    };

    // Handle resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // Event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Start animation
    if (enableAnimations) {
      animate();
    }

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose of Three.js objects
      scene.clear();
      renderer.dispose();
      if (particleSystem) {
        particleSystem.geometry.dispose();
      }
      material.dispose();
    };
  }, [theme, actualIntensity, actualParticleCount, particleSystem, enableAnimations]);

  // Update theme-specific colors
  useEffect(() => {
    if (particlesRef.current && particlesRef.current.material instanceof THREE.PointsMaterial) {
      const material = particlesRef.current.material;
      material.color.setHex(theme === 'dark' ? 0x00f7ff : 0x0088cc);
      material.opacity = theme === 'dark' ? 0.6 : 0.4;
      material.needsUpdate = true;
    }

    if (sceneRef.current) {
      sceneRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial) {
          child.material.color.setHex(theme === 'dark' ? 0x00f7ff : 0x0088cc);
          child.material.needsUpdate = true;
        }
      });
    }
  }, [theme]);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
};

export default ThreeBackground;
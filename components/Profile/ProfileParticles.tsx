// components/Profile/ProfileParticles.tsx
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation: Animated.Value;
  // Track positions separately
  currentX: number;
  currentY: number;
}

interface ProfileParticlesProps {
  type: 'stars' | 'bubbles' | 'fireflies' | 'snow' | 'confetti';
  color: string;
  count: number;
}

export default function ProfileParticles({ type, color, count }: ProfileParticlesProps) {
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    // Initialize particles
    particlesRef.current = Array.from({ length: count }, (_, i) => {
      const initialX = Math.random() * width;
      const initialY = Math.random() * height;
      return {
        id: i,
        x: new Animated.Value(initialX),
        y: new Animated.Value(initialY),
        opacity: new Animated.Value(Math.random() * 0.5 + 0.3),
        scale: new Animated.Value(Math.random() * 0.5 + 0.5),
        rotation: new Animated.Value(Math.random() * 360),
        currentX: initialX,
        currentY: initialY,
      };
    });

    // Start animations for each particle
    particlesRef.current.forEach((particle, index) => {
      // Stagger start times
      setTimeout(() => {
        startAnimation(particle);
      }, index * 100);
    });

    // Cleanup
    return () => {
      particlesRef.current.forEach((particle) => {
        particle.x.stopAnimation();
        particle.y.stopAnimation();
        particle.opacity.stopAnimation();
        particle.scale.stopAnimation();
        particle.rotation.stopAnimation();
      });
    };
  }, [type, count]);

  const startAnimation = (particle: Particle) => {
    switch (type) {
      case 'stars':
        animateStars(particle);
        break;
      case 'bubbles':
        animateBubbles(particle);
        break;
      case 'fireflies':
        animateFireflies(particle);
        break;
      case 'snow':
        animateSnow(particle);
        break;
      case 'confetti':
        animateConfetti(particle);
        break;
    }
  };

  const animateStars = (particle: Particle) => {
    const duration = 1000 + Math.random() * 2000;
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(particle.opacity, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0.2,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Subtle floating
    const floatY = particle.currentY;
    Animated.loop(
      Animated.sequence([
        Animated.timing(particle.y, {
          toValue: floatY + 10,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: floatY - 10,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const animateBubbles = (particle: Particle) => {
    const duration = 4000 + Math.random() * 3000;

    const animate = () => {
      const newX = Math.random() * width;
      particle.currentX = newX;
      particle.currentY = height + 50;
      
      particle.y.setValue(height + 50);
      particle.x.setValue(newX);
      particle.opacity.setValue(0.6 + Math.random() * 0.4);

      const swayAmount = 30;

      Animated.parallel([
        Animated.timing(particle.y, {
          toValue: -100,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(particle.x, {
            toValue: newX + swayAmount,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: newX - swayAmount,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  };

  const animateFireflies = (particle: Particle) => {
    const duration = 2000 + Math.random() * 2000;

    const animate = () => {
      const targetX = Math.random() * width;
      const targetY = Math.random() * height;

      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0.3,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0.8,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0.2,
              duration: 200,
              useNativeDriver: true,
            }),
          ]),
          { iterations: 3 }
        ),
        Animated.timing(particle.x, {
          toValue: targetX,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: targetY,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        particle.currentX = targetX;
        particle.currentY = targetY;
        animate();
      });
    };

    animate();
  };

  const animateSnow = (particle: Particle) => {
    const duration = 5000 + Math.random() * 3000;

    const animate = () => {
      const newX = Math.random() * width;
      particle.currentX = newX;
      particle.currentY = -50;
      
      particle.y.setValue(-50);
      particle.x.setValue(newX);
      particle.opacity.setValue(0.7 + Math.random() * 0.3);
      particle.rotation.setValue(0);

      const swayAmount = 20;

      Animated.parallel([
        Animated.timing(particle.y, {
          toValue: height + 50,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.x, {
              toValue: newX + swayAmount,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(particle.x, {
              toValue: newX - swayAmount,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.timing(particle.rotation, {
          toValue: 360,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  };

  const animateConfetti = (particle: Particle) => {
    const duration = 3000 + Math.random() * 2000;

    const animate = () => {
      const newX = Math.random() * width;
      particle.currentX = newX;
      particle.currentY = -50;
      
      particle.y.setValue(-50);
      particle.x.setValue(newX);
      particle.opacity.setValue(0.8 + Math.random() * 0.2);
      particle.rotation.setValue(0);

      Animated.parallel([
        Animated.timing(particle.y, {
          toValue: height + 50,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(particle.x, {
            toValue: newX + 60,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: newX - 40,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particle.rotation, {
          toValue: 720,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.scale, {
              toValue: 1.3,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 0.7,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start(() => animate());
    };

    animate();
  };

  const getParticleStyle = (particle: Particle) => {
    let size = 3;
    let shape: any = { borderRadius: 1.5 };

    switch (type) {
      case 'confetti':
        size = 8;
        shape = { borderRadius: 2 };
        break;
      case 'fireflies':
        size = 4;
        shape = { borderRadius: 2 };
        break;
      case 'snow':
        size = 4;
        shape = { borderRadius: 2 };
        break;
      case 'stars':
        size = 3;
        shape = { borderRadius: 1.5 };
        break;
      case 'bubbles':
        size = 6;
        shape = { borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' };
        break;
    }

    return {
      position: 'absolute' as const,
      width: size,
      height: size,
      backgroundColor: color,
      ...shape,
      transform: [
        { translateX: particle.x },
        { translateY: particle.y },
        { scale: particle.scale },
        { 
          rotate: particle.rotation.interpolate({
            inputRange: [0, 360],
            outputRange: ['0deg', '360deg'],
          })
        },
      ],
      opacity: particle.opacity,
    };
  };

  return (
    <View style={styles.container} pointerEvents="none">
      {particlesRef.current.map((particle) => (
        <Animated.View key={particle.id} style={getParticleStyle(particle)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
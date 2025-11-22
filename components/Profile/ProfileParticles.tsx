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
  currentX: number;
  currentY: number;
}

interface ProfileParticlesProps {
  type: 'stars' | 'bubbles' | 'fireflies' | 'snow' | 'confetti' | 'leaves' | 'sparkles' | 'rain' | 'smoke' | 'orbs' | 'dust' | 'waves' | 'feathers' | 'petals' | 'lightning' | 'plasma' | 'crystals';
  color: string;
  count: number;
}

export default function ProfileParticles({ type, color, count }: ProfileParticlesProps) {
  const particlesRef = useRef<Particle[]>([]);
  const [isReady, setIsReady] = React.useState(false);

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

    const mountTimer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => {
      clearTimeout(mountTimer);
      particlesRef.current.forEach((particle) => {
        particle.x.stopAnimation();
        particle.y.stopAnimation();
        particle.opacity.stopAnimation();
        particle.scale.stopAnimation();
        particle.rotation.stopAnimation();
      });
    };
  }, [type, count]);

  useEffect(() => {
    if (!isReady) return;

    particlesRef.current.forEach((particle, index) => {
      setTimeout(() => {
        startAnimation(particle);
      }, index * 50);
    });
  }, [isReady, type]);

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
      case 'leaves':
        animateLeaves(particle);
        break;
      case 'sparkles':
        animateSparkles(particle);
        break;
      case 'rain':
        animateRain(particle);
        break;
      case 'smoke':
        animateSmoke(particle);
        break;
      case 'orbs':
        animateOrbs(particle);
        break;
      case 'dust':
        animateDust(particle);
        break;
      case 'waves':
        animateWaves(particle);
        break;
      case 'feathers':
        animateFeathers(particle);
        break;
      case 'petals':
        animatePetals(particle);
        break;
      case 'lightning':
        animateLightning(particle);
        break;
      case 'plasma':
        animatePlasma(particle);
        break;
      case 'crystals':
        animateCrystals(particle);
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

  const animateLeaves = (particle: Particle) => {
    const duration = 4000 + Math.random() * 3000;

    const animate = () => {
      const newX = Math.random() * width;
      particle.currentX = newX;
      particle.currentY = -50;
      
      particle.y.setValue(-50);
      particle.x.setValue(newX);
      particle.opacity.setValue(0.6 + Math.random() * 0.4);
      particle.rotation.setValue(0);

      const swayAmount = 40;

      Animated.parallel([
        Animated.timing(particle.y, {
          toValue: height + 50,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(particle.x, {
            toValue: newX + swayAmount,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: newX - swayAmount,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: newX,
            duration: duration / 3,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particle.rotation, {
          toValue: 360,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  };

  const animateSparkles = (particle: Particle) => {
    const duration = 600 + Math.random() * 400;

    const animate = () => {
      particle.opacity.setValue(1);
      particle.scale.setValue(0.5);

      Animated.parallel([
        Animated.sequence([
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(particle.scale, {
            toValue: 1.2,
            duration: duration / 2,
            useNativeDriver: true,
          }),
          Animated.timing(particle.scale, {
            toValue: 0.5,
            duration: duration / 2,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        const newX = Math.random() * width;
        const newY = Math.random() * height;
        particle.x.setValue(newX);
        particle.y.setValue(newY);
        particle.currentX = newX;
        particle.currentY = newY;
        animate();
      });
    };

    animate();
  };

  const animateRain = (particle: Particle) => {
    const duration = 1500 + Math.random() * 1000;

    const animate = () => {
      const newX = Math.random() * width;
      particle.currentX = newX;
      particle.currentY = -50;
      
      particle.y.setValue(-50);
      particle.x.setValue(newX);
      particle.opacity.setValue(0.7);
      particle.rotation.setValue(0);

      Animated.parallel([
        Animated.timing(particle.y, {
          toValue: height + 50,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotation, {
          toValue: 20,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  };

  const animateSmoke = (particle: Particle) => {
    const duration = 3000 + Math.random() * 2000;

    const animate = () => {
      const newX = particle.currentX + (Math.random() - 0.5) * 100;
      const targetY = particle.currentY - 300;
      
      particle.opacity.setValue(0.6);
      particle.scale.setValue(0.3);

      Animated.parallel([
        Animated.timing(particle.y, {
          toValue: targetY,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.x, {
          toValue: newX,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 1.5,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        particle.currentX = Math.random() * width;
        particle.currentY = height + 50;
        particle.x.setValue(particle.currentX);
        particle.y.setValue(particle.currentY);
        animate();
      });
    };

    animate();
  };

  const animateOrbs = (particle: Particle) => {
    const duration = 3000 + Math.random() * 2000;
    const radius = 80 + Math.random() * 120;
    const centerX = Math.random() * width;
    const centerY = Math.random() * (height * 0.6) + height * 0.2;

    const animate = () => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.x, {
              toValue: centerX + Math.cos(Math.random() * Math.PI * 2) * radius,
              duration: duration,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.y, {
              toValue: centerY + Math.sin(Math.random() * Math.PI * 2) * radius,
              duration: duration,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.opacity, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0.4,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    };

    animate();
  };

  const animateDust = (particle: Particle) => {
    const duration = 2500 + Math.random() * 1500;

    const animate = () => {
      const newX = particle.currentX + (Math.random() - 0.5) * 60;
      const newY = particle.currentY - (100 + Math.random() * 150);
      
      particle.opacity.setValue(0.5 + Math.random() * 0.3);
      particle.scale.setValue(0.4);

      Animated.parallel([
        Animated.timing(particle.x, {
          toValue: newX,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: newY,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 0.8,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        particle.currentX = Math.random() * width;
        particle.currentY = height + 30;
        particle.x.setValue(particle.currentX);
        particle.y.setValue(particle.currentY);
        animate();
      });
    };

    animate();
  };

  const animateWaves = (particle: Particle) => {
    const baseY = particle.currentY;
    const frequency = 0.02 + Math.random() * 0.03;
    const amplitude = 30 + Math.random() * 40;
    const duration = 4000 + Math.random() * 2000;

    const animate = () => {
      const newX = Math.random() * width;
      particle.currentX = newX;
      
      particle.x.setValue(newX);
      particle.opacity.setValue(0.6);

      Animated.parallel([
        Animated.timing(particle.y, {
          toValue: baseY + amplitude,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0.2,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        particle.currentY = baseY - 100;
        particle.y.setValue(particle.currentY);
        animate();
      });
    };

    animate();
  };

  const animateFeathers = (particle: Particle) => {
    const duration = 5000 + Math.random() * 3000;

    const animate = () => {
      const newX = Math.random() * width;
      particle.currentX = newX;
      particle.currentY = -50;
      
      particle.y.setValue(-50);
      particle.x.setValue(newX);
      particle.opacity.setValue(0.7 + Math.random() * 0.3);
      particle.rotation.setValue(0);
      particle.scale.setValue(0.6 + Math.random() * 0.4);

      const swayAmount = 50;

      Animated.parallel([
        Animated.timing(particle.y, {
          toValue: height + 50,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(particle.x, {
            toValue: newX + swayAmount,
            duration: duration / 2.5,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: newX - swayAmount,
            duration: duration / 2.5,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: newX,
            duration: duration / 2.5,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.rotation, {
              toValue: 180,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(particle.rotation, {
              toValue: 360,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start(() => animate());
    };

    animate();
  };

  const animatePetals = (particle: Particle) => {
    const duration = 3500 + Math.random() * 2000;

    const animate = () => {
      const newX = Math.random() * width;
      particle.currentX = newX;
      particle.currentY = -50;
      
      particle.y.setValue(-50);
      particle.x.setValue(newX);
      particle.opacity.setValue(0.8 + Math.random() * 0.2);
      particle.rotation.setValue(0);

      const swayAmount = 35;

      Animated.parallel([
        Animated.timing(particle.y, {
          toValue: height + 50,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(particle.x, {
            toValue: newX + swayAmount,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: newX - swayAmount,
            duration: duration / 3,
            useNativeDriver: true,
          }),
          Animated.timing(particle.x, {
            toValue: newX,
            duration: duration / 3,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(particle.rotation, {
          toValue: 720,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };

    animate();
  };

  const animateLightning = (particle: Particle) => {
    const duration = 150 + Math.random() * 100;
    const holdDuration = 3000 + Math.random() * 2000;

    const animate = () => {
      particle.opacity.setValue(0);

      Animated.sequence([
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: holdDuration,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 1,
          duration: duration / 3,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: duration / 3,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0.8,
          duration: duration / 3,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ]).start(() => {
        const newX = Math.random() * width;
        const newY = Math.random() * (height * 0.4);
        particle.x.setValue(newX);
        particle.y.setValue(newY);
        particle.currentX = newX;
        particle.currentY = newY;
        animate();
      });
    };

    animate();
  };

  const animatePlasma = (particle: Particle) => {
    const duration = 2000 + Math.random() * 1500;

    const animate = () => {
      const targetX = Math.random() * width;
      const targetY = Math.random() * height;

      particle.opacity.setValue(0.8);
      particle.scale.setValue(0.6);
      particle.rotation.setValue(0);

      Animated.parallel([
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
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.scale, {
              toValue: 1.4,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 0.6,
              duration: 300,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.opacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0.5,
              duration: 200,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.timing(particle.rotation, {
          toValue: 360,
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

  const animateCrystals = (particle: Particle) => {
    const duration = 3000 + Math.random() * 2000;
    const centerX = Math.random() * width;
    const centerY = Math.random() * (height * 0.5) + height * 0.25;
    const radius = 60 + Math.random() * 100;
    const angle = Math.random() * Math.PI * 2;

    const animate = () => {
      const targetX = centerX + Math.cos(angle) * radius;
      const targetY = centerY + Math.sin(angle) * radius;

      particle.opacity.setValue(0.9 + Math.random() * 0.1);
      particle.scale.setValue(0.5 + Math.random() * 0.5);
      particle.rotation.setValue(0);

      Animated.parallel([
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
        Animated.loop(
          Animated.sequence([
            Animated.timing(particle.opacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0.6,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        ),
        Animated.timing(particle.rotation, {
          toValue: 360,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        const newAngle = Math.random() * Math.PI * 2;
        const newRadius = 60 + Math.random() * 100;
        const newX = centerX + Math.cos(newAngle) * newRadius;
        const newY = centerY + Math.sin(newAngle) * newRadius;
        particle.x.setValue(newX);
        particle.y.setValue(newY);
        particle.currentX = newX;
        particle.currentY = newY;
        animate();
      });
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
      case 'leaves':
        size = 7;
        shape = { borderRadius: 1 };
        break;
      case 'sparkles':
        size = 5;
        shape = { borderRadius: 2.5 };
        break;
      case 'rain':
        size = 2;
        shape = { borderRadius: 1 };
        break;
      case 'smoke':
        size = 12;
        shape = { borderRadius: 6 };
        break;
      case 'orbs':
        size = 8;
        shape = { borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' };
        break;
      case 'dust':
        size = 3;
        shape = { borderRadius: 1.5 };
        break;
      case 'waves':
        size = 5;
        shape = { borderRadius: 2.5 };
        break;
      case 'feathers':
        size = 9;
        shape = { borderRadius: 1 };
        break;
      case 'petals':
        size = 6;
        shape = { borderRadius: 3 };
        break;
      case 'lightning':
        size = 4;
        shape = { borderRadius: 2 };
        break;
      case 'plasma':
        size = 7;
        shape = { borderRadius: 3.5 };
        break;
      case 'crystals':
        size = 5;
        shape = { borderRadius: 1 };
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
// components/Interface/theme-animations.tsx
import { FriendCardTheme } from '@/constants/friend-card-themes';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View, ViewStyle } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ThemeAnimationsProps {
  theme: FriendCardTheme;
  containerStyle?: ViewStyle;
}

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotation?: Animated.Value;
  initialX: number; // Store initial X value
}

export default function ThemeAnimations({ theme, containerStyle }: ThemeAnimationsProps) {
  const particles = useRef<Particle[]>([]);
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!theme.animated) return;

    // Initialize particles
    if (theme.particles) {
      particles.current = Array.from({ length: theme.particles.count }, (_, i) => {
        const initialX = Math.random() * 100;
        return {
          id: i,
          x: new Animated.Value(initialX),
          y: new Animated.Value(Math.random() * 100),
          opacity: new Animated.Value(Math.random() * 0.5 + 0.3),
          scale: new Animated.Value(Math.random() * 0.5 + 0.5),
          rotation: new Animated.Value(Math.random() * 360),
          initialX, // Store the initial value
        };
      });

      // Animate particles
      particles.current.forEach((particle) => {
        animateParticle(particle, theme.particles!.type);
      });
    }

    // Shimmer animation
    if (theme.animationType === 'shimmer') {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: (theme.animationSpeed || 3) * 1000,
          useNativeDriver: true,
        })
      ).start();
    }

    // Wave animation
    if (theme.animationType === 'wave') {
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: (theme.animationSpeed || 2) * 1000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [theme]);

  const animateParticle = (particle: Particle, type: string) => {
    const duration = 3000 + Math.random() * 2000;
    const delay = Math.random() * 1000;

    switch (type) {
      case 'stars':
      case 'sparkles':
        // Twinkling effect
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(particle.opacity, {
              toValue: 1,
              duration: duration / 2,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0.2,
              duration: duration / 2,
              useNativeDriver: true,
            }),
          ])
        ).start();
        break;

      case 'bubbles':
        // Rising bubbles
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(particle.y, {
                toValue: -20,
                duration: duration,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(particle.opacity, {
                  toValue: 0.8,
                  duration: duration / 4,
                  useNativeDriver: true,
                }),
                Animated.timing(particle.opacity, {
                  toValue: 0,
                  duration: (duration * 3) / 4,
                  useNativeDriver: true,
                }),
              ]),
            ]),
            Animated.timing(particle.y, {
              toValue: 100,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
        break;

      case 'snow':
      case 'petals':
      case 'leaves':
        // Falling effect with sway
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(particle.y, {
                toValue: 120,
                duration: duration,
                useNativeDriver: true,
              }),
              Animated.sequence([
                Animated.timing(particle.x, {
                  toValue: particle.initialX + 20,
                  duration: duration / 2,
                  useNativeDriver: true,
                }),
                Animated.timing(particle.x, {
                  toValue: particle.initialX - 20,
                  duration: duration / 2,
                  useNativeDriver: true,
                }),
              ]),
              ...(particle.rotation
                ? [
                    Animated.timing(particle.rotation, {
                      toValue: 360,
                      duration: duration,
                      useNativeDriver: true,
                    }),
                  ]
                : []),
            ]),
            Animated.parallel([
              Animated.timing(particle.y, {
                toValue: -20,
                duration: 0,
                useNativeDriver: true,
              }),
              Animated.timing(particle.x, {
                toValue: Math.random() * 100,
                duration: 0,
                useNativeDriver: true,
              }),
            ]),
          ])
        ).start();
        break;

      case 'flames':
        // Rising flames
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(particle.y, {
                toValue: -30,
                duration: duration,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: duration,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 0.2,
                duration: duration,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(particle.y, {
                toValue: 100,
                duration: 0,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0.8,
                duration: 0,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 1,
                duration: 0,
                useNativeDriver: true,
              }),
            ]),
          ])
        ).start();
        break;

      case 'lightning':
        // Lightning flashes
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay + Math.random() * 3000),
            Animated.timing(particle.opacity, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0.8,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ])
        ).start();
        break;

      case 'code':
        // Matrix-style falling code
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(particle.y, {
              toValue: 120,
              duration: duration * 0.8,
              useNativeDriver: true,
            }),
            Animated.timing(particle.y, {
              toValue: -20,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ).start();
        break;
    }
  };

  const renderParticles = () => {
    if (!theme.particles) return null;

    return particles.current.map((particle) => {
      const particleColor =
        theme.particles!.colors[Math.floor(Math.random() * theme.particles!.colors.length)];

      const translateX = particle.x.interpolate({
        inputRange: [0, 100],
        outputRange: [0, SCREEN_WIDTH],
      });

      const translateY = particle.y.interpolate({
        inputRange: [-20, 120],
        outputRange: [-20, 120],
      });

      let particleContent;
      switch (theme.particles!.type) {
        case 'stars':
        case 'sparkles':
          particleContent = (
            <View
              style={[
                styles.particle,
                { backgroundColor: particleColor, width: 4, height: 4, borderRadius: 2 },
              ]}
            />
          );
          break;

        case 'bubbles':
          particleContent = (
            <View
              style={[
                styles.particle,
                {
                  backgroundColor: particleColor,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
              ]}
            />
          );
          break;

        case 'snow':
          particleContent = (
            <View style={[styles.particle, { backgroundColor: particleColor, width: 5, height: 5, borderRadius: 2.5 }]} />
          );
          break;

        case 'petals':
        case 'leaves':
          particleContent = (
            <View
              style={[
                styles.particle,
                {
                  backgroundColor: particleColor,
                  width: 6,
                  height: 8,
                  borderRadius: 3,
                },
              ]}
            />
          );
          break;

        case 'flames':
          particleContent = (
            <View
              style={[
                styles.particle,
                {
                  backgroundColor: particleColor,
                  width: 6,
                  height: 10,
                  borderTopLeftRadius: 5,
                  borderTopRightRadius: 5,
                },
              ]}
            />
          );
          break;

        case 'lightning':
          particleContent = (
            <View
              style={[
                styles.particle,
                {
                  backgroundColor: particleColor,
                  width: 2,
                  height: 40,
                },
              ]}
            />
          );
          break;

        case 'code':
          particleContent = (
            <View style={[styles.particle, { backgroundColor: particleColor, width: 2, height: 12 }]} />
          );
          break;

        default:
          particleContent = (
            <View style={[styles.particle, { backgroundColor: particleColor, width: 4, height: 4, borderRadius: 2 }]} />
          );
      }

      return (
        <Animated.View
          key={particle.id}
          style={[
            styles.particleContainer,
            {
              transform: [
                { translateX },
                { translateY },
                { scale: particle.scale },
                ...(particle.rotation
                  ? [
                      {
                        rotate: particle.rotation.interpolate({
                          inputRange: [0, 360],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ]
                  : []),
              ],
              opacity: particle.opacity,
            },
          ]}
        >
          {particleContent}
        </Animated.View>
      );
    });
  };

  const renderShimmer = () => {
    if (theme.animationType !== 'shimmer') return null;

    const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
    });

    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.2)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    );
  };

  const renderWave = () => {
    if (theme.animationType !== 'wave') return null;

    const colors = theme.gradientColors || ['#ff0000', '#00ff00', '#0000ff'];
    
    return (
      <Animated.View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={colors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    );
  };

  const renderMatrix = () => {
    if (theme.animationType !== 'matrix') return null;

    return (
      <View style={StyleSheet.absoluteFillObject}>
        {renderParticles()}
      </View>
    );
  };

  const renderOverlayPattern = () => {
    if (!theme.overlayPattern) return null;

    let patternContent;
    switch (theme.overlayPattern) {
      case 'grid':
        patternContent = (
          <View style={styles.gridPattern}>
            {Array.from({ length: 10 }).map((_, i) => (
              <View key={i} style={styles.gridLine} />
            ))}
          </View>
        );
        break;
      case 'dots':
        patternContent = (
          <View style={styles.dotsPattern}>
            {Array.from({ length: 50 }).map((_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        );
        break;
      default:
        patternContent = null;
    }

    return (
      <View style={[StyleSheet.absoluteFillObject, { opacity: 0.1 }]}>
        {patternContent}
      </View>
    );
  };

  return (
    <View style={[StyleSheet.absoluteFillObject, containerStyle]} pointerEvents="none">
      {renderWave()}
      {renderShimmer()}
      {renderMatrix()}
      {theme.animationType === 'particles' && renderParticles()}
      {renderOverlayPattern()}
    </View>
  );
}

const styles = StyleSheet.create({
  particleContainer: {
    position: 'absolute',
  },
  particle: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  gridPattern: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridLine: {
    width: 1,
    height: '100%',
    backgroundColor: '#fff',
  },
  dotsPattern: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 5,
  },
  dot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#fff',
    margin: 5,
  },
});
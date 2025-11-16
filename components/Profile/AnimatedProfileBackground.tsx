// components/Profile/AnimatedProfileBackground.tsx
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface AnimatedProfileBackgroundProps {
  colors: string[];
  themeId: string;
}

export default function AnimatedProfileBackground({
  colors,
  themeId,
}: AnimatedProfileBackgroundProps) {
  const animatedValue1 = useRef(new Animated.Value(0)).current;
  const animatedValue2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (themeId === 'aurora') {
      startAuroraAnimation();
    } else if (themeId === 'neon') {
      startNeonAnimation();
    }

    return () => {
      animatedValue1.stopAnimation();
      animatedValue2.stopAnimation();
    };
  }, [themeId]);

  const startAuroraAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(animatedValue1, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue1, {
            toValue: 0,
            duration: 4000,
            useNativeDriver: false,
          }),
        ]),
        Animated.sequence([
          Animated.timing(animatedValue2, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue2, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: false,
          }),
        ]),
      ])
    ).start();
  };

  const startNeonAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue1, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue1, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  if (themeId === 'aurora') {
    const interpolatedColors1 = animatedValue1.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(0, 255, 170, 0.1)', 'rgba(0, 255, 170, 0.3)'],
    });

    const interpolatedColors2 = animatedValue2.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(0, 212, 255, 0.1)', 'rgba(0, 212, 255, 0.3)'],
    });

    return (
      <>
        <LinearGradient
          colors={colors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.auroraLayer1,
            { backgroundColor: interpolatedColors1 },
          ]}
        />
        <Animated.View
          style={[
            styles.auroraLayer2,
            { backgroundColor: interpolatedColors2 },
          ]}
        />
      </>
    );
  }

  if (themeId === 'neon') {
    const interpolatedOpacity = animatedValue1.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.3, 0.6, 0.3],
    });

    return (
      <>
        <LinearGradient
          colors={colors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            styles.neonGlow,
            {
              opacity: interpolatedOpacity,
              shadowColor: '#ff00ff',
              shadowOpacity: interpolatedOpacity,
            },
          ]}
        />
      </>
    );
  }

  return (
    <LinearGradient
      colors={colors as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  auroraLayer1: {
    position: 'absolute',
    top: '10%',
    left: '-20%',
    right: '-20%',
    height: '30%',
    borderRadius: 999,
    transform: [{ rotate: '-15deg' }],
  },
  auroraLayer2: {
    position: 'absolute',
    bottom: '20%',
    left: '-10%',
    right: '-10%',
    height: '25%',
    borderRadius: 999,
    transform: [{ rotate: '10deg' }],
  },
  neonGlow: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    right: '10%',
    bottom: '25%',
    backgroundColor: 'transparent',
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
});
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
  const animatedValue3 = useRef(new Animated.Value(0)).current;
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      animatedValue1.stopAnimation();
      animatedValue2.stopAnimation();
      animatedValue3.stopAnimation();
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    switch (themeId) {
      case 'aurora':
        startAuroraAnimation();
        break;
      case 'neon':
        startNeonAnimation();
        break;
      case 'cyberpunk_pink':
        startCyberpunkAnimation();
        break;
      case 'desert':
        startDesertAnimation();
        break;
      case 'sunrise':
        startSunriseAnimation();
        break;
    }

    return () => {
      animatedValue1.stopAnimation();
      animatedValue2.stopAnimation();
      animatedValue3.stopAnimation();
    };
  }, [themeId, isReady]);

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

  const startCyberpunkAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(animatedValue1, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue1, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
        Animated.sequence([
          Animated.timing(animatedValue2, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue2, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ]),
      ])
    ).start();
  };

  const startDesertAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue1, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue1, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  };

  const startSunriseAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(animatedValue1, {
            toValue: 1,
            duration: 3500,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue1, {
            toValue: 0,
            duration: 3500,
            useNativeDriver: false,
          }),
        ]),
        Animated.sequence([
          Animated.timing(animatedValue2, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: false,
          }),
          Animated.timing(animatedValue2, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: false,
          }),
        ]),
      ])
    ).start();
  };

  // Aurora Borealis animation
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

  // Neon City animation
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

  // Cyberpunk Pink animation
  if (themeId === 'cyberpunk_pink') {
    const interpolatedOpacity1 = animatedValue1.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.2, 0.5, 0.2],
    });

    const interpolatedOpacity2 = animatedValue2.interpolate({
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
            styles.cyberpunkGlow1,
            {
              opacity: interpolatedOpacity1,
              shadowColor: '#ff00ff',
              shadowOpacity: interpolatedOpacity1,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.cyberpunkGlow2,
            {
              opacity: interpolatedOpacity2,
              shadowColor: '#00ffff',
              shadowOpacity: interpolatedOpacity2,
            },
          ]}
        />
      </>
    );
  }

  // Desert Mirage animation
  if (themeId === 'desert') {
    const interpolatedScale = animatedValue1.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.95, 1.05, 0.95],
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
            styles.desertShimmer,
            {
              transform: [{ scaleY: interpolatedScale }],
            },
          ]}
        />
      </>
    );
  }

  // Sunrise animation
  if (themeId === 'sunrise') {
    const interpolatedOpacity1 = animatedValue1.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255, 107, 53, 0.1)', 'rgba(255, 107, 53, 0.25)'],
    });

    const interpolatedOpacity2 = animatedValue2.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255, 214, 10, 0.05)', 'rgba(255, 214, 10, 0.2)'],
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
            styles.sunriseRay1,
            { backgroundColor: interpolatedOpacity1 },
          ]}
        />
        <Animated.View
          style={[
            styles.sunriseRay2,
            { backgroundColor: interpolatedOpacity2 },
          ]}
        />
      </>
    );
  }

  // Default: just the gradient
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
  // Aurora styles
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

  // Neon styles
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

  // Cyberpunk styles
  cyberpunkGlow1: {
    position: 'absolute',
    top: '20%',
    left: '5%',
    right: '30%',
    height: '35%',
    borderRadius: 999,
    backgroundColor: 'transparent',
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
  },
  cyberpunkGlow2: {
    position: 'absolute',
    bottom: '15%',
    right: '5%',
    left: '30%',
    height: '30%',
    borderRadius: 999,
    backgroundColor: 'transparent',
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },

  // Desert styles
  desertShimmer: {
    position: 'absolute',
    bottom: '15%',
    left: '0%',
    right: '0%',
    height: '20%',
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
  },

  // Sunrise styles
  sunriseRay1: {
    position: 'absolute',
    top: '5%',
    left: '20%',
    right: '20%',
    height: '40%',
    borderRadius: 999,
  },
  sunriseRay2: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    right: '10%',
    height: '35%',
    borderRadius: 999,
  },
});
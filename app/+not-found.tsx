import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/Default/ThemedText';
import { ThemedView } from '@/components/Default/ThemedView';

const { width } = Dimensions.get('window');

export default function NotFoundScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotation animation for planet
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const handleGoHome = () => {
    router.back();
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Lost in Space', headerShown: false }} />
      <LinearGradient
        colors={['#0a0e27', '#1a1b3d', '#2a1b4d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Animated Stars Background */}
        <ThemedView style={styles.starsContainer}>
          {[...Array(30)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.star,
                {
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.random() * 0.5 + 0.3],
                  }),
                },
              ]}
            />
          ))}
        </ThemedView>

        {/* Floating Planets in Background */}
        <Animated.View
          style={[
            styles.planetBackground,
            {
              transform: [{ rotate: spin }],
              opacity: 0.15,
            },
          ]}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.planet}
          />
        </Animated.View>

        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: floatAnim }
              ]
            }
          ]}
        >
          {/* Astronaut/Rocket Icon Badge with Gradient */}
          <LinearGradient
            colors={['#4facfe', '#00f2fe', '#667eea']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBadge}
          >
            <Ionicons name="rocket" size={60} color="#ffffff" />
          </LinearGradient>

          {/* Error Code - Fixed sizing */}
          <ThemedText style={styles.errorCode}>404</ThemedText>

          {/* Title */}
          <ThemedText style={styles.title}>Lost in Space</ThemedText>

          {/* Description */}
          <ThemedText style={styles.description}>
            Houston, we have a problem! This page drifted away into the cosmic void.
          </ThemedText>

          {/* Info Card - Space themed */}
          <Animated.View style={[styles.infoCard, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['rgba(79, 172, 254, 0.15)', 'rgba(102, 126, 234, 0.15)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.infoCardGradient}
            >
              <Ionicons name="planet-outline" size={24} color="#4facfe" />
              <ThemedText style={styles.infoText}>
                Navigate back to Earth (home screen) and continue your journey through the app.
              </ThemedText>
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        {/* Bottom Button */}
        <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleGoHome}
            style={styles.button}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2', '#f093fb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Ionicons name="home" size={24} color="#ffffff" />
              <ThemedText style={styles.buttonText}>Return to Earth</ThemedText>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  starsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  planetBackground: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 250,
    height: 250,
  },
  planet: {
    width: '100%',
    height: '100%',
    borderRadius: 125,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  iconBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#4facfe',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  errorCode: {
    fontSize: 64,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: 8,
    lineHeight: 80,
    textShadowColor: 'rgba(102, 126, 234, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(102, 126, 234, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  description: {
    fontSize: 15,
    color: '#b8b9d4',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  infoCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
    shadowColor: '#4facfe',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  infoCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 5,
  borderColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 18,
    
  },
  infoText: {
    fontSize: 14,
    color: '#d1d2e8',
    lineHeight: 20,
    flex: 1,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  button: {
    width: '100%',
    shadowColor: '#764ba2',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
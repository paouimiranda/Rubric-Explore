import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Particle component for floating stars
const Particle: React.FC<{ delay: number; duration: number; startX: number }> = ({
  delay,
  duration,
  startX,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -height * 0.4,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: duration * 0.2,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: duration * 0.3,
              delay: duration * 0.5,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: startX,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Ionicons name="star" size={12} color="#4facfe" />
    </Animated.View>
  );
};

const ExploreTeaser: React.FC = () => {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
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

    // Pulsing glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleBackToHome = () => {
    router.push('/screens/HomeScreen');
  };

  return (
    <LinearGradient colors={['#0A1C3C', '#1a2f4f', '#324762']} style={styles.container}>
      {/* Background pattern */}
      <View style={styles.backgroundPattern}>
        {Array.from({ length: 8 }).map((_, i) =>
          Array.from({ length: 12 }).map((_, j) => (
            <View
              key={`${i}-${j}`}
              style={[
                styles.dot,
                {
                  left: j * (width / 11),
                  top: i * (height / 7),
                },
              ]}
            />
          ))
        )}
      </View>

      {/* Floating particles */}
      <Particle delay={0} duration={4000} startX={width * 0.2} />
      <Particle delay={800} duration={5000} startX={width * 0.5} />
      <Particle delay={1600} duration={4500} startX={width * 0.8} />
      <Particle delay={400} duration={5500} startX={width * 0.35} />
      <Particle delay={1200} duration={4200} startX={width * 0.65} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ translateY: floatAnim }],
            },
          ]}
        >
          {/* Pulsing glow background */}
          <Animated.View
            style={[
              styles.glowCircle,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <LinearGradient
            colors={['#4facfe', '#00f2fe']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconBadge}
          >
            <Ionicons name="compass" size={60} color="#ffffff" />
          </LinearGradient>
        </Animated.View>

        <View style={styles.glassCard}>
          <Text style={styles.title}>Explore is Almost Here!</Text>
          <Text style={styles.subtitle}>
            Join the conquest for learning! Discover general knowledge quizzes soon!
          </Text>

          <View style={styles.featureContainer}>
            <View style={styles.featureRow}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featureIcon}
              >
                <Ionicons name="trophy" size={24} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.featureText}>Earn achievements</Text>
            </View>

            <View style={styles.featureRow}>
              <LinearGradient
                colors={['#f093fb', '#f5576c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featureIcon}
              >
                <Ionicons name="book" size={24} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.featureText}>Diverse topics</Text>
            </View>

            <View style={styles.featureRow}>
              <LinearGradient
                colors={['#fa709a', '#fee140']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featureIcon}
              >
                <Ionicons name="sparkles" size={24} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.featureText}>Master new knowledge</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={styles.progressDot} />
          </View>

          <Text style={styles.stayTuned}>Feature in progress. Stay tuned!</Text>
          
          {/* <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Coming in v2.0</Text>
          </View> */}
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.buttonContainer,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity activeOpacity={0.8} onPress={handleBackToHome}>
          <LinearGradient
            colors={['#4facfe', '#00f2fe']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Ionicons name="home" size={24} color="#ffffff" />
            <Text style={styles.buttonText}>Back to Home</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.15,
  },
  dot: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#ffffff',
  },
  particle: {
    position: 'absolute',
    bottom: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#4facfe',
    opacity: 0.3,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
  iconBadge: {
    width: 120,
    height: 120,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 35,
    width: width - 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
     maxHeight: 440,
  },
  title: {
    fontFamily: 'Montserrat',
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Montserrat',
    fontSize: 15,
    fontWeight: '400',
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 10,
  },
  featureContainer: {
    width: '100%',
    marginBottom: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureText: {
    fontFamily: 'Montserrat',
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 4,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#4facfe',
  },
  stayTuned: {
    fontFamily: 'Montserrat',
    fontSize: 14,
    fontWeight: '600',
    color: '#4facfe',
    textAlign: 'center',
    marginBottom: 16,
  },
  versionBadge: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  versionText: {
    fontFamily: 'Montserrat',
    fontSize: 12,
    fontWeight: '600',
    color: '#4facfe',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    marginTop: 30,
  },
  button: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    fontFamily: 'Montserrat',
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 12,
  },
});

export default ExploreTeaser;
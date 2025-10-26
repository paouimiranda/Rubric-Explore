import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function CheckEmailScreen() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const router = useRouter();
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    // Icon scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Content fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      delay: 200,
      useNativeDriver: true,
    }).start();

    // Pulse animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient
      colors={['#0A1C3C', '#324762']}
      style={styles.gradient}
    >
      <View style={styles.container}>
        {/* Animated Icon Badge */}
        <Animated.View 
          style={[
            styles.iconContainer,
            { 
              transform: [
                { scale: scaleAnim },
                { scale: pulseAnim }
              ] 
            }
          ]}
        >
          <LinearGradient
            colors={['#4facfe', '#00f2fe']}
            style={styles.iconBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="mail-open" size={60} color="#ffffff" />
          </LinearGradient>
          
          {/* Decorative rings */}
          <View style={[styles.ring, styles.ring1]} />
          <View style={[styles.ring, styles.ring2]} />
        </Animated.View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Check Your Mail</Text>
          <Text style={styles.text}>
            We've sent a verification link to your new email address.{"\n\n"}
            Please check your inbox and click the link to confirm your change.
          </Text>

          {/* Success indicators */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.checkCircle}>
                <Ionicons name="checkmark" size={16} color="#ffffff" />
              </View>
              <Text style={styles.infoText}>Email sent successfully</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.checkCircle}>
                <Ionicons name="time" size={16} color="#ffffff" />
              </View>
              <Text style={styles.infoText}>Link expires in 24 hours</Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={() => router.push("/screens/HomeScreen")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.button}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="home" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.linkButton}
          >
            <Ionicons name="refresh" size={16} color="#4facfe" style={{ marginRight: 6 }} />
            <Text style={styles.linkText}>Didn't get the email? Resend</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  iconBadge: {
    width: 120,
    height: 120,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 10,
  },
  ring: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  ring1: {
    width: 140,
    height: 140,
    top: -10,
    left: -10,
  },
  ring2: {
    width: 160,
    height: 160,
    top: -20,
    left: -20,
    borderColor: 'rgba(79, 172, 254, 0.2)',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  text: {
    color: "#aaa",
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  infoCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4caf50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  button: {
    width: "100%",
    height: 56,
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  linkText: {
    color: "#4facfe",
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
    textAlign: "center",
  },
});
// app/screens/Misc/loading.tsx
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const LoadingScreen = () => {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const animationRef = useRef<LottieView>(null);

  useEffect(() => {
    animationRef.current?.play();
  }, []);

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated) {
      router.replace('/screens/HomeScreen');
    } else {
      router.replace('/');
    }
  }, [loading, isAuthenticated]);

  return (
    <View style={styles.container}>
      <LottieView
        ref={animationRef}
        source={require('../../../assets/animations/quiz-loading.json')}
        autoPlay
        loop
        style={styles.animation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A2D4B',
  },
  animation: {
    width: 200,
    height: 200,
  },
});

export default LoadingScreen;
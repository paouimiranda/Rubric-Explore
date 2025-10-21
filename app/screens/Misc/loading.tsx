import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function LoadingScreen() {
  const animation = useRef<LottieView>(null);
  const router = useRouter();

  const scaleAnim = useRef(new Animated.Value(0)).current; // for pop-in
  const opacityAnim = useRef(new Animated.Value(1)).current; // for fade-out

  useFocusEffect(
    React.useCallback(() => {
      // ✅ Reset animated values every time screen is focused
      scaleAnim.setValue(0);
      opacityAnim.setValue(1);

      animation.current?.play();

      // Pop-in entrance
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 100,
      }).start();

      // Fade out and navigate after 2.5s
      const timeout = setTimeout(() => {
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          router.replace('../HomeScreen');
        });
      }, 2500);

      return () => clearTimeout(timeout);
    }, [])
  );

  return (
    <LinearGradient
      colors={['#324762', '#0A1C3C']}
      start={{x: 1, y: 1}}
      end={{ x: 1, y: 0 }}
      style={{ flex: 1}}
    >
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.animationWrapper,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <LottieView
          ref={animation}
          source={require('@/assets/animations/quiz-loading.json')} // adjust path
          autoPlay
          loop={false}
          style={styles.animation}
        />
      </Animated.View>
    </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: width * 0.9,
    height: width * 0.9,
  },
});

import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { BACKLOG_EVENTS } from "@/services/backlogEvents";
import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { loginUser } from '../services/auth-service';

const { width, height } = Dimensions.get('window');

type ErrorType = 'validation' | 'credentials' | 'network' | 'unknown';

interface ErrorState {
  visible: boolean;
  type: ErrorType;
  title: string;
  message: string;
}

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
}

const LoginScreen = () => {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [error, setError] = useState<ErrorState>({
    visible: false,
    type: 'unknown',
    title: '',
    message: '',
  });
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  const { addBacklogEvent } = useBacklogLogger();
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const logoFloatAnim = useRef(new Animated.Value(0)).current;
  const backgroundColorAnim = useRef(new Animated.Value(0)).current;
  
  // Floating label animations
  const emailLabelAnim = useRef(new Animated.Value(0)).current;
  const passwordLabelAnim = useRef(new Animated.Value(0)).current;
  
  // Input border glow animations
  const emailBorderAnim = useRef(new Animated.Value(0)).current;
  const passwordBorderAnim = useRef(new Animated.Value(0)).current;
  
  // Success checkmark
  const emailCheckAnim = useRef(new Animated.Value(0)).current;
  
  // Button shimmer effect
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const router = useRouter();

  // Animated gradient background
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundColorAnim, {
          toValue: 1,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(backgroundColorAnim, {
          toValue: 0,
          duration: 8000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  // Logo floating animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloatAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloatAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Button shimmer animation
  useEffect(() => {
    if (!isLoading) {
      Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isLoading]);

  // Email focus animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(emailLabelAnim, {
        toValue: emailFocused || email ? 1 : 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(emailBorderAnim, {
        toValue: emailFocused ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [emailFocused, email]);

  // Password focus animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(passwordLabelAnim, {
        toValue: passwordFocused || password ? 1 : 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(passwordBorderAnim, {
        toValue: passwordFocused ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [passwordFocused, password]);

  // Email validation checkmark
  useEffect(() => {
    const isValid = email.includes('@') && email.includes('.');
    Animated.spring(emailCheckAnim, {
      toValue: isValid && email ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [email]);

  // Particle explosion effect
  const createParticles = () => {
    const newParticles: Particle[] = Array.from({ length: 30 }, (_, i) => ({
      id: Date.now() + i,
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
    }));

    setParticles(newParticles);

    newParticles.forEach((particle, index) => {
      const angle = (index / newParticles.length) * Math.PI * 2;
      const velocity = 100 + Math.random() * 100;
      const targetX = Math.cos(angle) * velocity;
      const targetY = Math.sin(angle) * velocity;

      Animated.parallel([
        Animated.timing(particle.x, {
          toValue: targetX,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: targetY,
          duration: 1000,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    });

    setTimeout(() => setParticles([]), 1000);
  };

  // Shake animation for errors
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleResendVerification = async () => {
    try {
      const userData = await loginUser(email.trim().toLowerCase(), password);
      
      const response = await fetch('https://api-m2tvqc6zqq-uc.a.run.app/resendVerificationEmail', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: userData.uid }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'Verification email sent! Please check your inbox.');
      } else {
        const result = await response.json();
        Alert.alert('Error', result.error || 'Failed to resend verification email');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend verification email');
    }
  };

  useEffect(() => {
    if (error.visible) {
      Animated.parallel([
        Animated.timing(modalFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalScaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalFadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalScaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [error.visible]);

  const showError = (type: ErrorType, title: string, message: string) => {
    triggerShake();
    setError({ visible: true, type, title, message });
  };

  const hideError = () => {
    setError({ ...error, visible: false });
  };
   
  const validateForm = () => {
    if (!email.trim()) {
      showError('validation', 'Email Required', 'Please enter your email address to continue.');
      return false;
    }
    if (!email.includes('@')) {
      showError('validation', 'Invalid Email', 'Please enter a valid email address with an @ symbol.');
      return false;
    }
    if (!password) {
      showError('validation', 'Password Required', 'Please enter your password to continue.');
      return false;
    }
    if (password.length < 6) {
      showError('validation', 'Password Too Short', 'Password must be at least 6 characters long.');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const userData = await loginUser(email.trim().toLowerCase(), password);
      
      if (!userData.isVerified) {
        setIsLoading(false);
        showError(
          'validation',
          'Email Not Verified',
          'Please verify your email address before logging in. Check your inbox for the verification link.'
        );
        return;
      }

      // Create particle explosion on success
      createParticles();
      
      setTimeout(() => {
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 1200);

      addBacklogEvent(BACKLOG_EVENTS.LOGIN_SESSION, { email: email.toLowerCase() });
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        showError(
          'credentials',
          'Invalid Credentials',
          'The email or password you entered is incorrect. Please try again.'
        );
      } else if (error.code === 'auth/network-request-failed') {
        showError(
          'network',
          'Connection Error',
          'Unable to connect to the server. Please check your internet connection and try again.'
        );
      } else if (error.code === 'auth/too-many-requests') {
        showError(
          'credentials',
          'Too Many Attempts',
          'Too many failed login attempts. Please try again later or reset your password.'
        );
      } else {
        showError(
          'unknown',
          'Something Went Wrong',
          'An unexpected error occurred. Please try again later.'
        );
      }
      addBacklogEvent("login_error", { 
        email: email.toLowerCase(), 
        errorCode: error.code,  
      });
      opacityAnim.setValue(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('./screens/User/register');
  };

  const handleForgotPassword = () => {
    router.push('./screens/User/forgot-password');
  };

  const getErrorIcon = () => {
    switch (error.type) {
      case 'validation':
        return 'alert-circle';
      case 'credentials':
        return 'lock-closed';
      case 'network':
        return 'cloud-offline';
      default:
        return 'warning';
    }
  };

  const getErrorGradient = (): [string, string] => {
    switch (error.type) {
      case 'validation':
        return ['#f59e0b', '#f97316'];
      case 'credentials':
        return ['#ef4444', '#dc2626'];
      case 'network':
        return ['#8b5cf6', '#7c3aed'];
      default:
        return ['#6b7280', '#4b5563'];
    }
  };

  const backgroundGradientColors = backgroundColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1A2D4B', '#2D4A6B']
  });

  const logoTranslateY = logoFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20]
  });

  const emailBorderColor = emailBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.3)', '#52F7E2']
  });

  const passwordBorderColor = passwordBorderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.3)', '#52F7E2']
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width]
  });

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={['#1A2D4B', '#314661']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Animated.View style={[{ opacity: opacityAnim, transform: [{ translateX: shakeAnim }] }, styles.formContainer]}>
          {/* Floating Logo */}
          <Animated.View style={{ transform: [{ translateY: logoTranslateY }] }}>
            <Image
              source={require('../assets/images/rubric.png')}
              style={styles.logo}
            />
          </Animated.View>
          
          {/* Email Input with Floating Label */}
          <View style={styles.inputWrapper}>
            <Animated.Text
              style={[
                styles.floatingLabel,
                {
                  transform: [
                    {
                      translateY: emailLabelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, -24]
                      })
                    },
                    {
                      scale: emailLabelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.85]
                      })
                    }
                  ],
                  opacity: emailLabelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1]
                  }),
                  color: emailLabelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgba(255, 255, 255, 0.6)', '#52F7E2']
                  })
                }
              ]}
            >
              Email
            </Animated.Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={emailFocused ? '#52F7E2' : 'rgba(255, 255, 255, 0.6)'} style={styles.inputIcon} />
              <Animated.View style={[styles.inputBorderWrapper, { borderColor: emailBorderColor }]}>
                <TextInput
                  style={styles.input}
                  placeholder=""
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </Animated.View>
              <Animated.View style={[styles.checkmark, { opacity: emailCheckAnim, transform: [{ scale: emailCheckAnim }] }]}>
                <Ionicons name="checkmark-circle" size={24} color="#5EEF96" />
              </Animated.View>
            </View>
          </View>

          {/* Password Input with Floating Label */}
          <View style={styles.inputWrapper}>
            <Animated.Text
              style={[
                styles.floatingLabel,
                {
                  transform: [
                    {
                      translateY: passwordLabelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, -24]
                      })
                    },
                    {
                      scale: passwordLabelAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.85]
                      })
                    }
                  ],
                  opacity: passwordLabelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1]
                  }),
                  color: passwordLabelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['rgba(255, 255, 255, 0.6)', '#52F7E2']
                  })
                }
              ]}
            >
              Password
            </Animated.Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={passwordFocused ? '#52F7E2' : 'rgba(255, 255, 255, 0.6)'} style={styles.inputIcon} />
              <Animated.View style={[styles.inputBorderWrapper, { borderColor: passwordBorderColor }]}>
                <TextInput
                  style={styles.input}
                  placeholder=""
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
              </Animated.View>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="rgba(255, 255, 255, 0.6)" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button with Shimmer */}
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.disabledButton]} 
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#52F7E2', '#5EEF96']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#263A56" />
              ) : (
                <>
                  <Text style={styles.loginButtonText}>Log In</Text>
                  <Animated.View 
                    style={[
                      styles.shimmer,
                      { transform: [{ translateX: shimmerTranslate }] }
                    ]}
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.registerButton]} 
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Particle Effects */}
        {particles.map((particle) => (
          <Animated.View
            key={particle.id}
            style={[
              styles.particle,
              {
                transform: [
                  { translateX: particle.x },
                  { translateY: particle.y },
                  { scale: particle.scale }
                ],
                opacity: particle.opacity,
              }
            ]}
          />
        ))}

        {/* Error Modal */}
        <Modal
          visible={error.visible}
          transparent
          animationType="none"
          onRequestClose={hideError}
        >
          <Animated.View 
            style={[
              styles.modalOverlay,
              { opacity: modalFadeAnim }
            ]}
          >
            <Animated.View 
              style={[
                styles.errorModalContainer,
                {
                  opacity: modalFadeAnim,
                  transform: [{ scale: modalScaleAnim }]
                }
              ]}
            >
              <LinearGradient
                colors={['#0A1C3C', '#324762']}
                style={styles.errorModalContent}
              >
                <LinearGradient
                  colors={getErrorGradient()}
                  style={styles.errorIconBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={getErrorIcon()} size={40} color="#ffffff" />
                </LinearGradient>

                <Text style={styles.errorTitle}>{error.title}</Text>
                <Text style={styles.errorMessage}>{error.message}</Text>

                <View style={styles.errorButtons}>
                  {error.type === 'credentials' && (
                    <TouchableOpacity
                      style={styles.errorButtonWrapper}
                      onPress={() => {
                        hideError();
                        handleForgotPassword();
                      }}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.2)']}
                        style={styles.errorSecondaryButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="key" size={16} color="#667eea" />
                        <Text style={styles.errorSecondaryButtonText}>Reset Password</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  {error.title === 'Email Not Verified' && (
                    <TouchableOpacity 
                      style={styles.errorButtonWrapper}
                      onPress={handleResendVerification}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.2)']}
                        style={styles.errorSecondaryButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="mail" size={16} color="#667eea" />
                        <Text style={styles.errorSecondaryButtonText}>Resend Email</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.errorButtonWrapper, error.type !== 'credentials' && error.title !== 'Email Not Verified' && { flex: 1 }]}
                    onPress={hideError}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={getErrorGradient()}
                      style={styles.errorPrimaryButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.errorPrimaryButtonText}>
                        {error.type === 'network' ? 'Retry' : 'Got It'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          </Animated.View>
        </Modal>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  logo: {
    width: 250,
    height: 250,
    marginBottom: 40,
  },
  inputWrapper: {
    width: '85%',
    marginBottom: 30,
  },
  floatingLabel: {
    position: 'absolute',
    left: 48,
    top: 0,
    fontSize: 16,
    fontWeight: '500',
    zIndex: 1,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  inputBorderWrapper: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  input: {
    height: 50,
    paddingLeft: 44,
    paddingRight: 44,
    color: '#fff',
    fontSize: 16,
  },
  checkmark: {
    position: 'absolute',
    right: 12,
    zIndex: 2,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    padding: 8,
    zIndex: 2,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginRight: '7.5%',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#52F7E2',
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    borderRadius: 12,
    width: '85%',
    marginBottom: 15,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    padding: 16,
  },
  loginButtonText: {
    color: '#263A56',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '400',
    textAlign: 'center',
    fontSize: 16,
  },
  gradientButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#52F7E2',
    left: '50%',
    top: '50%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorModalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  errorModalContent: {
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorTitle: {
    fontSize: 22,
    fontFamily: 'Montserrat_700Bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  errorButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  errorButtonWrapper: {
    flex: 1,
  },
  errorPrimaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  errorPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  errorSecondaryButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  errorSecondaryButtonText: {
    color: '#667eea',
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
  },
});
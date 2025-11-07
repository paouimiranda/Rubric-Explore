import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
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


type ErrorType = 'validation' | 'credentials' | 'network' | 'unknown';

interface ErrorState {
  visible: boolean;
  type: ErrorType;
  title: string;
  message: string;
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
  const [showResendVerification, setShowResendVerification] = useState(false); //for resending
  const [error, setError] = useState<ErrorState>({
    visible: false,
    type: 'unknown',
    title: '',
    message: '',
  });

  const opacityAnim = useRef(new Animated.Value(1)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  const router = useRouter();


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
      
      // Check if email is verified
    if (!userData.isVerified) {
        setIsLoading(false);
        showError(
          'validation',
          'Email Not Verified',
          'Please verify your email address before logging in. Check your inbox for the verification link.'
        );
        return;
      }

      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        router.replace('./screens/Misc/loading');
      });
      
    } catch (error: any) {
      console.error('Login error:', error);
      console.log(error.code)
      
      // Determine error type and show appropriate message
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
        <Animated.View style={[{ opacity: opacityAnim }, styles.formContainer]}>
          <Image
            source={require('../assets/images/rubric.png')}
            style={{ width: 300, height: 300, marginBottom: 25 }}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#fff"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isLoading}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#fff"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!isLoading}
          />

          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, isLoading && styles.disabledButton]} 
            onPress={handleLogin}
            disabled={isLoading}
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
                <Text style={styles.loginButtonText}>Log In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.registerButton]} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Register</Text>
          </TouchableOpacity>
        </Animated.View>

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
                {/* Error Icon */}
                <LinearGradient
                  colors={getErrorGradient()}
                  style={styles.errorIconBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={getErrorIcon()} size={40} color="#ffffff" />
                </LinearGradient>

                {/* Error Title */}
                <Text style={styles.errorTitle}>{error.title}</Text>

                {/* Error Message */}
                <Text style={styles.errorMessage}>{error.message}</Text>

                {/* Action Buttons */}
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
                    <TouchableOpacity onPress={handleResendVerification}>
                      <Text style={styles.errorSecondaryButtonText}>Resend Verification Email</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.errorButtonWrapper, error.type !== 'credentials' && { flex: 1 }]}
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
  input: {
    width: '80%',
    height: 40,
    borderBottomWidth: 0.5,
    borderColor: '#fff',
    color: '#fff',
    marginBottom: 30,
    backgroundColor: 'transparent',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginRight: '10%',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#B0C4DE',
    fontSize: 14,
    textAlign: 'right',
  },
  button: {
    padding: 16,
    borderRadius: 150,
    width: '80%',
    marginBottom: 15,
  },
  disabledButton: {
    opacity: 0.6,
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fff',
    width: '70%',
  },
  loginButtonText: {
    color: '#263A56',
    textAlign: 'center',
    fontWeight: '600',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '100',
    textAlign: 'center',
  },
  gradientButton: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  // Modal Styles
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
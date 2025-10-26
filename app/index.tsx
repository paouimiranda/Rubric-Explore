import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { loginUser } from '../services/auth-service';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();
   
  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    if (!password) {
      Alert.alert('Validation Error', 'Password is required');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const userData = await loginUser(email.trim().toLowerCase(), password);
      
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        router.replace('./screens/Misc/loading');
      });
      
    } catch (error) {
      Alert.alert('Login Error');
      opacityAnim.setValue(1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = () => {
    router.push('./screens/User/register');
  };

  const handleForgotPassword = () => {
    // Changed from /screens/User/forgot-password to ./screens/User/forgot-password
    router.push('./screens/User/forgot-password');
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
            source={require('../assets/images/clover.png')}
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
});
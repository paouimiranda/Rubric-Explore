import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { registerUser } from '@/services/auth-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import TermsModal from '../Misc/t&c';

const RegisterScreen = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [year, setYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();
  const { addBacklogEvent } = useBacklogLogger();

  const getDateOfBirth = () => {
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || isNaN(d) || isNaN(y) || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > new Date().getFullYear()) {
      return null;
    }
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return null; // Invalid date, e.g., Feb 30
    }
    return date;
  };
  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);


  const validateForm = () => {
    if (!firstName.trim()) {
      Alert.alert('Validation Error', 'First name is required');
      return false;
    }
    if (!lastName.trim()) {
      Alert.alert('Validation Error', 'Last name is required');
      return false;
    }
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    if (!username.trim()) {
      Alert.alert('Validation Error', 'Username is required');
      return false;
    }
    if (username.length < 3) {
      Alert.alert('Validation Error', 'Username must be at least 3 characters long');
      return false;
    }
    if (!password) {
      Alert.alert('Validation Error', 'Password is required');
      return false;
    }
    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }
    
    const dateOfBirth = getDateOfBirth();
    if (!dateOfBirth) {
      Alert.alert('Validation Error', 'Please enter a valid date of birth (MM/DD/YYYY)');
      return false;
    }
    
    // Check if user is at least 13 years old
    const today = new Date();
    const age = today.getFullYear() - dateOfBirth.getFullYear();
    if (age < 13) {
      Alert.alert('Validation Error', 'You must be at least 13 years old to register');
      return false;
    }
    
    if (!acceptedTerms) {
      Alert.alert('Validation Error', 'You must accept the Terms and Conditions');
      return false;
    }
    
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      // ✅ ADDED: Log validation error
      addBacklogEvent("registration_error", { 
        errorType: "validation", 
        email: email.trim().toLowerCase(), 
        username: username.trim().toLowerCase() 
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const dateOfBirth = getDateOfBirth()!;
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        password,
        dateOfBirth: dateOfBirth.toISOString(),
      };
      
      const registeredUser = await registerUser(userData);
      // ✅ ADDED: Log successful registration
      addBacklogEvent("user_registered", { 
        email: userData.email, 
        username: userData.username, 
        uid: registeredUser.uid 
      });
      
      // Send verification email using new endpoint
      try {
        const response = await fetch('https://api-m2tvqc6zqq-uc.a.run.app/sendEmailVerification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: userData.email,
            uid: registeredUser.uid 
          }),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error('Failed to send verification email:', result.error);
        } else {
          console.log('Verification email sent successfully');
        }
      } catch (error) {
        console.error('Error sending verification email:', error);
      }
      
      Alert.alert(
        'Success', 
        'Account created! Please check your email to verify your account before logging in.',
        [
          {
            text: 'OK',
            onPress: () => {
              Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }).start(() => {
                router.back();
              });
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Registration Error', error.message || 'An error occurred during registration');
      addBacklogEvent("registration_error", { 
        errorType: "firebase", 
        email: email.trim().toLowerCase(), 
        username: username.trim().toLowerCase(), 
        errorCode: error.code, 
        errorMessage: error.message 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const handleTermsClose = () => {
    setShowTermsModal(false);
    setAcceptedTerms(true);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <LinearGradient
        colors={['#1A2D4B', '#314661']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.formContainer, { opacity: opacityAnim }]}>
            <Image
              source={require('@/assets/images/rubric.png')}
              style={styles.logo}
            />
            
            <Text style={styles.title}>Create Account</Text>
            
            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor="#fff"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor="#fff"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#fff"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#fff"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor="#fff"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={22} 
                  color="#fff" 
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirm Password"
                placeholderTextColor="#fff"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons 
                  name={showConfirmPassword ? "eye-off" : "eye"} 
                  size={22} 
                  color="#fff" 
                  style={styles.eyeIcon}
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.birthdayRow}>
              <Text style={styles.dateLabel}>Birthday</Text>
              <View style={styles.dateContainer}>
                <TextInput
                  ref={monthRef}
                  style={styles.dateInput}
                  placeholder="MM"
                  placeholderTextColor="#fff"
                  value={month}
                  onChangeText={(text) => {
                    const newText = text.replace(/[^0-9]/g, '').slice(0, 2);
                    setMonth(newText);
                    if (newText.length === 2) dayRef.current?.focus();
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.dateSeparator}>/</Text>
                <TextInput
                  ref={dayRef}
                  style={styles.dateInput}
                  placeholder="DD"
                  placeholderTextColor="#fff"
                  value={day}
                  onChangeText={(text) => {
                    const newText = text.replace(/[^0-9]/g, '').slice(0, 2);
                    setDay(newText);
                    if (newText.length === 2) yearRef.current?.focus();
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                />
                <Text style={styles.dateSeparator}>/</Text>
                <TextInput
                  ref={yearRef}
                  style={styles.dateInput}
                  placeholder="YYYY"
                  placeholderTextColor="#fff"
                  value={year}
                  onChangeText={(text) => {
                    const newText = text.replace(/[^0-9]/g, '').slice(0, 4);
                    setYear(newText);
                  }}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </View>
            <View style={styles.termsContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
              >
                <View style={[styles.checkboxBox, acceptedTerms && styles.checkboxChecked]}>
                  {acceptedTerms && (
                    <Ionicons name="checkmark" size={18} color="#263A56" />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I have read the{' '}
                <Text 
                  style={styles.termsLink}
                  onPress={() => setShowTermsModal(true)}
                >
                  Terms and Conditions
                </Text>
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.disabledButton]} 
              onPress={handleRegister}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#52F7E2', '#5EEF96']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? 'Creating Account...' : 'Register'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin}>
              <Text style={styles.backButtonText}>Already have an account? Log In</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Terms and Conditions Modal */}
        <TermsModal 
          visible={showTermsModal} 
          onClose={handleTermsClose}
        />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  formContainer: {
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
  },
  eyeIcon: {
    marginLeft: 10,
    marginTop: -20
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
  dateInput: {
    flex: 1,
    height: 40,
    borderBottomWidth: 0.5,
    borderColor: '#fff',
    color: '#fff',
    backgroundColor: 'transparent',
    textAlign: 'center',
  },
  dateSeparator: {
    color: '#fff',
    fontSize: 16,
    marginHorizontal: 5,
  },
  birthdayRow: {
  flexDirection: 'row',
  alignItems: 'center',
  width: '80%',
  marginBottom: 30,
  justifyContent: 'space-between',
  },

  dateLabel: {
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
    width: '25%',
    textAlign: 'left',
  },

  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 10,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#52F7E2',
    borderColor: '#52F7E2',
  },
  termsText: {
    color: '#B0C4DE',
    fontSize: 14,
    flex: 1,
  },
  termsLink: {
    color: '#52F7E2',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  button: {
    width: '80%',
    borderRadius: 150,
    marginTop: 20,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  gradientButton: {
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  registerButtonText: {
    color: '#263A56',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#B0C4DE',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default RegisterScreen;

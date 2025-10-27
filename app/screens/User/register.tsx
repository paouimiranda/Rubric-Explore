import { registerUser } from '@/services/auth-service';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
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
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const router = useRouter();

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
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        password,
        dateOfBirth: dateOfBirth.toISOString(),
      };
      
      await registerUser(userData);
      
      // Send verification email after successful registration
      try {
        const response = await fetch('https://us-central1-rubric-app-8f65c.cloudfunctions.net/api/sendVerificationLink', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: userData.email }),
        });
        
        if (!response.ok) {
          console.error('Failed to send verification email:', response.statusText);
        } else {
          console.log('Verification email sent successfully');
        }
      } catch (error) {
        console.error('Error sending verification email:', error);
      }
      
      Alert.alert(
        'Success', 
        'Account created successfully! Please check your email to verify your account.',
        [
          {
            text: 'OK',
            onPress: () => {
              Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }).start(() => {
                router.replace('../index');
              });
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Registration Error', error.message || 'An error occurred during registration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.back();
  };

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateOfBirth(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
            
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#fff"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#fff"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            
            <TouchableOpacity 
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                Date of Birth: {formatDate(dateOfBirth)}
              </Text>
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}

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
    width: '80%',
    height: 40,
    borderBottomWidth: 0.5,
    borderColor: '#fff',
    marginBottom: 30,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
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
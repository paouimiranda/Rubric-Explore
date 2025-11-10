import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { checkEmailAvailability, checkUsernameAvailability, registerUser } from '@/services/auth-service';
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
import TermsModal from '../Misc/t&c';

const { width } = Dimensions.get('window');

type ErrorType = 'validation' | 'credentials' | 'network' | 'unknown';

interface ErrorState {
  visible: boolean;
  type: ErrorType;
  title: string;
  message: string;
}

interface ValidationState {
  isChecking: boolean;
  isAvailable: boolean | null;
  message: string;
}

const RegisterScreen = () => {
  // Form state
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
  
  // Real-time validation states
  const [emailValidation, setEmailValidation] = useState<ValidationState>({
    isChecking: false,
    isAvailable: null,
    message: ''
  });
  const [usernameValidation, setUsernameValidation] = useState<ValidationState>({
    isChecking: false,
    isAvailable: null,
    message: ''
  });
  
  // Debounce timers
  const emailDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  // Focus states
  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [lastNameFocused, setLastNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  
  // Error state
  const [error, setError] = useState<ErrorState>({
    visible: false,
    type: 'unknown',
    title: '',
    message: '',
  });
  
  // Refs
  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);
  
  // Animations
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const logoFloatAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.9)).current;
  
  // Floating label animations
  const firstNameLabelAnim = useRef(new Animated.Value(0)).current;
  const lastNameLabelAnim = useRef(new Animated.Value(0)).current;
  const emailLabelAnim = useRef(new Animated.Value(0)).current;
  const usernameLabelAnim = useRef(new Animated.Value(0)).current;
  const passwordLabelAnim = useRef(new Animated.Value(0)).current;
  const confirmPasswordLabelAnim = useRef(new Animated.Value(0)).current;
  
  // Border glow animations
  const firstNameBorderAnim = useRef(new Animated.Value(0)).current;
  const lastNameBorderAnim = useRef(new Animated.Value(0)).current;
  const emailBorderAnim = useRef(new Animated.Value(0)).current;
  const usernameBorderAnim = useRef(new Animated.Value(0)).current;
  const passwordBorderAnim = useRef(new Animated.Value(0)).current;
  const confirmPasswordBorderAnim = useRef(new Animated.Value(0)).current;
  
  // Validation checkmarks
  const emailCheckAnim = useRef(new Animated.Value(0)).current;
  const usernameCheckAnim = useRef(new Animated.Value(0)).current;
  const passwordMatchAnim = useRef(new Animated.Value(0)).current;
  
  const router = useRouter();
  const { addBacklogEvent } = useBacklogLogger();

  // Real-time email validation
  useEffect(() => {
    if (emailDebounceTimer.current) {
      clearTimeout(emailDebounceTimer.current);
    }

    if (!email.trim()) {
      setEmailValidation({ isChecking: false, isAvailable: null, message: '' });
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValidation({ isChecking: false, isAvailable: false, message: 'Invalid email format' });
      return;
    }

    setEmailValidation({ isChecking: true, isAvailable: null, message: 'Checking...' });

    emailDebounceTimer.current = setTimeout(async () => {
      try {
        const isAvailable = await checkEmailAvailability(email);
        setEmailValidation({
          isChecking: false,
          isAvailable,
          message: isAvailable ? 'Email available!' : 'Email already registered'
        });
      } catch (error) {
        setEmailValidation({
          isChecking: false,
          isAvailable: false,
          message: 'Error checking email'
        });
      }
    }, 800);

    return () => {
      if (emailDebounceTimer.current) {
        clearTimeout(emailDebounceTimer.current);
      }
    };
  }, [email]);

  // Real-time username validation
  useEffect(() => {
    if (usernameDebounceTimer.current) {
      clearTimeout(usernameDebounceTimer.current);
    }

    if (!username.trim()) {
      setUsernameValidation({ isChecking: false, isAvailable: null, message: '' });
      return;
    }

    // Username format validation (3-20 chars, alphanumeric and underscores)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      setUsernameValidation({
        isChecking: false,
        isAvailable: false,
        message: username.length < 3 ? 'Too short (min 3 chars)' : 'Only letters, numbers, and underscores'
      });
      return;
    }

    setUsernameValidation({ isChecking: true, isAvailable: null, message: 'Checking...' });

    usernameDebounceTimer.current = setTimeout(async () => {
      try {
        const isAvailable = await checkUsernameAvailability(username);
        setUsernameValidation({
          isChecking: false,
          isAvailable,
          message: isAvailable ? 'Username available!' : 'Username already taken'
        });
      } catch (error) {
        setUsernameValidation({
          isChecking: false,
          isAvailable: false,
          message: 'Error checking username'
        });
      }
    }, 800);

    return () => {
      if (usernameDebounceTimer.current) {
        clearTimeout(usernameDebounceTimer.current);
      }
    };
  }, [username]);

  const handleTermsClose = () => {
    setShowTermsModal(false);
    setAcceptedTerms(true);
  };

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

  // Progress bar animation
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: currentStep / totalSteps,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Step transition animation
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [currentStep]);

  // Focus animations for all fields
  useEffect(() => {
    Animated.parallel([
      Animated.spring(firstNameLabelAnim, {
        toValue: firstNameFocused || firstName ? 1 : 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(firstNameBorderAnim, {
        toValue: firstNameFocused ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [firstNameFocused, firstName]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(lastNameLabelAnim, {
        toValue: lastNameFocused || lastName ? 1 : 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(lastNameBorderAnim, {
        toValue: lastNameFocused ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [lastNameFocused, lastName]);

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

  useEffect(() => {
    Animated.parallel([
      Animated.spring(usernameLabelAnim, {
        toValue: usernameFocused || username ? 1 : 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(usernameBorderAnim, {
        toValue: usernameFocused ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [usernameFocused, username]);

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

  useEffect(() => {
    Animated.parallel([
      Animated.spring(confirmPasswordLabelAnim, {
        toValue: confirmPasswordFocused || confirmPassword ? 1 : 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(confirmPasswordBorderAnim, {
        toValue: confirmPasswordFocused ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [confirmPasswordFocused, confirmPassword]);

  // Validation checkmarks
  useEffect(() => {
    const isValid = emailValidation.isAvailable === true;
    Animated.spring(emailCheckAnim, {
      toValue: isValid ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [emailValidation.isAvailable]);

  useEffect(() => {
    const isValid = usernameValidation.isAvailable === true;
    Animated.spring(usernameCheckAnim, {
      toValue: isValid ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [usernameValidation.isAvailable]);

  useEffect(() => {
    const isValid = password.length >= 6 && password === confirmPassword && confirmPassword.length > 0;
    Animated.spring(passwordMatchAnim, {
      toValue: isValid ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [password, confirmPassword]);

  // Error modal animation
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

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const showError = (type: ErrorType, title: string, message: string) => {
    triggerShake();
    setError({ visible: true, type, title, message });
  };

  const hideError = () => {
    setError({ ...error, visible: false });
  };

  const getDateOfBirth = () => {
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = parseInt(year, 10);
    if (isNaN(m) || isNaN(d) || isNaN(y) || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > new Date().getFullYear()) {
      return null;
    }
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return null;
    }
    return date;
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!firstName.trim()) {
        showError('validation', 'First Name Required', 'Please enter your first name to continue.');
        return false;
      }
      if (!lastName.trim()) {
        showError('validation', 'Last Name Required', 'Please enter your last name to continue.');
        return false;
      }
    } else if (currentStep === 2) {
      if (!email.trim()) {
        showError('validation', 'Email Required', 'Please enter your email address to continue.');
        return false;
      }
      if (emailValidation.isAvailable === false) {
        showError('validation', 'Email Unavailable', emailValidation.message);
        return false;
      }
      if (emailValidation.isAvailable === null) {
        showError('validation', 'Email Check Pending', 'Please wait while we verify your email.');
        return false;
      }
      if (!username.trim()) {
        showError('validation', 'Username Required', 'Please enter a username to continue.');
        return false;
      }
      if (usernameValidation.isAvailable === false) {
        showError('validation', 'Username Unavailable', usernameValidation.message);
        return false;
      }
      if (usernameValidation.isAvailable === null) {
        showError('validation', 'Username Check Pending', 'Please wait while we verify your username.');
        return false;
      }
    } else if (currentStep === 3) {
      if (!password) {
        showError('validation', 'Password Required', 'Please enter a password to continue.');
        return false;
      }
      if (password.length < 6) {
        showError('validation', 'Password Too Short', 'Password must be at least 6 characters long.');
        return false;
      }
      if (password !== confirmPassword) {
        showError('validation', 'Passwords Don\'t Match', 'Please make sure both passwords match.');
        return false;
      }
    } else if (currentStep === 4) {
      const dateOfBirth = getDateOfBirth();
      if (!dateOfBirth) {
        showError('validation', 'Invalid Date', 'Please enter a valid date of birth (MM/DD/YYYY).');
        return false;
      }
      
      const today = new Date();
      const age = today.getFullYear() - dateOfBirth.getFullYear();
      if (age < 13) {
        showError('validation', 'Age Requirement', 'You must be at least 13 years old to register.');
        return false;
      }
      
      if (!acceptedTerms) {
        showError('validation', 'Terms Required', 'You must accept the Terms and Conditions to continue.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    
    if (currentStep < totalSteps) {
      slideAnim.setValue(300);
      setCurrentStep(currentStep + 1);
    } else {
      handleRegister();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      slideAnim.setValue(-300);
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const handleRegister = async () => {
    if (!validateStep()) {
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
      addBacklogEvent("user_registered", { 
        email: userData.email, 
        username: userData.username, 
        uid: registeredUser.uid 
      });
      
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
      showError('unknown', 'Registration Error', error.message || 'An error occurred during registration');
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

  const logoTranslateY = logoFloatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20]
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  const renderValidationFeedback = (validation: ValidationState) => {
    if (!validation.message) return null;

    return (
      <View style={styles.validationFeedback}>
        {validation.isChecking ? (
          <ActivityIndicator size="small" color="#52F7E2" />
        ) : (
          <Ionicons 
            name={validation.isAvailable ? "checkmark-circle" : "close-circle"} 
            size={16} 
            color={validation.isAvailable ? "#5EEF96" : "#f87171"} 
          />
        )}
        <Text style={[
          styles.validationText,
          { color: validation.isAvailable ? "#5EEF96" : validation.isChecking ? "#52F7E2" : "#f87171" }
        ]}>
          {validation.message}
        </Text>
      </View>
    );
  };

  const renderInputField = (
    value: string,
    setValue: (text: string) => void,
    label: string,
    icon: string,
    labelAnim: Animated.Value,
    borderAnim: Animated.Value,
    checkAnim: Animated.Value | null,
    focused: boolean,
    setFocused: (focused: boolean) => void,
    secureTextEntry?: boolean,
    showIcon?: React.ReactNode,
    keyboardType?: any,
    autoCapitalize?: any,
    validation?: ValidationState
  ) => {
    const borderColor = borderAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['rgba(255, 255, 255, 0.3)', '#52F7E2']
    });

    return (
      <View style={styles.inputWrapper}>
        <Animated.Text
          style={[
            styles.floatingLabel,
            {
              transform: [
                {
                  translateY: labelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, -10]
                  })
                },
                {
                  scale: labelAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.85]
                  })
                }
              ],
              opacity: labelAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.6, 1]
              }),
              color: labelAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(255, 255, 255, 0.6)', '#52F7E2']
              })
            }
          ]}
        >
          {label}
        </Animated.Text>
        <View style={styles.inputContainer}>
          <Ionicons name={icon as any} size={20} color={focused ? '#52F7E2' : 'rgba(255, 255, 255, 0.6)'} style={styles.inputIcon} />
          <Animated.View style={[styles.inputBorderWrapper, { borderColor }]}>
            <TextInput
              style={styles.input}
              placeholder=""
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              value={value}
              onChangeText={setValue}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              secureTextEntry={secureTextEntry}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              editable={!isLoading}
            />
          </Animated.View>
          {showIcon && showIcon}
          {checkAnim && (
            <Animated.View style={[styles.checkmark, { opacity: checkAnim, transform: [{ scale: checkAnim }] }]}>
              <Ionicons name="checkmark-circle" size={24} color="#5EEF96" />
            </Animated.View>
          )}
        </View>
        {validation && renderValidationFeedback(validation)}
      </View>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
            <Text style={styles.stepTitle}>Let's get started!</Text>
            <Text style={styles.stepSubtitle}>Tell us your name</Text>
            
            {renderInputField(
              firstName,
              setFirstName,
              'First Name',
              'person-outline',
              firstNameLabelAnim,
              firstNameBorderAnim,
              null,
              firstNameFocused,
              setFirstNameFocused,
              false,
              null,
              'default',
              'words'
            )}
            
            {renderInputField(
              lastName,
              setLastName,
              'Last Name',
              'person-outline',
              lastNameLabelAnim,
              lastNameBorderAnim,
              null,
              lastNameFocused,
              setLastNameFocused,
              false,
              null,
              'default',
              'words'
            )}
          </Animated.View>
        );
      
      case 2:
        return (
          <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
            <Text style={styles.stepTitle}>Create your identity</Text>
            <Text style={styles.stepSubtitle}>Choose your email and username</Text>
            
            {renderInputField(
              email,
              setEmail,
              'Email',
              'mail-outline',
              emailLabelAnim,
              emailBorderAnim,
              emailCheckAnim,
              emailFocused,
              setEmailFocused,
              false,
              null,
              'email-address',
              'none',
              emailValidation
            )}
            
            {renderInputField(
              username,
              setUsername,
              'Username',
              'at-outline',
              usernameLabelAnim,
              usernameBorderAnim,
              usernameCheckAnim,
              usernameFocused,
              setUsernameFocused,
              false,
              null,
              'default',
              'none',
              usernameValidation
            )}
          </Animated.View>
        );
      
      case 3:
        return (
          <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
            <Text style={styles.stepTitle}>Secure your account</Text>
            <Text style={styles.stepSubtitle}>Create a strong password</Text>
            
            <View style={styles.inputWrapper}>
              <Animated.Text
                style={[
                  styles.floatingLabel,
                  {
                    transform: [
                      {
                        translateY: passwordLabelAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, -10]
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
                <Animated.View style={[styles.inputBorderWrapper, { borderColor: passwordBorderAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(255, 255, 255, 0.3)', '#52F7E2']
                }) }]}>
                  <TextInput
                    key={`password-${showPassword}`}
                    style={styles.input}
                    placeholder=""
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                    textContentType="newPassword"
                    autoComplete="password-new"
                  />
                </Animated.View>
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)} 
                  style={styles.eyeIcon}
                  activeOpacity={0.7}
                >
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.inputWrapper}>
              <Animated.Text
                style={[
                  styles.floatingLabel,
                  {
                    transform: [
                      {
                        translateY: confirmPasswordLabelAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, -10]
                        })
                      },
                      {
                        scale: confirmPasswordLabelAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.85]
                        })
                      }
                    ],
                    opacity: confirmPasswordLabelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 1]
                    }),
                    color: confirmPasswordLabelAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['rgba(255, 255, 255, 0.6)', '#52F7E2']
                    })
                  }
                ]}
              >
                Confirm Password
              </Animated.Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={confirmPasswordFocused ? '#52F7E2' : 'rgba(255, 255, 255, 0.6)'} style={styles.inputIcon} />
                <Animated.View style={[styles.inputBorderWrapper, { borderColor: confirmPasswordBorderAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['rgba(255, 255, 255, 0.3)', '#52F7E2']
                }) }]}>
                  <TextInput
                    style={styles.input}
                    placeholder=""
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setConfirmPasswordFocused(true)}
                    onBlur={() => setConfirmPasswordFocused(false)}
                    secureTextEntry={!showConfirmPassword}
                    editable={!isLoading}
                    textContentType="newPassword"
                    autoComplete="password-new"
                  />
                </Animated.View>
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                  <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
                <Animated.View style={[styles.checkmark, { opacity: passwordMatchAnim, transform: [{ scale: passwordMatchAnim }] }]}>
                  <Ionicons name="checkmark-circle" size={24} color="#5EEF96" />
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        );
      
      case 4:
        return (
          <Animated.View style={[styles.stepContainer, { transform: [{ translateX: slideAnim }] }]}>
            <Text style={styles.stepTitle}>Almost there!</Text>
            <Text style={styles.stepSubtitle}>Just a few more details</Text>
            
            <View style={styles.birthdayContainer}>
              <Text style={styles.birthdayLabel}>Date of Birth</Text>
              <View style={styles.dateInputsContainer}>
                <TextInput
                  ref={monthRef}
                  style={styles.dateInput}
                  placeholder="MM"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  value={month}
                  onChangeText={(text) => {
                    const newText = text.replace(/[^0-9]/g, '').slice(0, 2);
                    setMonth(newText);
                    if (newText.length === 2) dayRef.current?.focus();
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                  editable={!isLoading}
                />
                <Text style={styles.dateSeparator}>/</Text>
                <TextInput
                  ref={dayRef}
                  style={styles.dateInput}
                  placeholder="DD"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  value={day}
                  onChangeText={(text) => {
                    const newText = text.replace(/[^0-9]/g, '').slice(0, 2);
                    setDay(newText);
                    if (newText.length === 2) yearRef.current?.focus();
                  }}
                  keyboardType="numeric"
                  maxLength={2}
                  editable={!isLoading}
                />
                <Text style={styles.dateSeparator}>/</Text>
                <TextInput
                  ref={yearRef}
                  style={[styles.dateInput, { flex: 1.5 }]}
                  placeholder="YYYY"
                  placeholderTextColor="rgba(255, 255, 255, 0.6)"
                  value={year}
                  onChangeText={(text) => {
                    const newText = text.replace(/[^0-9]/g, '').slice(0, 4);
                    setYear(newText);
                  }}
                  keyboardType="numeric"
                  maxLength={4}
                  editable={!isLoading}
                />
              </View>
            </View>
            
            <View style={styles.termsContainer}>
              <TouchableOpacity 
                style={styles.checkbox}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
                disabled={isLoading}
              >
                <View style={[styles.checkboxBox, acceptedTerms && styles.checkboxChecked]}>
                  {acceptedTerms && (
                    <Ionicons name="checkmark" size={18} color="#263A56" />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I accept the{' '}
                <Text 
                  style={styles.termsLink}
                  onPress={() => setShowTermsModal(true)}
                >
                  Terms and Conditions
                </Text>
              </Text>
            </View>
          </Animated.View>
        );
      
      default:
        return null;
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
        <Animated.View style={[{ opacity: opacityAnim, transform: [{ translateX: shakeAnim }] }, styles.formContainer]}>
          {/* Logo */}
          <Animated.View style={{ transform: [{ translateY: logoTranslateY }] }}>
            <Image
              source={require('@/assets/images/rubric.png')}
              style={styles.logo}
            />
          </Animated.View>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
            </View>
            <Text style={styles.progressText}>Step {currentStep} of {totalSteps}</Text>
          </View>
          
          {/* Step Content */}
          {renderStep()}
          
          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity 
              style={[styles.navButton, styles.backButton]} 
              onPress={handleBack}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#52F7E2" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.navButton, styles.nextButton, isLoading && styles.disabledButton]} 
              onPress={handleNext}
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
                    <Text style={styles.nextButtonText}>
                      {currentStep === totalSteps ? 'Create Account' : 'Next'}
                    </Text>
                    {currentStep < totalSteps && (
                      <Ionicons name="arrow-forward" size={20} color="#263A56" />
                    )}
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {currentStep === 1 && (
            <TouchableOpacity 
              style={styles.loginLink}
              onPress={() => router.back()}
              disabled={isLoading}
            >
              <Text style={styles.loginLinkText}>
                Already have an account? <Text style={styles.loginLinkHighlight}>Log In</Text>
              </Text>
            </TouchableOpacity>
          )}
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

                <TouchableOpacity
                  style={styles.errorButtonWrapper}
                  onPress={hideError}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={getErrorGradient()}
                    style={styles.errorPrimaryButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.errorPrimaryButtonText}>Got It</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </Animated.View>
          </Animated.View>
        </Modal>

        {/* Terms Modal */}
        <TermsModal 
          visible={showTermsModal} 
          onClose={handleTermsClose}
        />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formContainer: {
    width: '100%',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 30,
  },
  progressBarContainer: {
    width: '85%',
    marginBottom: 40,
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#52F7E2',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputWrapper: {
    width: '85%',
    marginBottom: 24,
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
  validationFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 4,
    gap: 6,
  },
  validationText: {
    fontSize: 13,
    fontWeight: '500',
  },
  birthdayContainer: {
    width: '85%',
    marginBottom: 30,
  },
  birthdayLabel: {
    fontSize: 14,
    color: '#52F7E2',
    marginBottom: 12,
    fontWeight: '600',
  },
  dateInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    height: 50,
  },
  dateInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  dateSeparator: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 18,
    marginHorizontal: 8,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '85%',
    marginBottom: 20,
  },
  checkbox: {
    marginRight: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#52F7E2',
    borderColor: '#52F7E2',
  },
  termsText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    flex: 1,
  },
  termsLink: {
    color: '#52F7E2',
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    width: '85%',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  navButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(82, 247, 226, 0.4)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backButtonText: {
    color: '#52F7E2',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1.5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  gradientButton: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    flexDirection: 'row',
    gap: 8,
  },
  nextButtonText: {
    color: '#263A56',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    marginTop: 24,
  },
  loginLinkText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  loginLinkHighlight: {
    color: '#52F7E2',
    fontWeight: '600',
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
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  errorButtonWrapper: {
    width: '100%',
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
    fontWeight: '700',
  },
});

export default RegisterScreen;
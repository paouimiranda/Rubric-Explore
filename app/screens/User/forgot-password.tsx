//app/screens/User/forgot-password.tsx
import { CustomAlertModal } from "@/components/Interface/custom-alert-modal";
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

const BASE_URL = "https://api-m2tvqc6zqq-uc.a.run.app";

interface AlertState {
  visible: boolean;
  type: 'info' | 'success' | 'error' | 'warning';
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'primary';
  }>;
}

export default function ForgotPasswordScreen() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const router = useRouter();
  const { addBacklogEvent } = useBacklogLogger();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Add password validation states
  const [passwordValidation, setPasswordValidation] = useState({
    isValid: false,
    message: ''
  });
  const [confirmPasswordValidation, setConfirmPasswordValidation] = useState({
    isValid: false,
    message: ''
  });
  
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showAlert = (
    type: 'info' | 'success' | 'error' | 'warning',
    title: string,
    message: string,
    buttons?: AlertState['buttons']
  ) => {
    setAlertState({
      visible: true,
      type,
      title,
      message,
      buttons: buttons || [
        {
          text: 'OK',
          onPress: () => setAlertState(prev => ({ ...prev, visible: false })),
          style: 'primary',
        },
      ],
    });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  // Fade in animation when step changes
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [step]);

  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Add real-time password validation
  useEffect(() => {
    if (!newPassword.trim()) {
      setPasswordValidation({ isValid: false, message: '' });
      return;
    }
    const hasMinLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\$\${};':"\\|,.<>\/?]/.test(newPassword);
    const isValid = hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecialChar;
    let message = '';
    if (!isValid) {
      const missing = [];
      if (!hasMinLength) missing.push('8+ characters');
      if (!hasUppercase) missing.push('1 uppercase');
      if (!hasLowercase) missing.push('1 lowercase');
      if (!hasDigit) missing.push('1 number');
      if (!hasSpecialChar) missing.push('1 special characters (e.g. !@#$%^&*)');
      message = `Needs: ${missing.join(', ')}`;
    } else {
      message = 'Password is strong!';
    }
    setPasswordValidation({ isValid, message });
  }, [newPassword]);

  // Add real-time confirm password validation
  useEffect(() => {
    if (!confirmPassword.trim()) {
      setConfirmPasswordValidation({ isValid: false, message: '' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPasswordValidation({ isValid: false, message: 'Passwords don\'t match' });
    } else {
      setConfirmPasswordValidation({ isValid: true, message: 'Passwords match' });
    }
  }, [newPassword, confirmPassword]);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      showAlert("error", "Error", "Please enter your email");
      addBacklogEvent("password_reset_validation_error", { step: 1, error: "empty_email" });
      return;
    }

    if (!email.includes("@")) {
      showAlert("error", "Error", "Please enter a valid email address");
      addBacklogEvent("password_reset_validation_error", { step: 1, error: "invalid_email" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/sendOtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase() 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setStep(2);
      setResendTimer(60);
      addBacklogEvent("otp_sent", { step: 1, email: email.trim().toLowerCase() });
    } catch (error: any) {
      showAlert("error", "Error", error.message || "Failed to send OTP");
      addBacklogEvent("otp_send_error", { step: 1, email: email.trim().toLowerCase(), error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      showAlert("error", "Error", "Please fill in all fields");
      addBacklogEvent("password_reset_validation_error", { step: 2, error: "empty_fields" });
      return;
    }

    if (otp.length !== 6) {
      showAlert("error", "Error", "OTP must be 6 digits");
      addBacklogEvent("password_reset_validation_error", { step: 2, error: "invalid_otp_length" });
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("error", "Error", "Passwords do not match");
      addBacklogEvent("password_reset_validation_error", { step: 2, error: "password_mismatch" });
      return;
    }

    // Updated password validation to match registration standards
    const hasMinLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasDigit = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\$\${};':"\\|,.<>\/?]/.test(newPassword);
    if (!(hasMinLength && hasUppercase && hasLowercase && hasDigit && hasSpecialChar)) {
      showAlert(
        'error',
        'Weak Password',
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
        [{ text: 'OK', onPress: closeAlert, style: 'primary' }]
      );
      addBacklogEvent("password_reset_validation_error", { step: 2, error: "weak_password" });
      return;
    }

    if (newPassword.length < 6) {
      showAlert("error", "Error", "Password must be at least 6 characters");
      addBacklogEvent("password_reset_validation_error", { step: 2, error: "weak_password" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/verifyOtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      showAlert(
        "success",
        "Success",
        "Your password has been updated!",
        [
          {
            text: "OK",
            onPress: () => {
              closeAlert();
              router.replace("/");
            },
            style: 'primary',
          },
        ]
      );
      addBacklogEvent("password_reset", { step: 2, email: email.trim().toLowerCase() });
    } catch (error: any) {
      showAlert("error", "Error", error.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      showAlert(
        "warning",
        "Go Back?",
        "Your progress will be lost. Do you want to go back?",
        [
          {
            text: "Cancel",
            onPress: () => closeAlert(),
            style: 'cancel',
          },
          {
            text: "Yes",
            onPress: () => {
              closeAlert();
              setStep(1);
              setOtp("");
              setNewPassword("");
              setConfirmPassword("");
              setResendTimer(0);
            },
            style: 'primary',
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const getStepIcon = () => {
    return step === 1 ? "mail" : "lock-closed";
  };

  const getStepGradient = (): [string, string] => {
    return step === 1 ? ['#667eea', '#764ba2'] : ['#fa709a', '#fee140'];
  };

  return (
    <LinearGradient
      colors={['#0A1C3C', '#324762']}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          disabled={isLoading}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {[1, 2].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                s === step && styles.progressDotActive,
                s < step && styles.progressDotComplete,
              ]}
            />
          ))}
        </View>

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Icon Badge */}
          <LinearGradient
            colors={getStepGradient()}
            style={styles.iconBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={getStepIcon()} size={40} color="#ffffff" />
          </LinearGradient>

          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {step === 1 
              ? "Enter your email to receive a verification code" 
              : "Enter the code and your new password"}
          </Text>

          {step === 1 ? (
            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail" size={20} color="#667eea" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                  />
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleSendOtp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="paper-plane" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Send OTP</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <Ionicons name="key" size={20} color="#fa709a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit OTP"
                    placeholderTextColor="#666"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!isLoading}
                  />
                </View>
              </View>

              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#fa709a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor="#666"
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                {/* Add validation feedback */}
                {passwordValidation.message && (
                  <View style={styles.validationFeedback}>
                    <Ionicons 
                      name={passwordValidation.isValid ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color={passwordValidation.isValid ? "#5EEF96" : "#f87171"} 
                    />
                    <Text style={[
                      styles.validationText,
                      { color: passwordValidation.isValid ? "#5EEF96" : "#f87171" }
                    ]}>
                      {passwordValidation.message}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.inputWrapper}>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed" size={20} color="#fa709a" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor="#666"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                {/* Add validation feedback */}
                {confirmPasswordValidation.message && (
                  <View style={styles.validationFeedback}>
                    <Ionicons 
                      name={confirmPasswordValidation.isValid ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color={confirmPasswordValidation.isValid ? "#5EEF96" : "#f87171"} 
                    />
                    <Text style={[
                      styles.validationText,
                      { color: confirmPasswordValidation.isValid ? "#5EEF96" : "#f87171" }
                    ]}>
                      {confirmPasswordValidation.message}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                onPress={handleVerifyOtp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#fa709a', '#fee140']}
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Reset Password</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resendButton}
                onPress={handleSendOtp}
                disabled={isLoading || resendTimer > 0}
              >
                <Ionicons name="refresh" size={16} color={resendTimer > 0 ? "#666" : "#fa709a"} style={{ marginRight: 6 }} />
                <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Custom Alert Modal */}
        <CustomAlertModal
          visible={alertState.visible}
          type={alertState.type}
          title={alertState.title}
          message={alertState.message}
          buttons={alertState.buttons}
          onClose={closeAlert}
        />
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
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#fa709a',
  },
  progressDotComplete: {
    backgroundColor: '#4caf50',
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    color: "#fff",
    fontSize: 32,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: "#aaa",
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    width: "100%",
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: "#fff",
    fontSize: 16,
    fontFamily: 'Montserrat_400Regular',
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    width: "100%",
    height: 56,
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  resendButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    color: "#fa709a",
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
  },
  resendTextDisabled: {
    color: "#666",
  },
  inputWrapper: {
    width: "100%",
    marginBottom: 16,
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
  
});
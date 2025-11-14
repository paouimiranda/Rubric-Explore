//app/screens/User/change-email.tsx
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
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

export default function ChangeEmail() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [otp, setOtp] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [resendTimer, setResendTimer] = useState(0);
  const router = useRouter();
  const auth = getAuth();
  const currentEmail = auth.currentUser?.email;
  const { addBacklogEvent } = useBacklogLogger();
  const API_URL = "https://api-m2tvqc6zqq-uc.a.run.app";

  // Alert modal state
  const [alertModal, setAlertModal] = useState({
    visible: false,
    type: 'info' as 'info' | 'success' | 'error' | 'warning',
    title: '',
    message: '',
    buttons: [] as Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>,
  });

  const showAlert = (
    type: 'info' | 'success' | 'error' | 'warning',
    title: string,
    message: string,
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>
  ) => {
    setAlertModal({
      visible: true,
      type,
      title,
      message,
      buttons,
    });
  };

  const hideAlert = () => {
    setAlertModal(prev => ({ ...prev, visible: false }));
  };

  // Fade in animation when step changes
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [step]);

  // Timer effect for resend countdown (decrements every second)
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Check if user is authenticated
  useEffect(() => {
    if (!auth.currentUser) {
      showAlert(
        'error',
        'Error',
        'You must be logged in to change your email.',
        [
          {
            text: 'OK',
            onPress: () => {
              hideAlert();
              router.back();
            },
            style: 'primary'
          }
        ]
      );
    }
  }, []);

  // STEP 1: Send OTP to the current email
  const handleSendOtp = async () => {
    if (!currentEmail) {
      showAlert(
        'error',
        'Error',
        'No authenticated user found.',
        [{ text: 'OK', onPress: hideAlert, style: 'primary' }]
      );
      addBacklogEvent("change_email_error", { errorType: "no_auth", step: 1 });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/sendChangeEmailOtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      if (data.success) {
        setStep(2);
        setResendTimer(60);
        addBacklogEvent("otp_sent", { step: 1, email: currentEmail });
      }
    } catch (error: any) {
      console.error("Send OTP error:", error);
      showAlert(
        'error',
        'Error',
        error.message || 'Failed to send OTP.',
        [{ text: 'OK', onPress: hideAlert, style: 'primary' }]
      );
      addBacklogEvent("otp_send_error", { step: 1, email: currentEmail, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify OTP from current email
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      showAlert(
        'error',
        'Error',
        'Please enter your OTP.',
        [{ text: 'OK', onPress: hideAlert, style: 'primary' }]
      );
      addBacklogEvent("otp_validation_error", { step: 2, error: "empty_otp" });
      return;
    }

    if (otp.length !== 6) {
      showAlert(
        'error',
        'Error',
        'OTP must be 6 digits.',
        [{ text: 'OK', onPress: hideAlert, style: 'primary' }]
      );
      addBacklogEvent("otp_validation_error", { step: 2, error: "invalid_length" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/verifyChangeEmailOtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentEmail,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      if (data.success) {
        setStep(3);
        addBacklogEvent("otp_verified", { step: 2, email: currentEmail });
      }
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      showAlert(
        'error',
        'Error',
        error.message || 'Failed to verify OTP.',
        [{ text: 'OK', onPress: hideAlert, style: 'primary' }]
      );
      addBacklogEvent("otp_verification_error", { step: 2, email: currentEmail, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Send verification link to new email
  const handleSubmitNewEmail = async () => {
    if (!newEmail.trim()) {
      showAlert(
        'error',
        'Error',
        'Please enter your new email address.',
        [{ text: 'OK', onPress: hideAlert, style: 'primary' }]
      );
      addBacklogEvent("email_validation_error", { step: 3, error: "empty_email" });
      return;
    }

    if (!newEmail.includes("@")) {
      showAlert(
        'error',
        'Error',
        'Please enter a valid email address.',
        [{ text: 'OK', onPress: hideAlert, style: 'primary' }]
      );
      addBacklogEvent("email_validation_error", { step: 3, error: "invalid_email" });
      return;
    }

    if (newEmail.toLowerCase() === currentEmail?.toLowerCase()) {
      showAlert(
        'error',
        'Error',
        'New email must be different from current email.',
        [{ text: 'OK', onPress: hideAlert, style: 'primary' }]
      );
      addBacklogEvent("email_validation_error", { step: 3, error: "same_email" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/verifyChangeEmailOtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentEmail,
          otp,
          newEmail: newEmail.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification link');
      }

      if (data.success) {
        showAlert(
          'success',
          'Verification Sent',
          `A verification link was sent to ${newEmail}. Check your inbox.`,
          [
            {
              text: 'OK',
              onPress: () => {
                hideAlert();
                router.push("/screens/User/check-email");
              },
              style: 'primary'
            }
          ]
        );
        addBacklogEvent("change_email_submitted", { step: 3, oldEmail: currentEmail, newEmail: newEmail.trim().toLowerCase() });
      }
    } catch (error: any) {
      console.error("Send verification error:", error);
      showAlert(
        'error',
        'Error',
        error.message || 'Failed to send verification link.',
        [{ text: 'OK', onPress: hideAlert, style: 'primary' }]
      );
      addBacklogEvent("change_email_error", { step: 3, oldEmail: currentEmail, newEmail: newEmail.trim().toLowerCase(), error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      showAlert(
        'warning',
        'Go Back?',
        'Your progress will be lost. Do you want to go back?',
        [
          { text: 'Cancel', onPress: hideAlert, style: 'cancel' },
          {
            text: 'Yes',
            onPress: () => {
              hideAlert();
              if (step === 3) {
                setStep(2);
                setNewEmail("");
              } else if (step === 2) {
                setStep(1);
                setOtp("");
                setResendTimer(0);
              }
            },
            style: 'primary'
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case 1:
        return "mail";
      case 2:
        return "key";
      case 3:
        return "mail-open";
      default:
        return "mail";
    }
  };

  const getStepGradient = (): [string, string] => {
    switch (step) {
      case 1:
        return ['#667eea', '#764ba2'];
      case 2:
        return ['#f093fb', '#f5576c'];
      case 3:
        return ['#4facfe', '#00f2fe'];
      default:
        return ['#667eea', '#764ba2'];
    }
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
          {[1, 2, 3].map((s) => (
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

          <Text style={styles.title}>Change Email</Text>
          <Text style={styles.subtitle}>
            {step === 1 && "We'll send a verification code to your current email"}
            {step === 2 && "Enter the code sent to your email"}
            {step === 3 && "Enter your new email address"}
          </Text>

          {/* STEP 1: Send OTP */}
          {step === 1 && (
            <View style={styles.formContainer}>
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="mail" size={20} color="#667eea" />
                  <Text style={styles.infoLabel}>Current Email</Text>
                </View>
                <Text style={styles.infoValue}>{currentEmail || "Not logged in"}</Text>
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
          )}

          {/* STEP 2: Verify OTP */}
          {step === 2 && (
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Ionicons name="key" size={20} color="#667eea" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity 
                onPress={handleVerifyOtp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#f093fb', '#f5576c']}
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Verify OTP</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.resendButton}
                onPress={handleSendOtp}
                disabled={isLoading || resendTimer > 0}
              >
                <Ionicons name="refresh" size={16} color={resendTimer > 0 ? "#666" : "#667eea"} style={{ marginRight: 6 }} />
                <Text style={[styles.resendText, resendTimer > 0 && styles.resendTextDisabled]}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: Input new email */}
          {step === 3 && (
            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-open" size={20} color="#4facfe" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter new email address"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={newEmail}
                  onChangeText={setNewEmail}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity 
                onPress={handleSubmitNewEmail}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4facfe', '#00f2fe']}
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                      <Text style={styles.buttonText}>Send Verification Link</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Custom Alert Modal */}
        <CustomAlertModal
          visible={alertModal.visible}
          type={alertModal.type}
          title={alertModal.title}
          message={alertModal.message}
          buttons={alertModal.buttons}
          onClose={hideAlert}
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
    backgroundColor: '#667eea',
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
  infoCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoLabel: {
    color: "#aaa",
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: "#fff",
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
  },
  inputContainer: {
    width: "100%",
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    marginBottom: 20,
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
  button: {
    width: "100%",
    height: 56,
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
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
    color: "#667eea",
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
  },
  resendTextDisabled: {
    color: "#666",
  },
});
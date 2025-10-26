import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

export default function ChangeEmail() {
  const [otp, setOtp] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = getAuth();
  const currentEmail = auth.currentUser?.email;

  const API_URL = "https://api-m2tvqc6zqq-uc.a.run.app";

  // Check if user is authenticated
  useEffect(() => {
    if (!auth.currentUser) {
      Alert.alert("Error", "You must be logged in to change your email.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    }
  }, []);

  // STEP 1: Send OTP to the current email
  const handleSendOtp = async () => {
    if (!currentEmail) {
      Alert.alert("Error", "No authenticated user found.");
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
        Alert.alert("OTP Sent", `An OTP has been sent to ${currentEmail}.`);
        setStep(2);
      }
    } catch (error: any) {
      console.error("Send OTP error:", error);
      Alert.alert("Error", error.message || "Failed to send OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify OTP from current email
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      Alert.alert("Error", "Please enter your OTP.");
      return;
    }

    if (otp.length !== 6) {
      Alert.alert("Error", "OTP must be 6 digits.");
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
        Alert.alert("Verified", "OTP verified successfully. Now enter your new email.");
        setStep(3);
      }
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      Alert.alert("Error", error.message || "Failed to verify OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Send verification link to new email
  const handleSubmitNewEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert("Error", "Please enter your new email address.");
      return;
    }

    if (!newEmail.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    if (newEmail.toLowerCase() === currentEmail?.toLowerCase()) {
      Alert.alert("Error", "New email must be different from current email.");
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
        Alert.alert(
          "Verification Sent",
          `A verification link was sent to ${newEmail}. Check your inbox.`,
          [
            {
              text: "OK",
              onPress: () => router.push("/screens/User/check-email")
            }
          ]
        );
      }
    } catch (error: any) {
      console.error("Send verification error:", error);
      Alert.alert("Error", error.message || "Failed to send verification link.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      Alert.alert(
        "Go Back?",
        "Your progress will be lost. Do you want to go back?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Yes",
            onPress: () => {
              if (step === 3) {
                setStep(2);
                setNewEmail("");
              } else if (step === 2) {
                setStep(1);
                setOtp("");
              }
            }
          }
        ]
      );
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleBack}
        disabled={isLoading}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Change Email</Text>
      <Text style={styles.subtitle}>
        {step === 1 && "We'll send a verification code to your current email"}
        {step === 2 && "Enter the code sent to your email"}
        {step === 3 && "Enter your new email address"}
      </Text>

      {/* STEP 1: Send OTP */}
      {step === 1 && (
        <>
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Current Email:</Text>
            <Text style={styles.infoValue}>{currentEmail || "Not logged in"}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleSendOtp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* STEP 2: Verify OTP */}
      {step === 2 && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
            editable={!isLoading}
          />
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleVerifyOtp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.resendButton}
            onPress={handleSendOtp}
            disabled={isLoading}
          >
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        </>
      )}

      {/* STEP 3: Input new email */}
      {step === 3 && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter new email address"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={newEmail}
            onChangeText={setNewEmail}
            editable={!isLoading}
          />
          <TouchableOpacity 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleSubmitNewEmail}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Verification Link</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,
  },
  backButtonText: {
    color: "#5a3dff",
    fontSize: 16,
    fontWeight: "600",
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  infoContainer: {
    width: "100%",
    backgroundColor: "#1e1e1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
  },
  infoLabel: {
    color: "#999",
    fontSize: 12,
    marginBottom: 5,
  },
  infoValue: {
    color: "#fff",
    fontSize: 16,
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#1e1e1e",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#5a3dff",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  resendButton: {
    marginTop: 20,
  },
  resendText: {
    color: "#5a3dff",
    fontSize: 14,
  },
});
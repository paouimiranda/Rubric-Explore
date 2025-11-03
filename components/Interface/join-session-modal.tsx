// components/JoinSessionModal.tsx
import { getCurrentUserData } from '@/services/auth-service';
import { joinSessionByCode } from '@/services/multiplayer-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CustomAlertModal } from './custom-alert-modal';

interface JoinSessionModalProps {
  visible: boolean;
  onClose: () => void;
}

interface AlertState {
  visible: boolean;
  type: 'info' | 'success' | 'error' | 'warning';
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'primary';
  }>;
}

const JoinSessionModal: React.FC<JoinSessionModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = (
    type: AlertState['type'],
    title: string,
    message: string,
    buttons: AlertState['buttons'] = [{ text: 'OK', onPress: () => {}, style: 'primary' }]
  ) => {
    setAlertState({
      visible: true,
      type,
      title,
      message,
      buttons,
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  const handleJoin = async () => {
    if (!sessionCode || sessionCode.trim().length !== 6) {
      showAlert(
        'warning',
        'Invalid Code',
        'Please enter a valid 6-character session code',
        [{ text: 'OK', onPress: () => {}, style: 'primary' }]
      );
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const user = await getCurrentUserData();
      if (!user) {
        showAlert(
          'error',
          'Error',
          'Please login to join a session',
          [{ text: 'OK', onPress: () => {}, style: 'primary' }]
        );
        return;
      }

      // Join session
      const sessionId = await joinSessionByCode(
        sessionCode.trim().toUpperCase(),
        user.uid,
        user.displayName,
      );

      // Navigate to lobby
      onClose();
      setSessionCode('');
      router.push({
        pathname: './multiplayer-lobby',
        params: { sessionId },
      });
    } catch (error: any) {
      console.error('Error joining session:', error);
      showAlert(
        'error',
        'Error',
        error.message || 'Failed to join session',
        [{ text: 'OK', onPress: () => {}, style: 'primary' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSessionCode('');
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <View style={styles.container}>
            {/* Gradient Background */}
            <LinearGradient
              colors={['#0A1C3C', '#1a2f4f', '#324762']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBackground}
            />

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.iconBadge}>
                  <LinearGradient
                    colors={['#8b5cf6', '#7c3aed']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconBadgeGradient}
                  >
                    <Ionicons name="people" size={24} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={styles.title}>Join Multiplayer Quiz</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <Ionicons name="information-circle-outline" size={20} color="#8b5cf6" />
              <Text style={styles.instructions}>
                Enter the 6-character session code to join a multiplayer quiz
              </Text>
            </View>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={sessionCode}
                onChangeText={(text) => setSessionCode(text.toUpperCase())}
                placeholder="ABC123"
                placeholderTextColor="#64748b"
                maxLength={6}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
              />
              <View style={styles.inputBorder} />
            </View>

            {/* Join Button */}
            <TouchableOpacity
              style={[styles.joinBtnWrapper]}
              onPress={handleJoin}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={loading ? ['#64748b', '#475569'] : ['#8b5cf6', '#7c3aed']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.joinBtn}
              >
                {loading ? (
                  <Text style={styles.joinBtnText}>Joining...</Text>
                ) : (
                  <>
                    <Ionicons name="enter-outline" size={20} color="#ffffff" />
                    <Text style={styles.joinBtnText}>Join Session</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconBadgeGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  instructions: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputBorder: {
    position: 'absolute',
    bottom: -2,
    left: '50%',
    marginLeft: -20,
    width: 40,
    height: 3,
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
  joinBtnWrapper: {
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 16,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default JoinSessionModal;
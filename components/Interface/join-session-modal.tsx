// components/JoinSessionModal.tsx
import { getCurrentUserData } from '@/services/auth-service';
import { joinSessionByCode } from '@/services/multiplayer-service';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';


interface JoinSessionModalProps {
  visible: boolean;
  onClose: () => void;
}

const JoinSessionModal: React.FC<JoinSessionModalProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!sessionCode || sessionCode.trim().length !== 6) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-character session code');
      return;
    }

    try {
      setLoading(true);

      // Get current user
      const user = await getCurrentUserData();
      if (!user) {
        Alert.alert('Error', 'Please login to join a session');
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
      Alert.alert('Error', error.message || 'Failed to join session');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSessionCode('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Join Multiplayer Quiz</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.instructions}>
            Enter the 6-character session code to join a multiplayer quiz
          </Text>

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

          <TouchableOpacity
            style={[styles.joinBtn, loading && styles.joinBtnDisabled]}
            onPress={handleJoin}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.joinBtnText}>Joining...</Text>
            ) : (
              <>
                <Ionicons name="enter-outline" size={20} color="#ffffff" />
                <Text style={styles.joinBtnText}>Join Session</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructions: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: '#334155',
    marginBottom: 20,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  joinBtnDisabled: {
    opacity: 0.6,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default JoinSessionModal;
// components/JoinNoteButton.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import JoinNoteModal from './join-modal';

interface JoinNoteButtonProps {
  style?: any;
  onNoteJoined?: (noteId: string, permission: 'view' | 'edit') => void;
}

export default function JoinNoteButton({ style, onNoteJoined }: JoinNoteButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const handleNoteJoined = (noteId: string, permission: 'view' | 'edit') => {
    // You can add any additional logic here, like refreshing the notes list
    console.log(`Joined note ${noteId} with ${permission} permission`);
    onNoteJoined?.(noteId, permission);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.joinButton, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="enter-outline" size={20} color="#fff" />
        </View>
        <Text style={styles.buttonText}>Join Note</Text>
      </TouchableOpacity>

      <JoinNoteModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleNoteJoined}
      />
    </>
  );
}

// Alternative compact button version (for toolbars/headers)
export function JoinNoteIconButton({ style, onNoteJoined }: JoinNoteButtonProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.iconButton, style]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="enter-outline" size={24} color="#fff" />
      </TouchableOpacity>

      <JoinNoteModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={onNoteJoined}
      />
    </>
  );
}

const styles = StyleSheet.create({
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  iconContainer: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

// File: components/Interface/option-focus-modal.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface OptionFocusModalProps {
  visible: boolean;
  optionIndex: number;
  optionText: string;
  isCorrect: boolean;
  backgroundColor: string;
  onClose: () => void;
  onSave: (text: string, isCorrect: boolean) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const OptionFocusModal: React.FC<OptionFocusModalProps> = ({
  visible,
  optionIndex,
  optionText,
  isCorrect,
  backgroundColor,
  onClose,
  onSave,
}) => {
  const [text, setText] = React.useState(optionText);
  const [correct, setCorrect] = React.useState(isCorrect);
  
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setText(optionText);
    setCorrect(isCorrect);
  }, [optionText, isCorrect]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSave = () => {
    onSave(text, correct);
    onClose();
  };

  const answerLabels = ['A', 'B', 'C', 'D'];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View 
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor,
              transform: [
                { scale: scaleAnim },
              ],
            }
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.answerBadge}>
                <Text style={styles.answerBadgeText}>
                  {answerLabels[optionIndex]}
                </Text>
              </View>
              <Text style={styles.headerTitle}>Edit Answer</Text>
            </View>
            <TouchableOpacity
              onPress={handleSave}
              style={styles.doneButton}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            placeholder={`Answer ${optionIndex + 1}`}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={text}
            onChangeText={setText}
            style={styles.input}
            multiline
            autoFocus
            textAlignVertical="center"
          />

          {/* <View style={styles.charCount}>
            <Text style={styles.charCountText}>
              {text.length} characters
            </Text>
          </View> */}

          <View style={styles.divider} />

          <TouchableOpacity
            style={[
              styles.correctToggle,
              correct && styles.correctToggleActive
            ]}
            onPress={() => setCorrect(!correct)}
            activeOpacity={0.8}
          >
            <View style={styles.correctToggleLeft}>
              <Ionicons 
                name={correct ? "checkmark-circle" : "checkmark-circle-outline"} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.correctToggleText}>
                {correct ? 'Correct Answer' : 'Mark as Correct'}
              </Text>
            </View>
            
            <View style={[
              styles.toggleSwitch,
              correct && styles.toggleSwitchActive
            ]}>
              <Animated.View style={[
                styles.toggleKnob,
                correct && styles.toggleKnobActive
              ]} />
            </View>
          </TouchableOpacity>

          
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
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
  },
  answerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  answerBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  doneButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    minHeight: 120,
    maxHeight: 200,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textAlign: 'center',
  },
  charCount: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 16,
  },
  charCountText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 16,
  },
  correctToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  correctToggleActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  correctToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  correctToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleSwitch: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleKnobActive: {
    transform: [{ translateX: 24 }],
  },
  correctBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  correctBadgeText: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '600',
  },
});
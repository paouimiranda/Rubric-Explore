// /components/Interface/custom-alert-modal.tsx - Neo-Glassmorphic Alert Modal
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface CustomAlertModalProps {
  visible: boolean;
  type?: 'info' | 'success' | 'error' | 'warning';
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'primary';
  }>;
  onClose?: () => void;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK', onPress: () => {}, style: 'primary' }],
  onClose,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const iconAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(iconAnim, {
          toValue: 1,
          friction: 6,
          tension: 40,
          delay: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      iconAnim.setValue(0);
    }
  }, [visible]);

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          name: 'checkmark-circle',
          colors: ['#10b981', '#059669'],
          bgColor: 'rgba(16, 185, 129, 0.15)',
        };
      case 'error':
        return {
          name: 'close-circle',
          colors: ['#ef4444', '#dc2626'],
          bgColor: 'rgba(239, 68, 68, 0.15)',
        };
      case 'warning':
        return {
          name: 'warning',
          colors: ['#f59e0b', '#d97706'],
          bgColor: 'rgba(245, 158, 11, 0.15)',
        };
      default:
        return {
          name: 'information-circle',
          colors: ['#3b82f6', '#2563eb'],
          bgColor: 'rgba(59, 130, 246, 0.15)',
        };
    }
  };

  const getButtonGradient = (style?: string) => {
    switch (style) {
      case 'primary':
        return ['#667eea', '#764ba2'] as any;
      case 'cancel':
        return ['#475569', '#334155'] as any;
      default:
        return ['#1e293b', '#0f172a'] as any;
    }
  };

  const iconConfig = getIconConfig() as any;

  const handleButtonPress = (button: typeof buttons[0]) => {
    button.onPress();
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.glassCard}>
            <LinearGradient
              colors={['rgba(30, 41, 59, 0.95)', 'rgba(15, 23, 42, 0.98)']}
              style={styles.glassBackground}
            >
              {/* Icon Badge */}
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: iconConfig.bgColor,
                    transform: [
                      {
                        scale: iconAnim,
                      },
                      {
                        rotate: iconAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <LinearGradient
                  colors={iconConfig.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconGradient}
                >
                  <Ionicons
                    name={iconConfig.name as any}
                    size={48}
                    color="#ffffff"
                  />
                </LinearGradient>
              </Animated.View>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Message */}
              <Text style={styles.message}>{message}</Text>

              {/* Buttons */}
              <View style={styles.buttonsContainer}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.buttonWrapper}
                    onPress={() => handleButtonPress(button)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={getButtonGradient(button.style)}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.button,
                        buttons.length === 1 && styles.buttonFull,
                      ]}
                    >
                      <Text
                        style={[
                          styles.buttonText,
                          button.style === 'cancel' && styles.buttonTextSecondary,
                        ]}
                      >
                        {button.text}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  glassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  glassBackground: {
    padding: 28,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  buttonWrapper: {
    flex: 1,
  },
  button: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonFull: {
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  buttonTextSecondary: {
    color: '#cbd5e1',
  },
});
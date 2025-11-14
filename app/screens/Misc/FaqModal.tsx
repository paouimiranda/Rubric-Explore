//screens/Misc/faq.tsx   --->> FREQUENTLY ASKED QUESTIONS
import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface FaqModalProps {
  visible: boolean;
  onClose: () => void;
}

const faqData = [
  {
    q: "What is Rubric?",
    a: "Rubric is a study companion app that helps learners create and organize notes, build custom quizzes, and monitor study progress.",
  },
  {
    q: "How do I create, edit, or delete a note?",
    a: "Create: Go to Notes → “+” → Save.\nEdit: Open a note → Edit icon → Save.\nDelete: Tap Delete to remove permanently.",
  },
  {
    q: "How do quizzes work?",
    a: "Create quizzes from topics or notes. You can take them, view results, and retake them. Attempts are saved for tracking progress.",
  },
  {
    q: "Is my data secure and private?",
    a: "All data is transmitted securely and stored with authentication.",
  },
  {
    q: "What data does Rubric collect?",
    a: "Notes, quiz definitions and attempts, logs for the main features of the application and account info (email/username).",
  },
  {
    q: "How do I request support or delete my account?",
    a: "Support: Email rubric.capstone@gmail.com\nDelete Account: Send an email from your registered address with subject “Account Deletion Request”. Data is purged within 30–90 days.",
  },
];

const FaqModal: React.FC<FaqModalProps> = ({ visible, onClose }) => {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [expandedIndex, setExpandedIndex] = useState<number | null>(0); // first item open
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View 
          style={[
            styles.modalContainer, 
            { 
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          <LinearGradient
            colors={['#0A1C3C', '#324762']}
            style={styles.gradientWrapper}
          >
            {/* Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconBadge}
              >
                <Ionicons name="help-circle" size={40} color="#fff" />
              </LinearGradient>
              <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
              <Text style={styles.headerSubtitle}>
                Find answers to common questions about Rubric
              </Text>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              {faqData.map((item, index) => {
                const isOpen = index === expandedIndex;

                return (
                  <View key={index} style={styles.section}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() =>
                        setExpandedIndex(isOpen ? null : index)
                      }
                      style={styles.sectionHeader}
                    >
                      <View style={styles.numberBadge}>
                        <Text style={styles.numberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.sectionTitle}>{item.q}</Text>
                      <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={20}
                        color="#667eea"
                      />
                    </TouchableOpacity>

                    {isOpen && (
                      <Text style={styles.sectionText}>
                        {item.a}
                      </Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Footer with Close button */}
            <View style={styles.footer}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.button}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color="#fff"
                  />
                  <Text style={styles.buttonText}>
                    Close
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
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
  modalContainer: {
    width: width * 0.92,
    maxWidth: 500,
    height: height * 0.85,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  gradientWrapper: {
    flex: 1,
  },
  header: {
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  numberText: {
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
    color: '#667eea',
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
    flex: 1,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 8,
  },
  footer: {
    padding: 20,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 1,
  },
  buttonText: {
    fontSize: 17,
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
  },
});

export default FaqModal;
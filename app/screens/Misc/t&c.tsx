//screens/Misc/t&c.tsx   --->> TERMS AND CONDITIONS
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

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

const TermsModal = ({ visible, onClose }: TermsModalProps) => {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonScale = useRef(new Animated.Value(0.95)).current;

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

  React.useEffect(() => {
    if (hasScrolledToBottom) {
      Animated.spring(buttonScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }
  }, [hasScrolledToBottom]);

  const handleScroll = (event : any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (isCloseToBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const handleDone = () => {
    if (hasScrolledToBottom) {
      onClose();
      setTimeout(() => setHasScrolledToBottom(false), 300);
    }
  };

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
                <Ionicons name="shield-checkmark" size={40} color="#fff" />
              </LinearGradient>
              <Text style={styles.headerTitle}>Terms & Conditions</Text>
              <Text style={styles.headerSubtitle}>
                Please read carefully before continuing
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
              onScroll={handleScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={true}
            >
              <View style={styles.dateCard}>
                <Ionicons name="calendar" size={16} color="#667eea" />
                <Text style={styles.effectiveDate}>
                  Effective: 10/26/2025 | Updated: 10/26/2025
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>1</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Introduction</Text>
                </View>
                <Text style={styles.sectionText}>
                  Welcome to Rubric ("we," "our," or "us"). These Terms and
                  Conditions ("Terms") govern your access to and use of our
                  multimodal study application ("Rubric").
                </Text>
                <Text style={styles.sectionText}>
                  By accessing or using Rubric, you agree to comply with and be
                  bound by these Terms. If you do not agree, you must stop using
                  the App immediately.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>2</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
                </View>
                <Text style={styles.sectionText}>
                  By creating an account, accessing, or using Rubric, you confirm
                  that you are at least 18 years old or have obtained consent from
                  a parent or guardian if you are a minor. You also acknowledge
                  that you have read and understood our Privacy Policy, which
                  forms an integral part of these Terms.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>3</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Use of the Application</Text>
                </View>
                <Text style={styles.sectionText}>
                  You agree to use Rubric solely for lawful, academic, and
                  educational purposes. You shall not:
                </Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Use the App to upload or distribute content that is unlawful,
                      harmful, or violates the rights of others.
                    </Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Interfere with or disrupt the operation of the App or its
                      servers.
                    </Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Attempt to gain unauthorized access to any part of the App or
                      its systems.
                    </Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Use automated tools or scripts to collect data or manipulate
                      the App's functionality.
                    </Text>
                  </View>
                </View>
                <Text style={styles.sectionText}>
                  We reserve the right to suspend or terminate your access if you
                  violate these Terms or any applicable law.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>4</Text>
                  </View>
                  <Text style={styles.sectionTitle}>
                    Account Registration and Security
                  </Text>
                </View>
                <Text style={styles.sectionText}>
                  When creating an account, you agree to:
                </Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Provide accurate and complete information.
                    </Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Keep your login credentials confidential.
                    </Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Be responsible for all activities that occur under your
                      account.
                    </Text>
                  </View>
                </View>
                <Text style={styles.sectionText}>
                  We are not liable for any loss or damage arising from
                  unauthorized access resulting from your failure to secure your
                  account information.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>5</Text>
                  </View>
                  <Text style={styles.sectionTitle}>
                    Intellectual Property Rights
                  </Text>
                </View>
                <Text style={styles.sectionText}>
                  All intellectual property rights in Rubric—including software,
                  design, logos, graphics, and content—are owned by or licensed to
                  Rubric.
                </Text>
                <Text style={styles.sectionText}>
                  You are granted a limited, non-exclusive, non-transferable
                  license to use the App for personal or educational purposes
                  only. You may not copy, modify, distribute, or create derivative
                  works from any part of the App without our prior written
                  consent.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>6</Text>
                  </View>
                  <Text style={styles.sectionTitle}>User-Generated Content</Text>
                </View>
                <Text style={styles.sectionText}>
                  You may upload or submit materials such as text, images, or
                  other study-related content ("User Content") through Rubric.
                </Text>
                <Text style={styles.sectionText}>
                  By submitting User Content, you:
                </Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Grant Rubric a non-exclusive, royalty-free, worldwide license
                      to store, display, and process such content for the purpose of
                      providing App functionality and research improvement.
                    </Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Represent and warrant that you own or have rights to submit
                      such content and that it does not infringe any third-party
                      rights.
                    </Text>
                  </View>
                </View>
                <Text style={styles.sectionText}>
                  We reserve the right to remove or restrict content that violates
                  laws or these Terms.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>7</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Data Privacy</Text>
                </View>
                <Text style={styles.sectionText}>
                  Your use of Rubric is also governed by our Privacy Policy, which
                  explains how we collect, use, and protect your personal data in
                  accordance with the Data Privacy Act of 2012 (Republic Act No.
                  10173).
                </Text>
                <Text style={styles.sectionText}>
                  We use Firestore | Firebase for secure data storage and
                  implement appropriate technical and organizational measures to
                  safeguard your information.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>8</Text>
                  </View>
                  <Text style={styles.sectionTitle}>
                    Service Availability and Modifications
                  </Text>
                </View>
                <Text style={styles.sectionText}>
                  We strive to keep Rubric available and operational at all times
                  but do not guarantee uninterrupted or error-free service.
                </Text>
                <Text style={styles.sectionText}>
                  We reserve the right to modify, update, suspend, or discontinue
                  any part of the App, temporarily or permanently, without prior
                  notice. We will not be liable for any loss or inconvenience
                  resulting from such actions.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>9</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Limitation of Liability</Text>
                </View>
                <Text style={styles.sectionText}>
                  To the fullest extent permitted by law, Rubric shall not be
                  liable for any direct, indirect, incidental, or consequential
                  damages arising from:
                </Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Use or inability to use the App;
                    </Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Unauthorized access or alteration of data;
                    </Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Content posted by users or third parties;
                    </Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Service interruptions or technical issues.
                    </Text>
                  </View>
                </View>
                <Text style={styles.sectionText}>
                  You agree to use the App at your own risk.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>10</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Indemnification</Text>
                </View>
                <Text style={styles.sectionText}>
                  You agree to indemnify and hold harmless Rubric, its developers,
                  affiliates, and partners from any claims, losses, damages,
                  liabilities, or expenses (including legal fees) arising from
                  your:
                </Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Violation of these Terms;</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Misuse of the App; or</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>
                      Violation of any third-party rights.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>11</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Termination</Text>
                </View>
                <Text style={styles.sectionText}>
                  We may suspend or terminate your account at any time, without
                  prior notice, if we believe you have violated these Terms or
                  applicable laws. Upon termination, your right to use the App
                  will immediately cease.
                </Text>
                <Text style={styles.sectionText}>
                  You may also terminate your account at any time by contacting us
                  at rubric.capstone@gmail.com.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>12</Text>
                  </View>
                  <Text style={styles.sectionTitle}>
                    Governing Law and Jurisdiction
                  </Text>
                </View>
                <Text style={styles.sectionText}>
                  These Terms shall be governed by and construed in accordance
                  with the laws of the Republic of the Philippines.
                </Text>
                <Text style={styles.sectionText}>
                  Any disputes arising from or related to these Terms shall be
                  subject to the exclusive jurisdiction of the proper courts of
                  the Republic of the Philippines.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>13</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Amendments</Text>
                </View>
                <Text style={styles.sectionText}>
                  We may revise these Terms from time to time. Updated versions
                  will be posted in the App or on our website, with the "Last
                  Updated" date changed accordingly. Continued use of the App
                  after such updates constitutes acceptance of the revised Terms.
                </Text>
              </View>

              <View style={[styles.section, { marginBottom: 24 }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>14</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                </View>
                <Text style={styles.sectionText}>
                  For questions or concerns about these Terms, please contact us
                  at:
                </Text>
                <View style={styles.contactCard}>
                  <View style={styles.contactIconBadge}>
                    <Ionicons name="mail" size={20} color="#667eea" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactText}>Rubric Team</Text>
                    <Text style={styles.contactEmail}>
                      rubric.capstone@gmail.com
                    </Text>
                  </View>
                </View>
              </View>

              {/* Scroll indicator */}
              {!hasScrolledToBottom && (
                <View style={styles.scrollIndicator}>
                  <Ionicons name="chevron-down" size={24} color="#667eea" />
                  <Text style={styles.scrollText}>Scroll to continue</Text>
                  <Ionicons name="chevron-down" size={24} color="#667eea" />
                </View>
              )}
            </ScrollView>

            {/* Footer with Done button */}
            <View style={styles.footer}>
              <TouchableOpacity
                activeOpacity={hasScrolledToBottom ? 0.7 : 1}
                onPress={handleDone}
                disabled={!hasScrolledToBottom}
              >
                <Animated.View
                  style={{
                    transform: [{ scale: hasScrolledToBottom ? buttonScale : 0.95 }],
                  }}
                >
                  <LinearGradient
                    colors={
                      hasScrolledToBottom
                        ? ['#667eea', '#764ba2']
                        : ['rgba(102, 126, 234, 0.3)', 'rgba(118, 75, 162, 0.3)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.button}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={hasScrolledToBottom ? '#fff' : 'rgba(255,255,255,0.4)'}
                    />
                    <Text
                      style={[
                        styles.buttonText,
                        !hasScrolledToBottom && styles.buttonTextDisabled,
                      ]}
                    >
                      I Accept
                    </Text>
                  </LinearGradient>
                </Animated.View>
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
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  effectiveDate: {
    fontSize: 11,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#667eea',
  },
  section: {
    marginBottom: 24,
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
    marginBottom: 12,
  },
  bulletContainer: {
    marginLeft: 8,
    marginBottom: 12,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#667eea',
    marginTop: 8,
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Montserrat_400Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  contactIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactText: {
    fontSize: 15,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#fff',
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
    color: '#667eea',
  },
  scrollIndicator: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  scrollText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#667eea',
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
  buttonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

export default TermsModal;
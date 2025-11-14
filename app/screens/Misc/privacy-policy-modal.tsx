import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';
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

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ visible, onClose }) => {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  // Removed "must scroll to bottom to accept" feature.
  // Button now simply closes the modal when pressed.

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
                <Ionicons name="shield-checkmark" size={40} color="#fff" />
              </LinearGradient>
              <Text style={styles.headerTitle}>Privacy Policy</Text>
              <Text style={styles.headerSubtitle}>
                Effective Date: October 26, 2025 | Last Updated: October 26, 2025
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
                  Welcome to Rubric. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we handle your information when you use our multimodal study application in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173) of the Republic of the Philippines.
                </Text>
                <View style={styles.infoBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#43e97b" />
                  <Text style={styles.infoBadgeText}>Your privacy matters to us</Text>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>2</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Information We Collect</Text>
                </View>
                <Text style={styles.sectionText}>
                  We may collect and process the following data about you:
                </Text>
                <Text style={styles.subTitle}>Personal Information</Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Name and contact information (email address)</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Account credentials (username, password)</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Profile information you choose to provide</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Study-related content you upload (text, images, notes)</Text>
                  </View>
                </View>
                <Text style={styles.subTitle}>Technical Information</Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Device information (model, operating system, unique device identifiers)</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Log data (IP address, crash reports, system activity)</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Usage data (features used, time spent, study sessions, interactions)</Text>
                  </View>
                </View>
                <Text style={styles.subTitle}>Educational Content</Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Study materials and notes you create or upload</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Learning progress and activity data</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Quiz and assessment results</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>3</Text>
                  </View>
                  <Text style={styles.sectionTitle}>How We Use Your Information</Text>
                </View>
                <Text style={styles.sectionText}>
                  We use the information we collect for the following purposes:
                </Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>To provide, maintain, and improve our educational services</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>To personalize your learning experience within the app</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>To store and organize your study materials securely</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>To analyze learning patterns and optimize app performance</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>To communicate with you about updates, security alerts, and support</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>To conduct research and improve our AI-powered study features</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>To detect, prevent, and address technical issues</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>To comply with legal obligations under Philippine law</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>4</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Information Sharing</Text>
                </View>
                <Text style={styles.sectionText}>
                  We do not sell your personal information. We may share your information only in the following circumstances:
                </Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}><Text style={styles.boldText}>Service Providers:</Text> With third-party vendors who perform services on our behalf</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}><Text style={styles.boldText}>Legal Requirements:</Text> When required by law or to protect our rights</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}><Text style={styles.boldText}>Business Transfers:</Text> In connection with a merger, acquisition, or sale of assets</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}><Text style={styles.boldText}>With Your Consent:</Text> When you explicitly agree to share your information</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>5</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Data Security</Text>
                </View>
                <Text style={styles.sectionText}>
                  We implement appropriate technical and organizational measures to protect your personal data against unauthorized or unlawful processing, accidental loss, destruction, or damage. We use Firebase/Firestore for secure data storage. These measures include:
                </Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Encryption of data in transit and at rest</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Secure cloud storage infrastructure (Firebase/Firestore)</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Regular security assessments and updates</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Access controls and authentication mechanisms</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Compliance with the Data Privacy Act of 2012 (RA 10173)</Text>
                  </View>
                </View>
                <Text style={styles.sectionText}>
                  However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>6</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Your Rights</Text>
                </View>
                <Text style={styles.sectionText}>
                  Under the Data Privacy Act of 2012 (Republic Act No. 10173), you have the following rights regarding your personal data:
                </Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}><Text style={styles.boldText}>Access:</Text> Request a copy of the personal data we hold about you</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}><Text style={styles.boldText}>Correction:</Text> Request correction of inaccurate or incomplete data</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}><Text style={styles.boldText}>Deletion:</Text> Request deletion of your personal data and account</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}><Text style={styles.boldText}>Objection:</Text> Object to processing of your personal data</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}><Text style={styles.boldText}>Portability:</Text> Request transfer of your data to another service</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}><Text style={styles.boldText}>Withdraw Consent:</Text> Withdraw your consent at any time</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}><Text style={styles.boldText}>File a Complaint:</Text> Lodge a complaint with the National Privacy Commission</Text>
                  </View>
                </View>
                <Text style={styles.sectionText}>
                  To exercise these rights, please contact us using the information provided below.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>7</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Cookies and Tracking</Text>
                </View>
                <Text style={styles.sectionText}>
                  Our app may use cookies and similar tracking technologies to enhance your experience. These may include:
                </Text>
                <View style={styles.bulletContainer}>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Analytics cookies to understand how users interact with our app</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Functional cookies to remember your preferences</Text>
                  </View>
                  <View style={styles.bulletPoint}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>Performance cookies to monitor app performance</Text>
                  </View>
                </View>
                <Text style={styles.sectionText}>
                  You can control cookie settings through your device settings.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>8</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Children's Privacy</Text>
                </View>
                <Text style={styles.sectionText}>
                  Our app is not intended for children under the age of 18 without parental or guardian consent. If you are a minor, you must obtain consent from your parent or guardian before using Rubric. If you believe we have collected information from a minor without proper consent, please contact us immediately.
                </Text>
              </View>
                            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>9</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Changes to This Policy</Text>
                </View>
                <Text style={styles.sectionText}>
                  We may update this privacy policy from time to time to reflect changes in our practices or legal requirements. We will notify you of any material changes by posting the new privacy policy in the app and updating the "Last Updated" date. We encourage you to review this policy periodically for any changes. Your continued use of Rubric after changes are posted constitutes acceptance of the revised policy.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>10</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Governing Law</Text>
                </View>
                <Text style={styles.sectionText}>
                  This privacy policy shall be governed by and construed in accordance with the laws of the Republic of the Philippines, including the Data Privacy Act of 2012 (Republic Act No. 10173).
                </Text>
                <Text style={styles.sectionText}>
                  Any disputes arising from or related to this privacy policy or our data practices shall be subject to the jurisdiction of the proper courts of the Philippines. You may also file complaints with the National Privacy Commission of the Philippines.
                </Text>
              </View>

              <View style={[styles.section, { marginBottom: 24 }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>11</Text>
                  </View>
                  <Text style={styles.sectionTitle}>Contact Us</Text>
                </View>
                <Text style={styles.sectionText}>
                  If you have any questions about this privacy policy, our data practices, or wish to exercise your rights under the Data Privacy Act of 2012, please contact us:
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
                <Text style={styles.sectionText}>
                  You may also contact the National Privacy Commission:
                </Text>
                <View style={styles.contactCard}>
                  <View style={styles.contactIconBadge}>
                    <Ionicons name="globe" size={20} color="#667eea" />
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactText}>National Privacy Commission</Text>
                    <Text style={styles.contactEmail}>
                      privacy.gov.ph | info@privacy.gov.ph
                    </Text>
                  </View>
                </View>
              </View>

            </ScrollView>

            {/* Footer with Accept button (now always enabled) */}
            <View style={styles.footer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onClose}
              >
                <Animated.View>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.button}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={'#fff'}
                    />
                    <Text
                      style={styles.buttonText}
                    >
                      I Understand
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
  subTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
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
  boldText: {
    fontFamily: 'Montserrat_600SemiBold',
    color: '#fff',
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(67, 233, 123, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(67, 233, 123, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  infoBadgeText: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
    color: '#43e97b',
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

export default PrivacyPolicyModal;

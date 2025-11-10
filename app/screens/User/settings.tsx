//settings.tsx - IMPROVED UI with Logout
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import BottomNavigation from '@/components/Interface/nav-bar';
import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import { Montserrat_300Light, Montserrat_400Regular, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Animated, LogBox, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import TermsModal from '../Misc/t&c';

const translations: Record<string, Record<string, string>> = {
  en: {
    settings: 'Settings',
    privacy: 'Privacy & Security',
    support: 'Help & Support',
    about: 'About Us',
    logout: 'Log Out',
    logoutConfirm: 'Are you sure you want to log out?',
    cancel: 'Cancel',
    confirm: 'Log Out',
    logoutError: 'Error',
    logoutErrorMsg: 'Failed to log out. Please try again.',
  },
  tl: {
    settings: 'Mga Setting',
    notifications: 'Mga Abiso',
    enablePush: 'Paganahin ang Push Notification',
    privacy: 'Privacy at Seguridad',
    support: 'Tulong at Suporta',
    about: 'Tungkol sa Amin',
    logout: 'Mag-logout',
    logoutConfirm: 'Sigurado ka bang gusto mong mag-logout?',
    cancel: 'Kanselahin',
    confirm: 'Mag-logout',
    logoutError: 'Error',
    logoutErrorMsg: 'Hindi matagumpay ang pag-logout. Subukan muli.',
  },
};

const SettingsScreen = () => {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_600SemiBold,
  });

  const router = useRouter();
  const { user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lang, setLang] = useState<'en' | 'tl'>('en');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  
  // Custom Alert Modal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: 'info' | 'success' | 'error' | 'warning';
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  useEffect(() => {
    LogBox.ignoreLogs(['Text strings must be rendered within a <Text> component']);
  }, []);

  const handleLogout = async () => {
    setAlertConfig({
      visible: true,
      type: 'warning',
      title: t.logout,
      message: t.logoutConfirm,
      buttons: [
        {
          text: t.cancel,
          onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
          style: 'cancel',
        },
        {
          text: t.confirm,
          onPress: async () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            try {
              await signOut(auth);
              await AsyncStorage.removeItem('userData');
              console.log('👋 User logged out successfully');
              router.dismissAll();
              router.replace('/');
            } catch (error) {
              console.error('❌ Logout error:', error);
              // Show error alert
              setAlertConfig({
                visible: true,
                type: 'error',
                title: t.logoutError,
                message: t.logoutErrorMsg,
                buttons: [
                  {
                    text: 'OK',
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                    style: 'primary',
                  }
                ],
              });
            }
          },
          style: 'primary',
        },
      ],
    });
  };

  const t = translations[lang];
  const textColor = isDarkMode ? '#ffffff' : '#113470ff';
  const cardBg = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.7)';

  const toggleSection = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const gradientColors: [string, string] = isDarkMode
    ? ['#0A1C3C', '#324762']
    : ['#83b4ed', '#dcf0f7'];

  const iconGradientColors = isDarkMode
    ? ['#667eea', '#764ba2']
    : ['#4facfe', '#00f2fe'];

  const SettingCard = ({ 
    title, 
    iconName, 
    sectionKey, 
    children, // Made optional to fix TypeScript error
    gradientColors: customGradient
  }: { 
    title: string; 
    iconName: keyof typeof Ionicons.glyphMap; 
    sectionKey: string; 
    children?: React.ReactNode; // Made optional
    gradientColors?: [string, string];
  }) => {
    const [animation] = useState(new Animated.Value(0));

    useEffect(() => {
      Animated.timing(animation, {
        toValue: expanded[sectionKey] ? 1 : 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }, [expanded[sectionKey]]);

    const rotateIcon = animation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '180deg'],
    });

    const gradient = customGradient || iconGradientColors;

    return (
      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <TouchableOpacity 
          onPress={() => toggleSection(sectionKey)} 
          style={styles.cardHeader}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeaderLeft}>
            <LinearGradient
              colors={gradient as any}
              style={styles.iconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={iconName} size={22} color="#ffffff" />
            </LinearGradient>
            <Text style={[styles.cardTitle, { color: textColor, flex: 1, flexWrap: 'wrap' }]}>{title}</Text>
          </View>
          <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}>
            <Ionicons name="chevron-down" size={20} color={textColor} />
          </Animated.View>
        </TouchableOpacity>
        {expanded[sectionKey] && (
          <View style={styles.cardContent}>{children}</View>
        )}
      </View>
    );
  };

  const SettingRow = ({ 
    label, 
    value, 
    onToggle,
    disabled = false // Added disabled prop
  }: { 
    label: string; 
    value: boolean; 
    onToggle: (val: boolean) => void;
    disabled?: boolean; // Added disabled prop
  }) => (
    <View style={styles.settingRow}>
      <Text style={[styles.settingLabel, { color: textColor, opacity: disabled ? 0.5 : 1 }]}>{label}</Text> {/* Gray out text when disabled */}
      <Switch
        value={value}
        onValueChange={disabled ? undefined : onToggle} // Prevent toggling when disabled
        disabled={disabled} // Disable the switch
        trackColor={{ false: disabled ? '#888' : '#555', true: disabled ? '#888' : '#667eea' }} // Gray track when disabled
        thumbColor={value ? '#ffffff' : '#dddddd'}
        ios_backgroundColor="#555"
      />
    </View>
  );

  const ActionButton = ({ 
    label, 
    onPress, 
    iconName,
    variant = 'default' 
  }: { 
    label: string; 
    onPress?: () => void; 
    iconName?: keyof typeof Ionicons.glyphMap;
    variant?: 'default' | 'header' 
  }) => (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.actionButton, 
        variant === 'header' && styles.actionButtonHeader,
        { borderColor: isDarkMode ? '#444' : '#ccc' }
      ]}
      disabled={variant === 'header'}
      activeOpacity={variant === 'header' ? 1 : 0.6}
    >
      {iconName && variant !== 'header' && (
        <Ionicons name={iconName} size={18} color={textColor} style={{ marginRight: 10 }} />
      )}
      <Text style={[
        styles.actionButtonText, 
        variant === 'header' && styles.actionButtonHeaderText,
        { color: textColor }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={gradientColors} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={[styles.header, { color: textColor }]}>{t.settings}</Text>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.headerUnderline}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>

          <SettingCard 
            title={t.privacy} 
            iconName="shield-checkmark" 
            sectionKey="privacy"
            gradientColors={['#4facfe', '#00f2fe']}
          >
            <ActionButton label="Account" variant="header" />
            <ActionButton label="Change Email" iconName="mail" onPress={() => {router.push('/screens/User/change-email')}} />
            <ActionButton label="Change Password" iconName="key" onPress={() => {router.push('/screens/User/change-password')}} />
            
            <View style={styles.sectionDivider} />
            <ActionButton label="App Permissions" variant="header" />
            
            <ActionButton 
              label="Manage in Device Settings" 
              iconName="settings"
              onPress={() => Linking.openSettings()} 
            />
            
            <View style={styles.sectionDivider} />
            <ActionButton label="Standards" variant="header" />
            <ActionButton 
              label="View Privacy Policy" 
              iconName="document-text" 
              onPress={() => setShowPrivacyModal(true)} 
            />
            <ActionButton 
              label="View Terms and Condition" 
              iconName="document-text" 
              onPress={() => setShowPrivacyModal(true)} 
            />
            
            
            
          </SettingCard>

          <SettingCard 
            title={t.support} 
            iconName="help-circle" 
            sectionKey="support"
            gradientColors={['#fa709a', '#fee140']}
          >
            <ActionButton label="Contact Support" iconName="chatbubbles" onPress={() => {}} />
            <ActionButton label="FAQ" iconName="help-buoy" onPress={() => {}} />
            <ActionButton label="Submit Feedback" iconName="megaphone" onPress={() => {}} />
          </SettingCard>

          <SettingCard 
            title={t.about} 
            iconName="information-circle" 
            sectionKey="about"
            gradientColors={['#a6ea6eff', '#5c9724ff']}
          >
            <View style={styles.aboutContent}>
              <Text style={[styles.aboutText, { color: textColor }]}>
                Version 1.0.0
              </Text>
              <Text style={[styles.aboutText, { color: textColor, opacity: 0.7 }]}>
                © 2025 Rubric
              </Text>
            </View>
          </SettingCard>
          {/* Logout Button - Moved outside ScrollView to position it lower/fixed at bottom */}
        <TouchableOpacity 
          onPress={handleLogout}
          activeOpacity={0.8}
          style={styles.logoutButtonContainer}
        >
          <LinearGradient
            colors={['#eb3349', '#ff7340ff']}
            style={styles.logoutButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="log-out-outline" size={22} color="#ffffff" style={{ marginRight: 10 }} />
            <Text style={styles.logoutButtonText}>{t.logout}</Text>
          </LinearGradient>
        </TouchableOpacity>
        </ScrollView>
        
        
        
        {/* Privacy Policy Modal */}
        <TermsModal 
          visible={showPrivacyModal} 
          onClose={() => setShowPrivacyModal(false)} 
        />
        
        {/* Custom Alert Modal */}
        <CustomAlertModal
          visible={alertConfig.visible}
          type={alertConfig.type}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        />
        
        <BottomNavigation />
      </SafeAreaView>
    </LinearGradient>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 20, // Reduced since logout is now outside ScrollView
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  header: {
    fontSize: 48,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 2,
  },
  headerUnderline: {
    width: 80,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBadge: {
    marginTop: 5,
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat_600SemiBold',
    marginLeft: 15,
  },
  cardContent: {
    padding: 16,
    paddingTop: 0,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonHeader: {
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontFamily: 'Montserrat_400Regular',
  },
  actionButtonHeaderText: {
    fontFamily: 'Montserrat_600SemiBold',
    fontSize: 14,
    opacity: 0.8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    marginVertical: 12,
  },
  aboutContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  aboutText: {
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    marginVertical: 4,
  },
  logoutButtonContainer: {
    marginHorizontal: 16,
    marginTop: 20, // Added more top margin to push it down further
    marginBottom: 10, // Space before BottomNavigation
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#eb3349',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
    letterSpacing: 0.5,
  },
});
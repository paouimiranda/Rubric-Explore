//settings.tsx - IMPROVED UI with Logout
import BottomNavigation from '@/components/Interface/nav-bar';
import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import { Montserrat_300Light, Montserrat_400Regular, Montserrat_600SemiBold } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Camera from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import * as MediaLibrary from 'expo-media-library';
//import * as Notifications from 'expo-notifications'; // Commented out due to expo-notifications removal from Expo Go in SDK 53
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { Alert, Animated, SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../../../firebase';
import { useAuth } from '../../contexts/AuthContext';

const translations: Record<string, Record<string, string>> = {
  en: {
    settings: 'Settings',
    notifications: 'Notifications',
    enablePush: 'Enable Push Notifications',
    privacy: 'Privacy & Security',
    support: 'Help & Support',
    about: 'About Us',
    logout: 'Log Out',
    logoutConfirm: 'Are you sure you want to log out?',
    cancel: 'Cancel',
    confirm: 'Log Out',
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
  const [notificationsEnabled, setNotificationsEnabled] = useState(false); // Set to false by default since disabled
  const [cameraPermission, requestCameraPermission] = Camera.useCameraPermissions();
  const [permissions, setPermissions] = useState<
    { name: string; icon: string; status: boolean; onRequest?: () => void }[]
  >([]);

  useEffect(() => {
    const checkPermissions = async () => {
      const cameraGranted = cameraPermission?.granted ?? false;
      const { status: mediaStatus } = await MediaLibrary.getPermissionsAsync();
      //const { status: notifStatus } = await Notifications.getPermissionsAsync(); // Commented out due to expo-notifications removal

      setPermissions([
        {
          name: 'Camera',
          icon: 'camera',
          status: cameraGranted,
          onRequest: requestCameraPermission,
        },
        {
          name: 'Media Library',
          icon: 'images',
          status: mediaStatus === 'granted',
          onRequest: async () => {
            await MediaLibrary.requestPermissionsAsync();
            checkPermissions();
          },
        },
        // {
        //   name: 'Notifications',
        //   icon: 'notifications',
        //   status: notifStatus === 'Not applicable', // Commented out due to expo-notifications removal
        //   onRequest: async () => {
        //     await Notifications.requestPermissionsAsync(); // Commented out due to expo-notifications removal
        //     checkPermissions();
        //   },
        // },
      ]);
    };

    checkPermissions();
  }, [cameraPermission]);

  const handleLogout = async () => {
    Alert.alert(
      t.logout,
      t.logoutConfirm,
      [
        {
          text: t.cancel,
          style: 'cancel',
        },
        {
          text: t.confirm,
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              await AsyncStorage.removeItem('userData');
              console.log('👋 User logged out successfully');
              router.replace('/');
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
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
    children = undefined, // Made optional to fix TypeScript error
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
            <Text style={[styles.cardTitle, { color: textColor }]}>{title}</Text>
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

  const PermissionItem = ({ 
    permission,
    key // Added key prop to fix TypeScript error (not used in component, but required for React map)
  }: { 
    permission: { name: string; icon: string; status: boolean; onRequest?: () => void };
    key?: string; // Added key prop
  }) => {
    const permissionGradient = permission.status 
      ? ['#11998e', '#38ef7d'] 
      : ['#eb3349', '#f45c43'];

    return (
      <View style={styles.permissionItem}>
        <View style={styles.permissionLeft}>
          <LinearGradient
            colors={permissionGradient as any}
            style={styles.permissionBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={permission.icon as keyof typeof Ionicons.glyphMap} size={18} color="#ffffff" />
          </LinearGradient>
          <View>
            <Text style={[styles.permissionName, { color: textColor }]}>
              {permission.name}
            </Text>
            <Text style={[
              styles.permissionStatus, 
              { color: permission.status ? '#38ef7d' : '#f45c43' }
            ]}>
              {permission.status ? 'Granted' : 'Denied'}
            </Text>
          </View>
        </View>
        {!permission.status && (
          <TouchableOpacity
            onPress={permission.onRequest}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.allowButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.allowButtonText}>Allow</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  };

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
            title={t.notifications} 
            iconName="notifications" 
            sectionKey="notifications"
            gradientColors={['#f093fb', '#f5576c']}
          >
            {/* Disabled due to expo-notifications removal from Expo Go in SDK 53. Re-enable when using a development build. */}
            <SettingRow 
              label={t.enablePush} 
              value={notificationsEnabled} 
              onToggle={setNotificationsEnabled} 
              disabled={true} // Disable the toggle to gray it out
            />
          </SettingCard>

          <SettingCard 
            title={t.privacy} 
            iconName="shield-checkmark" 
            sectionKey="privacy"
            gradientColors={['#4facfe', '#00f2fe']}
          >
            <ActionButton label="Change Email" iconName="mail" onPress={() => {router.push('/screens/User/change-email')}} />
            <ActionButton label="Change Password" iconName="key" onPress={() => {router.push('/screens/User/change-password')}} />
            <ActionButton label="Enable Biometric Login" iconName="finger-print" onPress={() => {}} />
            
            <View style={styles.sectionDivider} />
            <ActionButton label="App Permissions" variant="header" />
            
            {permissions.map((p) => (
              <PermissionItem key={p.name} permission={p} />
            ))}

            <ActionButton 
              label="Manage in Device Settings" 
              iconName="settings"
              onPress={() => Linking.openSettings()} 
            />
            
            <View style={styles.sectionDivider} />
            <ActionButton label="Clear App Data" iconName="trash" onPress={() => {}} />
            <ActionButton label="View Privacy Policy" iconName="document-text" onPress={() => {}} />
            <ActionButton label="Two-Factor Authentication" iconName="lock-closed" onPress={() => {}} />
            
            <SettingRow label="Allow Data Sharing" value={true} onToggle={() => {}} />
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

          {/* Logout Button */}
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
        <BottomNavigation />
      </SafeAreaView>
    </LinearGradient>
  );
};

export default SettingsScreen;

// Styles remain unchanged from the original code. No additions or removals needed.


const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
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
  permissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  permissionBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  permissionName: {
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  permissionStatus: {
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  allowButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  allowButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Montserrat_600SemiBold',
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
    marginTop: 24,
    marginBottom: 16,
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
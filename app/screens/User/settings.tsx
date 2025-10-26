import BottomNavigation from '@/components/Interface/nav-bar';
import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import { Montserrat_300Light } from '@expo-google-fonts/montserrat';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import * as Camera from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState } from 'react';


import { SafeAreaView, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

const translations: Record<string, Record<string, string>> = {
  en: {
    settings: 'Settings',
    appearance: 'Appearance',
    darkMode: 'Dark Mode',
    language: 'Language',
    notifications: 'Notifications',
    enablePush: 'Enable Push Notifications',
    privacy: 'Privacy and Security',
    support: 'Help and Support',
    about: 'About Us',
  },
  tl: {
    settings: 'Mga Setting',
    appearance: 'Hitsura',
    darkMode: 'Madilim na Mode',
    language: 'Wika',
    notifications: 'Mga Abiso',
    enablePush: 'Paganahin ang Push Notification',
    privacy: 'Privacy at Seguridad',
    support: 'Tulong at Suporta',
    about: 'Tungkol sa Amin',
  },
};



const SettingsScreen = () => {
  const [fontsLoaded] = useFonts ({
    BebasNeue_400Regular,
    Montserrat_300Light,
  })
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lang, setLang] = useState<'en' | 'tl'>('en');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

 // Camera permission hook (new Expo API)
const [cameraPermission, requestCameraPermission] = Camera.useCameraPermissions();

// Store the permissions state
const [permissions, setPermissions] = useState<
  { name: string; icon: string; status: boolean; onRequest?: () => void }[]
>([]);

// Check permissions on mount
useEffect(() => {
  const checkPermissions = async () => {
    const cameraGranted = cameraPermission?.granted ?? false;

    const { status: mediaStatus } = await MediaLibrary.getPermissionsAsync();
    const { status: notifStatus } = await Notifications.getPermissionsAsync();

    setPermissions([
      {
        name: 'Camera',
        icon: '📷',
        status: cameraGranted,
        onRequest: requestCameraPermission,
      },
      {
        name: 'Media Library',
        icon: '🗂️',
        status: mediaStatus === 'granted',
        onRequest: async () => {
          await MediaLibrary.requestPermissionsAsync();
          checkPermissions();
        },
      },
      {
        name: 'Notifications',
        icon: '🔔',
        status: notifStatus === 'granted',
        onRequest: async () => {
          await Notifications.requestPermissionsAsync();
          checkPermissions();
        },
      },
    ]);
  };

  checkPermissions();
}, [cameraPermission]);


  const t = translations[lang];

  const textColor = isDarkMode ? '#ffffff' : '#113470ff';
  const dividerColor = isDarkMode ? '#444' : '#8aa1caff';

  const toggleSection = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const gradientColors: [string, string] = isDarkMode
  ? ['#0A1C3C', '#324762']
  : ['#83b4ed', '#dcf0f7'];



  return (
    <LinearGradient colors={gradientColors} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[styles.header, { color: textColor }]}>{t.settings}</Text>

          {/* Appearance */}
          <TouchableOpacity onPress={() => toggleSection('appearance')} style={[styles.section, { borderColor: dividerColor }]}>
            <Text style={[styles.label, { color: textColor }]}>👁 {t.appearance}</Text>
          </TouchableOpacity>
          {expanded.appearance && (
            <View style={styles.sectionContent}>
              <View style={styles.row}>
                <Text style={[styles.sub, { color: textColor }]}>{t.darkMode}</Text>
                <Switch
                  value={isDarkMode}
                  onValueChange={setIsDarkMode}
                  trackColor={{ false: '#888', true: '#81b0ff' }}
                  thumbColor={isDarkMode ? '#0d47a1' : '#f4f3f4'}
                />
              </View>
            </View>
          )}

          {/* Language */}
          <TouchableOpacity onPress={() => toggleSection('language')} style={[styles.section, { borderColor: dividerColor }]}>
            <Text style={[styles.label, { color: textColor }]}>🌐 {t.language}</Text>
          </TouchableOpacity>
          {expanded.language && (
            <View style={styles.sectionContent}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={lang}
                  onValueChange={(value) => setLang(value)}
                  style={[styles.picker, { color: textColor }]}
                  dropdownIconColor={textColor}
                  mode="dropdown"
                >
                  <Picker.Item label="English" value="en" />
                  <Picker.Item label="Tagalog" value="tl" />
                </Picker>
              </View>
            </View>
          )}

          {/* Notifications */}
          <TouchableOpacity onPress={() => toggleSection('notifications')} style={[styles.section, { borderColor: dividerColor }]}>
            <Text style={[styles.label, { color: textColor }]}>🔔 {t.notifications}</Text>
          </TouchableOpacity>
          {expanded.notifications && (
            <View style={styles.sectionContent}>
              <View style={styles.row}>
                <Text style={[styles.sub, { color: textColor }]}>{t.enablePush}</Text>
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: '#888', true: '#81b0ff' }}
                  thumbColor={notificationsEnabled ? '#0d47a1' : '#f4f3f4'}
                />
              </View>
            </View>
          )}

          {/* Privacy */}
          <TouchableOpacity onPress={() => toggleSection('privacy')} style={[styles.section, { borderColor: dividerColor }]}>
            <Text style={[styles.label, { color: textColor }]}>🔒 {t.privacy}</Text>
          </TouchableOpacity>
          {expanded.privacy && (
            <View style={styles.sectionContent}>
              {/* Account Management */}
              <TouchableOpacity style={styles.privacyButton}>
                <Text style={{ color: textColor }}>✉️ Change Email</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.privacyButton}>
                <Text style={{ color: textColor }}>🔑 Change Password</Text>
              </TouchableOpacity>

              {/* App Security */}
              <TouchableOpacity style={styles.privacyButton}>
                <Text style={{ color: textColor }}>🔐 Enable App Lock / Biometric Login</Text>
              </TouchableOpacity>

              {/* App Permissions (clean + no borders) */}
              <TouchableOpacity disabled style={styles.privacyButton}>
                <Text style={[styles.subHeader, { color: textColor }]}>📱 App Permissions</Text>
              </TouchableOpacity>
                    
              {permissions.map((p) => (
                <View key={p.name} style={[styles.row, { marginVertical: 6 }]}>
                  <Text style={[styles.permissionText, { color: textColor }]}>
                    {p.icon} {p.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: p.status ? '#2ecc71' : '#e74c3c', fontWeight: '500' }}>
                      {p.status ? 'Allowed' : 'Denied'}
                    </Text>
                    {!p.status && (
                      <TouchableOpacity
                        onPress={p.onRequest}
                        style={{
                          backgroundColor: '#81b0ff',
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 12 }}>Allow</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}

              <TouchableOpacity style={[styles.privacyButton, { marginTop: 5 }]} onPress={() => Linking.openSettings()}>
                <Text style={{ color: textColor }}>⚙️ Manage in Device Settings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.privacyButton}>
                <Text style={{ color: textColor }}>🧹 Clear App Data</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.privacyButton}>
                <Text style={{ color: textColor }}>📄 View Privacy Policy</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.privacyButton}>
                <Text style={{ color: textColor }}>🔒 Two-Factor Authentication</Text>
              </TouchableOpacity>

              <View style={styles.row}>
                <Text style={{ color: textColor }}>📊 Allow Data Sharing</Text>
                <Switch
                  value={true}
                  onValueChange={() => {}}
                  trackColor={{ false: '#888', true: '#81b0ff' }}
                  thumbColor={'#0d47a1'}
                />
              </View>
            </View>
          )}

          {/* Support */}
          <TouchableOpacity onPress={() => toggleSection('support')} style={[styles.section, { borderColor: dividerColor }]}>
            <Text style={[styles.label, { color: textColor }]}>🧰 {t.support}</Text>
          </TouchableOpacity>
          {expanded.support && (
            <View style={styles.sectionContent}>
              <Text style={{ color: textColor }}>[Support Options Placeholder]</Text>
            </View>
          )}

          {/* About */}
          <TouchableOpacity onPress={() => toggleSection('about')} style={[styles.section, { borderColor: dividerColor }]}>
            <Text style={[styles.label, { color: textColor }]}>❓ {t.about}</Text>
          </TouchableOpacity>
          {expanded.about && (
            <View style={styles.sectionContent}>
              <Text style={{ color: textColor }}>[About Us Info Placeholder]</Text>
            </View>
          )}
        </ScrollView>
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
    padding: 20,
    paddingBottom: 80,
  },
  header: {
    fontSize: 70,
    fontFamily: 'BebasNeue_400Regular',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionContent: {
    marginBottom: 25,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 18,
    fontFamily: 'Montserrat_300Light'
  },
  sub: {
    fontSize: 14,
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerWrapper: {
  borderWidth: 1,
  borderRadius: 8,
  borderColor: '#888',
  overflow: 'hidden',
  marginTop: 10,
  alignItems: 'center',
  justifyContent: 'center',
},
picker: {
  height: 40,
  width: '100%',
  fontSize: 14,
},
  privacyButton: {
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderColor: '#555',
  marginBottom: 5,
},
permissionBox: {
  borderWidth: 1,
  borderRadius: 8,
  padding: 10,
  marginBottom: 10,
},
permissionTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  marginBottom: 5,
},
subHeader: {
  fontSize: 16,
  fontWeight: '600',
  marginVertical: 8,
  marginLeft: 2,
},

permissionText: {
  fontSize: 14,
  marginLeft: 5,
},
permissionButton: {
  marginTop: 8,
  paddingVertical: 6,
  borderTopWidth: 1,
  borderColor: '#555',
},


});

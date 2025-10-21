import BottomNavigation from '@/components/Interface/nav-bar';
import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import { Montserrat_300Light } from '@expo-google-fonts/montserrat';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
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
              <Text style={{ color: textColor }}>[Privacy Options Placeholder]</Text>
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
    borderRadius: 6,
    borderColor: '#888',
    marginTop: 10,
  },
  picker: {
    height: 40,
    width: '100%',
  },
});

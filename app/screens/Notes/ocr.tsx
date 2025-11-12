// components/OCRModal.tsx
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { Montserrat_400Regular, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { GeminiOCRTab } from './GeminiOCR';
import { MLKitOCRTab } from './MLKitOCR';

interface OCRModalProps {
  isVisible: boolean;
  onClose: () => void;
  onInsertText: (text: string) => void;
}

type TabType = 'gemini' | 'mlkit';

export default function OCRModal({ isVisible, onClose, onInsertText }: OCRModalProps) {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });
  const { addBacklogEvent } = useBacklogLogger();
  const [activeTab, setActiveTab] = useState<TabType>('gemini');

  React.useEffect(() => {
    if (isVisible) {
      addBacklogEvent("ocr_modal_opened");
    }
  }, [isVisible]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    addBacklogEvent("ocr_tab_changed", { tab });
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.ocrModalOverlay}>
        <LinearGradient
          colors={['#0A1C3C', '#324762']}
          style={styles.ocrModalContent}
        >
          {/* Header */}
          <View style={styles.ocrHeader}>
            <View style={styles.headerLeft}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.headerIconBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="scan" size={24} color="#ffffff" />
              </LinearGradient>
              <Text style={styles.ocrTitle}>Text Extraction</Text>
            </View>
            <TouchableOpacity style={styles.ocrCloseButton} onPress={onClose}>
              <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => handleTabChange('gemini')}
              activeOpacity={0.8}
            >
              {activeTab === 'gemini' ? (
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.activeTab}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.activeTabText}>Gemini AI</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <Ionicons name="sparkles-outline" size={18} color="#aaa" />
                  <Text style={styles.inactiveTabText}>Gemini AI</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => handleTabChange('mlkit')}
              activeOpacity={0.8}
            >
              {activeTab === 'mlkit' ? (
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.activeTab}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="hardware-chip" size={18} color="#fff" />
                  <Text style={styles.activeTabText}>ML Kit</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTab}>
                  <Ionicons name="hardware-chip-outline" size={18} color="#aaa" />
                  <Text style={styles.inactiveTabText}>ML Kit</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'gemini' ? (
            <GeminiOCRTab onInsertText={onInsertText} onClose={onClose} />
          ) : (
            <MLKitOCRTab onInsertText={onInsertText} onClose={onClose} />
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  ocrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  ocrModalContent: {
    flex: 1,
    marginTop: 60,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  ocrHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ocrTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    color: "#fff",
  },
  ocrCloseButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 0,
    gap: 12,
  },
  tabButton: {
    flex: 1,
  },
  activeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  inactiveTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTabText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  inactiveTabText: {
    color: '#aaa',
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
});
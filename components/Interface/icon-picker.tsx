// components/Interface/icon-picker.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

interface IconPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectIcon: (iconName: string, color: string) => void;
  currentIcon?: string;
  currentColor?: string;
}

// Categorized icon sets
const ICON_CATEGORIES = {
  Academic: [
    'book', 'book-outline', 'school', 'school-outline', 'library', 
    'library-outline', 'calculator', 'calculator-outline', 'flask',
    'flask-outline', 'pencil', 'pencil-outline', 'document-text',
    'document-text-outline', 'reader', 'reader-outline', 'glasses',
    'glasses-outline', 'bulb', 'bulb-outline'
  ],
  Work: [
    'briefcase', 'briefcase-outline', 'business', 'business-outline',
    'laptop', 'laptop-outline', 'desktop', 'desktop-outline', 'folder',
    'folder-outline', 'documents', 'documents-outline', 'clipboard',
    'clipboard-outline', 'stats-chart', 'stats-chart-outline', 'trending-up',
    'trending-up-outline', 'pie-chart', 'pie-chart-outline'
  ],
  Personal: [
    'person', 'person-outline', 'heart', 'heart-outline', 'home',
    'home-outline', 'star', 'star-outline', 'gift', 'gift-outline',
    'fitness', 'fitness-outline', 'restaurant', 'restaurant-outline',
    'cafe', 'cafe-outline', 'game-controller', 'game-controller-outline',
    'musical-notes', 'musical-notes-outline'
  ],
  Time: [
    'calendar', 'calendar-outline', 'time', 'time-outline', 'alarm',
    'alarm-outline', 'hourglass', 'hourglass-outline', 'timer',
    'timer-outline', 'stopwatch', 'stopwatch-outline', 'today',
    'today-outline', 'calendar-number', 'calendar-number-outline'
  ],
  Status: [
    'checkmark-circle', 'checkmark-circle-outline', 'close-circle',
    'close-circle-outline', 'alert-circle', 'alert-circle-outline',
    'warning', 'warning-outline', 'information-circle', 'information-circle-outline',
    'flag', 'flag-outline', 'ribbon', 'ribbon-outline', 'trophy',
    'trophy-outline', 'medal', 'medal-outline'
  ],
  Communication: [
    'mail', 'mail-outline', 'chatbubble', 'chatbubble-outline', 'call',
    'call-outline', 'notifications', 'notifications-outline', 'megaphone',
    'megaphone-outline', 'mic', 'mic-outline', 'videocam', 'videocam-outline'
  ],
  Location: [
    'location', 'location-outline', 'map', 'map-outline', 'navigate',
    'navigate-outline', 'compass', 'compass-outline', 'globe', 'globe-outline',
    'airplane', 'airplane-outline', 'car', 'car-outline', 'train',
    'train-outline', 'bicycle', 'bicycle-outline'
  ],
  Technology: [
    'code', 'code-outline', 'code-slash', 'code-slash-outline', 'terminal',
    'terminal-outline', 'bug', 'bug-outline', 'cloud', 'cloud-outline',
    'server', 'server-outline', 'wifi', 'wifi-outline', 'bluetooth',
    'bluetooth-outline', 'hardware-chip', 'hardware-chip-outline'
  ],
  Creative: [
    'brush', 'brush-outline', 'color-palette', 'color-palette-outline',
    'image', 'image-outline', 'camera', 'camera-outline', 'film',
    'film-outline', 'easel', 'easel-outline', 'sparkles', 'sparkles-outline'
  ],
  Nature: [
    'leaf', 'leaf-outline', 'flower', 'flower-outline', 'sunny',
    'sunny-outline', 'moon', 'moon-outline', 'rainy', 'rainy-outline',
    'cloudy', 'cloudy-outline', 'snow', 'snow-outline', 'water',
    'water-outline', 'bonfire', 'bonfire-outline'
  ],
};

const ICON_COLORS = [
  { name: 'Gray', color: '#6b7280' },
  { name: 'Blue', color: '#4facfe' },
  { name: 'Green', color: '#10b981' },
  { name: 'Red', color: '#f5576c' },
  { name: 'Yellow', color: '#fee140' },
  { name: 'Purple', color: '#667eea' },
  { name: 'Pink', color: '#ec4899' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Cyan', color: '#06b6d4' },
  { name: 'Lime', color: '#84cc16' },
];

export default function IconPicker({
  visible,
  onClose,
  onSelectIcon,
  currentIcon,
  currentColor = '#6b7280',
}: IconPickerProps) {
  const [selectedIcon, setSelectedIcon] = useState<string>(currentIcon || '');
  const [selectedColor, setSelectedColor] = useState<string>(currentColor);

  const handleConfirm = () => {
    if (selectedIcon) {
      onSelectIcon(selectedIcon, selectedColor);
      onClose();
    }
  };

  const handleRemoveIcon = () => {
    onSelectIcon('', '#6b7280');
    onClose();
  };



  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Gradient Background */}
          <LinearGradient
            colors={['#0A1C3C', '#1a2f4f', '#324762']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBackground}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.iconBadge}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconBadgeGradient}
                >
                  <Ionicons name="color-palette" size={28} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Choose Your Icon</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* All Icons with Category Headers */}
          <ScrollView 
            style={styles.iconsContainer} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {Object.entries(ICON_CATEGORIES).map(([category, icons]) => (
              <View key={category} style={styles.categorySection}>
                <View style={styles.categoryHeaderContainer}>
                  <View style={styles.categoryDivider} />
                  <Text style={styles.categoryHeader}>{category}</Text>
                  <View style={styles.categoryDivider} />
                </View>
                <View style={styles.iconsGrid}>
                  {icons.map((iconName, idx) => (
                    <TouchableOpacity
                      key={`${iconName}-${idx}`}
                      style={[styles.iconButton]}
                      onPress={() => setSelectedIcon(iconName)}
                      activeOpacity={0.8}
                    >
                      <View style={[
                        styles.iconButtonInner,
                        selectedIcon === iconName && styles.iconButtonSelected,
                      ]}>
                        <Ionicons
                          // @ts-ignore - Ionicons type checking
                          name={iconName}
                          size={24}
                          color={selectedIcon === iconName ? selectedColor : '#9ca3af'}
                        />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Color Picker */}
          <View style={styles.colorSection}>
            <Text style={styles.sectionLabel}>Select Color</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorsContainer}
            >
              {ICON_COLORS.map((colorOption) => (
                <TouchableOpacity
                  key={colorOption.color}
                  style={styles.colorButtonWrapper}
                  onPress={() => setSelectedColor(colorOption.color)}
                  activeOpacity={0.8}
                >
                  <View style={styles.colorButton}>
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: colorOption.color },
                        selectedColor === colorOption.color && styles.colorButtonSelected,
                      ]}
                    />
                    {selectedColor === colorOption.color && (
                      <View style={styles.colorCheckmarkContainer}>
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color="#fff"
                          style={styles.colorCheckmark}
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Preview & Actions */}
          <View style={styles.footer}>
            <View style={styles.previewContainer}>
              {selectedIcon ? (
                <View style={styles.previewIconWrapper}>
                  <Ionicons 
                    // @ts-ignore - Ionicons type checking
                    name={selectedIcon} 
                    size={32} 
                    color={selectedColor} 
                  />
                </View>
              ) : (
                <Text style={styles.noIconText}>No icon selected</Text>
              )}
            </View>

            <View style={styles.actions}>
              {currentIcon && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={handleRemoveIcon}
                  activeOpacity={0.8}
                >
                  <View style={styles.removeButtonInner}>
                    <Ionicons name="trash-outline" size={20} color="#f5576c" />
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <View style={styles.cancelButtonInner}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !selectedIcon && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                disabled={!selectedIcon}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.confirmButtonGradient,
                  { backgroundColor: selectedIcon ? selectedColor : '#4b5563' }
                ]}>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    height: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconBadgeGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconsContainer: {
    flexGrow: 1,
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  categoryDivider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4facfe',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconButton: {
    width: 52,
    height: 52,
  },
  iconButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  iconButtonSelected: {
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  colorSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  colorsContainer: {
    gap: 12,
    paddingBottom: 4,
  },
  colorButtonWrapper: {
    marginRight: 4,
  },
  colorButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  colorButtonSelected: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  colorCheckmarkContainer: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCheckmark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  previewIconWrapper: {
    padding: 8,
  },
  noIconText: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  removeButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  removeButtonInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 87, 108, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 87, 108, 0.3)',
    borderRadius: 16,
  },
  removeButtonText: {
    color: '#f5576c',
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cancelButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  cancelButtonText: {
    color: '#d1d5db',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  confirmButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
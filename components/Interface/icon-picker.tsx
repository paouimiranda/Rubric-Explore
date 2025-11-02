// components/Interface/icon-picker.tsx
import { Ionicons } from "@expo/vector-icons";
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
  { name: 'Blue', color: '#3b82f6' },
  { name: 'Green', color: '#10b981' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Yellow', color: '#f59e0b' },
  { name: 'Purple', color: '#8b5cf6' },
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
  const [activeCategory, setActiveCategory] = useState<string>('Academic');

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

  const categories = Object.keys(ICON_CATEGORIES);
  const currentIcons = ICON_CATEGORIES[activeCategory as keyof typeof ICON_CATEGORIES] || [];

  // Debug: Log current icons
  React.useEffect(() => {
    console.log('Active category:', activeCategory);
    console.log('Current icons count:', currentIcons.length);
    console.log('First 5 icons:', currentIcons.slice(0, 5));
  }, [activeCategory, currentIcons]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Icon</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>



          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryTab,
                  activeCategory === category && styles.categoryTabActive,
                ]}
                onPress={() => setActiveCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    activeCategory === category && styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Icons Grid */}
          <ScrollView style={styles.iconsContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.iconsGrid}>
              {currentIcons.map((iconName, idx) => {
                // Verify icon exists by trying to render it
                try {
                  return (
                    <TouchableOpacity
                      key={`${iconName}-${idx}`}
                      style={[
                        styles.iconButton,
                        selectedIcon === iconName && styles.iconButtonSelected,
                      ]}
                      onPress={() => setSelectedIcon(iconName)}
                    >
                      <Ionicons
                        // @ts-ignore - Ionicons type checking
                        name={iconName}
                        size={24}
                        color={selectedIcon === iconName ? selectedColor : '#9ca3af'}
                      />
                    </TouchableOpacity>
                  );
                } catch (error) {
                  console.warn(`Icon ${iconName} not found`);
                  return null;
                }
              })}
            </View>
          </ScrollView>

          {/* Color Picker */}
          <View style={styles.colorSection}>
            <Text style={styles.sectionLabel}>Icon Color</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorsContainer}
            >
              {ICON_COLORS.map((colorOption) => (
                <TouchableOpacity
                  key={colorOption.color}
                  style={[
                    styles.colorButton,
                    selectedColor === colorOption.color && styles.colorButtonSelected,
                  ]}
                  onPress={() => setSelectedColor(colorOption.color)}
                >
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: colorOption.color },
                    ]}
                  />
                  {selectedColor === colorOption.color && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color="#fff"
                      style={styles.colorCheckmark}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Preview & Actions */}
          <View style={styles.footer}>
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Preview:</Text>
              {selectedIcon ? (
                <View style={styles.previewIcon}>
                  <Ionicons 
                    // @ts-ignore - Ionicons type checking
                    name={selectedIcon} 
                    size={28} 
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
                  style={[styles.actionButton, styles.removeButton]}
                  onPress={handleRemoveIcon}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.confirmButton,
                  !selectedIcon && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!selectedIcon}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 85, 99, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    margin: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    display: 'none', // Hidden but keeping styles
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    display: 'none', // Hidden but keeping styles
  },
  categoriesContainer: {
    maxHeight: 50,
    marginBottom: 12,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  categoryTabActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  iconsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    minHeight: 200, // Ensure minimum height
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 16,
    justifyContent: 'flex-start',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconButtonSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
  },
  colorSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 85, 99, 0.3)',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
  colorsContainer: {
    gap: 8,
    paddingBottom: 16,
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  colorButtonSelected: {
    borderColor: '#ffffff',
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorCheckmark: {
    position: 'absolute',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(75, 85, 99, 0.3)',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(51, 65, 85, 0.3)',
    borderRadius: 12,
    gap: 12,
  },
  previewLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noIconText: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  removeButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.3)',
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
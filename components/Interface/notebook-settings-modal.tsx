// components/Interface/notebook-settings-modal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface NotebookProperty {
  key: string;
  value: string;
  source?: 'inherited' | 'manual';
  icon?: string;
  iconColor?: string;
}

interface Notebook {
  id: string;
  uid: string;
  title: string;
  description?: string;
  coverImage?: string;
  properties?: NotebookProperty[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  color?: string;
  isPublic: boolean;
}

interface NotebookSettingsModalProps {
  visible: boolean;
  notebook: Notebook | null;
  isPublicToggle: boolean;
  onClose: () => void;
  onPublicToggle: (value: boolean) => void;
  onSyncProperties: () => void;
  onEdit: () => void;
  colorScheme: any;
}

export default function NotebookSettingsModal({
  visible,
  notebook,
  isPublicToggle,
  onClose,
  onPublicToggle,
  onSyncProperties,
  onEdit,
  colorScheme,
}: NotebookSettingsModalProps) {
  const [localIsPublic, setLocalIsPublic] = useState(false);

  useEffect(() => {
    if (visible && notebook) {
      setLocalIsPublic(isPublicToggle);
    }
  }, [visible, notebook, isPublicToggle]);

  const handlePublicToggle = (value: boolean) => {
    setLocalIsPublic(value);
    onPublicToggle(value);
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.settingsModalContent, { borderColor: colorScheme.border }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notebook Settings</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.settingsSection} showsVerticalScrollIndicator={false}>
           

            {/* Description Display */}
            {notebook?.description && (
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <View style={[styles.settingIconContainer, {
                    backgroundColor: colorScheme.overlay,
                    borderColor: colorScheme.border,
                  }]}>
                    <Ionicons name="reader-outline" size={20} color={colorScheme.light} />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Description</Text>
                    <Text style={styles.settingValue}>{notebook.description}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Public/Private Toggle */}
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <View style={[styles.settingIconContainer, {
                  backgroundColor: colorScheme.overlay,
                  borderColor: colorScheme.border,
                }]}>
                  <Ionicons
                    name={localIsPublic ? "globe" : "lock-closed"}
                    size={20}
                    color={localIsPublic ? "#52C72B" : colorScheme.light}
                  />
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Public Notebook</Text>
                  <Text style={styles.settingDescription}>
                    {localIsPublic
                      ? "Anyone can view this notebook on your profile"
                      : "Only you can see this notebook"}
                  </Text>
                </View>
              </View>
              <Switch
                value={localIsPublic}
                onValueChange={handlePublicToggle}
                trackColor={{ false: "#374151", true: colorScheme.primary }}
                thumbColor={localIsPublic ? "#ffffff" : "#9ca3af"}
                ios_backgroundColor="#374151"
              />
            </View>

            {localIsPublic && (
              <View style={styles.warningBox}>
                <Ionicons name="information-circle-outline" size={20} color="#f59e0b" />
                <Text style={styles.warningText}>
                  Public notebooks will be visible on your profile. Individual notes still need to be set to public separately.
                </Text>
              </View>
            )}

            {/* Sync Properties Button */}
            {notebook?.properties && notebook.properties.length > 0 && (
              <TouchableOpacity
                style={[styles.syncButton, {
                  backgroundColor: colorScheme.overlay,
                  borderColor: colorScheme.border,
                }]}
                onPress={onSyncProperties}
              >
                <Ionicons name="sync-outline" size={20} color={colorScheme.primary} />
                <Text style={[styles.syncButtonText, { color: colorScheme.light }]}>
                  Sync Properties to All Notes
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colorScheme.primary }]}
              onPress={onEdit}
            >
              <Ionicons name="create-outline" size={16} color="#ffffff" />
              <Text style={styles.saveButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  settingsModalContent: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    width: "100%",
    maxWidth: 500,
    borderWidth: 2,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(75, 85, 99, 0.3)",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(156, 163, 175, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsSection: {
    padding: 20,
    paddingTop: 16,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(31, 41, 55, 0.5)",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(75, 85, 99, 0.3)",
    marginBottom: 16,
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: "#9ca3af",
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#f59e0b",
    lineHeight: 18,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  syncButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(75, 85, 99, 0.3)",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    backgroundColor: "rgba(107, 114, 128, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.3)",
  },
  cancelButtonText: {
    color: "#9ca3af",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
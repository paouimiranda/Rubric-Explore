// app/(notes)/PropertiesModal.tsx - WITH ICON SUPPORT AND CUSTOM ALERT
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Import IconPicker - adjust path if needed
import IconPicker from "@/components/Interface/icon-picker";

interface NotebookProperty {
  key: string;
  value: string;
  source?: 'inherited' | 'manual';
  icon?: string;
  iconColor?: string;
}

interface PropertiesModalProps {
  visible: boolean;
  onClose: () => void;
  properties: NotebookProperty[];
  onUpdateProperties: (properties: NotebookProperty[]) => void;
}

const defaultPropertyKeys = ["Priority", "Status", "Category", "Due Date", "Tags", "Custom"];

export default function PropertiesModal({
  visible,
  onClose,
  properties,
  onUpdateProperties,
}: PropertiesModalProps) {
  const [newPropertyKey, setNewPropertyKey] = useState("");
  const [newPropertyValue, setNewPropertyValue] = useState("");
  const [editingPropertyIndex, setEditingPropertyIndex] = useState<number | null>(null);
  
  // Icon picker state
  const [iconPickerVisible, setIconPickerVisible] = useState(false);
  const [iconPickerTarget, setIconPickerTarget] = useState<{
    type: 'new' | 'edit';
    index?: number;
  } | null>(null);
  const [tempIcon, setTempIcon] = useState<string>("");
  const [tempIconColor, setTempIconColor] = useState<string>("#6b7280");

  // Alert modal state
  const [alertModal, setAlertModal] = useState({
    visible: false,
    type: 'info' as 'info' | 'success' | 'error' | 'warning',
    title: '',
    message: '',
    buttons: [] as Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>,
  });

  // Debug log
  React.useEffect(() => {
    if (visible) {
      console.log('PropertiesModal opened with properties:', properties);
    }
  }, [visible, properties]);

  const showAlert = (
    type: 'info' | 'success' | 'error' | 'warning',
    title: string,
    message: string,
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'primary';
    }>
  ) => {
    setAlertModal({
      visible: true,
      type,
      title,
      message,
      buttons,
    });
  };

  const hideAlert = () => {
    setAlertModal(prev => ({ ...prev, visible: false }));
  };

  const resetModal = () => {
    setNewPropertyKey("");
    setNewPropertyValue("");
    setEditingPropertyIndex(null);
    setTempIcon("");
    setTempIconColor("#6b7280");
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const addProperty = () => {
    if (newPropertyKey && newPropertyValue) {
      let updatedProperties: NotebookProperty[];
      
      const propertyData: NotebookProperty = {
        key: newPropertyKey,
        value: newPropertyValue,
        source: 'manual',
        icon: tempIcon || '',
        iconColor: tempIconColor !== '#6b7280' ? tempIconColor : '',
      };
      
      if (editingPropertyIndex !== null) {
        // Edit existing property
        updatedProperties = [...properties];
        updatedProperties[editingPropertyIndex] = propertyData;
        setEditingPropertyIndex(null);
      } else {
        // Add new property
        updatedProperties = [...properties, propertyData];
      }
      
      onUpdateProperties(updatedProperties);
      setNewPropertyKey("");
      setNewPropertyValue("");
      setTempIcon("");
      setTempIconColor("#6b7280");
      onClose();
    }
  };

  const editProperty = (index: number) => {
    const property = properties[index];
    setNewPropertyKey(property.key);
    setNewPropertyValue(property.value);
    setTempIcon(property.icon || "");
    setTempIconColor(property.iconColor || "#6b7280");
    setEditingPropertyIndex(index);
  };

  const removeProperty = (index: number) => {
    showAlert(
      'warning',
      'Remove Property',
      'Are you sure you want to remove this property?',
      [
        {
          text: 'Cancel',
          onPress: hideAlert,
          style: 'cancel',
        },
        {
          text: 'Remove',
          onPress: () => {
            hideAlert();
            const updatedProperties = properties.filter((_, i) => i !== index);
            onUpdateProperties(updatedProperties);
          },
          style: 'primary',
        },
      ]
    );
  };

  const selectPropertyKey = (key: string) => {
    if (key === "Custom") {
      setNewPropertyKey("");
    } else {
      setNewPropertyKey(key);
    }
  };

  const openIconPicker = (type: 'new' | 'edit', index?: number) => {
    setIconPickerTarget({ type, index });
    
    if (type === 'edit' && index !== undefined) {
      const prop = properties[index];
      setTempIcon(prop.icon || "");
      setTempIconColor(prop.iconColor || "#6b7280");
    }
    
    setIconPickerVisible(true);
  };

  const handleIconSelect = (iconName: string, color: string) => {
    console.log('Icon selected:', iconName, 'Color:', color); // Debug log
    setTempIcon(iconName);
    setTempIconColor(color);

    // If editing an existing property directly from the list
    if (iconPickerTarget?.type === 'edit' && iconPickerTarget.index !== undefined) {
      const updatedProperties = [...properties];
      updatedProperties[iconPickerTarget.index] = {
        ...updatedProperties[iconPickerTarget.index],
        icon: iconName || '',
        iconColor: color !== '#6b7280' ? color : '',
        source: 'manual',
      };
      console.log('Updated property:', updatedProperties[iconPickerTarget.index]); // Debug log
      onUpdateProperties(updatedProperties);
    }

    setIconPickerVisible(false);
    setIconPickerTarget(null);
  };

  return (
    <>
      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPropertyIndex !== null ? "Edit Property" : "Add Property"}
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Icon Selector */}
              <View style={styles.iconSelectorContainer}>
                <Text style={styles.inputLabel}>Icon (Optional)</Text>
                <TouchableOpacity
                  style={styles.iconSelectorButton}
                  onPress={() => openIconPicker('new')}
                >
                  {tempIcon ? (
                    <>
                      <Ionicons
                        name={tempIcon as any}
                        size={24}
                        color={tempIconColor}
                      />
                      <Text style={styles.iconSelectorText}>Change Icon</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={24} color="#6b7280" />
                      <Text style={styles.iconSelectorText}>Add Icon</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Property Key</Text>
              <TextInput
                style={styles.modalInput}
                value={newPropertyKey}
                onChangeText={setNewPropertyKey}
                placeholder="Enter property key"
                placeholderTextColor="#9ca3af"
              />
              
              {/* Quick property key selection */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickKeys}>
                {defaultPropertyKeys.map((key) => (
                  <TouchableOpacity
                    key={key}
                    style={styles.quickKeyChip}
                    onPress={() => selectPropertyKey(key)}
                  >
                    <Text style={styles.quickKeyText}>{key}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Property Value</Text>
              <TextInput
                style={styles.modalInput}
                value={newPropertyValue}
                onChangeText={setNewPropertyValue}
                placeholder="Enter property value"
                placeholderTextColor="#9ca3af"
              />

              {/* Existing Properties */}
              {properties.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Current Properties</Text>
                  <View style={styles.existingPropertiesContainer}>
                    {properties.map((property, index) => (
                      <View key={index} style={styles.existingProperty}>
                        <View style={styles.propertyContent}>
                          {property.icon && (
                            <Ionicons
                              name={property.icon as any}
                              size={18}
                              color={property.iconColor || '#6b7280'}
                              style={styles.propertyIcon}
                            />
                          )}
                          <View style={styles.propertyTextContainer}>
                            <Text style={styles.existingPropertyKey}>
                              {property.key}
                            </Text>
                            <Text style={styles.existingPropertyValue}>
                              {property.value}
                            </Text>
                          </View>
                          {property.source === 'inherited' && (
                            <View style={styles.inheritedBadge}>
                              <Ionicons name="link-outline" size={10} color="#a78bfa" />
                            </View>
                          )}
                        </View>
                        <View style={styles.propertyActions}>
                          <TouchableOpacity
                            style={styles.propertyActionButton}
                            onPress={() => openIconPicker('edit', index)}
                          >
                            <Ionicons name="color-palette-outline" size={18} color="#f59e0b" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.propertyActionButton}
                            onPress={() => editProperty(index)}
                          >
                            <Ionicons name="pencil" size={16} color="#3b82f6" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.propertyActionButton}
                            onPress={() => removeProperty(index)}
                          >
                            <Ionicons name="trash" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleClose}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.modalButtonPrimary,
                  (!newPropertyKey || !newPropertyValue) && styles.modalButtonDisabled
                ]}
                onPress={addProperty}
                disabled={!newPropertyKey || !newPropertyValue}
              >
                <Text style={styles.modalButtonText}>
                  {editingPropertyIndex !== null ? "Update" : "Add"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <IconPicker
        visible={iconPickerVisible}
        onClose={() => {
          setIconPickerVisible(false);
          setIconPickerTarget(null);
        }}
        onSelectIcon={handleIconSelect}
        currentIcon={tempIcon}
        currentColor={tempIconColor}
      />

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alertModal.visible}
        type={alertModal.type}
        title={alertModal.title}
        message={alertModal.message}
        buttons={alertModal.buttons}
        onClose={hideAlert}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 24,
    maxHeight: "90%",
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSelectorContainer: {
    marginBottom: 16,
  },
  iconSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  iconSelectorText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#d1d5db",
    marginBottom: 8,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: "#334155",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  quickKeys: {
    marginVertical: 12,
  },
  quickKeyChip: {
    backgroundColor: "#475569",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  quickKeyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginTop: 20,
    marginBottom: 12,
  },
  existingPropertiesContainer: {
    gap: 8,
    marginBottom: 16,
  },
  existingProperty: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#334155",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(75, 85, 99, 0.3)',
  },
  propertyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  propertyIcon: {
    marginRight: 4,
  },
  propertyTextContainer: {
    flex: 1,
  },
  existingPropertyKey: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "500",
  },
  existingPropertyValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  inheritedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  propertyActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  propertyActionButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalButtonPrimary: {
    backgroundColor: "#3b82f6",
  },
  modalButtonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#4b5563",
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextSecondary: {
    color: "#d1d5db",
    fontSize: 16,
    fontWeight: "600",
  },
});
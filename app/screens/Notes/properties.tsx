// app/(notes)/PropertiesModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface NotebookProperty {
  key: string;
  value: string;
  source?: 'inherited' | 'manual'; // Track if property is inherited from notebook or manually edited
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

  const resetModal = () => {
    setNewPropertyKey("");
    setNewPropertyValue("");
    setEditingPropertyIndex(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const addProperty = () => {
    if (newPropertyKey && newPropertyValue) {
      let updatedProperties: NotebookProperty[];
      
      if (editingPropertyIndex !== null) {
        // Edit existing property
        updatedProperties = [...properties];
        updatedProperties[editingPropertyIndex] = {
          key: newPropertyKey,
          value: newPropertyValue,
        };
        setEditingPropertyIndex(null);
      } else {
        // Add new property
        updatedProperties = [...properties, { key: newPropertyKey, value: newPropertyValue }];
      }
      
      onUpdateProperties(updatedProperties);
      setNewPropertyKey("");
      setNewPropertyValue("");
      onClose();
    }
  };

  const editProperty = (index: number) => {
    const property = properties[index];
    setNewPropertyKey(property.key);
    setNewPropertyValue(property.value);
    setEditingPropertyIndex(index);
  };

  const removeProperty = (index: number) => {
    Alert.alert(
      "Remove Property",
      "Are you sure you want to remove this property?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const updatedProperties = properties.filter((_, i) => i !== index);
            onUpdateProperties(updatedProperties);
          },
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

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editingPropertyIndex !== null ? "Edit Property" : "Add Property"}
          </Text>

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
              <ScrollView style={styles.existingProperties}>
                {properties.map((property, index) => (
                  <View key={index} style={styles.existingProperty}>
                    <Text style={styles.existingPropertyText}>
                      {property.key}: {property.value}
                    </Text>
                    <View style={styles.propertyActions}>
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
              </ScrollView>
            </>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={handleClose}
            >
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
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
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
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
    marginTop: 16,
    marginBottom: 8,
  },
  existingProperties: {
    maxHeight: 120,
    marginBottom: 16,
  },
  existingProperty: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#334155",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  existingPropertyText: {
    color: "#fff",
    fontSize: 14,
    flex: 1,
  },
  propertyActions: {
    flexDirection: "row",
    gap: 8,
  },
  propertyActionButton: {
    padding: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
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
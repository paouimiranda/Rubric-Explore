// CreateNotebookModal.tsx
import IconPicker from '@/components/Interface/icon-picker';
import { pickImage } from '@/services/image-service';
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Image,
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
  icon?: string;
  iconColor?: string;
}

interface CreateNotebookModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (notebookData: {
    title: string;
    description: string;
    coverImage: string;
    color: string;
    properties: NotebookProperty[];
    tags: string[];
    isPublic: boolean;
  }) => void;
  creating: boolean;
  userId: string;
}

const defaultCoverImages = [
  { id: 'notebook1', source: require('@/assets/covers/notebook1.jpg'), name: 'Classic', gradient: ['#667eea', '#764ba2'] },
  { id: 'notebook2', source: require('@/assets/covers/notebook2.jpg'), name: 'Modern', gradient: ['#4facfe', '#00f2fe'] },
  { id: 'notebook3', source: require('@/assets/covers/notebook3.jpg'), name: 'Vintage', gradient: ['#fa709a', '#fee140'] },
  { id: 'notebook4', source: require('@/assets/covers/notebook4.jpg'), name: 'Minimal', gradient: ['#a8edea', '#fed6e3'] },
  { id: 'notebook5', source: require('@/assets/covers/notebook5.jpg'), name: 'Colorful', gradient: ['#f093fb', '#f5576c'] },
  { id: 'notebook6', source: require('@/assets/covers/notebook6.jpg'), name: 'Nature', gradient: ['#43e97b', '#38f9d7'] },
];

const colorPalette = [
  { name: "Blue", gradient: ['#4facfe', '#00f2fe'], solid: "#3b82f6", tag: "All", icon: "water" },
  { name: "Green", gradient: ['#43e97b', '#38f9d7'], solid: "#10b981", tag: "Personal", icon: "leaf" },
  { name: "Orange", gradient: ['#fa709a', '#fee140'], solid: "#f59e0b", tag: "School", icon: "school" },
  { name: "Purple", gradient: ['#667eea', '#764ba2'], solid: "#8b5cf6", tag: "Work", icon: "briefcase" },
  { name: "Red", gradient: ['#eb337aff', '#ec6d5aff'], solid: "#ef4444", tag: null, icon: "flame" },
  { name: "Pink", gradient: ['#f093fb', '#f5576c'], solid: "#ec4899", tag: null, icon: "heart" },
];

const tagColors = {
  "All": { gradient: ['#4facfe', '#00f2fe'], solid: "#3b82f6" },
  "Personal": { gradient: ['#43e97b', '#38f9d7'], solid: "#10b981" },
  "School": { gradient: ['#fa709a', '#fee140'], solid: "#f59e0b" },
  "Work": { gradient: ['#667eea', '#764ba2'], solid: "#8b5cf6" },
};

const availableTags = ["Personal", "School", "Work"];
const defaultPropertyKeys = ["Course", "Instructor", "Status", "Priority"];

export default function CreateNotebookModal({
  visible,
  onClose,
  onCreate,
  creating,
  userId,
}: CreateNotebookModalProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newCoverImage, setNewCoverImage] = useState("");
  const [newColor, setNewColor] = useState("#3b82f6");
  const [currentGradient, setCurrentGradient] = useState(['#4facfe', '#00f2fe']);
  const [newPropertyKey, setNewPropertyKey] = useState("");
  const [newPropertyValue, setNewPropertyValue] = useState("");
  const [properties, setProperties] = useState<NotebookProperty[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [propertyIconPickerVisible, setPropertyIconPickerVisible] = useState(false);
  const [tempPropertyIcon, setTempPropertyIcon] = useState("");
  const [tempPropertyIconColor, setTempPropertyIconColor] = useState("#667eea");
  const [fadeAnim] = useState(new Animated.Value(0));
  const [uploadingImage, setUploadingImage] = useState(false);
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const resetDialog = () => {
    setNewTitle("");
    setNewCoverImage("");
    setNewColor("#3b82f6");
    setCurrentGradient(['#4facfe', '#00f2fe']);
    setNewPropertyKey("");
    setNewPropertyValue("");
    setProperties([]);
    setSelectedTags([]);
    setTempPropertyIcon("");
    setTempPropertyIconColor("#667eea");
    setCustomImageUri(null);
  };

  const handleCreate = () => {
    const notebookData = {
      title: newTitle || "Untitled Notebook",
      description: "",
      coverImage: customImageUri || newCoverImage,
      color: newColor,
      properties,
      tags: selectedTags,
      isPublic: false,
    };
    onCreate(notebookData);
    resetDialog();
  };

  const handleClose = () => {
    resetDialog();
    onClose();
  };

  const addProperty = () => {
    if (newPropertyKey && newPropertyValue) {
      const newProp: NotebookProperty = {
        key: newPropertyKey,
        value: newPropertyValue,
        icon: tempPropertyIcon || 'pricetag',
        iconColor: tempPropertyIconColor,
      };
      setProperties([...properties, newProp]);
      setNewPropertyKey("");
      setNewPropertyValue("");
      setTempPropertyIcon("");
      setTempPropertyIconColor("#667eea");
    }
  };

  const removeProperty = (index: number) => {
    setProperties(properties.filter((_, i) => i !== index));
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const selectPropertyKey = (key: string) => {
    setNewPropertyKey(key);
    setShowPropertyDropdown(false);
  };

  const selectCoverImage = (imageId: string) => {
    setNewCoverImage(imageId);
    setCustomImageUri(null);
  };

  const handleUploadImage = async () => {
    try {
      setUploadingImage(true);
      const image = await pickImage();
      
      if (image && image.uri) {
        // For now, just store the local URI
        // We'll upload it when creating the notebook
        setCustomImageUri(image.uri);
        setNewCoverImage('');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to pick image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const selectColor = (colorOption: any) => {
    setNewColor(colorOption.solid);
    setCurrentGradient(colorOption.gradient);
  };

  const getCoverImageSource = (coverImage?: string) => {
    if (!coverImage) return null;
    const defaultImage = defaultCoverImages.find(img => img.id === coverImage);
    return defaultImage?.source || null;
  };

  return (
    <>
      <Modal animationType="slide" transparent visible={visible}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['#0A1C3C', '#1e293b', '#324762']}
              style={styles.gradientBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ScrollView 
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerContent}>
                    <LinearGradient
                      colors={currentGradient as any}
                      style={styles.iconBadge}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="book" size={40} color="#fff" />
                    </LinearGradient>
                    <View style={styles.headerText}>
                      <Text style={styles.modalTitle}>Create Notebook</Text>
                      <Text style={styles.modalSubtitle}>Build your knowledge base</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                    <Ionicons name="close" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                {/* Title Input */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Notebook Title</Text>
                  <View style={styles.glassInput}>
                    <Ionicons name="create-outline" size={20} color={newColor} style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter notebook title"
                      placeholderTextColor="#64748b"
                      value={newTitle}
                      onChangeText={setNewTitle}
                    />
                  </View>
                </View>

                {/* Tags Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Category</Text>
                  <View style={styles.tagContainer}>
                    {availableTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      const tagColorObj = tagColors[tag as keyof typeof tagColors];
                      return (
                        <TouchableOpacity
                          key={tag}
                          activeOpacity={0.7}
                          onPress={() => toggleTag(tag)}
                          style={[
                            styles.tagChip,
                            { borderColor: tagColorObj.solid },
                            isSelected && { backgroundColor: tagColorObj.solid }
                          ]}
                        >
                          <Text style={[
                            styles.tagText,
                            { color: isSelected ? "#fff" : tagColorObj.solid }
                          ]}>
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Cover Image Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Cover Image</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.coverScroll}
                  >
                    {defaultCoverImages.map((image) => {
                      const isSelected = newCoverImage === image.id;
                      return (
                        <TouchableOpacity
                          key={image.id}
                          onPress={() => selectCoverImage(image.id)}
                          activeOpacity={0.8}
                        >
                          <View style={[
                            styles.coverOption,
                            isSelected && styles.coverOptionSelected
                          ]}>
                            <Image source={image.source} style={styles.coverImage} />
                            {isSelected && (
                              <LinearGradient
                                colors={image.gradient as any}
                                style={styles.coverBadge}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                              >
                                <Ionicons name="checkmark" size={16} color="#fff" />
                              </LinearGradient>
                            )}
                            <Text style={styles.coverName}>{image.name}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    
                    {/* Custom Upload Option */}
                    <TouchableOpacity
                      onPress={handleUploadImage}
                      activeOpacity={0.8}
                      disabled={uploadingImage}
                    >
                      <View style={[
                        styles.coverOption,
                        customImageUri && styles.coverOptionSelected
                      ]}>
                        {customImageUri ? (
                          <>
                            <Image source={{ uri: customImageUri }} style={styles.coverImage} />
                            <LinearGradient
                              colors={['#667eea', '#764ba2']}
                              style={styles.coverBadge}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            </LinearGradient>
                          </>
                        ) : (
                          <View style={styles.uploadCoverPlaceholder}>
                            {uploadingImage ? (
                              <ActivityIndicator size="small" color="#667eea" />
                            ) : (
                              <>
                                <LinearGradient
                                  colors={['#667eea', '#764ba2']}
                                  style={styles.uploadIconCircle}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                >
                                  <Ionicons name="cloud-upload" size={32} color="#fff" />
                                </LinearGradient>
                                <Text style={styles.uploadText}>Upload</Text>
                              </>
                            )}
                          </View>
                        )}
                        <Text style={styles.coverName}>
                          {customImageUri ? 'Custom' : 'Upload'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </ScrollView>
                </View>

                {/* Color Theme Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Color Theme</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.colorScroll}
                  >
                    {colorPalette.map((colorOption) => {
                      const isSelected = newColor === colorOption.solid;
                      return (
                        <TouchableOpacity
                          key={colorOption.name}
                          onPress={() => selectColor(colorOption)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.colorOptionContainer}>
                            <LinearGradient
                              colors={colorOption.gradient as any}
                              style={[
                                styles.colorCircle,
                                isSelected && styles.colorCircleSelected
                              ]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Ionicons name={colorOption.icon as any} size={24} color="#fff" />
                            </LinearGradient>
                            <Text style={styles.colorName}>{colorOption.name}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Properties Section */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Properties (Optional)</Text>
                  
                  <View style={styles.propertyInputContainer}>
                    <TouchableOpacity
                      style={styles.propertyIconButton}
                      onPress={() => setPropertyIconPickerVisible(true)}
                    >
                      <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.propertyIconGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons 
                          name={tempPropertyIcon as any || "add-circle"} 
                          size={20} 
                          color="#fff" 
                        />
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.propertyInputs}>
                      <View style={[styles.glassInput, styles.propertyKey]}>
                        <TextInput
                          style={[styles.textInput, { paddingRight: 32 }]}
                          placeholder="Key"
                          placeholderTextColor="#64748b"
                          value={newPropertyKey}
                          onChangeText={setNewPropertyKey}
                        />
                        <TouchableOpacity 
                          style={styles.dropdownIcon}
                          onPress={() => setShowPropertyDropdown(!showPropertyDropdown)}
                        >
                          <Ionicons name="chevron-down" size={16} color="#9ca3af" />
                        </TouchableOpacity>
                      </View>

                      <View style={[styles.glassInput, styles.propertyValue]}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Value"
                          placeholderTextColor="#64748b"
                          value={newPropertyValue}
                          onChangeText={setNewPropertyValue}
                        />
                      </View>
                    </View>
                  </View>

                  {showPropertyDropdown && (
                    <View style={styles.dropdownMenu}>
                      {defaultPropertyKeys.map((key) => (
                        <TouchableOpacity
                          key={key}
                          style={styles.dropdownItem}
                          onPress={() => selectPropertyKey(key)}
                        >
                          <Text style={styles.dropdownText}>{key}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.addPropertyButton}
                    onPress={addProperty}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)']}
                      style={styles.addPropertyGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="add" size={20} color="#3b82f6" />
                      <Text style={styles.addPropertyText}>Add Property</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Property List */}
                  {properties.length > 0 && (
                    <View style={styles.propertyList}>
                      {properties.map((prop, idx) => (
                        <View key={idx} style={styles.propertyCard}>
                          <View style={styles.propertyCardContent}>
                            <Ionicons 
                              name={prop.icon as any || 'pricetag'} 
                              size={18} 
                              color={prop.iconColor || '#667eea'} 
                            />
                            <Text style={styles.propertyCardKey}>{prop.key}</Text>
                            <Text style={styles.propertyCardSeparator}>:</Text>
                            <Text style={styles.propertyCardValue}>{prop.value}</Text>
                          </View>
                          <TouchableOpacity onPress={() => removeProperty(idx)}>
                            <Ionicons name="close-circle" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={handleClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={handleCreate}
                    disabled={creating}
                    activeOpacity={0.8}
                    style={{ flex: 1 }}
                  >
                    <LinearGradient
                      colors={creating ? ['#6b7280', '#6b7280'] : currentGradient as any}
                      style={styles.createButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {creating ? (
                        <>
                          <Ionicons name="hourglass" size={20} color="#fff" />
                          <Text style={styles.createButtonText}>Creating...</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={20} color="#fff" />
                          <Text style={styles.createButtonText}>Create Notebook</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>

      <IconPicker
        visible={propertyIconPickerVisible}
        onClose={() => setPropertyIconPickerVisible(false)}
        onSelectIcon={(iconName, color) => {
          setTempPropertyIcon(iconName);
          setTempPropertyIconColor(color);
        }}
        currentIcon={tempPropertyIcon}
        currentColor={tempPropertyIconColor}
      />
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    height: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  gradientBackground: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  glassInput: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tagChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  tagText: {
    fontSize: 14,
    fontWeight: "600",
  },
  coverScroll: {
    marginHorizontal: -4,
  },
  coverOption: {
    marginHorizontal: 6,
    alignItems: "center",
  },
  coverOptionSelected: {
    transform: [{ scale: 1.05 }],
  },
  coverImage: {
    width: 100,
    height: 140,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: "transparent",
  },
  coverBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  coverName: {
    fontSize: 12,
    color: "#cbd5e1",
    marginTop: 8,
    fontWeight: "500",
  },
  uploadCoverPlaceholder: {
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(102, 126, 234, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  uploadText: {
    fontSize: 12,
    color: "#667eea",
    fontWeight: "600",
  },
  colorScroll: {
    marginHorizontal: -4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  colorOptionContainer: {
    alignItems: "center",
    marginHorizontal: 8,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorCircleSelected: {
    borderColor: "#fff",
    transform: [{ scale: 1.1 }],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  colorName: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 8,
    fontWeight: "500",
  },
  propertyInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  propertyIconButton: {
    marginRight: 12,
  },
  propertyIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  propertyInputs: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  propertyKey: {
    flex: 1.2,
  },
  propertyValue: {
    flex: 1,
  },
  dropdownIcon: {
    padding: 4,
  },
  dropdownMenu: {
    backgroundColor: "rgba(51,65,85,0.95)",
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  dropdownText: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "500",
  },
  addPropertyButton: {
    marginTop: 8,
  },
  addPropertyGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
    gap: 8,
  },
  addPropertyText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
  },
  propertyList: {
    marginTop: 16,
    gap: 8,
  },
  propertyCard: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  propertyCardContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  propertyCardKey: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
  },
  propertyCardSeparator: {
    color: "#64748b",
    fontSize: 14,
  },
  propertyCardValue: {
    color: "#94a3b8",
    fontSize: 14,
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 0.8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cancelButtonText: {
    color: "#cbd5e1",
    fontSize: 16,
    fontWeight: "600",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
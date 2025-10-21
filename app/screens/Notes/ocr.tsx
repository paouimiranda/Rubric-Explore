// components/OCRModal.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Types
interface OCRResponse {
  success: boolean;
  text: string;
  word_count: number;
  language: string;
  error?: string;
}

interface OCRState {
  isVisible: boolean;
  isProcessing: boolean;
  extractedText: string;
  wordCount: number;
  selectedImage: string | null;
  error: string | null;
}

interface OCRModalProps {
  isVisible: boolean;
  onClose: () => void;
  onInsertText: (text: string) => void;
}

// Constants
const API_BASE_URL = 'http://192.168.254.111:8000';

// Custom hook for OCR functionality
function useOCR() {
  const [ocrState, setOcrState] = useState<OCRState>({
    isVisible: false,
    isProcessing: false,
    extractedText: "",
    wordCount: 0,
    selectedImage: null,
    error: null,
  });

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images.',
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      let result;
      
      if (source === 'camera') {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPermission.status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setOcrState(prev => ({
          ...prev,
          selectedImage: imageUri,
          extractedText: '',
          wordCount: 0,
          error: null,
        }));
        
        // Automatically process the image after selection
        await processImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setOcrState(prev => ({
        ...prev,
        error: 'Failed to pick image. Please try again.',
      }));
    }
  };

  const processImage = async (imageUri: string) => {
    if (!imageUri) {
      setOcrState(prev => ({
        ...prev,
        error: 'Please select an image first.',
      }));
      return;
    }

    setOcrState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
    }));
    
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add the image file
      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);
      
      // Add default parameters
      formData.append('lang', 'en');
      formData.append('confidence', '0.5');
      formData.append('format', 'simple');

      const response = await fetch(`${API_BASE_URL}/api/ocr`, {
        method: 'POST',
        body: formData as any,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json() as OCRResponse;

      if (data.success) {
        setOcrState(prev => ({
          ...prev,
          isProcessing: false,
          extractedText: data.text,
          wordCount: data.word_count,
        }));
      } else {
        throw new Error(data.error || 'OCR processing failed');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      setOcrState(prev => ({
        ...prev,
        isProcessing: false,
        error: `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        extractedText: '',
        wordCount: 0,
      }));
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to select an image',
      [
        { text: 'Camera', onPress: () => pickImage('camera') },
        { text: 'Photo Library', onPress: () => pickImage('library') },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(ocrState.extractedText);
      Alert.alert('Copied!', 'Text has been copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy text to clipboard');
    }
  };

  const clearOCRData = () => {
    setOcrState(prev => ({
      ...prev,
      extractedText: "",
      wordCount: 0,
      selectedImage: null,
      error: null,
    }));
  };

  return {
    ocrState,
    setOcrState,
    showImagePickerOptions,
    copyToClipboard,
    clearOCRData,
  };
}

// Main OCRModal Component
export default function OCRModal({ isVisible, onClose, onInsertText }: OCRModalProps) {
  const {
    ocrState,
    showImagePickerOptions,
    copyToClipboard,
    clearOCRData,
  } = useOCR();

  const insertOCRText = () => {
    if (ocrState.extractedText) {
      onInsertText(ocrState.extractedText);
      // Clear OCR text after insertion
      clearOCRData();
      onClose();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.ocrModalOverlay}>
        <View style={styles.ocrModalContent}>
          {/* OCR Header */}
          <View style={styles.ocrHeader}>
            <Text style={styles.ocrTitle}>OCR Text Extraction</Text>
            <TouchableOpacity style={styles.ocrCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* OCR Content */}
          <ScrollView style={styles.ocrScrollView} showsVerticalScrollIndicator={false}>
            {/* Image Selection Section */}
            <View style={styles.ocrSection}>
              <TouchableOpacity
                style={[styles.ocrUploadButton, ocrState.isProcessing && styles.ocrUploadButtonDisabled]}
                onPress={showImagePickerOptions}
                disabled={ocrState.isProcessing}
              >
                <Ionicons 
                  name={ocrState.selectedImage ? "images-outline" : "camera-outline"} 
                  size={24} 
                  color="#fff" 
                />
                <Text style={styles.ocrUploadText}>
                  {ocrState.selectedImage ? 'Change Image' : 'Select Image'}
                </Text>
              </TouchableOpacity>
              
              {ocrState.selectedImage && (
                <View style={styles.ocrImageContainer}>
                  <Image source={{ uri: ocrState.selectedImage }} style={styles.ocrPreviewImage} />
                </View>
              )}
            </View>

            {/* Processing Indicator */}
            {ocrState.isProcessing && (
              <View style={styles.ocrLoadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.ocrLoadingText}>Processing image...</Text>
              </View>
            )}

            {/* Error Display */}
            {ocrState.error && (
              <View style={styles.ocrErrorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.ocrErrorText}>{ocrState.error}</Text>
              </View>
            )}

            {/* Results Section */}
            {ocrState.extractedText && !ocrState.isProcessing && (
              <View style={styles.ocrSection}>
                <View style={styles.ocrResultHeader}>
                  <Text style={styles.ocrSectionTitle}>Extracted Text</Text>
                  <View style={styles.ocrHeaderActions}>
                    <TouchableOpacity
                      style={styles.ocrCopyButton}
                      onPress={copyToClipboard}
                    >
                      <Ionicons name="copy-outline" size={16} color="#fff" />
                      <Text style={styles.ocrCopyButtonText}>Copy</Text>
                    </TouchableOpacity>
                    <Text style={styles.ocrWordCount}>{ocrState.wordCount} words</Text>
                  </View>
                </View>
                
                <View style={styles.ocrTextContainer}>
                  <ScrollView style={styles.ocrTextScrollView}>
                    <Text style={styles.ocrText} selectable>
                      {ocrState.extractedText}
                    </Text>
                  </ScrollView>
                </View>

                <View style={styles.ocrTextActions}>
                  <TouchableOpacity
                    style={styles.ocrActionButton}
                    onPress={clearOCRData}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={styles.ocrActionButtonTextDelete}>Clear All</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.ocrActionButton, styles.ocrInsertButton]}
                    onPress={insertOCRText}
                  >
                    <Ionicons name="add-outline" size={18} color="#fff" />
                    <Text style={styles.ocrActionButtonText}>Insert to Note</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Instructions */}
            {!ocrState.extractedText && !ocrState.isProcessing && !ocrState.error && !ocrState.selectedImage && (
              <View style={styles.ocrInstructions}>
                <Text style={styles.ocrInstructionsText}>
                  Select an image to extract text using OCR technology.
                </Text>
              </View>
            )}

            {/* Info Section */}
            <View style={styles.ocrInfoSection}>
              <Text style={styles.ocrInfoText}>• Language: English (en)</Text>
              <Text style={styles.ocrInfoText}>• Confidence: 0.5</Text>
              <Text style={styles.ocrInfoText}>• Supports JPG, PNG images</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Styles
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  // OCR Modal Styles
  ocrModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  ocrModalContent: {
    flex: 1,
    backgroundColor: "#1e293b",
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  ocrTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  ocrCloseButton: {
    padding: 4,
  },

  ocrScrollView: {
    flex: 1,
    padding: 20,
  },
  ocrSection: {
    marginBottom: 24,
  },
  ocrUploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  ocrUploadButtonDisabled: {
    backgroundColor: "#475569",
  },
  ocrUploadText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  ocrImageContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  ocrPreviewImage: {
    width: width - 80,
    height: 200,
    borderRadius: 12,
    resizeMode: "cover",
  },

  ocrLoadingContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  ocrLoadingText: {
    color: "#d1d5db",
    fontSize: 16,
    marginTop: 12,
  },

  ocrErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  ocrErrorText: {
    color: "#ef4444",
    fontSize: 14,
    flex: 1,
  },

  ocrResultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ocrSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  ocrHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ocrCopyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#475569",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  ocrCopyButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  ocrWordCount: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "500",
  },

  ocrTextContainer: {
    backgroundColor: "#334155",
    borderRadius: 12,
    maxHeight: 200,
    marginBottom: 16,
  },
  ocrTextScrollView: {
    padding: 16,
  },
  ocrText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
  },

  ocrTextActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  ocrActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  ocrInsertButton: {
    backgroundColor: "#10b981",
  },
  ocrActionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  ocrActionButtonTextDelete: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },

  ocrInstructions: {
    alignItems: "center",
    paddingVertical: 40,
  },
  ocrInstructionsText: {
    color: "#9ca3af",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },

  ocrInfoSection: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.3)",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  ocrInfoText: {
    color: "#93c5fd",
    fontSize: 12,
    marginBottom: 4,
  },
});
// components/OCRTabs/MLKitOCRTab.tsx
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { Ionicons } from '@expo/vector-icons';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface MLKitState {
  isProcessing: boolean;
  extractedText: string;
  wordCount: number;
  selectedImage: string | null;
  error: string | null;
}

interface AlertState {
  visible: boolean;
  type: 'info' | 'success' | 'error' | 'warning';
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'primary';
  }>;
}

interface MLKitOCRTabProps {
  onInsertText: (text: string) => void;
  onClose: () => void;
}

export function MLKitOCRTab({ onInsertText, onClose }: MLKitOCRTabProps) {
  const { addBacklogEvent } = useBacklogLogger();
  const [mlkitState, setMlkitState] = useState<MLKitState>({
    isProcessing: false,
    extractedText: "",
    wordCount: 0,
    selectedImage: null,
    error: null,
  });
  
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  const [imagePickerAlert, setImagePickerAlert] = useState(false);

  const showAlert = (
    type: AlertState['type'],
    title: string,
    message: string,
    buttons: AlertState['buttons'] = [{ text: 'OK', onPress: () => {}, style: 'primary' }]
  ) => {
    setAlertState({
      visible: true,
      type,
      title,
      message,
      buttons,
    });
  };

  const hideAlert = () => {
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert(
          'warning',
          'Permission Required',
          'Sorry, we need camera roll permissions to upload images.',
          [{ text: 'OK', onPress: () => {}, style: 'primary' }]
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async (source: 'camera' | 'library') => {
    setImagePickerAlert(false);
    
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      let result;
      
      if (source === 'camera') {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPermission.status !== 'granted') {
          showAlert(
            'warning',
            'Permission Required',
            'Camera permission is needed to take photos.',
            [{ text: 'OK', onPress: () => {}, style: 'primary' }]
          );
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 1,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 1,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        setMlkitState(prev => ({
          ...prev,
          selectedImage: imageUri,
          extractedText: '',
          wordCount: 0,
          error: null,
        }));
        
        await recognizeText(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setMlkitState(prev => ({
        ...prev,
        error: 'Failed to pick image. Please try again.',
      }));
    }
  };

  const recognizeText = async (uri: string) => {
    try {
      setMlkitState(prev => ({
        ...prev,
        isProcessing: true,
        error: null,
      }));

      const result = await TextRecognition.recognize(uri);
      
      const extractedText = result.blocks
        .map(block => block.text)
        .join('\n');

      const text = extractedText || 'No text detected';
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

      setMlkitState(prev => ({
        ...prev,
        isProcessing: false,
        extractedText: text,
        wordCount: wordCount,
      }));
      
    } catch (error: any) {
      console.error('ML Kit Error:', error);
      setMlkitState(prev => ({
        ...prev,
        isProcessing: false,
        error: `Failed to process image: ${error.message || 'Unknown error'}`,
        extractedText: '',
        wordCount: 0,
      }));
    }
  };

  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(mlkitState.extractedText);
      showAlert(
        'success',
        'Copied!',
        'Text has been copied to clipboard',
        [{ text: 'OK', onPress: () => {}, style: 'primary' }]
      );
    } catch (error) {
      showAlert(
        'error',
        'Error',
        'Failed to copy text to clipboard',
        [{ text: 'OK', onPress: () => {}, style: 'primary' }]
      );
    }
  };

  const clearMLKitData = () => {
    setMlkitState(prev => ({
      ...prev,
      extractedText: "",
      wordCount: 0,
      selectedImage: null,
      error: null,
    }));
  };

  const insertMLKitText = () => {
    if (mlkitState.extractedText) {
      onInsertText(mlkitState.extractedText);
      clearMLKitData();
      onClose();
      addBacklogEvent("mlkit_ocr_text_inserted", { wordCount: mlkitState.wordCount });
    }
  };

  return (
    <>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Selection Card */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => setImagePickerAlert(true)}
            disabled={mlkitState.isProcessing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={mlkitState.isProcessing ? ['#475569', '#64748b'] : ['#667eea', '#764ba2']}
              style={styles.uploadButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons 
                name={mlkitState.selectedImage ? "images" : "camera"} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.uploadText}>
                {mlkitState.selectedImage ? 'Change Image' : 'Select Image'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {mlkitState.selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image 
                source={{ uri: mlkitState.selectedImage }} 
                style={styles.previewImage} 
              />
              <View style={styles.imageOverlay}>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.6)']}
                  style={styles.imageGradient}
                />
              </View>
            </View>
          )}
        </View>

        {/* Processing Indicator */}
        {mlkitState.isProcessing && (
          <View style={styles.loadingCard}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.loadingIconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ActivityIndicator size="large" color="#ffffff" />
            </LinearGradient>
            <Text style={styles.loadingTitle}>Extracting Text</Text>
            <Text style={styles.loadingText}>ML Kit is analyzing your image...</Text>
          </View>
        )}

        {/* Error Display */}
        {mlkitState.error && (
          <View style={styles.errorCard}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.errorIconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="alert-circle" size={24} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.errorText}>{mlkitState.error}</Text>
          </View>
        )}

        {/* Results Section */}
        {mlkitState.extractedText && !mlkitState.isProcessing && (
          <View style={styles.card}>
            <View style={styles.resultHeader}>
              <View style={styles.resultHeaderLeft}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.successBadge}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                </LinearGradient>
                <View>
                  <Text style={styles.resultTitle}>Text Extracted</Text>
                  <Text style={styles.wordCount}>{mlkitState.wordCount} words</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyToClipboard}
              >
                <Ionicons name="copy" size={18} color="#667eea" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.textContainer}>
              <ScrollView style={styles.textScrollView}>
                <Text style={styles.extractedText} selectable>
                  {mlkitState.extractedText}
                </Text>
              </ScrollView>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearMLKitData}
              >
                <Ionicons name="trash" size={18} color="#ef4444" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={insertMLKitText}
                activeOpacity={0.8}
                style={styles.insertButtonWrapper}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.insertButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="add-circle" size={18} color="#ffffff" />
                  <Text style={styles.insertButtonText}>Insert to Note</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Empty State */}
        {!mlkitState.extractedText && !mlkitState.isProcessing && !mlkitState.error && !mlkitState.selectedImage && (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.2)']}
              style={styles.emptyIconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="hardware-chip" size={48} color="#667eea" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>On-Device ML Kit OCR</Text>
            <Text style={styles.emptyText}>
              Fast text recognition powered by Google ML Kit. Processes images locally on your device.
            </Text>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#667eea" />
            <Text style={styles.infoHeaderText}>ML Kit Features</Text>
          </View>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={16} color="#10b981" />
              <Text style={styles.infoItemText}>On-device processing </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={16} color="#10b981" />
              <Text style={styles.infoItemText}>Fast & lightweight</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={16} color="#10b981" />
              <Text style={styles.infoItemText}>Privacy-focused (no data sent)</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={16} color="#10b981" />
              <Text style={styles.infoItemText}>Great for printed documents</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alertState.visible}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />

      {/* Image Picker Alert */}
      <CustomAlertModal
        visible={imagePickerAlert}
        type="info"
        title="Select Image"
        message="Choose how you want to select an image"
        buttons={[
          {
            text: 'Camera',
            onPress: () => pickImage('camera'),
            style: 'primary',
          },
          {
            text: 'Library',
            onPress: () => pickImage('library'),
            style: 'primary',
          },
          {
            text: 'Cancel',
            onPress: () => setImagePickerAlert(false),
            style: 'cancel',
          },
        ]}
        onClose={() => setImagePickerAlert(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  uploadText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
  },
  imagePreviewContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: "cover",
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  imageGradient: {
    flex: 1,
  },
  loadingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 32,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 8,
  },
  loadingText: {
    color: "#aaa",
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    flex: 1,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  resultHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat_600SemiBold',
    color: "#fff",
  },
  wordCount: {
    color: "#aaa",
    fontSize: 12,
    fontFamily: 'Montserrat_400Regular',
    marginTop: 2,
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 12,
    maxHeight: 200,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textScrollView: {
    padding: 16,
  },
  extractedText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  clearButtonText: {
    color: "#ef4444",
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  insertButtonWrapper: {
    flex: 2,
  },
  insertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  insertButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconBadge: {
    width: 100,
    height: 100,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: "#aaa",
    fontSize: 14,
    fontFamily: 'Montserrat_400Regular',
    textAlign: "center",
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoHeaderText: {
    color: '#667eea',
    fontSize: 14,
    fontFamily: 'Montserrat_600SemiBold',
  },
  infoList: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoItemText: {
    color: "#aaa",
    fontSize: 13,
    fontFamily: 'Montserrat_400Regular',
  },
});
// components/OCRTabs/GeminiOCRTab.tsx
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import { useBacklogLogger } from "@/hooks/useBackLogLogger";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
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
// NEW: Add Firebase imports (adjust the path to your firebase.ts file)
import { auth, firestore } from '@/firebase'; // Import the initialized instances
import { doc, getDoc, increment, setDoc, updateDoc } from 'firebase/firestore';

// NEW: Define the daily limit constant
const DAILY_LIMIT = 3;

interface OCRState {
  isProcessing: boolean;
  extractedText: string;
  wordCount: number;
  selectedImage: {
    uri: string;
    base64?: string;
    mimeType?: string;
  } | null;
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

interface GeminiOCRTabProps {
  onInsertText: (text: string) => void;
  onClose: () => void;
}

export function GeminiOCRTab({ onInsertText, onClose }: GeminiOCRTabProps) {
  const { addBacklogEvent } = useBacklogLogger();
  // NEW: State for usage count and loading
  const [usageCount, setUsageCount] = useState<number>(0);
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(true);
  const [ocrState, setOcrState] = useState<OCRState>({
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
  // NEW: Helper to get today's date as YYYY-MM-DD
  const getTodayDate = () => new Date().toISOString().split('T')[0];
  
   // NEW: Fetch and reset usage count on mount
  useEffect(() => {
    const fetchAndResetUsageCount = async () => {
      const user = auth.currentUser;
      if (!user) {
        setIsLoadingCount(false);
        showAlert('error', 'Authentication Required', 'Please log in to use OCR.', [{ text: 'OK', onPress: () => {}, style: 'primary' }]);
        return;
      }
      
      try {
        // MODIFIED: Use modular collection and doc functions
        const docRef = doc(firestore, 'OCRLimits', user.uid);
        // MODIFIED: Use modular getDoc function
        const docSnap = await getDoc(docRef);
        const today = getTodayDate();
        
        if (docSnap.exists()) { // MODIFIED: Check exists() property
          const data = docSnap.data();
          const lastReset = data?.lastResetDate;
          if (lastReset !== today) {
            // Reset count for new day
            // MODIFIED: Use modular updateDoc function
            await updateDoc(docRef, { ocrUsageCount: 0, lastResetDate: today });
            setUsageCount(0);
          } else {
            setUsageCount(data?.ocrUsageCount || 0);
          }
        } else {
          // New user: Create document with initial values
          // MODIFIED: Use modular setDoc function
          await setDoc(docRef, { ocrUsageCount: 0, lastResetDate: today });
          setUsageCount(0);
        }
      } catch (error) {
        console.error('Error fetching/resetting usage count:', error);
        showAlert('error', 'Error', 'Failed to load usage data. Please check your connection.', [{ text: 'OK', onPress: () => {}, style: 'primary' }]);
      } finally {
        setIsLoadingCount(false);
      }
    };
    
    fetchAndResetUsageCount();
  }, []); // Runs once on mount


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
    // MODIFIED: Use DAILY_LIMIT constant
    if (isLoadingCount) {
      showAlert('info', 'Loading', 'Please wait while we load your data.', [{ text: 'OK', onPress: () => {}, style: 'primary' }]);
      return;
    }
    if (usageCount >= DAILY_LIMIT) {
      showAlert(
        'warning',
        'Daily Limit Reached',
        `You have used the OCR feature ${DAILY_LIMIT} times today. Please try again tomorrow.`,
        [{ text: 'OK', onPress: () => {}, style: 'primary' }]
      );
      return;
    }
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
          quality: 0.7,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const imageData = {
          uri: asset.uri,
          base64: asset.base64 ?? undefined,
          mimeType: asset.mimeType || 'image/jpeg',
        };
        
        setOcrState(prev => ({
          ...prev,
          selectedImage: imageData,
          extractedText: '',
          wordCount: 0,
          error: null,
        }));
        
        await processImage(imageData);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setOcrState(prev => ({
        ...prev,
        error: 'Failed to pick image. Please try again.',
      }));
    }
  };

  const processImage = async (imageData: { uri: string; base64?: string; mimeType?: string }) => {
    if (!imageData || !imageData.base64) {
      setOcrState(prev => ({
        ...prev,
        error: 'Image data is missing. Please try again.',
      }));
      return;
    }
    // MODIFIED: Increment usage count (adjusted for web SDK)
    const user = auth.currentUser;
    if (user) {
      try {
        // MODIFIED: Use modular doc and updateDoc functions
        const docRef = doc(firestore, 'OCRLimits', user.uid); 
        await updateDoc(docRef, { ocrUsageCount: increment(1) }); // Use increment(1)
        setUsageCount(prev => prev + 1); // Update local state
      } catch (error) {
        console.error('Error updating usage count:', error);
        showAlert('error', 'Error', 'Failed to update usage. Please check your connection.', [{ text: 'OK', onPress: () => {}, style: 'primary' }]);
        // NOTE: The request will still proceed, as the image was picked. 
        // We log the error but allow processing to attempt.
      }
    }

    setOcrState(prev => ({
      ...prev,
      isProcessing: true,
      error: null,
    }));
    
    try {
      const response = await fetch('https://api-m2tvqc6zqq-uc.a.run.app/extractTextFromImage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base64Image: imageData.base64,
          mimeType: imageData.mimeType || 'image/jpeg',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setOcrState(prev => ({
          ...prev,
          isProcessing: false,
          extractedText: data.text,
          wordCount: data.wordCount,
        }));
      } else {
        throw new Error('Failed to extract text');
      }
    } catch (error: any) {
      console.error('OCR Error:', error);
      setOcrState(prev => ({
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
      await Clipboard.setString(ocrState.extractedText);
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

  const clearOCRData = () => {
    setOcrState(prev => ({
      ...prev,
      extractedText: "",
      wordCount: 0,
      selectedImage: null,
      error: null,
    }));
  };

  const insertOCRText = () => {
    if (ocrState.extractedText) {
      onInsertText(ocrState.extractedText);
      clearOCRData();
      onClose();
      addBacklogEvent("gemini_ocr_text_inserted", { wordCount: ocrState.wordCount });
    }
  };

  // NEW: Determine if the component is in a disabled state
  const isButtonDisabled = ocrState.isProcessing || isLoadingCount || usageCount >= DAILY_LIMIT;
  const isLimitReached = usageCount >= DAILY_LIMIT;

  return (
    <>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Usage Count and Loading Indicator */}
        <View style={styles.usageContainer}>
            {isLoadingCount ? (
                <View style={styles.usageLoading}>
                    <ActivityIndicator size="small" color="#667eea" />
                    <Text style={styles.usageText}>Loading daily limit...</Text>
                </View>
            ) : (
                <View style={[styles.usageBadge, isLimitReached && styles.usageLimitReachedBadge]}>
                    <Ionicons 
                        name={isLimitReached ? "warning" : "bar-chart-outline"} 
                        size={14} 
                        color={isLimitReached ? "#ef4444" : "#10b981"} 
                    />
                    <Text style={[styles.usageText, isLimitReached && styles.usageLimitReachedText]}>
                        Usage: {usageCount} / {DAILY_LIMIT} (Daily Limit)
                    </Text>
                </View>
            )}
        </View>

        {/* Image Selection Card */}
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => setImagePickerAlert(true)}
            disabled={isButtonDisabled} // MODIFIED: Use combined check
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isButtonDisabled ? ['#475569', '#64748b'] : ['#667eea', '#764ba2']} // MODIFIED: Gray out when disabled
              style={styles.uploadButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons 
                name={ocrState.selectedImage ? "images" : "camera"} 
                size={24} 
                color="#fff" 
              />
              <Text style={styles.uploadText}>
                {ocrState.selectedImage ? 'Change Image' : 'Select Image'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          
          {ocrState.selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image 
                source={{ uri: ocrState.selectedImage.uri }} 
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
        {ocrState.isProcessing && (
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
            <Text style={styles.loadingText}>Gemini AI is analyzing your image...</Text>
          </View>
        )}

        {/* Error Display */}
        {ocrState.error && (
          <View style={styles.errorCard}>
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.errorIconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="alert-circle" size={24} color="#ffffff" />
            </LinearGradient>
            <Text style={styles.errorText}>{ocrState.error}</Text>
          </View>
        )}

        {/* Results Section */}
        {ocrState.extractedText && !ocrState.isProcessing && (
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
                  <Text style={styles.wordCount}>{ocrState.wordCount} words</Text>
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
              <ScrollView 
                style={styles.textScrollView}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                <Text style={styles.extractedText} selectable>
                  {ocrState.extractedText}
                </Text>
              </ScrollView>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearOCRData}
              >
                <Ionicons name="trash" size={18} color="#ef4444" />
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={insertOCRText}
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
        {!ocrState.extractedText && !ocrState.isProcessing && !ocrState.error && !ocrState.selectedImage && (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['rgba(102, 126, 234, 0.2)', 'rgba(118, 75, 162, 0.2)']}
              style={styles.emptyIconBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="sparkles" size={48} color="#667eea" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Gemini AI Text Recognition</Text>
            <Text style={styles.emptyText}>
              Advanced AI-powered OCR using Google's Gemini model. Best for complex layouts and multiple languages.
            </Text>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#667eea" />
            <Text style={styles.infoHeaderText}>Gemini AI Features</Text>
          </View>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={16} color="#10b981" />
              <Text style={styles.infoItemText}>Advanced AI vision models</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={16} color="#10b981" />
              <Text style={styles.infoItemText}>Handwritten & printed text</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={16} color="#10b981" />
              <Text style={styles.infoItemText}>Multiple language support</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark" size={16} color="#10b981" />
              <Text style={styles.infoItemText}>Complex document layouts</Text>
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
  // NEW STYLES for Usage Indicator
  usageContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  usageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)', // Tailwind green-500 with opacity
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  usageLimitReachedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', // Tailwind red-500 with opacity
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  usageText: {
    color: "#10b981", // Green
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
  usageLimitReachedText: {
    color: "#ef4444", // Red
  },
  usageLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  // END NEW STYLES
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
    height: 500,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textScrollView: {
    padding: 16,
    flex: 1
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
import { BebasNeue_400Regular, useFonts } from '@expo-google-fonts/bebas-neue';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface OCRResponse {
  success: boolean;
  text: string;
  word_count: number;
  language: string;
  error?: string;
}


const OCRScreen: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);

  // Replace with your actual API URL
  const API_BASE_URL = 'http://192.168.254.111:8000';

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
        setSelectedImage(imageUri);
        setExtractedText(''); // Clear previous results
        setWordCount(0);
        
        // Automatically process the image after selection
        await processImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const processImage = async (imageUri: string) => {
    if (!imageUri) {
      Alert.alert('Error', 'Please select an image first.');
      return;
    }

    setIsLoading(true);
    
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
        setExtractedText(data.text);
        setWordCount(data.word_count);
      } else {
        throw new Error(data.error || 'OCR processing failed');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      Alert.alert(
        'Processing Error', 
        `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      setExtractedText('');
      setWordCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const clearAll = () => {
    setSelectedImage(null);
    setExtractedText('');
    setWordCount(0);
  };

  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
  });

  const copyToClipboard = async () => {
    try {
      await Clipboard.setString(extractedText);
      Alert.alert('Copied!', 'Text has been copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy text to clipboard');
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

  return (
    <LinearGradient
          colors={['#324762', '#0A1C3C']}
          start={{x: 1, y: 1}}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1}}
        >
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>OCR Text Extraction</Text>
      
      {/* Image Selection Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={showImagePickerOptions}
          disabled={isLoading}
        >
          <Text style={styles.uploadButtonText}>
            {selectedImage ? 'Change Image' : 'Select Image'}
          </Text>
        </TouchableOpacity>
        
        {selectedImage && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          </View>
        )}
      </View>

      {/* Processing Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Processing image...</Text>
        </View>
      )}

      {/* Results Section */}
      {extractedText && !isLoading && (
        <View style={styles.section}>
          <View style={styles.resultHeader}>
            <Text style={styles.sectionTitle}>Extracted Text</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={copyToClipboard}
              >
                <Text style={styles.copyButtonText}>Copy</Text>
              </TouchableOpacity>
              <Text style={styles.wordCount}>{wordCount} words</Text>
            </View>
          </View>
          
          <View style={styles.textContainer}>
            <ScrollView style={styles.textScrollView}>
              <Text style={styles.extractedText} selectable>
                {extractedText}
              </Text>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      {(selectedImage || extractedText) && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearAll}
            disabled={isLoading}
          >
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Info Section */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>
          • Language: English (en)
        </Text>
        <Text style={styles.infoText}>
          • Confidence: 0.5
        </Text>
        <Text style={styles.infoText}>
          • Supports JPG, PNG images
        </Text>
      </View>
    </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 50,
    fontFamily: 'BebasNeue_400Regular',
    textAlign: 'center',
    marginBottom: 30,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 20,
  },
  uploadButton: {
    backgroundColor: '#87E3E3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  previewImage: {
    width: 300,
    height: 200,
    borderRadius: 10,
    resizeMode: 'contain',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copyButton: {
    backgroundColor: '#90EE90',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  wordCount: {
    fontSize: 14,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  textContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 300,
  },
  textScrollView: {
    padding: 15,
  },
  extractedText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  clearButton: {
    backgroundColor: '#FF999A',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
});

export default OCRScreen;
// File: services/image-service.ts - Extended with Quiz functionality
import { storage } from '@/firebase';
import * as ImagePicker from 'expo-image-picker';
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from 'firebase/storage';

export interface ImageUploadResult {
  url: string;
  path: string;
  fileName: string;
}

/**
 * Request camera roll permissions
 */
export async function requestImagePermissions(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return false;
  }
  return true;
}

/**
 * Pick an image from the device
 */
export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    const hasPermission = await requestImagePermissions();
    if (!hasPermission) {
      throw new Error('Permission to access camera roll is required');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0];
    }

    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
}

/**
 * Upload image to Firebase Storage
 */
export async function uploadNoteImage(
  noteId: string,
  imageUri: string,
  userId: string
): Promise<ImageUploadResult> {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `image_${timestamp}.jpg`;
    const storagePath = `notes/${noteId}/${fileName}`;

    // Fetch the image as a blob
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Upload the blob
    console.log('Uploading image to:', storagePath);
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('Image uploaded successfully:', downloadURL);

    return {
      url: downloadURL,
      path: storagePath,
      fileName: fileName,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Delete image from Firebase Storage
 */
export async function deleteNoteImage(imagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, imagePath);
    await deleteObject(storageRef);
    console.log('Image deleted successfully:', imagePath);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

/**
 * Take a photo with camera
 */
export async function takePhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access camera is required');
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0];
    }

    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
}

// ============================================
// QUIZ-SPECIFIC FUNCTIONS
// ============================================

/**
 * Upload quiz cover image to Firebase Storage
 */
export async function uploadQuizCoverImage(
  quizId: string,
  imageUri: string,
  userId: string
): Promise<ImageUploadResult> {
  try {
    const timestamp = Date.now();
    const fileName = `cover_${timestamp}.jpg`;
    const storagePath = `quizzes/${quizId}/cover/${fileName}`;

    const response = await fetch(imageUri);
    const blob = await response.blob();

    const storageRef = ref(storage, storagePath);

    console.log('Uploading quiz cover to:', storagePath);
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        type: 'quiz-cover'
      },
    });

    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('Quiz cover uploaded successfully:', downloadURL);

    return {
      url: downloadURL,
      path: storagePath,
      fileName: fileName,
    };
  } catch (error) {
    console.error('Error uploading quiz cover:', error);
    throw error;
  }
}

/**
 * Upload quiz question image to Firebase Storage
 */
export async function uploadQuestionImage(
  quizId: string,
  questionId: string,
  imageUri: string,
  userId: string
): Promise<ImageUploadResult> {
  try {
    const timestamp = Date.now();
    const fileName = `question_${questionId}_${timestamp}.jpg`;
    const storagePath = `quizzes/${quizId}/questions/${fileName}`;

    const response = await fetch(imageUri);
    const blob = await response.blob();

    const storageRef = ref(storage, storagePath);

    console.log('Uploading question image to:', storagePath);
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        questionId: questionId,
        type: 'quiz-question'
      },
    });

    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('Question image uploaded successfully:', downloadURL);

    return {
      url: downloadURL,
      path: storagePath,
      fileName: fileName,
    };
  } catch (error) {
    console.error('Error uploading question image:', error);
    throw error;
  }
}

/**
 * Delete quiz image (cover or question)
 */
export async function deleteQuizImage(imagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, imagePath);
    await deleteObject(storageRef);
    console.log('Quiz image deleted successfully:', imagePath);
  } catch (error) {
    console.error('Error deleting quiz image:', error);
    // Don't throw - image might already be deleted
  }
}

/**
 * Delete all images for a quiz
 */
export async function deleteAllQuizImages(quizId: string): Promise<void> {
  try {
    const quizRef = ref(storage, `quizzes/${quizId}`);
    
    // List all files
    const listResult = await listAll(quizRef);
    
    // Delete all items
    const deletePromises = listResult.items.map(item => deleteObject(item));
    
    // Also check subfolders
    const subfolderPromises = listResult.prefixes.map(async (folderRef) => {
      const subList = await listAll(folderRef);
      return Promise.all(subList.items.map(item => deleteObject(item)));
    });
    
    await Promise.all([...deletePromises, ...subfolderPromises]);
    
    console.log('All quiz images deleted successfully for quiz:', quizId);
  } catch (error) {
    console.error('Error deleting all quiz images:', error);
    // Don't throw - some images might already be deleted
  }
}

/**
 * Helper: Check if a URI is a Firebase Storage URL
 */
export function isFirebaseStorageUrl(uri: string): boolean {
  return uri.includes('firebasestorage.googleapis.com') || uri.includes('firebase');
}

/**
 * Helper: Check if a URI is a local file
 */
export function isLocalFile(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://');
}

/**
 * Helper: Extract storage path from Firebase URL
 */
export function extractStoragePathFromUrl(url: string): string | null {
  try {
    if (!isFirebaseStorageUrl(url)) return null;
    
    // Extract path from URL
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1]);
    }
    return null;
  } catch (error) {
    console.error('Error extracting storage path:', error);
    return null;
  }
}

/**
 * Helper: Get image source for React Native Image component
 * Handles default quiz covers, Firebase URLs, and local files
 */
export function getQuizImageSource(imageUri: string) {
  if (!imageUri) return null;
  
  // Default quiz covers
  const defaultImages: Record<string, any> = {
    quiz1: require('@/assets/covers/notebook1.jpg'),
    quiz2: require('@/assets/covers/notebook2.jpg'),
    quiz3: require('@/assets/covers/notebook3.jpg'),
    quiz4: require('@/assets/covers/notebook4.jpg'),
    quiz5: require('@/assets/covers/notebook5.jpg'),
    quiz6: require('@/assets/covers/notebook6.jpg'),
  };
  
  if (defaultImages[imageUri]) {
    return defaultImages[imageUri];
  }
  
  // Firebase or local URI
  return { uri: imageUri };
}
// services/image-service.ts
import { storage } from '@/firebase';
import * as ImagePicker from 'expo-image-picker';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';

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
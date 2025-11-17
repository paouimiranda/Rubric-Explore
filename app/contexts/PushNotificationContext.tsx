// app/contexts/PushNotificationContext.tsx
import { NotificationService } from '@/services/notification-service';
import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

interface PushNotificationContextType {
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  isRequestingPermission: boolean;
}

const PushNotificationContext = createContext<PushNotificationContextType>({
  hasPermission: false,
  requestPermission: async () => false,
  isRequestingPermission: false,
});

export const usePushNotification = () => useContext(PushNotificationContext);

interface PushNotificationProviderProps {
  children: React.ReactNode;
}

export function PushNotificationProvider({ children }: PushNotificationProviderProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check initial permission status
    checkPermissionStatus();

    // Set up notification listeners
    const notificationReceivedListener = NotificationService.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        // You can show an in-app banner here if desired
      }
    );

    const notificationResponseListener = NotificationService.addNotificationResponseListener(
      (response) => {
        console.log('Notification tapped:', response);
        
        // Navigate to planner when notification is tapped
        const planId = response.notification.request.content.data?.planId;
        if (planId) {
          // Navigate to planner screen
          router.push('/screens/Planner/planner');
        }
      }
    );

    // Cleanup listeners on unmount
    return () => {
      NotificationService.removeNotificationSubscription(notificationReceivedListener);
      NotificationService.removeNotificationSubscription(notificationResponseListener);
    };
  }, []);

  const checkPermissionStatus = async () => {
    const permission = await NotificationService.hasPermissions();
    setHasPermission(permission);
  };

  const requestPermission = async (): Promise<boolean> => {
    try {
      setIsRequestingPermission(true);
      
      // Request permission
      const granted = await NotificationService.requestPermissions();
      
      if (granted) {
        setHasPermission(true);
        
        // Show success message
        if (Platform.OS === 'ios') {
          Alert.alert(
            '✅ Notifications Enabled',
            'You will now receive reminders for your plans!',
            [{ text: 'OK' }]
          );
        }
      } else {
        // Permission denied
        Alert.alert(
          'Notifications Disabled',
          'To receive plan reminders, please enable notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                // Note: You might want to use expo-linking to open settings
                console.log('Open app settings');
              },
            },
          ]
        );
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  };

  return (
    <PushNotificationContext.Provider
      value={{
        hasPermission,
        requestPermission,
        isRequestingPermission,
      }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
}
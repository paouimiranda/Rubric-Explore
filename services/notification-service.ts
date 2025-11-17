// services/notification-service.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ScheduledNotification {
  identifier: string;
  trigger: Date;
}

export class NotificationService {
  /**
   * Request notification permissions from the user
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('planner-reminders', {
          name: 'Plan Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4facfe',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Check if notification permissions are granted
   */
  static async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule a notification for a plan
   * @param planId - Unique identifier for the plan
   * @param title - Plan title
   * @param body - Plan description (optional)
   * @param triggerDate - When to trigger the notification
   * @param category - Plan category for styling
   * @returns Notification identifier or null if failed
   */
  static async schedulePlanNotification(
    planId: string,
    title: string,
    body: string | undefined,
    triggerDate: Date,
    category: string = 'personal'
  ): Promise<string | null> {
    try {
      // Check if we have permissions
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        console.warn('Cannot schedule notification without permissions');
        return null;
      }

      // Don't schedule if the time has already passed
      if (triggerDate <= new Date()) {
        console.warn('Cannot schedule notification for past time');
        return null;
      }

      // Cancel any existing notification for this plan
      await this.cancelPlanNotification(planId);

      // Schedule the notification
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📅 ${title}`,
          body: body || 'Time for your scheduled plan!',
          data: { planId, category },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' && {
            channelId: 'planner-reminders',
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
        identifier: `plan-${planId}`, // Use consistent identifier
      });

      console.log(`Notification scheduled for plan ${planId}:`, identifier);
      return identifier;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Schedule a notification with a reminder offset (e.g., 15 minutes before)
   * @param planId - Unique identifier for the plan
   * @param title - Plan title
   * @param body - Plan description (optional)
   * @param planDateTime - The actual plan date/time
   * @param reminderMinutes - Minutes before plan time to send notification (default: 15)
   * @param category - Plan category for styling
   * @returns Notification identifier or null if failed
   */
  static async schedulePlanNotificationWithReminder(
    planId: string,
    title: string,
    body: string | undefined,
    planDateTime: Date,
    reminderMinutes: number = 15,
    category: string = 'personal'
  ): Promise<string | null> {
    // Calculate trigger time (plan time minus reminder minutes)
    const triggerDate = new Date(planDateTime.getTime() - reminderMinutes * 60 * 1000);
    
    // Update body to indicate it's a reminder
    const reminderBody = reminderMinutes > 0 
      ? `Reminder: ${body || 'Your plan is coming up!'} (in ${reminderMinutes} min)`
      : body || 'Time for your scheduled plan!';

    return this.schedulePlanNotification(planId, title, reminderBody, triggerDate, category);
  }

  /**
   * Cancel a scheduled notification for a plan
   * @param planId - Unique identifier for the plan
   */
  static async cancelPlanNotification(planId: string): Promise<void> {
    try {
      const identifier = `plan-${planId}`;
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log(`Notification cancelled for plan ${planId}`);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Test notification (immediate)
   */
  static async sendTestNotification(): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Notifications Working!',
          body: 'Your plan reminders are set up correctly.',
          data: { test: true },
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }

  /**
   * Add notification received listener
   * Useful for handling notifications when app is in foreground
   */
  static addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add notification response listener
   * Useful for handling when user taps on a notification
   */
  static addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Remove notification listeners
   */
  static removeNotificationSubscription(subscription: Notifications.Subscription): void {
    subscription.remove();
  }
}
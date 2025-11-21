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
   * @param notificationType - Type of notification ('reminder' or 'main')
   * @returns Notification identifier or null if failed
   */
  static async schedulePlanNotification(
    planId: string,
    title: string,
    body: string | undefined,
    triggerDate: Date,
    category: string = 'personal',
    notificationType: 'reminder' | 'main' = 'main'
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

      // Use different identifiers for reminder vs main notification
      const identifier = notificationType === 'reminder' 
        ? `plan-${planId}-reminder` 
        : `plan-${planId}-main`;

      // Cancel any existing notification with this identifier
      await Notifications.cancelScheduledNotificationAsync(identifier);

      // Schedule the notification
      const scheduledId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `📅 ${title}`,
          body: body || 'Time for your scheduled plan!',
          data: { planId, category, notificationType },
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
        identifier,
      });

      console.log(`${notificationType} notification scheduled for plan ${planId}:`, scheduledId);
      return scheduledId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Schedule DUAL notifications with a reminder offset
   * Schedules TWO notifications:
   * 1. Reminder notification (X minutes before plan time)
   * 2. Main notification (at the actual plan time)
   * 
   * @param planId - Unique identifier for the plan
   * @param title - Plan title
   * @param body - Plan description (optional)
   * @param planDateTime - The actual plan date/time
   * @param reminderMinutes - Minutes before plan time to send reminder (default: 15)
   * @param category - Plan category for styling
   * @returns Object with both notification IDs, or null if failed
   */
  static async schedulePlanNotificationWithReminder(
    planId: string,
    title: string,
    body: string | undefined,
    planDateTime: Date,
    reminderMinutes: number = 15,
    category: string = 'personal'
  ): Promise<string | null> {
    try {
      const scheduledIds: string[] = [];

      // Schedule REMINDER notification (if reminderMinutes > 0)
      if (reminderMinutes > 0) {
        const reminderDate = new Date(planDateTime.getTime() - reminderMinutes * 60 * 1000);
        
        // Only schedule reminder if it's in the future
        if (reminderDate > new Date()) {
          const reminderBody = `Reminder: ${body || 'Your plan is coming up!'} (in ${reminderMinutes} min)`;
          
          const reminderId = await this.schedulePlanNotification(
            planId,
            title,
            reminderBody,
            reminderDate,
            category,
            'reminder'
          );
          
          if (reminderId) {
            scheduledIds.push(reminderId);
            console.log(`✅ Reminder notification scheduled for ${reminderDate.toLocaleString()}`);
          }
        }
      }

      // Schedule MAIN notification (at actual plan time)
      if (planDateTime > new Date()) {
        const mainBody = body || 'Time for your scheduled plan!';
        
        const mainId = await this.schedulePlanNotification(
          planId,
          title,
          mainBody,
          planDateTime,
          category,
          'main'
        );
        
        if (mainId) {
          scheduledIds.push(mainId);
          console.log(`✅ Main notification scheduled for ${planDateTime.toLocaleString()}`);
        }
      }

      // Return a combined identifier or null if no notifications were scheduled
      return scheduledIds.length > 0 ? scheduledIds.join(',') : null;
    } catch (error) {
      console.error('Error scheduling dual notifications:', error);
      return null;
    }
  }

  /**
   * Cancel ALL notifications for a plan (both reminder and main)
   * @param planId - Unique identifier for the plan
   */
  static async cancelPlanNotification(planId: string): Promise<void> {
    try {
      // Cancel both reminder and main notifications
      const reminderIdentifier = `plan-${planId}-reminder`;
      const mainIdentifier = `plan-${planId}-main`;
      
      await Notifications.cancelScheduledNotificationAsync(reminderIdentifier);
      await Notifications.cancelScheduledNotificationAsync(mainIdentifier);
      
      console.log(`Both notifications cancelled for plan ${planId}`);
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
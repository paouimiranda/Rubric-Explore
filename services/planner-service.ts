// services/planner-service.ts
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { NotificationService } from './notification-service';

export interface Plan {
  id?: string;
  uid: string;
  
  // Core fields
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  
  // Organization
  category: 'work' | 'personal' | 'health' | 'education' | 'other';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  
  // Status tracking
  status: 'pending' | 'completed' | 'cancelled';
  completedAt?: any;
  
  // Social
  isPublic: boolean;
  
  // Notification
  notificationId?: string;
  reminderMinutes?: number; // Minutes before plan to send notification (default: 15)
  
  // Metadata
  createdAt?: any;
  updatedAt?: any;
}

export interface PlanAnalytics {
  totalPlans: number;
  completedPlans: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
  plansByCategory: { [key: string]: number };
  plansByPriority: { [key: string]: number };
  completionTrend: { date: string; completed: number; total: number }[];
}

export class PlannerService {
  private static readonly COLLECTION_NAME = 'plans';

  /**
   * Get current user ID
   */
  private static getCurrentUserId(): string {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to perform this action.');
    }
    return user.uid;
  }

  /**
   * Remove undefined values from an object to prevent Firebase errors
   * Firebase doesn't accept undefined values - they must be null or omitted
   */
  private static cleanUndefinedFields<T extends Record<string, any>>(obj: T): Partial<T> {
    const cleaned: any = {};
    
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      
      // Skip undefined values entirely (don't include them in the update)
      if (value !== undefined) {
        cleaned[key] = value;
      }
    });
    
    return cleaned;
  }

  /**
   * Create a new plan with notification
   */
  static async createPlan(
    plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'uid' | 'notificationId'>
  ): Promise<string> {
    try {
      const uid = this.getCurrentUserId();
      
      const planData = {
        ...plan,
        uid,
        status: plan.status || 'pending',
        tags: plan.tags || [],
        isPublic: plan.isPublic ?? false,
        reminderMinutes: plan.reminderMinutes ?? 15,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), planData);
      const planId = docRef.id;

      // Schedule notification
      const notificationId = await this.scheduleNotificationForPlan({
        ...planData,
        id: planId,
      } as Plan);

      // Update plan with notification ID if scheduled
      if (notificationId) {
        await updateDoc(docRef, { notificationId });
      }

      return planId;
    } catch (error) {
      console.error('Error creating plan:', error);
      throw new Error('Failed to create plan.');
    }
  }

  /**
   * Get a single plan by ID
   */
  static async getPlanById(planId: string): Promise<Plan | null> {
    try {
      const uid = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTION_NAME, planId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const planData = docSnap.data() as Omit<Plan, 'id'>;
        
        // Check access permissions
        const isOwner = planData.uid === uid;
        const isPublic = planData.isPublic ?? false;
        
        if (!isOwner && !isPublic) {
          throw new Error('You do not have permission to access this plan.');
        }
        
        return {
          id: docSnap.id,
          ...planData,
          completedAt: planData.completedAt?.toDate?.() || null,
          createdAt: planData.createdAt?.toDate?.() || new Date(),
          updatedAt: planData.updatedAt?.toDate?.() || new Date(),
        } as Plan;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching plan:', error);
      throw error;
    }
  }

  /**
   * Get all plans for the current user
   */
  static async getAllPlans(): Promise<Plan[]> {
    try {
      const uid = this.getCurrentUserId();
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('uid', '==', uid),
        orderBy('date', 'asc'),
        orderBy('time', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate?.() || null,
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      } as Plan));
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  }

  /**
   * Get plans for a specific date
   */
  static async getPlansByDate(date: string): Promise<Plan[]> {
    try {
      const uid = this.getCurrentUserId();
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('uid', '==', uid),
        where('date', '==', date),
        orderBy('time', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        completedAt: doc.data().completedAt?.toDate?.() || null,
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      } as Plan));
    } catch (error) {
      console.error('Error fetching plans by date:', error);
      throw error;
    }
  }

  /**
   * Update an existing plan with notification rescheduling
   */
  static async updatePlan(
    planId: string,
    updates: Partial<Omit<Plan, 'id' | 'uid' | 'createdAt'>>
  ): Promise<void> {
    try {
      const uid = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTION_NAME, planId);
      
      // Check ownership
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Plan not found.');
      }
      
      const planData = docSnap.data();
      if (planData.uid !== uid) {
        throw new Error('You do not have permission to update this plan.');
      }

      // Clean undefined fields FIRST before processing
      const cleanedUpdates = this.cleanUndefinedFields(updates);

      // If date, time, or reminder settings changed, reschedule notification
      const shouldReschedule = 
        cleanedUpdates.date !== undefined || 
        cleanedUpdates.time !== undefined || 
        cleanedUpdates.reminderMinutes !== undefined ||
        cleanedUpdates.status !== undefined;

      if (shouldReschedule) {
        // Get updated plan data
        const updatedPlan = {
          ...planData,
          ...cleanedUpdates,
          id: planId,
        } as Plan;

        // Cancel old notification
        await NotificationService.cancelPlanNotification(planId);

        // Schedule new notification if plan is pending
        if (updatedPlan.status === 'pending' || cleanedUpdates.status === 'pending') {
          const notificationId = await this.scheduleNotificationForPlan(updatedPlan);
          if (notificationId) {
            cleanedUpdates.notificationId = notificationId;
          }
          // If scheduling failed, notificationId simply won't be in cleanedUpdates
        }
        // If not pending, notificationId won't be added to update
      }

      await updateDoc(docRef, {
        ...cleanedUpdates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating plan:', error);
      throw error;
    }
  }

  /**
   * Mark a plan as completed (cancels notification)
   */
  static async completePlan(planId: string): Promise<void> {
    try {
      const uid = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTION_NAME, planId);
      
      // Check ownership
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Plan not found.');
      }
      
      const planData = docSnap.data();
      if (planData.uid !== uid) {
        throw new Error('You do not have permission to update this plan.');
      }
      
      // Cancel notification when completing
      await NotificationService.cancelPlanNotification(planId);
      
      // Only update status and completedAt - don't touch notificationId
      await updateDoc(docRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error completing plan:', error);
      throw error;
    }
  }

  /**
   * Toggle plan status between pending and completed
   */
  static async togglePlanStatus(planId: string): Promise<void> {
    try {
      const uid = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTION_NAME, planId);
      
      // Check ownership and get current status
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Plan not found.');
      }
      
      const planData = docSnap.data();
      if (planData.uid !== uid) {
        throw new Error('You do not have permission to update this plan.');
      }

      const currentPlan = { ...planData, id: planId } as Plan;
      const isCurrentlyCompleted = currentPlan.status === 'completed';

      if (isCurrentlyCompleted) {
        // Uncomplete: change to pending and reschedule notification
        const notificationId = await this.scheduleNotificationForPlan(currentPlan);
        
        const updateData: Record<string, any> = {
          status: 'pending',
          completedAt: null,
          updatedAt: serverTimestamp(),
        };

        // Only add notificationId if successfully scheduled
        if (notificationId) {
          updateData.notificationId = notificationId;
        }

        await updateDoc(docRef, updateData);
      } else {
        // Complete: change to completed and cancel notification
        await NotificationService.cancelPlanNotification(planId);
        
        await updateDoc(docRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error toggling plan status:', error);
      throw error;
    }
  }

  /**
   * Mark a plan as pending (reschedules notification)
   */
  static async uncompletePlan(planId: string): Promise<void> {
    try {
      const uid = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTION_NAME, planId);
      
      // Check ownership
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Plan not found.');
      }
      
      const planData = docSnap.data();
      if (planData.uid !== uid) {
        throw new Error('You do not have permission to update this plan.');
      }

      // Get current plan data to reschedule notification
      const currentPlan = {
        ...planData,
        id: planId,
      } as Plan;

      // Schedule notification for the plan
      const notificationId = await this.scheduleNotificationForPlan(currentPlan);

      // Update plan status and notification ID
      const updateData: any = {
        status: 'pending',
        completedAt: null,
        updatedAt: serverTimestamp(),
      };

      // Only add notificationId if it was successfully scheduled
      if (notificationId) {
        updateData.notificationId = notificationId;
      }

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error uncompleting plan:', error);
      throw error;
    }
  }

  /**
   * Delete a plan (cancels notification)
   */
  static async deletePlan(planId: string): Promise<void> {
    try {
      const uid = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTION_NAME, planId);
      
      // Check ownership
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Plan not found.');
      }
      
      const planData = docSnap.data();
      if (planData.uid !== uid) {
        throw new Error('You do not have permission to delete this plan.');
      }

      // Cancel notification before deleting
      await NotificationService.cancelPlanNotification(planId);
      
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw error;
    }
  }

  /**
   * Schedule notification for a plan
   * @private
   */
  private static async scheduleNotificationForPlan(plan: Plan): Promise<string | null> {
    try {
      // Don't schedule if plan is completed or cancelled
      if (plan.status !== 'pending') {
        return null;
      }

      // Parse plan date and time
      const [hours, minutes] = plan.time.split(':').map(Number);
      const planDateTime = new Date(plan.date);
      planDateTime.setHours(hours, minutes, 0, 0);

      // Don't schedule if time has already passed
      if (planDateTime <= new Date()) {
        return null;
      }

      // Schedule with reminder offset
      const reminderMinutes = plan.reminderMinutes ?? 15;
      const notificationId = await NotificationService.schedulePlanNotificationWithReminder(
        plan.id!,
        plan.title,
        plan.description,
        planDateTime,
        reminderMinutes,
        plan.category
      );

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification for plan:', error);
      return null;
    }
  }

  /**
   * Get all unique tags used by the user
   */
  static async getAllTags(): Promise<string[]> {
    try {
      const plans = await this.getAllPlans();
      const tagsSet = new Set<string>();
      
      plans.forEach(plan => {
        plan.tags?.forEach(tag => tagsSet.add(tag));
      });
      
      return Array.from(tagsSet).sort();
    } catch (error) {
      console.error('Error fetching tags:', error);
      return [];
    }
  }

  /**
   * Get analytics for the user's plans
   */
  static async getAnalytics(startDate?: string, endDate?: string): Promise<PlanAnalytics> {
    try {
      let plans = await this.getAllPlans();
      
      // Filter by date range if provided
      if (startDate && endDate) {
        plans = plans.filter(plan => plan.date >= startDate && plan.date <= endDate);
      }
      
      const totalPlans = plans.length;
      const completedPlans = plans.filter(p => p.status === 'completed').length;
      const completionRate = totalPlans > 0 ? (completedPlans / totalPlans) * 100 : 0;
      
      // Calculate streaks
      const streaks = this.calculateStreaks(plans);
      
      // Plans by category
      const plansByCategory: { [key: string]: number } = {};
      plans.forEach(plan => {
        plansByCategory[plan.category] = (plansByCategory[plan.category] || 0) + 1;
      });
      
      // Plans by priority
      const plansByPriority: { [key: string]: number } = {};
      plans.forEach(plan => {
        plansByPriority[plan.priority] = (plansByPriority[plan.priority] || 0) + 1;
      });
      
      // Completion trend (last 7 days)
      const completionTrend = this.getCompletionTrend(plans, 7);
      
      return {
        totalPlans,
        completedPlans,
        completionRate,
        currentStreak: streaks.current,
        longestStreak: streaks.longest,
        plansByCategory,
        plansByPriority,
        completionTrend,
      };
    } catch (error) {
      console.error('Error calculating analytics:', error);
      return {
        totalPlans: 0,
        completedPlans: 0,
        completionRate: 0,
        currentStreak: 0,
        longestStreak: 0,
        plansByCategory: {},
        plansByPriority: {},
        completionTrend: [],
      };
    }
  }

  /**
   * Calculate current and longest completion streaks
   */
  private static calculateStreaks(plans: Plan[]): { current: number; longest: number } {
    // Group plans by date
    const plansByDate = new Map<string, Plan[]>();
    plans.forEach(plan => {
      if (!plansByDate.has(plan.date)) {
        plansByDate.set(plan.date, []);
      }
      plansByDate.get(plan.date)!.push(plan);
    });
    
    // Get sorted dates
    const dates = Array.from(plansByDate.keys()).sort();
    
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate streaks based on days with at least one completed plan
    for (let i = dates.length - 1; i >= 0; i--) {
      const date = dates[i];
      const datePlans = plansByDate.get(date)!;
      const hasCompleted = datePlans.some(p => p.status === 'completed');
      
      if (hasCompleted) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
        
        // Check if this is part of current streak (from today backwards)
        if (date <= today && currentStreak === 0) {
          currentStreak = tempStreak;
        }
      } else {
        if (currentStreak === 0) {
          currentStreak = tempStreak;
        }
        tempStreak = 0;
      }
    }
    
    return { current: currentStreak, longest: longestStreak };
  }

  /**
   * Get completion trend for the last N days
   */
  private static getCompletionTrend(plans: Plan[], days: number): { date: string; completed: number; total: number }[] {
    const trend: { date: string; completed: number; total: number }[] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const dayPlans = plans.filter(p => p.date === dateString);
      const completed = dayPlans.filter(p => p.status === 'completed').length;
      
      trend.push({
        date: dateString,
        completed,
        total: dayPlans.length,
      });
    }
    
    return trend;
  }

  /**
   * Get category color
   */
  static getCategoryColor(category: string): string[] {
    const colors: { [key: string]: string[] } = {
      work: ['#667eea', '#764ba2'],
      personal: ['#f093fb', '#f5576c'],
      health: ['#4facfe', '#00f2fe'],
      education: ['#43e97b', '#38f9d7'],
      other: ['#fa709a', '#fee140'],
    };
    return colors[category] || colors.other;
  }

  /**
   * Get priority color
   */
  static getPriorityColor(priority: string): string {
    const colors: { [key: string]: string } = {
      low: '#4ade80',
      medium: '#fbbf24',
      high: '#f97316',
    };
    return colors[priority] || colors.low;
  }

  /**
   * Validate plan data
   */
  static validatePlan(plan: Partial<Plan>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plan.title || !plan.title.trim()) {
      errors.push('Plan title is required.');
    }

    if (!plan.date) {
      errors.push('Plan date is required.');
    }

    if (!plan.time) {
      errors.push('Plan time is required.');
    }

    if (!plan.category) {
      errors.push('Plan category is required.');
    }

    if (!plan.priority) {
      errors.push('Plan priority is required.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
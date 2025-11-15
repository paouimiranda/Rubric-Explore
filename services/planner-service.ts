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
   * Create a new plan
   */
  static async createPlan(plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt' | 'uid'>): Promise<string> {
    try {
      const uid = this.getCurrentUserId();
      
      const planData = {
        ...plan,
        uid,
        status: plan.status || 'pending',
        tags: plan.tags || [],
        isPublic: plan.isPublic ?? false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), planData);
      return docRef.id;
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
   * Update an existing plan
   */
  static async updatePlan(planId: string, updates: Partial<Omit<Plan, 'id' | 'uid' | 'createdAt'>>): Promise<void> {
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
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating plan:', error);
      throw error;
    }
  }

  /**
   * Mark a plan as completed
   */
  static async completePlan(planId: string): Promise<void> {
    try {
      await this.updatePlan(planId, {
        status: 'completed',
        completedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error completing plan:', error);
      throw error;
    }
  }

  /**
   * Mark a plan as pending (undo completion)
   */
  static async uncompletePlan(planId: string): Promise<void> {
    try {
      await this.updatePlan(planId, {
        status: 'pending',
        completedAt: null,
      });
    } catch (error) {
      console.error('Error uncompleting plan:', error);
      throw error;
    }
  }

  /**
   * Delete a plan
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
      
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting plan:', error);
      throw error;
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
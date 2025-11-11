import { Plan, PlannerService } from '@/services/planner-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import {
    Animated,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface AnalyticsModalProps {
  visible: boolean;
  plans: Plan[];
  onClose: () => void;
}

export default function AnalyticsModal({
  visible,
  plans,
  onClose,
}: AnalyticsModalProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  const analytics = useMemo(() => {
    const totalPlans = plans.length;
    const completedPlans = plans.filter(p => p.status === 'completed').length;
    const pendingPlans = totalPlans - completedPlans;
    const completionRate = totalPlans > 0 ? (completedPlans / totalPlans) * 100 : 0;
    
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
    
    return {
      totalPlans,
      completedPlans,
      pendingPlans,
      completionRate,
      plansByCategory,
      plansByPriority,
    };
  }, [plans]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.modalContent,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <LinearGradient
            colors={['#fa709a', '#fee140']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeader}
          >
            <Ionicons name="stats-chart" size={32} color="#fff" />
            <Text style={styles.modalTitle}>Analytics</Text>
          </LinearGradient>

          <ScrollView style={styles.modalBody}>
            <View style={styles.analyticsSection}>
              <Text style={styles.analyticsSectionTitle}>Overview</Text>
              
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsCard}>
                  <LinearGradient
                    colors={['#4facfe', '#00f2fe']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.analyticsIconBadge}
                  >
                    <Ionicons name="calendar" size={24} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.analyticsValue}>{analytics.totalPlans}</Text>
                  <Text style={styles.analyticsLabel}>Total Plans</Text>
                </View>

                <View style={styles.analyticsCard}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.analyticsIconBadge}
                  >
                    <Ionicons name="trending-up" size={24} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.analyticsValue}>{analytics.completionRate.toFixed(0)}%</Text>
                  <Text style={styles.analyticsLabel}>Completion Rate</Text>
                </View>
              </View>

              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsCard}>
                  <LinearGradient
                    colors={['#43e97b', '#38f9d7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.analyticsIconBadge}
                  >
                    <Ionicons name="checkmark-done" size={24} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.analyticsValue}>{analytics.completedPlans}</Text>
                  <Text style={styles.analyticsLabel}>Completed</Text>
                </View>

                <View style={styles.analyticsCard}>
                  <LinearGradient
                    colors={['#f093fb', '#f5576c']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.analyticsIconBadge}
                  >
                    <Ionicons name="hourglass" size={24} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.analyticsValue}>{analytics.pendingPlans}</Text>
                  <Text style={styles.analyticsLabel}>Pending</Text>
                </View>
              </View>
            </View>

            <View style={styles.analyticsSection}>
              <Text style={styles.analyticsSectionTitle}>By Category</Text>
              {Object.keys(analytics.plansByCategory).length > 0 ? (
                Object.entries(analytics.plansByCategory).map(([category, count]) => {
                  const percentage = (count / analytics.totalPlans) * 100;
                  const colors = PlannerService.getCategoryColor(category);
                  
                  return (
                    <View key={category} style={styles.analyticsBarContainer}>
                      <View style={styles.analyticsBarHeader}>
                        <View style={styles.analyticsBarLabelRow}>
                          <LinearGradient
                            colors={colors as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.categoryIcon}
                          >
                            <Ionicons name="folder" size={12} color="#fff" />
                          </LinearGradient>
                          <Text style={styles.analyticsBarLabel}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </Text>
                        </View>
                        <Text style={styles.analyticsBarValue}>{count}</Text>
                      </View>
                      <View style={styles.analyticsBarTrack}>
                        <LinearGradient
                          colors={colors as any}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.analyticsBarFill, { width: `${percentage}%` }]}
                        />
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyAnalytics}>No category data available</Text>
              )}
            </View>

            <View style={styles.analyticsSection}>
              <Text style={styles.analyticsSectionTitle}>By Priority</Text>
              {Object.keys(analytics.plansByPriority).length > 0 ? (
                Object.entries(analytics.plansByPriority).map(([priority, count]) => {
                  const percentage = (count / analytics.totalPlans) * 100;
                  const color = PlannerService.getPriorityColor(priority);
                  
                  return (
                    <View key={priority} style={styles.analyticsBarContainer}>
                      <View style={styles.analyticsBarHeader}>
                        <View style={styles.analyticsBarLabelRow}>
                          <View 
                            style={[styles.priorityDot, { backgroundColor: color }]} 
                          />
                          <Text style={styles.analyticsBarLabel}>
                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                          </Text>
                        </View>
                        <Text style={styles.analyticsBarValue}>{count}</Text>
                      </View>
                      <View style={styles.analyticsBarTrack}>
                        <View
                          style={[
                            styles.analyticsBarFill,
                            { width: `${percentage}%`, backgroundColor: color },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyAnalytics}>No priority data available</Text>
              )}
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: '#1a2744',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  analyticsSection: {
    marginBottom: 24,
  },
  analyticsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  analyticsIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  analyticsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '500',
    textAlign: 'center',
  },
  analyticsBarContainer: {
    marginBottom: 16,
  },
  analyticsBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  analyticsBarLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  analyticsBarLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  analyticsBarValue: {
    fontSize: 14,
    color: '#4facfe',
    fontWeight: '600',
  },
  analyticsBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  analyticsBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyAnalytics: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingVertical: 20,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  closeButtonText: {
    color: '#4facfe',
    fontSize: 16,
    fontWeight: '600',
  },
});
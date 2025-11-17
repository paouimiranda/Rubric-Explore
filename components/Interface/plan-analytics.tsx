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

interface PlansOverviewModalProps {
  visible: boolean;
  plans: Plan[];
  onClose: () => void;
}

export default function PlansOverviewModal({
  visible,
  plans,
  onClose,
}: PlansOverviewModalProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible]);

  const overview = useMemo(() => {
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
            { 
              opacity: fadeAnim, 
              transform: [{ translateY: slideAnim }] 
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerTitleRow}>
                <LinearGradient
                  colors={['#4facfe', '#00f2fe']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerIcon}
                >
                  <Ionicons name="pie-chart" size={24} color="#fff" />
                </LinearGradient>
                <Text style={styles.headerTitle}>Plans Overview</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeIconButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#aaa" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerSubtitle}>
              Summary of your {overview.totalPlans} plan{overview.totalPlans !== 1 ? 's' : ''}
            </Text>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Quick Stats */}
            <View style={styles.section}>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#43e97b', '#38f9d7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statIconContainer}
                  >
                    <Ionicons name="checkmark-circle" size={28} color="#fff" />
                  </LinearGradient>
                  <View style={styles.statInfo}>
                    <Text style={styles.statValue}>{overview.completedPlans}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <LinearGradient
                    colors={['#fa709a', '#fee140']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.statIconContainer}
                  >
                    <Ionicons name="time" size={28} color="#fff" />
                  </LinearGradient>
                  <View style={styles.statInfo}>
                    <Text style={styles.statValue}>{overview.pendingPlans}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                </View>
              </View>

              {/* Completion Progress */}
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Completion Progress</Text>
                  <Text style={styles.progressPercentage}>
                    {overview.completionRate.toFixed(0)}%
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill,
                      { width: `${overview.completionRate}%` }
                    ]}
                  />
                </View>
                <Text style={styles.progressSubtext}>
                  {overview.completedPlans} of {overview.totalPlans} plans completed
                </Text>
              </View>
            </View>

            {/* Category Breakdown */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="albums" size={20} color="#4facfe" />
                <Text style={styles.sectionTitle}>By Category</Text>
              </View>
              
              {Object.keys(overview.plansByCategory).length > 0 ? (
                <View style={styles.breakdownList}>
                  {Object.entries(overview.plansByCategory)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, count]) => {
                      const percentage = (count / overview.totalPlans) * 100;
                      const colors = PlannerService.getCategoryColor(category);
                      
                      return (
                        <View key={category} style={styles.breakdownItem}>
                          <View style={styles.breakdownHeader}>
                            <View style={styles.breakdownLabelRow}>
                              <LinearGradient
                                colors={colors as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.breakdownIcon}
                              >
                                <Ionicons name="folder" size={14} color="#fff" />
                              </LinearGradient>
                              <Text style={styles.breakdownLabel}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </Text>
                            </View>
                            <View style={styles.breakdownStats}>
                              <Text style={styles.breakdownCount}>{count}</Text>
                              <Text style={styles.breakdownPercentage}>
                                {percentage.toFixed(0)}%
                              </Text>
                            </View>
                          </View>
                          <View style={styles.breakdownBar}>
                            <LinearGradient
                              colors={colors as any}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={[
                                styles.breakdownBarFill,
                                { width: `${percentage}%` }
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={32} color="#555" />
                  <Text style={styles.emptyText}>No categories yet</Text>
                </View>
              )}
            </View>

            {/* Priority Breakdown */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flag" size={20} color="#f5576c" />
                <Text style={styles.sectionTitle}>By Priority</Text>
              </View>
              
              {Object.keys(overview.plansByPriority).length > 0 ? (
                <View style={styles.breakdownList}>
                  {(['high', 'medium', 'low'] as const)
                    .filter(priority => overview.plansByPriority[priority])
                    .map(priority => {
                      const count = overview.plansByPriority[priority];
                      const percentage = (count / overview.totalPlans) * 100;
                      const color = PlannerService.getPriorityColor(priority);
                      
                      return (
                        <View key={priority} style={styles.breakdownItem}>
                          <View style={styles.breakdownHeader}>
                            <View style={styles.breakdownLabelRow}>
                              <View 
                                style={[styles.priorityIndicator, { backgroundColor: color }]} 
                              />
                              <Text style={styles.breakdownLabel}>
                                {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                              </Text>
                            </View>
                            <View style={styles.breakdownStats}>
                              <Text style={styles.breakdownCount}>{count}</Text>
                              <Text style={styles.breakdownPercentage}>
                                {percentage.toFixed(0)}%
                              </Text>
                            </View>
                          </View>
                          <View style={styles.breakdownBar}>
                            <View
                              style={[
                                styles.breakdownBarFill,
                                { width: `${percentage}%`, backgroundColor: color }
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="flag-outline" size={32} color="#555" />
                  <Text style={styles.emptyText}>No priority data yet</Text>
                </View>
              )}
            </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    height: '85%',
    backgroundColor: '#1a2744',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  closeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginLeft: 52,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    padding: 20,
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#aaa',
    fontWeight: '500',
  },
  progressCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#667eea',
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressSubtext: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  breakdownList: {
    gap: 12,
  },
  breakdownItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  breakdownLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  breakdownStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownCount: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  breakdownPercentage: {
    fontSize: 13,
    color: '#4facfe',
    fontWeight: '600',
  },
  breakdownBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
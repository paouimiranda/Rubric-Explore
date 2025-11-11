import { Plan, PlannerService } from '@/services/planner-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface TodayTabProps {
  plans: Plan[];
  loading: boolean;
  onToggleStatus: (plan: Plan) => void;
  onEditPlan: (plan: Plan) => void;
  onDeletePlan: (planId: string) => void;
  onCreatePlan: (date?: string) => void;
}

export default function TodayTab({
  plans,
  loading,
  onToggleStatus,
  onEditPlan,
  onDeletePlan,
  onCreatePlan,
}: TodayTabProps) {
  const today = moment().format('YYYY-MM-DD');

  const todayPlans = useMemo(() => {
    const filtered = plans.filter(p => p.date === today);
    return filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      return moment(`${a.date} ${a.time}`).diff(moment(`${b.date} ${b.time}`));
    });
  }, [plans, today]);

  const overduePlans = useMemo(() => {
    const filtered = plans.filter(
      p => p.date < today && p.status === 'pending'
    );
    return filtered.sort((a, b) =>
      moment(`${a.date} ${a.time}`).diff(moment(`${b.date} ${b.time}`))
    );
  }, [plans, today]);

  const stats = useMemo(() => {
    const completed = todayPlans.filter(p => p.status === 'completed').length;
    const total = todayPlans.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, remaining: total - completed, percentage };
  }, [todayPlans]);

  const PlanCard = React.memo(({ plan, isOverdue }: { plan: Plan; isOverdue?: boolean }) => {
    const categoryColors = PlannerService.getCategoryColor(plan.category);
    const priorityColor = PlannerService.getPriorityColor(plan.priority);
    
    return (
      <TouchableOpacity
        onPress={() => onEditPlan(plan)}
        style={[
          styles.planCard,
          plan.status === 'completed' && styles.completedCard,
          isOverdue && styles.overdueCard,
        ]}
        activeOpacity={0.7}
      >
        <View style={styles.planCardContent}>
          <TouchableOpacity
            onPress={() => onToggleStatus(plan)}
            style={styles.checkboxContainer}
            activeOpacity={0.7}
          >
            {plan.status === 'completed' ? (
              <LinearGradient
                colors={['#4ade80', '#22c55e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.checkbox}
              >
                <Ionicons name="checkmark" size={20} color="#fff" />
              </LinearGradient>
            ) : (
              <View style={[
                styles.checkboxEmpty,
                isOverdue && styles.checkboxOverdue
              ]} />
            )}
          </TouchableOpacity>

          <View style={styles.planTextContainer}>
            <View style={styles.planHeader}>
              <Text style={[
                styles.planTitle,
                plan.status === 'completed' && styles.completedText,
              ]}>
                {plan.title}
              </Text>
              <View style={styles.badges}>
                <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
                  <Text style={styles.priorityText}>{plan.priority[0].toUpperCase()}</Text>
                </View>
                <LinearGradient
                  colors={categoryColors as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.categoryBadge}
                >
                  <Ionicons name="folder" size={12} color="#fff" />
                </LinearGradient>
              </View>
            </View>
            
            <View style={styles.planMeta}>
              <Ionicons name="time-outline" size={14} color={isOverdue ? '#f97316' : '#4facfe'} />
              <Text style={[styles.planTime, isOverdue && styles.overdueText]}>
                {plan.time}
                {isOverdue && ` • ${moment(plan.date).fromNow()}`}
              </Text>
            </View>
            
            {plan.description && (
              <Text style={styles.planDescription} numberOfLines={2}>
                {plan.description}
              </Text>
            )}
            
            {plan.tags && plan.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {plan.tags.slice(0, 3).map((tag, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
                {plan.tags.length > 3 && (
                  <Text style={styles.moreTagsText}>+{plan.tags.length - 3}</Text>
                )}
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => onDeletePlan(plan.id!)}
            style={styles.deleteButton}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  });

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4facfe" />
        <Text style={styles.loadingText}>Loading today's plans...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Redesigned Header */}
      <View style={styles.headerContainer}>
        <View style={styles.topRow}>
          <View style={styles.dateSection}>
            <Text style={styles.greeting}>
              {moment().hour() < 12 ? 'Good Morning' : moment().hour() < 18 ? 'Good Afternoon' : 'Good Evening'}
            </Text>
            <Text style={styles.dateText}>{moment().format('dddd, MMMM D')}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statCardValue}>{stats.total}</Text>
              <Text style={styles.statCardLabel}>Total</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statCardValue, { color: '#4ade80' }]}>
                {stats.completed}
              </Text>
              <Text style={styles.statCardLabel}>Done</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statCardValue, { color: '#fbbf24' }]}>
                {stats.remaining}
              </Text>
              <Text style={styles.statCardLabel}>Left</Text>
            </View>
          </View>
        </View>

        {stats.total > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Today's Progress</Text>
              <Text style={styles.progressPercentage}>{stats.percentage}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg} />
              <LinearGradient
                colors={['#4ade80', '#22c55e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${stats.percentage}%` }]}
              />
            </View>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overdue Plans */}
        {overduePlans.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={20} color="#f97316" />
              <Text style={styles.sectionTitle}>Overdue ({overduePlans.length})</Text>
            </View>
            
            {overduePlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} isOverdue />
            ))}
          </View>
        )}

        {/* Today's Plans */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="today" size={20} color="#4facfe" />
            <Text style={styles.sectionTitle}>
              Today's Plans ({todayPlans.length})
            </Text>
          </View>
          
          {todayPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIcon}
              >
                <Ionicons name="checkmark-done" size={40} color="#fff" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>All Clear!</Text>
              <Text style={styles.emptySubtitle}>
                No plans for today. Tap + to add one.
              </Text>
              <TouchableOpacity
                onPress={() => onCreatePlan(today)}
                style={styles.emptyButton}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#4facfe', '#00f2fe']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.emptyButtonGradient}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.emptyButtonText}>Add Plan</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            todayPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 12,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateSection: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '400',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4facfe',
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 9,
    color: '#777',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  progressPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4ade80',
  },
  progressBarContainer: {
    height: 6,
    position: 'relative',
  },
  progressBarBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
  },
  progressBarFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  completedCard: {
    opacity: 0.6,
  },
  overdueCard: {
    borderColor: 'rgba(249, 115, 22, 0.3)',
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
  },
  planCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkboxContainer: {
    marginTop: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxEmpty: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  checkboxOverdue: {
    borderColor: '#f97316',
  },
  planTextContainer: {
    flex: 1,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  planTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  priorityBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  categoryBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  planTime: {
    color: '#4facfe',
    fontSize: 13,
    fontWeight: '600',
  },
  overdueText: {
    color: '#f97316',
  },
  planDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  tag: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  tagText: {
    color: '#4facfe',
    fontSize: 11,
    fontWeight: '500',
  },
  moreTagsText: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 20,
  },
  emptyButton: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
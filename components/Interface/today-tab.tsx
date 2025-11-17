import { Plan, PlannerService } from '@/services/planner-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Stop, RadialGradient as SvgRadialGradient } from 'react-native-svg';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

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
  const [completingPlanId, setCompletingPlanId] = useState<string | null>(null);
  const [completionProgress, setCompletionProgress] = useState(0);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [exitingPlanId, setExitingPlanId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const progressWidthAnim = useRef(new Animated.Value(0)).current;
  const emptyStateScale = useRef(new Animated.Value(0)).current;
  const emptyStateOpacity = useRef(new Animated.Value(0)).current;

  const COMPLETION_TIMER = 800;

  const todayPlans = useMemo(() => {
    const filtered = plans.filter(p => p.date === today);
    return filtered.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      return moment(`${a.date} ${a.time}`).diff(moment(`${b.date} ${b.time}`));
    });
  }, [plans, today]);

  const pendingPlans = useMemo(() => 
    todayPlans.filter(p => p.status === 'pending'),
    [todayPlans]
  );

  const completedPlans = useMemo(() => 
    todayPlans.filter(p => p.status === 'completed'),
    [todayPlans]
  );

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

  useEffect(() => {
    Animated.spring(progressWidthAnim, {
      toValue: stats.percentage,
      friction: 8,
      tension: 40,
      useNativeDriver: false,
    }).start();
  }, [stats.percentage]);

  useEffect(() => {
    if (pendingPlans.length === 0 && todayPlans.length > 0) {
      Animated.parallel([
        Animated.spring(emptyStateScale, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(emptyStateOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      emptyStateScale.setValue(0);
      emptyStateOpacity.setValue(0);
    }
  }, [pendingPlans.length, todayPlans.length]);

  const handleCheckboxPress = async (plan: Plan) => {
    if (plan.status === 'completed') {
      // Undo completion - use the service method directly
      try {
        await PlannerService.togglePlanStatus(plan.id!);
        // Call the original toggle handler to refresh UI
        onToggleStatus(plan);
      } catch (error) {
        console.error('Error uncompleting plan:', error);
        Alert.alert('Error', 'Failed to update plan status');
      }
      return;
    }

    // If already completing this plan, undo it
    if (completingPlanId === plan.id) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setCompletingPlanId(null);
      setCompletionProgress(0);
      return;
    }

    // Start the completion timer
    setCompletingPlanId(plan.id!);
    setCompletionProgress(0);

    const startTime = Date.now();
    
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / COMPLETION_TIMER) * 100, 100);
      
      setCompletionProgress(progress);
      
      if (progress >= 100) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        setExitingPlanId(plan.id!);
        
        setTimeout(async () => {
          try {
            await PlannerService.togglePlanStatus(plan.id!);
            // Call the original toggle handler to refresh UI
            onToggleStatus(plan);
          } catch (error) {
            console.error('Error completing plan:', error);
            Alert.alert('Error', 'Failed to complete plan');
          } finally {
            setExitingPlanId(null);
            setCompletingPlanId(null);
            setCompletionProgress(0);
          }
        }, 400);
      }
    }, 16);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const PlanCard = React.memo(({ plan, isOverdue }: { plan: Plan; isOverdue?: boolean }) => {
    const categoryColors = PlannerService.getCategoryColor(plan.category);
    const priorityColor = PlannerService.getPriorityColor(plan.priority);
    const isCompleting = completingPlanId === plan.id;
    const isExiting = exitingPlanId === plan.id;
    
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const translateYAnim = useRef(new Animated.Value(0)).current;
    const checkmarkScale = useRef(new Animated.Value(0)).current;
    const glowOpacity = useRef(new Animated.Value(0)).current;
    const rippleScale = useRef(new Animated.Value(0)).current;
    const rippleOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (isCompleting) {
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        const progressValue = completionProgress / 100;
        Animated.spring(checkmarkScale, {
          toValue: progressValue,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }).start();

        if (completionProgress >= 100) {
          Animated.sequence([
            Animated.parallel([
              Animated.timing(rippleScale, {
                toValue: 2,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.timing(rippleOpacity, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
              }),
            ]),
          ]).start();

          Animated.sequence([
            Animated.spring(scaleAnim, {
              toValue: 1.03,
              friction: 3,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 3,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start();
        }
      } else {
        checkmarkScale.setValue(0);
        glowOpacity.setValue(0);
        rippleScale.setValue(0);
        rippleOpacity.setValue(1);
      }
    }, [isCompleting, completionProgress]);

    useEffect(() => {
      if (isExiting) {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.85,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: -20,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isExiting]);

    const circumference = 2 * Math.PI * 12;
    const progressStrokeDashoffset = circumference - (completionProgress / 100) * circumference;

    // Check if notification is scheduled
    const hasReminder = plan.reminderMinutes !== undefined && plan.reminderMinutes >= 0;
    const planDateTime = moment(`${plan.date} ${plan.time}`, 'YYYY-MM-DD HH:mm');
    const isPastTime = planDateTime.isBefore(moment());

    return (
      <Animated.View style={{ 
        transform: [
          { scale: scaleAnim },
          { translateY: translateYAnim }
        ],
        opacity: fadeAnim 
      }}>
        <TouchableOpacity
          onPress={() => onEditPlan(plan)}
          style={[
            styles.planCard,
            plan.status === 'completed' && styles.completedCard,
            isOverdue && styles.overdueCard,
          ]}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={
              plan.status === 'completed' 
                ? ['rgba(74, 222, 128, 0.05)', 'rgba(34, 197, 94, 0.05)']
                : isOverdue 
                ? ['rgba(249, 115, 22, 0.08)', 'rgba(234, 88, 12, 0.08)']
                : ['rgba(79, 172, 254, 0.05)', 'rgba(0, 242, 254, 0.05)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.planCardGradient}
          >
            <View style={styles.planCardContent}>
              <TouchableOpacity
                onPress={() => handleCheckboxPress(plan)}
                style={styles.checkboxContainer}
                activeOpacity={0.7}
              >
                <View style={{ position: 'relative' }}>
                  {isCompleting && (
                    <Animated.View 
                      style={[
                        styles.checkboxGlow,
                        { opacity: glowOpacity }
                      ]}
                    >
                      <LinearGradient
                        colors={['rgba(74, 222, 128, 0.4)', 'rgba(34, 197, 94, 0.4)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>
                  )}

                  {isCompleting && completionProgress >= 100 && (
                    <Animated.View
                      style={[
                        styles.rippleEffect,
                        {
                          opacity: rippleOpacity,
                          transform: [{ scale: rippleScale }],
                        }
                      ]}
                    >
                      <LinearGradient
                        colors={['rgba(74, 222, 128, 0.6)', 'rgba(34, 197, 94, 0.3)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </Animated.View>
                  )}

                  {plan.status === 'completed' ? (
                    <LinearGradient
                      colors={['#4ade80', '#22c55e']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.checkbox}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </LinearGradient>
                  ) : isCompleting ? (
                    <View style={styles.checkbox}>
                      <View style={[styles.checkboxEmpty, { borderColor: 'rgba(255, 255, 255, 0.15)' }]} />
                      
                      <Svg 
                        width={28} 
                        height={28} 
                        style={StyleSheet.absoluteFill}
                        viewBox="0 0 28 28"
                      >
                        <Defs>
                          <SvgRadialGradient id="progressGrad">
                            <Stop offset="0" stopColor="#4ade80" stopOpacity="1" />
                            <Stop offset="1" stopColor="#22c55e" stopOpacity="1" />
                          </SvgRadialGradient>
                        </Defs>
                        <Circle
                          cx="14"
                          cy="14"
                          r="12"
                          stroke="url(#progressGrad)"
                          strokeWidth="3"
                          fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={progressStrokeDashoffset}
                          strokeLinecap="round"
                          transform="rotate(-90 14 14)"
                        />
                      </Svg>

                      <Animated.View
                        style={{
                          position: 'absolute',
                          transform: [{ scale: checkmarkScale }],
                        }}
                      >
                        <LinearGradient
                          colors={['#4ade80', '#22c55e']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.checkboxInner}
                        >
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </LinearGradient>
                      </Animated.View>
                    </View>
                  ) : (
                    <View style={[
                      styles.checkboxEmpty,
                      isOverdue && styles.checkboxOverdue
                    ]} />
                  )}
                </View>
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
                  {hasReminder && !isPastTime && plan.status !== 'completed' && (
                    <>
                      <View style={styles.metaDivider} />
                      <Ionicons name="notifications" size={14} color="#fbbf24" />
                      <Text style={styles.reminderText}>
                        {plan.reminderMinutes === 0 ? 'On time' : `${plan.reminderMinutes}m`}
                      </Text>
                    </>
                  )}
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
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
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
              <AnimatedLinearGradient
                colors={['#4ade80', '#22c55e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressBarFill,
                  {
                    width: progressWidthAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
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

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="today" size={20} color="#4facfe" />
            <Text style={styles.sectionTitle}>
              Pending ({pendingPlans.length})
            </Text>
          </View>
          
          {pendingPlans.length === 0 ? (
            <Animated.View 
              style={[
                styles.emptyState,
                {
                  opacity: emptyStateOpacity,
                  transform: [{ scale: emptyStateScale }],
                }
              ]}
            >
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
                No pending plans. Tap + to add one.
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
            </Animated.View>
          ) : (
            pendingPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))
          )}
        </View>

        {completedPlans.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity
              onPress={() => setCompletedExpanded(!completedExpanded)}
              style={styles.collapsibleHeader}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
                <Text style={styles.sectionTitle}>
                  Completed ({completedPlans.length})
                </Text>
              </View>
              <Ionicons 
                name={completedExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#888" 
              />
            </TouchableOpacity>
            
            {completedExpanded && completedPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </View>
        )}
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
  collapsibleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  planCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  planCardGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  completedCard: {
    opacity: 0.6,
  },
  overdueCard: {
    borderColor: 'rgba(249, 115, 22, 0.3)',
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
    position: 'relative',
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
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    left: -8,
    top: -8,
  },
  rippleEffect: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    left: 0,
    top: 0,
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
    flexWrap: 'wrap',
  },
  planTime: {
    color: '#4facfe',
    fontSize: 13,
    fontWeight: '600',
  },
  overdueText: {
    color: '#f97316',
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#666',
  },
  reminderText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  planDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
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
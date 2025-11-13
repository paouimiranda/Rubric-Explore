import BottomNavigation from '@/components/Interface/nav-bar';
import AnalyticsModal from '@/components/Interface/plan-analytics';
import PlanModal from '@/components/Interface/plan-modal';
import TodayTab from '@/components/Interface/today-tab';
import UpcomingTab from '@/components/Interface/upcoming-tab';
import { Plan, PlannerService } from '@/services/planner-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const screenWidth = Dimensions.get('window').width;

type TabType = 'today' | 'upcoming';

export default function PlannerScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [analyticsVisible, setAnalyticsVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [initialDate, setInitialDate] = useState<string | undefined>(undefined);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabContentOpacity = useRef(new Animated.Value(1)).current;
  const tabContentTranslate = useRef(new Animated.Value(0)).current;
  const indicatorPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    loadPlans();
  }, []);

  useEffect(() => {
    // Animate tab indicator
    Animated.spring(indicatorPosition, {
      toValue: activeTab === 'today' ? 0 : 1,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();

    // Animate content transition
    Animated.sequence([
      Animated.parallel([
        Animated.timing(tabContentOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(tabContentTranslate, {
          toValue: -20,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(tabContentOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(tabContentTranslate, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [activeTab]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const fetchedPlans = await PlannerService.getAllPlans();
      setPlans(fetchedPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      Alert.alert('Error', 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (date?: string) => {
    // If a date is provided, store it separately
    if (date) {
      setInitialDate(date);
    } else {
      setInitialDate(undefined);
    }
    setEditingPlan(null);
    setModalVisible(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setInitialDate(undefined);
    setModalVisible(true);
  };

  const togglePlanStatus = async (plan: Plan) => {
    try {
      setPlans(prevPlans => 
        prevPlans.map(p => 
          p.id === plan.id 
            ? { ...p, status: p.status === 'completed' ? 'pending' : 'completed' } 
            : p
        )
      );

      if (plan.status === 'completed') {
        await PlannerService.uncompletePlan(plan.id!);
      } else {
        await PlannerService.completePlan(plan.id!);
      }
    } catch (error) {
      console.error('Error toggling plan status:', error);
      await loadPlans();
      Alert.alert('Error', 'Failed to update plan status');
    }
  };

  const deletePlan = async (planId: string) => {
    Alert.alert(
      'Delete Plan',
      'Are you sure you want to delete this plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setPlans(prevPlans => prevPlans.filter(p => p.id !== planId));
              await PlannerService.deletePlan(planId);
            } catch (error) {
              console.error('Error deleting plan:', error);
              await loadPlans();
              Alert.alert('Error', 'Failed to delete plan');
            }
          },
        },
      ]
    );
  };

  const handleSavePlan = async () => {
    await loadPlans();
    setModalVisible(false);
  };

  const tabWidth = (screenWidth - 52) / 2; // 52 = padding (40) + gap (12)

  return (
    <LinearGradient colors={['#0A1C3C', '#324762']} style={styles.container}>
      <Animated.View style={[styles.headerContainer, { opacity: fadeAnim }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIconBadge}
            >
              <Ionicons name="calendar" size={32} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>My Planner</Text>
              <Text style={styles.headerSubtitle}>Stay organized & productive</Text>
            </View>
          </View>
          
          <TouchableOpacity
            onPress={() => setAnalyticsVisible(true)}
            style={styles.analyticsButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#fa709a', '#fee140']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.analyticsButtonGradient}
            >
              <Ionicons name="stats-chart" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Improved Tab Selector with Animation */}
        <View style={styles.tabOuterContainer}>
          <View style={styles.tabContainer}>
            {/* Animated Indicator */}
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  width: tabWidth,
                  transform: [
                    {
                      translateX: indicatorPosition.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, tabWidth + 12], // 12 is gap
                      }),
                    },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tabIndicatorGradient}
              />
            </Animated.View>

            {/* Tab Buttons */}
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setActiveTab('today')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={activeTab === 'today' ? 'today' : 'today-outline'} 
                size={20} 
                color={activeTab === 'today' ? '#fff' : '#888'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'today' && styles.tabTextActive
              ]}>
                Today
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tab}
              onPress={() => setActiveTab('upcoming')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={activeTab === 'upcoming' ? 'calendar' : 'calendar-outline'} 
                size={20} 
                color={activeTab === 'upcoming' ? '#fff' : '#888'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'upcoming' && styles.tabTextActive
              ]}>
                Upcoming
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Animated Tab Content */}
      <Animated.View 
        style={[
          styles.tabContent,
          {
            opacity: tabContentOpacity,
            transform: [{ translateY: tabContentTranslate }],
          },
        ]}
      >
        {activeTab === 'today' ? (
          <TodayTab
            plans={plans}
            loading={loading}
            onToggleStatus={togglePlanStatus}
            onEditPlan={openEditModal}
            onDeletePlan={deletePlan}
            onCreatePlan={openCreateModal}
          />
        ) : (
          <UpcomingTab
            plans={plans}
            loading={loading}
            onToggleStatus={togglePlanStatus}
            onEditPlan={openEditModal}
            onDeletePlan={deletePlan}
            onCreatePlan={openCreateModal}
          />
        )}
      </Animated.View>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.addButtonContainer}
        onPress={() => openCreateModal()}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#fa709a', '#fee140']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addButton}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Modals */}
      <PlanModal
        visible={modalVisible}
        editingPlan={editingPlan}
        initialDate={initialDate}
        onClose={() => {
          setModalVisible(false);
          setInitialDate(undefined);
        }}
        onSave={handleSavePlan}
      />

      <AnalyticsModal
        visible={analyticsVisible}
        plans={plans}
        onClose={() => setAnalyticsVisible(false)}
      />

      <BottomNavigation />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 20 
  },
  headerContainer: { 
    paddingHorizontal: 20, 
    marginBottom: 0 
  },
  headerTopRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 20 
  },
  headerLeft: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  headerIconBadge: { 
    width: 60, 
    height: 60, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#667eea', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 8 
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#ffffff' 
  },
  headerSubtitle: { 
    fontSize: 13, 
    color: '#aaa', 
    fontWeight: '400' 
  },
  analyticsButton: { 
    marginTop: 8 
  },
  analyticsButtonGradient: { 
    width: 48, 
    height: 48, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#fa709a', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 6 
  },
  tabOuterContainer: {
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 4,
    borderRadius: 14,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabIndicator: {
    position: 'absolute',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    top: 4,
    left: 4,
  },
  tabIndicatorGradient: {
    width: '100%',
    height: '100%',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    zIndex: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#888',
    
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  tabContent: {
    flex: 1,
  },
  addButtonContainer: { 
    position: 'absolute', 
    bottom: 80, 
    right: 20, 
    shadowColor: '#fa709a', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.4, 
    shadowRadius: 12, 
    elevation: 10 
  },
  addButton: { 
    width: 64, 
    height: 64, 
    borderRadius: 32, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
});
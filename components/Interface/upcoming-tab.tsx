import { Plan, PlannerService } from '@/services/planner-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface UpcomingTabProps {
  plans: Plan[];
  loading: boolean;
  onToggleStatus: (plan: Plan) => void;
  onEditPlan: (plan: Plan) => void;
  onDeletePlan: (planId: string) => void;
  onCreatePlan: (date?: string) => void;
}

export default function UpcomingTab({
  plans,
  loading,
  onToggleStatus,
  onEditPlan,
  onDeletePlan,
  onCreatePlan,
}: UpcomingTabProps) {
  const [selectedDate, setSelectedDate] = useState<string>(moment().format('YYYY-MM-DD'));
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const dateSectionRefs = useRef<Map<string, number>>(new Map());
  const isScrollingFromHorizontal = useRef(false);

  const today = moment().format('YYYY-MM-DD');
  
  // Get the month name for the selected date
  const selectedMonth = moment(selectedDate).format('MMMM YYYY');
  
  // Calculate responsive dimensions
  const HORIZONTAL_PADDING = 20;
  const ITEM_GAP = 6;
  const AVAILABLE_WIDTH = SCREEN_WIDTH - (HORIZONTAL_PADDING * 2);
  const DATE_ITEM_WIDTH = (AVAILABLE_WIDTH - (ITEM_GAP * 6)) / 7; // 7 days with 6 gaps
  const WEEK_WIDTH = AVAILABLE_WIDTH;
  
  // Calculate week starting from Sunday
  const getWeekStart = (date: moment.Moment) => {
    return date.clone().startOf('week'); // Sunday
  };

  // Generate weeks (4-5 weeks worth of days, grouped by week)
  const weekGroups = useMemo(() => {
    const weeks: Array<Array<{
      dateString: string;
      day: string;
      dayName: string;
      isToday: boolean;
      isPastDate: boolean;
    }>> = [];
    
    let currentWeekStart = getWeekStart(moment());
    
    // Generate 5 weeks
    for (let weekIndex = 0; weekIndex < 5; weekIndex++) {
      const week = [];
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = currentWeekStart.clone().add(dayIndex, 'days');
        const dateString = date.format('YYYY-MM-DD');
        week.push({
          dateString,
          day: date.format('D'),
          dayName: date.format('ddd'),
          isToday: dateString === today,
          isPastDate: dateString < today,
        });
      }
      weeks.push(week);
      currentWeekStart.add(7, 'days');
    }
    
    return weeks;
  }, [today]);

  // Group plans by date
  const plansByDate = useMemo(() => {
    const map = new Map<string, Plan[]>();
    plans.forEach(plan => {
      if (plan.date >= today) {
        if (!map.has(plan.date)) {
          map.set(plan.date, []);
        }
        map.get(plan.date)!.push(plan);
      }
    });
    
    // Sort plans within each date
    map.forEach((datePlans) => {
      datePlans.sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'pending' ? -1 : 1;
        }
        return moment(`${a.date} ${a.time}`).diff(moment(`${b.date} ${b.time}`));
      });
    });
    
    return map;
  }, [plans, today]);

  // Create chronological list of dates with plans for vertical scroll
  const chronologicalDates = useMemo(() => {
    const dates: Array<{
      dateString: string;
      displayTitle: string;
      plans: Plan[];
      isToday: boolean;
      isTomorrow: boolean;
    }> = [];

    // Get all dates with plans, sorted
    const sortedDates = Array.from(plansByDate.keys()).sort();
    
    // Also include the next 30 days even if they don't have plans
    const futureDates = [];
    for (let i = 0; i < 30; i++) {
      futureDates.push(moment().add(i, 'days').format('YYYY-MM-DD'));
    }
    
    // Combine and deduplicate
    const allDates = Array.from(new Set([...futureDates, ...sortedDates])).sort();
    
    allDates.forEach(dateString => {
      const date = moment(dateString);
      const datePlans = plansByDate.get(dateString) || [];
      
      dates.push({
        dateString,
        displayTitle: dateString === today ? 'Today' : 
                     dateString === moment().add(1, 'day').format('YYYY-MM-DD') ? 'Tomorrow' :
                     date.format('ddd, MMM D'),
        plans: datePlans,
        isToday: dateString === today,
        isTomorrow: dateString === moment().add(1, 'day').format('YYYY-MM-DD'),
      });
    });
    
    return dates;
  }, [plansByDate, today]);

  // Helper function to scroll to date in horizontal scroll
  const scrollToDateInWeekView = useCallback((targetDate: string) => {
    setSelectedDate(targetDate);
    // Find which week contains this date
    const weekIndex = weekGroups.findIndex(week => 
      week.some(day => day.dateString === targetDate)
    );
    if (weekIndex !== -1 && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: weekIndex * WEEK_WIDTH,
        animated: true,
      });
    }
  }, [weekGroups, WEEK_WIDTH]);

  // Handle vertical scroll to update selected date
  const handleVerticalScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isScrollingFromHorizontal.current) {
      return;
    }

    const scrollY = event.nativeEvent.contentOffset.y;
    
    // Find which date section is currently most visible
    let closestDate = chronologicalDates[0]?.dateString;
    let minDistance = Infinity;

    dateSectionRefs.current.forEach((yPosition, dateString) => {
      const distance = Math.abs(scrollY - yPosition);
      if (distance < minDistance) {
        minDistance = distance;
        closestDate = dateString;
      }
    });

    if (closestDate && closestDate !== selectedDate) {
      setSelectedDate(closestDate);
      scrollToDateInWeekView(closestDate);
    }
  }, [chronologicalDates, selectedDate, scrollToDateInWeekView]);

  // Handle date selection from horizontal scroll
  const handleDateSelect = useCallback((dateString: string) => {
    setSelectedDate(dateString);
    
    // Scroll to the corresponding section in vertical scroll
    const yPosition = dateSectionRefs.current.get(dateString);
    if (yPosition !== undefined && verticalScrollRef.current) {
      isScrollingFromHorizontal.current = true;
      verticalScrollRef.current.scrollTo({
        y: yPosition - 20, // Offset for better visibility
        animated: true,
      });
      
      // Reset flag after animation completes
      setTimeout(() => {
        isScrollingFromHorizontal.current = false;
      }, 500);
    }
  }, []);

  // Measure date section positions
  const onDateSectionLayout = useCallback((dateString: string, y: number) => {
    dateSectionRefs.current.set(dateString, y);
  }, []);

  // Marked dates for calendar
  const markedDates = useMemo(() => {
    const marked: any = {};
    
    plansByDate.forEach((datePlans, date) => {
      const hasCompleted = datePlans.some(p => p.status === 'completed');
      const hasPending = datePlans.some(p => p.status === 'pending');
      
      marked[date] = {
        marked: true,
        dotColor: hasPending ? '#4facfe' : '#4ade80',
        selected: date === selectedDate,
        selectedColor: '#4facfe',
      };
    });
    
    if (selectedDate && !marked[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: '#4facfe',
      };
    }
    
    return marked;
  }, [plansByDate, selectedDate]);

  const PlanCard = React.memo(({ plan }: { plan: Plan }) => {
    const categoryColors = PlannerService.getCategoryColor(plan.category);
    const priorityColor = PlannerService.getPriorityColor(plan.priority);
    
    return (
      <TouchableOpacity
        onPress={() => onEditPlan(plan)}
        style={[
          styles.planCard,
          plan.status === 'completed' && styles.completedCard,
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
              <View style={styles.checkboxEmpty} />
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
              <Ionicons name="time-outline" size={14} color="#4facfe" />
              <Text style={styles.planTime}>{plan.time}</Text>
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
        <Text style={styles.loadingText}>Loading upcoming plans...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Calendar Toggle */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{selectedMonth}</Text>
        <TouchableOpacity
          onPress={() => setShowFullCalendar(!showFullCalendar)}
          style={styles.calendarToggleButton}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={showFullCalendar ? 'calendar' : 'calendar-outline'} 
            size={22} 
            color="#4facfe" 
          />
        </TouchableOpacity>
      </View>

      {/* Full Calendar View (Expanded) */}
      {showFullCalendar && (
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setShowFullCalendar(false);
              handleDateSelect(day.dateString);
            }}
            markedDates={markedDates}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'rgba(255, 255, 255, 0.05)',
              dayTextColor: '#fff',
              monthTextColor: '#fff',
              arrowColor: '#4facfe',
              textDisabledColor: '#666',
              todayTextColor: '#4facfe',
              selectedDayBackgroundColor: '#4facfe',
              selectedDayTextColor: '#fff',
            }}
            minDate={today}
          />
        </View>
      )}

      {/* Horizontal Date Scroll (Week View) */}
      {!showFullCalendar && (
        <View style={styles.dateScrollContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateScroll}
            pagingEnabled={true}
            snapToInterval={WEEK_WIDTH}
            snapToAlignment="start"
            decelerationRate="fast"
          >
            {weekGroups.map((week, weekIndex) => (
              <View 
                key={`week-${weekIndex}`} 
                style={[styles.weekContainer, { width: WEEK_WIDTH }]}
              >
                {week.map((day) => {
                  const isSelected = day.dateString === selectedDate;
                  const plansForDay = plansByDate.get(day.dateString) || [];
                  const hasPlans = plansForDay.length > 0;
                  const completedCount = plansForDay.filter(p => p.status === 'completed').length;
                  const allCompleted = hasPlans && completedCount === plansForDay.length;

                  return (
                    <TouchableOpacity
                      key={day.dateString}
                      onPress={() => handleDateSelect(day.dateString)}
                      style={[
                        styles.dateItem,
                        { width: DATE_ITEM_WIDTH },
                        isSelected && styles.dateItemSelected,
                        day.isToday && !isSelected && styles.dateItemToday,
                        day.isPastDate && styles.dateItemPast,
                      ]}
                      activeOpacity={0.7}
                      disabled={day.isPastDate}
                    >
                      <Text style={[
                        styles.dayName,
                        isSelected && styles.dayNameSelected,
                        day.isToday && !isSelected && styles.dayNameToday,
                        day.isPastDate && styles.dayNamePast,
                      ]}>
                        {day.dayName}
                      </Text>
                      <Text style={[
                        styles.dayNumber,
                        isSelected && styles.dayNumberSelected,
                        day.isToday && !isSelected && styles.dayNumberToday,
                        day.isPastDate && styles.dayNumberPast,
                      ]}>
                        {day.day}
                      </Text>
                      {hasPlans && !day.isPastDate && (
                        <View style={[
                          styles.planIndicator,
                          allCompleted && styles.planIndicatorCompleted,
                        ]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Chronological Plans List (Todoist-style) */}
      <ScrollView 
        ref={verticalScrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleVerticalScroll}
        scrollEventThrottle={16}
      >
        {chronologicalDates.map((dateGroup) => (
          <View 
            key={dateGroup.dateString} 
            style={styles.dateSection}
            onLayout={(event) => {
              const layout = event.nativeEvent.layout;
              onDateSectionLayout(dateGroup.dateString, layout.y);
            }}
          >
            {/* Date Header - Tappable */}
            <TouchableOpacity
              onPress={() => scrollToDateInWeekView(dateGroup.dateString)}
              activeOpacity={0.7}
            >
              <View style={styles.dateSectionHeader}>
                <View style={styles.dateSectionTitleContainer}>
                  <Text style={[
                    styles.dateSectionTitle,
                    (dateGroup.isToday || dateGroup.isTomorrow) && styles.dateSectionTitleHighlight,
                  ]}>
                    {dateGroup.displayTitle}
                  </Text>
                  <Text style={styles.dateSectionSubtitle}>
                    {!dateGroup.isToday && !dateGroup.isTomorrow && 
                      moment(dateGroup.dateString).format('MMMM D, YYYY')
                    }
                  </Text>
                </View>
                {dateGroup.plans.length > 0 && (
                  <Text style={styles.plansSectionCount}>
                    {dateGroup.plans.filter(p => p.status === 'completed').length}/{dateGroup.plans.length}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Plans for this date */}
            {dateGroup.plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </View>
        ))}

        {/* Overall Empty State */}
        {chronologicalDates.every(d => d.plans.length === 0) && (
          <View style={styles.overallEmptyState}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIcon}
            >
              <Ionicons name="calendar-outline" size={40} color="#fff" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Upcoming Plans</Text>
            <Text style={styles.emptySubtitle}>
              Start planning your future by adding your first plan!
            </Text>
            <TouchableOpacity
              onPress={() => onCreatePlan()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  calendarToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  calendarContainer: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateScrollContainer: {
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  dateScroll: {
    maxHeight: 90,
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dateItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dateItemSelected: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  dateItemToday: {
    borderColor: '#4facfe',
    borderWidth: 2,
  },
  dateItemPast: {
    opacity: 0.3,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayNameSelected: {
    color: '#fff',
  },
  dayNameToday: {
    color: '#4facfe',
  },
  dayNamePast: {
    color: '#666',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  dayNumberSelected: {
    color: '#fff',
  },
  dayNumberToday: {
    color: '#4facfe',
  },
  dayNumberPast: {
    color: '#666',
  },
  planIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4facfe',
    marginTop: 6,
  },
  planIndicatorCompleted: {
    backgroundColor: '#4ade80',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dateSectionTitleContainer: {
    flex: 1,
  },
  dateSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  dateSectionTitleHighlight: {
    color: '#4facfe',
  },
  dateSectionSubtitle: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  plansSectionCount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4facfe',
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyDateState: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyDateText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
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
  overallEmptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
    textAlign: 'center',
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
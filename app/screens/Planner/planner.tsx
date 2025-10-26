import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import moment from 'moment';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

const screenWidth = Dimensions.get('window').width;

export default function App() {
  const [selectedDate, setSelectedDate] = useState<string | null>(
    moment().format('YYYY-MM-DD')
  );
  const [plans, setPlans] = useState<{ [date: string]: { text: string; time: string }[] }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [planText, setPlanText] = useState('');
  const [planDate, setPlanDate] = useState(new Date());
  const [planTime, setPlanTime] = useState('');
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [displayedMonth, setDisplayedMonth] = useState(moment().format('MMMM YYYY'));
  const [baseWeek] = useState(moment().startOf('week'));
  const scrollRef = useRef<ScrollView>(null);
  const [weeksRange] = useState(52);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    (async () => {
      await Notifications.requestPermissionsAsync();
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      const stored = await AsyncStorage.getItem('plans');
      if (stored) setPlans(JSON.parse(stored));
    })();
  }, []);

  const savePlans = async (data: any) => {
    setPlans(data);
    await AsyncStorage.setItem('plans', JSON.stringify(data));
  };

  const addPlan = async () => {
    if (!planText || !planTime || !planDate) {
      Alert.alert('Missing information', 'Please fill out all fields.');
      return;
    }

    const dateKey = moment(planDate).format('YYYY-MM-DD');
    const newPlans = { ...plans };
    const newPlan = { text: planText, time: planTime };
    newPlans[dateKey] = [...(newPlans[dateKey] || []), newPlan].sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    await savePlans(newPlans);
    setModalVisible(false);
    setPlanText('');
    setPlanTime('');

    const [h, m] = planTime.split(':').map(Number);
    const fireAt = new Date(dateKey);
    fireAt.setHours(h, m, 0, 0);

    if (fireAt.getTime() > Date.now() + 3000) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📅 Reminder',
          body: `${planText} at ${planTime}`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        } as Notifications.DateTriggerInput,
      });
    }
  };

  const deletePlan = async (date: string, index: number) => {
    const updated = { ...plans };
    updated[date].splice(index, 1);
    if (updated[date].length === 0) delete updated[date];
    await savePlans(updated);
  };

  const getAllSortedPlans = () =>
    Object.entries(plans)
      .flatMap(([date, entries]) => entries.map((p) => ({ date, ...p })))
      .sort((a, b) =>
        moment(`${a.date} ${a.time}`).diff(moment(`${b.date} ${b.time}`))
      );

  const scrollToSelectedWeek = (dateString: string | null) => {
    if (!dateString) return;
    const diffWeeks = moment(dateString).startOf('week').diff(baseWeek, 'weeks');
    const targetOffset = diffWeeks * screenWidth;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: targetOffset, animated: true });
    }, 100);
  };

  const handlePlanTap = (date: string) => {
    setSelectedDate(date);
    setDisplayedMonth(moment(date).format('MMMM YYYY'));
    scrollToSelectedWeek(date);
  };

  const renderPlans = () => {
    if (!selectedDate) {
      const grouped = getAllSortedPlans().reduce((acc: any, plan) => {
        acc[plan.date] = acc[plan.date] || [];
        acc[plan.date].push(plan);
        return acc;
      }, {});

      const sortedDates = Object.keys(grouped).sort((a, b) =>
        moment(a).diff(moment(b))
      );

      if (sortedDates.length === 0) {
        return (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyIcon}
            >
              <Ionicons name="calendar-outline" size={50} color="#fff" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>No Plans Yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to create your first plan</Text>
          </View>
        );
      }

      return (
        <ScrollView contentContainerStyle={styles.plansContainer}>
          {sortedDates.map((date) => (
            <View key={date} style={styles.dateSection}>
              <View style={styles.dateHeaderContainer}>
                <Ionicons name="calendar" size={18} color="#4facfe" />
                <Text style={styles.dateHeaderText}>
                  {moment(date).format('MMMM D, YYYY')}
                </Text>
              </View>
              {grouped[date].map((item: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handlePlanTap(item.date)}
                  style={styles.glassPlanCard}
                  activeOpacity={0.7}
                >
                  <View style={styles.planCardContent}>
                    <LinearGradient
                      colors={['#4facfe', '#00f2fe']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.planIconBadge}
                    >
                      <Ionicons name="time" size={20} color="#fff" />
                    </LinearGradient>
                    <View style={styles.planTextContainer}>
                      <Text style={styles.planTime}>{item.time}</Text>
                      <Text style={styles.planDescription}>{item.text}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        deletePlan(item.date, plans[item.date].indexOf(item))
                      }
                      style={styles.deleteButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      );
    }

    const dayPlans = plans[selectedDate] || [];
    if (dayPlans.length === 0) {
      return (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyIcon}
          >
            <Ionicons name="calendar-clear-outline" size={50} color="#fff" />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Plans Today</Text>
          <Text style={styles.emptySubtitle}>Add a plan to get started</Text>
        </View>
      );
    }

    return (
      <ScrollView contentContainerStyle={styles.plansContainer}>
        {dayPlans.map((item, idx) => (
          <View key={idx} style={styles.glassPlanCard}>
            <View style={styles.planCardContent}>
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.planIconBadge}
              >
                <Ionicons name="time" size={20} color="#fff" />
              </LinearGradient>
              <View style={styles.planTextContainer}>
                <Text style={styles.planTime}>{item.time}</Text>
                <Text style={styles.planDescription}>{item.text}</Text>
              </View>
              <TouchableOpacity
                onPress={() => deletePlan(selectedDate, idx)}
                style={styles.deleteButton}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  const getWeekDays = (start: moment.Moment) =>
    Array.from({ length: 7 }, (_, i) => start.clone().add(i, 'days'));

  const handleWeekScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const weekIndex = Math.round(offsetX / screenWidth);
    const newStart = baseWeek.clone().add(weekIndex, 'weeks');
    setDisplayedMonth(newStart.format('MMMM YYYY'));
  };

  const renderWeekView = () => (
    <View style={styles.weekWrapper}>
      <ScrollView
        horizontal
        pagingEnabled
        ref={scrollRef}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleWeekScroll}
        contentContainerStyle={styles.weekContainer}
      >
        {Array.from({ length: weeksRange }).map((_, index) => {
          const start = baseWeek.clone().add(index, 'weeks');
          const days = getWeekDays(start);
          return (
            <View key={index} style={styles.weekRow}>
              {days.map((d) => {
                const day = d.format('YYYY-MM-DD');
                const isSelected = day === selectedDate;
                const hasPlans = !!plans[day];
                const isToday = day === moment().format('YYYY-MM-DD');
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayCell]}
                    onPress={() => {
                      if (selectedDate === day) {
                        setSelectedDate(null);
                      } else {
                        setSelectedDate(day);
                        setDisplayedMonth(d.format('MMMM YYYY'));
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={['#4facfe', '#00f2fe']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.selectedDayGradient}
                      >
                        <Text style={styles.dayName}>{d.format('ddd')}</Text>
                        <Text style={styles.dayNumberSelected}>{d.format('D')}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.dayCellInner, isToday && styles.todayCell]}>
                        <Text style={[styles.dayName, isToday && styles.todayText]}>
                          {d.format('ddd')}
                        </Text>
                        <Text style={[styles.dayNumber, isToday && styles.todayText]}>
                          {d.format('D')}
                        </Text>
                      </View>
                    )}
                    {hasPlans && <View style={styles.planDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );

  useEffect(() => {
    scrollToSelectedWeek(selectedDate);
  }, []);

  return (
    <LinearGradient colors={['#0A1C3C', '#324762']} style={styles.container}>
      <Animated.View
        style={[
          styles.headerContainer,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerIconBadge}
        >
          <Ionicons name="calendar" size={40} color="#fff" />
        </LinearGradient>
        <Text style={styles.headerTitle}>My Planner</Text>
        <Text style={styles.headerSubtitle}>Plan your perfect day</Text>
      </Animated.View>

      <View style={styles.monthSelectorContainer}>
        <TouchableOpacity
          onPress={() => setShowFullCalendar(!showFullCalendar)}
          style={styles.monthSelector}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={20} color="#4facfe" />
          <Text style={styles.monthText}>{displayedMonth}</Text>
          <Ionicons
            name={showFullCalendar ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#aaa"
          />
        </TouchableOpacity>
      </View>

      {showFullCalendar ? (
        <View style={styles.calendarContainer}>
          <Calendar
            onDayPress={(d) => {
              if (selectedDate === d.dateString) {
                setSelectedDate(null);
              } else {
                setSelectedDate(d.dateString);
                setDisplayedMonth(moment(d.dateString).format('MMMM YYYY'));
                scrollToSelectedWeek(d.dateString);
              }
              setShowFullCalendar(false);
            }}
            markedDates={
              selectedDate
                ? { [selectedDate]: { selected: true, selectedColor: '#4facfe' } }
                : {}
            }
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'rgba(255, 255, 255, 0.05)',
              dayTextColor: '#fff',
              monthTextColor: '#fff',
              arrowColor: '#4facfe',
              textDisabledColor: '#666',
              todayTextColor: '#4facfe',
            }}
          />
        </View>
      ) : (
        renderWeekView()
      )}

      <View style={styles.plansSectionHeader}>
        <Ionicons name="list" size={20} color="#4facfe" />
        <Text style={styles.plansSectionTitle}>
          {selectedDate ? `${moment(selectedDate).format('MMM D')} Plans` : 'All Plans'}
        </Text>
        {selectedDate && (
          <TouchableOpacity
            onPress={() => setSelectedDate(null)}
            style={styles.viewAllButton}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="arrow-forward" size={16} color="#4facfe" />
          </TouchableOpacity>
        )}
      </View>

      <View style={{ flex: 1 }}>{renderPlans()}</View>

      <TouchableOpacity
        style={styles.addButtonContainer}
        onPress={() => {
          setPlanText('');
          setPlanTime('');
          setPlanDate(selectedDate ? new Date(selectedDate) : new Date());
          setModalVisible(true);
        }}
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

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
            ]}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeader}
            >
              <Ionicons name="create" size={32} color="#fff" />
              <Text style={styles.modalTitle}>Create Plan</Text>
            </LinearGradient>

            <View style={styles.modalBody}>
              <View style={styles.inputContainer}>
                <Ionicons name="document-text-outline" size={22} color="#aaa" />
                <TextInput
                  placeholder="What's the plan?"
                  placeholderTextColor="#888"
                  style={styles.input}
                  value={planText}
                  onChangeText={setPlanText}
                />
              </View>

              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setDatePickerVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={22} color="#aaa" />
                <Text style={styles.inputText}>
                  {moment(planDate).format('MMMM D, YYYY')}
                </Text>
              </TouchableOpacity>

              {datePickerVisible && (
                <DateTimePicker
                  value={planDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, d) => {
                    setDatePickerVisible(false);
                    if (d) setPlanDate(d);
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setTimePickerVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={22} color="#aaa" />
                <Text style={styles.inputText}>
                  {planTime || 'Select time'}
                </Text>
              </TouchableOpacity>

              {timePickerVisible && (
                <DateTimePicker
                  value={planDate}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, t) => {
                    setTimePickerVisible(false);
                    if (t) {
                      const h = t.getHours().toString().padStart(2, '0');
                      const m = t.getMinutes().toString().padStart(2, '0');
                      setPlanTime(`${h}:${m}`);
                    }
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.saveButtonContainer}
                onPress={addPlan}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4facfe', '#00f2fe']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButton}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.saveText}>Save Plan</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.cancelButton}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#aaa',
    fontWeight: '400',
  },
  monthSelectorContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 10,
  },
  monthText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
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
  weekWrapper: {
    height: 100,
    marginBottom: 20,
  },
  weekContainer: {
    paddingVertical: 0,
  },
  weekRow: {
    width: screenWidth,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 75,
  },
  dayCellInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  todayCell: {
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  selectedDayGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  dayName: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  todayText: {
    color: '#4facfe',
    fontWeight: '600',
  },
  dayNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  dayNumberSelected: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  planDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fa709a',
    position: 'absolute',
    bottom: 8,
  },
  plansSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  plansSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4facfe',
    fontWeight: '500',
  },
  plansContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dateHeaderText: {
    color: '#4facfe',
    fontSize: 15,
    fontWeight: '600',
  },
  glassPlanCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  planCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planTextContainer: {
    flex: 1,
  },
  planTime: {
    color: '#4facfe',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  planDescription: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '400',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#aaa',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    shadowColor: '#fa709a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '400',
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '400',
  },
  saveButtonContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
});
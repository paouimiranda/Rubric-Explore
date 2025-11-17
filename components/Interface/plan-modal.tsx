import { usePushNotification } from '@/app/contexts/PushNotificationContext';
import { Plan, PlannerService } from '@/services/planner-service';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PlanModalProps {
  visible: boolean;
  editingPlan: Plan | null;
  initialDate?: string;
  onClose: () => void;
  onSave: () => void;
}

export default function PlanModal({
  visible,
  editingPlan,
  initialDate,
  onClose,
  onSave,
}: PlanModalProps) {
  // Form states
  const [planTitle, setPlanTitle] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planDate, setPlanDate] = useState(new Date());
  const [planTime, setPlanTime] = useState('');
  const [planCategory, setPlanCategory] = useState<Plan['category']>('personal');
  const [planPriority, setPlanPriority] = useState<Plan['priority']>('medium');
  const [reminderMinutes, setReminderMinutes] = useState(15);
  
  // Picker states
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [priorityPickerVisible, setPriorityPickerVisible] = useState(false);
  const [reminderPickerVisible, setReminderPickerVisible] = useState(false);
  
  // Validation states
  const [errors, setErrors] = useState({ title: false, time: false });
  const [isSaving, setIsSaving] = useState(false);
  
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = React.useRef(new Animated.Value(0)).current;

  const { hasPermission, requestPermission, isRequestingPermission } = usePushNotification();

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (editingPlan) {
        setPlanTitle(editingPlan.title);
        setPlanDescription(editingPlan.description || '');
        setPlanDate(new Date(editingPlan.date));
        setPlanTime(editingPlan.time);
        setPlanCategory(editingPlan.category);
        setPlanPriority(editingPlan.priority);
        setReminderMinutes(editingPlan.reminderMinutes ?? 15);
      } else {
        resetForm();
        // If initialDate is provided, set it as the default date
        if (initialDate) {
          setPlanDate(new Date(initialDate));
        }
      }
      setErrors({ title: false, time: false });
    }
  }, [visible, editingPlan, initialDate]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);
    });
  };

  const resetForm = () => {
    setPlanTitle('');
    setPlanDescription('');
    setPlanDate(new Date());
    setPlanTime('');
    setPlanCategory('personal');
    setPlanPriority('medium');
    setReminderMinutes(15);
  };

  const validateForm = () => {
    const newErrors = {
      title: !planTitle.trim(),
      time: !planTime,
    };
    setErrors(newErrors);
    return !newErrors.title && !newErrors.time;
  };

  const savePlanWithoutPermission = async () => {
    setIsSaving(true);
    try {
      const planData = {
        title: planTitle,
        description: planDescription,
        date: moment(planDate).format('YYYY-MM-DD'),
        time: planTime,
        category: planCategory,
        priority: planPriority,
        tags: [],
        status: 'pending' as const,
        isPublic: false,
        reminderMinutes,
      };

      if (editingPlan) {
        await PlannerService.updatePlan(editingPlan.id!, planData);
      } else {
        await PlannerService.createPlan(planData);
      }

      handleClose();
      setTimeout(() => onSave(), 300);
    } catch (error) {
      console.error('Error saving plan:', error);
      Alert.alert('Error', 'Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  const savePlan = async () => {
    if (!validateForm()) {
      Alert.alert('Missing Information', 'Please fill out all required fields (*)');
      return;
    }

    // Check notification permission before saving
    if (!hasPermission && !isRequestingPermission) {
      Alert.alert(
        'Enable Notifications?',
        'Would you like to receive reminders for your plans?',
        [
          { text: 'Not Now', style: 'cancel', onPress: () => savePlanWithoutPermission() },
          { text: 'Enable', onPress: async () => {
            const granted = await requestPermission();
            if (granted) {
              savePlanWithoutPermission();
            }
          }},
        ]
      );
      return;
    }

    savePlanWithoutPermission();
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      work: 'briefcase',
      personal: 'person',
      health: 'fitness',
      education: 'school',
      other: 'apps',
    };
    return icons[category] || 'folder';
  };

  const getPriorityIcon = (priority: string) => {
    const icons: Record<string, string> = {
      low: 'flag-outline',
      medium: 'flag',
      high: 'flame',
    };
    return icons[priority] || 'flag';
  };

  const getReminderIcon = (minutes: number) => {
    if (minutes === 0) return 'notifications-off';
    if (minutes <= 5) return 'alarm';
    if (minutes <= 15) return 'notifications';
    return 'notifications-circle';
  };

  const getReminderLabel = (minutes: number) => {
    if (minutes === 0) return 'At plan time';
    if (minutes < 60) return `${minutes} min before`;
    const hours = Math.floor(minutes / 60);
    return hours === 1 ? '1 hour before' : `${hours} hours before`;
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        {/* Backdrop */}
        <Animated.View 
          style={[
            styles.backdrop,
            { opacity: backdropAnim }
          ]}
        >
          <TouchableOpacity 
            style={StyleSheet.absoluteFill}
            activeOpacity={1} 
            onPress={handleClose}
          />
        </Animated.View>
        
        {/* Sliding Content */}
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Drag Indicator */}
          <View style={styles.dragIndicatorContainer}>
            <View style={styles.dragIndicator} />
          </View>

          {/* Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeader}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                {editingPlan && (
                  <View style={styles.headerIconContainer}>
                    <Ionicons name="create-outline" size={24} color="#fff" />
                  </View>
                )}
                <View>
                  <Text style={styles.modalTitle}>
                    {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {editingPlan ? 'Update your plan details' : 'Fill in the details below'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={handleClose} 
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView 
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Title Section */}
            <View style={styles.section}>
              <View style={styles.labelContainer}>
                <Ionicons name="document-text" size={16} color="#4facfe" />
                <Text style={styles.sectionLabel}>
                  Title <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <View style={[
                styles.inputContainer, 
                errors.title && styles.inputError
              ]}>
                <TextInput
                  placeholder="What do you want to do?"
                  placeholderTextColor="#666"
                  style={styles.input}
                  value={planTitle}
                  onChangeText={(text) => {
                    setPlanTitle(text);
                    if (text.trim()) setErrors(prev => ({ ...prev, title: false }));
                  }}
                />
              </View>
              {errors.title && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#ff6b6b" />
                  <Text style={styles.errorText}>Title is required</Text>
                </View>
              )}
            </View>

            {/* Description Section */}
            <View style={styles.section}>
              <View style={styles.labelContainer}>
                <Ionicons name="list" size={16} color="#4facfe" />
                <Text style={styles.sectionLabel}>Description</Text>
              </View>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <TextInput
                  placeholder="Add more details..."
                  placeholderTextColor="#666"
                  style={[styles.input, styles.textArea]}
                  value={planDescription}
                  onChangeText={setPlanDescription}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>
              <Text style={styles.charCount}>
                {planDescription.length}/500 characters
              </Text>
            </View>

            {/* Date & Time Section */}
            <View style={styles.section}>
              <View style={styles.labelContainer}>
                <Ionicons name="time" size={16} color="#4facfe" />
                <Text style={styles.sectionLabel}>
                  When <Text style={styles.required}>*</Text>
                </Text>
              </View>
              <View style={styles.rowContainer}>
                <TouchableOpacity
                  style={[styles.inputContainer, styles.halfWidth]}
                  onPress={() => setDatePickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar-outline" size={20} color="#4facfe" />
                  <Text style={styles.inputText}>
                    {moment(planDate).format('MMM DD, YYYY')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.inputContainer, 
                    styles.halfWidth,
                    errors.time && styles.inputError
                  ]}
                  onPress={() => setTimePickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={20} color="#4facfe" />
                  <Text style={[
                    styles.inputText,
                    !planTime && styles.placeholderText
                  ]}>
                    {planTime || 'Set time'}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.time && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={14} color="#ff6b6b" />
                  <Text style={styles.errorText}>Time is required</Text>
                </View>
              )}
            </View>

            {datePickerVisible && (
              <DateTimePicker
                value={planDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, d) => {
                  setDatePickerVisible(false);
                  if (d) setPlanDate(d);
                }}
                minimumDate={new Date()}
              />
            )}

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
                    setErrors(prev => ({ ...prev, time: false }));
                  }
                }}
              />
            )}

            {/* Category & Priority Row */}
            <View style={styles.rowContainer}>
              {/* Category Section */}
              <View style={[styles.section, styles.halfWidth, styles.noMargin]}>
                <View style={styles.labelContainer}>
                  <Ionicons name="apps" size={16} color="#4facfe" />
                  <Text style={styles.sectionLabel}>Category</Text>
                </View>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setCategoryPickerVisible(!categoryPickerVisible)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={PlannerService.getCategoryColor(planCategory) as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.categoryIconContainer}
                  >
                    <Ionicons 
                      name={getCategoryIcon(planCategory) as any} 
                      size={16} 
                      color="#fff" 
                    />
                  </LinearGradient>
                  <Text style={styles.inputTextCompact} numberOfLines={1}>
                    {planCategory.charAt(0).toUpperCase() + planCategory.slice(1)}
                  </Text>
                  <Ionicons 
                    name={categoryPickerVisible ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color="#aaa" 
                  />
                </TouchableOpacity>
              </View>

              {/* Priority Section */}
              <View style={[styles.section, styles.halfWidth, styles.noMargin]}>
                <View style={styles.labelContainer}>
                  <Ionicons name="flag" size={16} color="#4facfe" />
                  <Text style={styles.sectionLabel}>Priority</Text>
                </View>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setPriorityPickerVisible(!priorityPickerVisible)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.priorityIndicator,
                    { backgroundColor: PlannerService.getPriorityColor(planPriority) }
                  ]}>
                    <Ionicons 
                      name={getPriorityIcon(planPriority) as any} 
                      size={14} 
                      color="#fff" 
                    />
                  </View>
                  <Text style={styles.inputTextCompact} numberOfLines={1}>
                    {planPriority.charAt(0).toUpperCase() + planPriority.slice(1)}
                  </Text>
                  <Ionicons 
                    name={priorityPickerVisible ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color="#aaa" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Category Picker */}
            {categoryPickerVisible && (
              <View style={[styles.pickerContainer, styles.fullWidth]}>
                {(['work', 'personal', 'health', 'education', 'other'] as const).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.pickerOption,
                      planCategory === cat && styles.pickerOptionSelected
                    ]}
                    onPress={() => {
                      setPlanCategory(cat);
                      setCategoryPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={PlannerService.getCategoryColor(cat) as any}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.pickerIconBadge}
                    >
                      <Ionicons 
                        name={getCategoryIcon(cat) as any} 
                        size={16} 
                        color="#fff" 
                      />
                    </LinearGradient>
                    <Text style={styles.pickerText}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                    {planCategory === cat && (
                      <Ionicons name="checkmark-circle" size={20} color="#4facfe" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Priority Picker */}
            {priorityPickerVisible && (
              <View style={[styles.pickerContainer, styles.fullWidth]}>
                {(['low', 'medium', 'high'] as const).map((pri) => (
                  <TouchableOpacity
                    key={pri}
                    style={[
                      styles.pickerOption,
                      planPriority === pri && styles.pickerOptionSelected
                    ]}
                    onPress={() => {
                      setPlanPriority(pri);
                      setPriorityPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.priorityColorBadge,
                      { backgroundColor: PlannerService.getPriorityColor(pri) }
                    ]}>
                      <Ionicons 
                        name={getPriorityIcon(pri) as any} 
                        size={16} 
                        color="#fff" 
                      />
                    </View>
                    <Text style={styles.pickerText}>
                      {pri.charAt(0).toUpperCase() + pri.slice(1)} Priority
                    </Text>
                    {planPriority === pri && (
                      <Ionicons name="checkmark-circle" size={20} color="#4facfe" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Reminder Settings Section */}
            <View style={styles.section}>
              <View style={styles.labelContainer}>
                <Ionicons name="notifications" size={16} color="#4facfe" />
                <Text style={styles.sectionLabel}>Reminder</Text>
                {!hasPermission && (
                  <View style={styles.permissionBadge}>
                    <Ionicons name="alert-circle" size={12} color="#fbbf24" />
                    <Text style={styles.permissionBadgeText}>Disabled</Text>
                  </View>
                )}
              </View>
              
              <TouchableOpacity
                style={[
                  styles.inputContainer,
                  !hasPermission && styles.inputDisabled
                ]}
                onPress={() => {
                  if (!hasPermission) {
                    Alert.alert(
                      'Notifications Disabled',
                      'Enable notifications to receive reminders for your plans.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Enable', 
                          onPress: async () => {
                            await requestPermission();
                          }
                        },
                      ]
                    );
                  } else {
                    setReminderPickerVisible(!reminderPickerVisible);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.reminderIconContainer,
                  { backgroundColor: hasPermission ? '#4facfe15' : '#66666615' }
                ]}>
                  <Ionicons 
                    name={getReminderIcon(reminderMinutes) as any} 
                    size={18} 
                    color={hasPermission ? '#4facfe' : '#666'} 
                  />
                </View>
                <Text style={[
                  styles.inputText,
                  !hasPermission && styles.inputTextDisabled
                ]}>
                  {getReminderLabel(reminderMinutes)}
                </Text>
                <Ionicons 
                  name={reminderPickerVisible ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color="#aaa" 
                />
              </TouchableOpacity>
              
              {!hasPermission && (
                <TouchableOpacity 
                  style={styles.enableNotificationsButton}
                  onPress={requestPermission}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={16} color="#4facfe" />
                  <Text style={styles.enableNotificationsText}>
                    Enable Notifications
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Reminder Picker */}
            {reminderPickerVisible && hasPermission && (
              <View style={[styles.pickerContainer, styles.fullWidth]}>
                {[
                  { minutes: 0, label: 'At plan time', icon: 'notifications-off' },
                  { minutes: 5, label: '5 minutes before', icon: 'alarm' },
                  { minutes: 15, label: '15 minutes before', icon: 'notifications' },
                  { minutes: 30, label: '30 minutes before', icon: 'notifications' },
                  { minutes: 60, label: '1 hour before', icon: 'notifications-circle' },
                  { minutes: 120, label: '2 hours before', icon: 'notifications-circle' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.minutes}
                    style={[
                      styles.pickerOption,
                      reminderMinutes === option.minutes && styles.pickerOptionSelected
                    ]}
                    onPress={() => {
                      setReminderMinutes(option.minutes);
                      setReminderPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.reminderOptionIcon}>
                      <Ionicons 
                        name={option.icon as any} 
                        size={18} 
                        color={reminderMinutes === option.minutes ? '#4facfe' : '#aaa'} 
                      />
                    </View>
                    <Text style={styles.pickerText}>
                      {option.label}
                    </Text>
                    {reminderMinutes === option.minutes && (
                      <Ionicons name="checkmark-circle" size={20} color="#4facfe" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Bottom Spacing for Safe Area */}
            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Fixed Bottom Action Buttons */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[styles.cancelButton, { marginRight: 12 }]}
              onPress={handleClose}
              activeOpacity={0.7}
              disabled={isSaving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButtonContainer}
              onPress={savePlan}
              activeOpacity={0.8}
              disabled={isSaving}
            >
              <LinearGradient
                colors={isSaving ? ['#666', '#888'] : ['#4facfe', '#00f2fe']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveButton}
              >
                <Ionicons 
                  name={isSaving ? "hourglass-outline" : "checkmark-circle"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.saveText}>
                  {isSaving ? 'Saving...' : (editingPlan ? 'Update' : 'Create')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: { 
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.92,
    backgroundColor: '#1a2744',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  dragIndicatorContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  modalHeader: { 
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: '#fff',
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  modalBody: { 
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  section: {
    marginBottom: 20,
  },
  noMargin: {
    marginBottom: 0,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: '#ff6b6b',
  },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.06)', 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 13, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 255, 255, 0.08)', 
    gap: 10,
  },
  inputError: {
    borderColor: 'rgba(255, 107, 107, 0.5)',
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  textAreaContainer: { 
    alignItems: 'flex-start',
    minHeight: 100,
    paddingTop: 13,
  },
  input: { 
    flex: 1, 
    fontSize: 15, 
    color: '#fff', 
    fontWeight: '400',
  },
  textArea: { 
    minHeight: 80, 
    textAlignVertical: 'top',
  },
  inputText: { 
    flex: 1, 
    fontSize: 15, 
    color: '#fff', 
    fontWeight: '500',
  },
  inputTextCompact: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#666',
    fontWeight: '400',
  },
  charCount: {
    fontSize: 11,
    color: '#666',
    textAlign: 'right',
    marginTop: 6,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginLeft: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#ff6b6b',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  fullWidth: {
    marginTop: 12,
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityIndicator: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: { 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    borderRadius: 12, 
    padding: 4, 
    marginBottom: 12,
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pickerOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 12, 
    borderRadius: 8, 
    gap: 12,
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(79, 172, 254, 0.12)',
  },
  pickerIconBadge: { 
    width: 32, 
    height: 32, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  priorityColorBadge: { 
    width: 32, 
    height: 32, 
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: { 
    flex: 1, 
    fontSize: 14, 
    color: '#fff', 
    fontWeight: '500',
  },
  bottomBar: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: '#1a2744',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  saveButtonContainer: { 
    flex: 2,
  },
  saveButton: { 
    height: 52, 
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
    flex: 1,
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelText: { 
    color: '#aaa', 
    fontSize: 15, 
    fontWeight: '600',
  },
  permissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  permissionBadgeText: {
    fontSize: 10,
    color: '#fbbf24',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  inputTextDisabled: {
    color: '#666',
  },
  reminderIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enableNotificationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  enableNotificationsText: {
    fontSize: 13,
    color: '#4facfe',
    fontWeight: '600',
  },
});
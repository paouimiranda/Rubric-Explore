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
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [customReminderInput, setCustomReminderInput] = useState('');
  
  // Picker states
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [priorityPickerVisible, setPriorityPickerVisible] = useState(false);
  const [reminderPickerVisible, setReminderPickerVisible] = useState(false);
  const [showCustomReminderInput, setShowCustomReminderInput] = useState(false);
  
  // Validation states
  const [errors, setErrors] = useState({ title: false, time: false, reminder: false });
  const [isSaving, setIsSaving] = useState(false);
  
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  const { hasPermission, requestPermission, isRequestingPermission } = usePushNotification();

  useEffect(() => {
    if (visible) {
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
        if (initialDate) {
          setPlanDate(new Date(initialDate));
        }
      }
      setErrors({ title: false, time: false, reminder: false });
    }
  }, [visible, editingPlan, initialDate]);

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const resetForm = () => {
    setPlanTitle('');
    setPlanDescription('');
    setPlanDate(new Date());
    setPlanTime('');
    setPlanCategory('personal');
    setPlanPriority('medium');
    setReminderMinutes(15);
    setCustomReminderInput('');
    setShowCustomReminderInput(false);
  };

  const validateReminderTime = () => {
    if (!planTime) return true;

    const [hours, minutes] = planTime.split(':').map(Number);
    const planDateTime = new Date(planDate);
    planDateTime.setHours(hours, minutes, 0, 0);
    
    const reminderTime = new Date(planDateTime.getTime() - reminderMinutes * 60000);
    const now = new Date();
    
    if (reminderTime <= now) {
      setErrors(prev => ({ ...prev, reminder: true }));
      Alert.alert(
        'Invalid Reminder Time',
        'The reminder time would be in the past. Please choose a later plan time or a shorter reminder duration.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    setErrors(prev => ({ ...prev, reminder: false }));
    return true;
  };

  const validateForm = () => {
    const newErrors = {
      title: !planTitle.trim(),
      time: !planTime,
      reminder: false,
    };
    setErrors(newErrors);
    
    if (newErrors.title || newErrors.time) {
      shakeError();
      return false;
    }
    
    return validateReminderTime();
  };

  const savePlanWithoutPermission = async () => {
    if (!validateForm()) {
      Alert.alert('Missing Information', 'Please fill out all required fields (*)');
      return;
    }

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
      return;
    }

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

  const handleCustomReminderSubmit = () => {
    const minutes = parseInt(customReminderInput);
    if (isNaN(minutes) || minutes < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of minutes (0 or greater)');
      return;
    }
    if (minutes > 10080) {
      Alert.alert('Invalid Input', 'Reminder cannot be more than 7 days (10,080 minutes) before the plan');
      return;
    }
    setReminderMinutes(minutes);
    setShowCustomReminderInput(false);
    setReminderPickerVisible(false);
    setCustomReminderInput('');
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
    if (minutes === 0) return 'notifications-off-outline';
    if (minutes <= 5) return 'alarm-outline';
    if (minutes <= 15) return 'notifications-outline';
    return 'time-outline';
  };

  const getReminderLabel = (minutes: number) => {
    if (minutes === 0) return 'No reminder';
    if (minutes < 60) return `${minutes} min before`;
    if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      return hours === 1 ? '1 hour before' : `${hours} hours before`;
    }
    const days = Math.floor(minutes / 1440);
    return days === 1 ? '1 day before' : `${days} days before`;
  };

  if (!visible) return null;

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        {/* Backdrop */}
        <TouchableOpacity 
          style={StyleSheet.absoluteFill}
          activeOpacity={1} 
          onPress={() => {
            Keyboard.dismiss();
            handleClose();
          }}
        />
        
        {/* Content */}
        <View style={styles.modalContent}>
          <View style={styles.keyboardView}>
            {/* Compact Header */}
            <View style={styles.compactHeader}>
              <View style={styles.dragIndicator} />
              <View style={styles.headerRow}>
                <View style={styles.headerTitleContainer}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerIconBadge}
                  >
                    <Ionicons 
                      name={editingPlan ? "create-outline" : "add-circle-outline"} 
                      size={20} 
                      color="#fff" 
                    />
                  </LinearGradient>
                  <View>
                    <Text style={styles.compactTitle}>
                      {editingPlan ? 'Edit Plan' : 'New Plan'}
                    </Text>
                    <Text style={styles.compactSubtitle}>
                      {moment(planDate).format('MMM DD, YYYY')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#aaa" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* Title Input Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="text-outline" size={18} color="#4facfe" />
                  <Text style={styles.cardTitle}>What's the plan?</Text>
                  <Text style={styles.requiredDot}>*</Text>
                </View>
                <TextInput
                  placeholder="Enter plan title..."
                  placeholderTextColor="#555"
                  style={[styles.titleInput, errors.title && styles.inputError]}
                  value={planTitle}
                  onChangeText={(text) => {
                    setPlanTitle(text);
                    if (text.trim()) setErrors(prev => ({ ...prev, title: false }));
                  }}
                  maxLength={100}
                  autoCorrect={false}
                  multiline
                  numberOfLines={2}
                  scrollEnabled={false}
                  textAlignVertical="top"
                />
                {errors.title && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={14} color="#ff6b6b" />
                    <Text style={styles.errorText}>Title is required</Text>
                  </View>
                )}
              </View>

              {/* Description Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="document-text-outline" size={18} color="#4facfe" />
                  <Text style={styles.cardTitle}>Description</Text>
                  <Text style={styles.optionalBadge}>Optional</Text>
                </View>
                <TextInput
                  placeholder="Add details about your plan..."
                  placeholderTextColor="#555"
                  style={styles.descriptionInput}
                  value={planDescription}
                  onChangeText={setPlanDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.charCounter}>
                  {planDescription.length}/500
                </Text>
              </View>

              {/* Date & Time Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="calendar-outline" size={18} color="#4facfe" />
                  <Text style={styles.cardTitle}>Date & Time</Text>
                  <Text style={styles.requiredDot}>*</Text>
                </View>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setDatePickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="calendar" size={20} color="#fff" />
                    <View style={styles.dateTimeTextContainer}>
                      <Text style={styles.dateTimeLabel}>Date</Text>
                      <Text style={styles.dateTimeValue}>
                        {moment(planDate).format('MMM DD')}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dateTimeButton, errors.time && styles.inputError]}
                    onPress={() => setTimePickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="time" size={20} color="#fff" />
                    <View style={styles.dateTimeTextContainer}>
                      <Text style={styles.dateTimeLabel}>Time</Text>
                      <Text style={[
                        styles.dateTimeValue,
                        !planTime && styles.placeholderValue
                      ]}>
                        {planTime || 'Set time'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
                {errors.time && (
                  <View style={styles.errorRow}>
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

              {/* Category & Priority Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="options-outline" size={18} color="#4facfe" />
                  <Text style={styles.cardTitle}>OTHERS</Text>
                </View>
                <View style={styles.optionsRow}>
                  {/* Category */}
                  <View style={styles.optionContainer}>
                    <Text style={styles.optionLabel}>Category</Text>
                    <TouchableOpacity
                      style={styles.optionButton}
                      onPress={() => setCategoryPickerVisible(!categoryPickerVisible)}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={PlannerService.getCategoryColor(planCategory) as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.optionIconBadge}
                      >
                        <Ionicons 
                          name={getCategoryIcon(planCategory) as any} 
                          size={16} 
                          color="#fff" 
                        />
                      </LinearGradient>
                      <Text style={styles.optionText} numberOfLines={1}>
                        {planCategory.charAt(0).toUpperCase() + planCategory.slice(1)}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>

                  {/* Priority */}
                  <View style={styles.optionContainer}>
                    <Text style={styles.optionLabel}>Priority</Text>
                    <TouchableOpacity
                      style={styles.optionButton}
                      onPress={() => setPriorityPickerVisible(!priorityPickerVisible)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.optionIconBadge,
                        { backgroundColor: PlannerService.getPriorityColor(planPriority) }
                      ]}>
                        <Ionicons 
                          name={getPriorityIcon(planPriority) as any} 
                          size={16} 
                          color="#fff" 
                        />
                      </View>
                      <Text style={styles.optionText} numberOfLines={1}>
                        {planPriority.charAt(0).toUpperCase() + planPriority.slice(1)}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Category Picker */}
                {categoryPickerVisible && (
                  <View style={styles.pickerDropdown}>
                    {(['work', 'personal', 'health', 'education', 'other'] as const).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.pickerItem,
                          planCategory === cat && styles.pickerItemSelected
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
                          style={styles.pickerItemIcon}
                        >
                          <Ionicons 
                            name={getCategoryIcon(cat) as any} 
                            size={16} 
                            color="#fff" 
                          />
                        </LinearGradient>
                        <Text style={styles.pickerItemText}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </Text>
                        {planCategory === cat && (
                          <Ionicons name="checkmark" size={20} color="#4facfe" style={styles.checkmark} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Priority Picker */}
                {priorityPickerVisible && (
                  <View style={styles.pickerDropdown}>
                    {(['low', 'medium', 'high'] as const).map((pri) => (
                      <TouchableOpacity
                        key={pri}
                        style={[
                          styles.pickerItem,
                          planPriority === pri && styles.pickerItemSelected
                        ]}
                        onPress={() => {
                          setPlanPriority(pri);
                          setPriorityPickerVisible(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.pickerItemIcon,
                          { backgroundColor: PlannerService.getPriorityColor(pri) }
                        ]}>
                          <Ionicons 
                            name={getPriorityIcon(pri) as any} 
                            size={16} 
                            color="#fff" 
                          />
                        </View>
                        <Text style={styles.pickerItemText}>
                          {pri.charAt(0).toUpperCase() + pri.slice(1)} Priority
                        </Text>
                        {planPriority === pri && (
                          <Ionicons name="checkmark" size={20} color="#4facfe" style={styles.checkmark} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* Reminder Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="notifications-outline" size={18} color="#4facfe" />
                  <Text style={styles.cardTitle}>Reminder</Text>
                  {!hasPermission && (
                    <View style={styles.disabledBadge}>
                      <Ionicons name="close-circle" size={12} color="#ff6b6b" />
                      <Text style={styles.disabledBadgeText}>OFF</Text>
                    </View>
                  )}
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.reminderButton,
                    !hasPermission && styles.reminderButtonDisabled,
                    errors.reminder && styles.inputError
                  ]}
                  onPress={() => {
                    if (!hasPermission) {
                      Alert.alert(
                        'Enable Notifications',
                        'Turn on notifications to receive reminders for your plans.',
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
                  <View style={styles.reminderButtonLeft}>
                    <View style={[
                      styles.reminderIconContainer,
                      !hasPermission && styles.reminderIconDisabled
                    ]}>
                      <Ionicons 
                        name={getReminderIcon(reminderMinutes) as any} 
                        size={20} 
                        color={hasPermission ? '#4facfe' : '#555'} 
                      />
                    </View>
                    <Text style={[
                      styles.reminderButtonText,
                      !hasPermission && styles.reminderButtonTextDisabled
                    ]}>
                      {getReminderLabel(reminderMinutes)}
                    </Text>
                  </View>
                  <Ionicons 
                    name={reminderPickerVisible ? "chevron-up" : "chevron-down"} 
                    size={18} 
                    color="#666" 
                  />
                </TouchableOpacity>

                {!hasPermission && (
                  <TouchableOpacity 
                    style={styles.enableButton}
                    onPress={requestPermission}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="notifications" size={16} color="#4facfe" />
                    <Text style={styles.enableButtonText}>Enable Notifications</Text>
                  </TouchableOpacity>
                )}

                {/* Reminder Picker */}
                {reminderPickerVisible && hasPermission && (
                  <View style={styles.pickerDropdown}>
                    {[
                      { minutes: 0, label: 'No reminder', icon: 'notifications-off-outline' },
                      { minutes: 5, label: '5 minutes before', icon: 'alarm-outline' },
                      { minutes: 15, label: '15 minutes before', icon: 'notifications-outline' },
                      { minutes: 30, label: '30 minutes before', icon: 'notifications-outline' },
                      { minutes: 60, label: '1 hour before', icon: 'time-outline' },
                      { minutes: 120, label: '2 hours before', icon: 'time-outline' },
                      { minutes: 1440, label: '1 day before', icon: 'calendar-outline' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.minutes}
                        style={[
                          styles.pickerItem,
                          reminderMinutes === option.minutes && styles.pickerItemSelected
                        ]}
                        onPress={() => {
                          setReminderMinutes(option.minutes);
                          setReminderPickerVisible(false);
                          setShowCustomReminderInput(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.reminderPickerIcon}>
                          <Ionicons 
                            name={option.icon as any} 
                            size={18} 
                            color={reminderMinutes === option.minutes ? '#4facfe' : '#666'} 
                          />
                        </View>
                        <Text style={styles.pickerItemText}>{option.label}</Text>
                        {reminderMinutes === option.minutes && (
                          <Ionicons name="checkmark" size={20} color="#4facfe" style={styles.checkmark} />
                        )}
                      </TouchableOpacity>
                    ))}
                    
                    {/* Custom Option */}
                    <TouchableOpacity
                      style={[
                        styles.pickerItem,
                        showCustomReminderInput && styles.pickerItemSelected
                      ]}
                      onPress={() => setShowCustomReminderInput(!showCustomReminderInput)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.reminderPickerIcon}>
                        <Ionicons 
                          name="create-outline" 
                          size={18} 
                          color={showCustomReminderInput ? '#4facfe' : '#666'} 
                        />
                      </View>
                      <Text style={styles.pickerItemText}>Custom time</Text>
                      <Ionicons 
                        name={showCustomReminderInput ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                    
                    {showCustomReminderInput && (
                      <View style={styles.customInputContainer}>
                        <Text style={styles.customInputLabel}>Minutes before plan:</Text>
                        <View style={styles.customInputRow}>
                          <TextInput
                            style={styles.customInput}
                            placeholder="e.g., 45"
                            placeholderTextColor="#555"
                            keyboardType="number-pad"
                            value={customReminderInput}
                            onChangeText={setCustomReminderInput}
                          />
                          <TouchableOpacity
                            style={styles.customSubmitButton}
                            onPress={handleCustomReminderSubmit}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="checkmark" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.customInputHint}>Maximum: 10,080 min (7 days)</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomActionBar}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={savePlan}
                activeOpacity={0.8}
                disabled={isSaving}
                style={styles.saveButtonWrapper}
              >
                <LinearGradient
                  colors={isSaving ? ['#555', '#666'] : ['#667eea', '#764ba2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButton}
                >
                  {isSaving ? (
                    <>
                      <Ionicons name="hourglass-outline" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>Saving...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.saveButtonText}>
                        {editingPlan ? 'Update Plan' : 'Create Plan'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: SCREEN_HEIGHT * 0.70,
    backgroundColor: '#0f1729',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 24,
  },
  keyboardView: {
    flex: 1,
  },
  compactHeader: {
    backgroundColor: '#1a2744',
    paddingTop: 8,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  dragIndicator: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  compactSubtitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  requiredDot: {
    fontSize: 16,
    color: '#ff6b6b',
    fontWeight: '700',
  },
  optionalBadge: {
    fontSize: 10,
    color: '#666',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  titleInput: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 48,
    maxHeight: 80,
  },
  descriptionInput: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '400',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 90,
  },
  charCounter: {
    fontSize: 11,
    color: '#555',
    textAlign: 'right',
    marginTop: 6,
  },
  inputError: {
    borderColor: 'rgba(255, 107, 107, 0.5)',
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#ff6b6b',
    fontWeight: '500',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  placeholderValue: {
    color: '#555',
    fontWeight: '400',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  optionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  pickerDropdown: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
  },
  pickerItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerItemText: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  checkmark: {
    marginLeft: 'auto',
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  reminderButtonDisabled: {
    opacity: 0.5,
  },
  reminderButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  reminderIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 172, 254, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderIconDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  reminderButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
  reminderButtonTextDisabled: {
    color: '#555',
  },
  disabledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  disabledBadgeText: {
    fontSize: 10,
    color: '#ff6b6b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  enableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  enableButtonText: {
    fontSize: 13,
    color: '#4facfe',
    fontWeight: '600',
  },
  reminderPickerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customInputContainer: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    marginTop: 4,
  },
  customInputLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
    fontWeight: '500',
  },
  customInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  customInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontWeight: '500',
  },
  customSubmitButton: {
    width: 48,
    backgroundColor: '#4facfe',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customInputHint: {
    fontSize: 11,
    color: '#555',
    marginTop: 8,
  },
  bottomActionBar: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#1a2744',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#aaa',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButtonWrapper: {
    flex: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
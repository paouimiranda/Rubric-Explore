import { Plan, PlannerService } from '@/services/planner-service';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import moment from 'moment';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Animated,
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

interface PlanModalProps {
  visible: boolean;
  editingPlan: Plan | null;
  onClose: () => void;
  onSave: () => void;
}

export default function PlanModal({
  visible,
  editingPlan,
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
  // NOTE: Tags feature has been removed - priority and category are sufficient for organization
  // const [planTags, setPlanTags] = useState<string[]>([]);
  // const [tagInput, setTagInput] = useState('');
  
  // Picker states
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [priorityPickerVisible, setPriorityPickerVisible] = useState(false);
  
  // Validation states
  const [errors, setErrors] = useState({ title: false, time: false });
  const [isSaving, setIsSaving] = useState(false);
  
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

      if (editingPlan) {
        setPlanTitle(editingPlan.title);
        setPlanDescription(editingPlan.description || '');
        setPlanDate(new Date(editingPlan.date));
        setPlanTime(editingPlan.time);
        setPlanCategory(editingPlan.category);
        setPlanPriority(editingPlan.priority);
        // setPlanTags(editingPlan.tags || []); // Tags removed
      } else {
        resetForm();
      }
      setErrors({ title: false, time: false });
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible, editingPlan]);

  const resetForm = () => {
    setPlanTitle('');
    setPlanDescription('');
    setPlanDate(new Date());
    setPlanTime('');
    setPlanCategory('personal');
    setPlanPriority('medium');
    // setPlanTags([]); // Tags removed
    // setTagInput(''); // Tags removed
  };

  const validateForm = () => {
    const newErrors = {
      title: !planTitle.trim(),
      time: !planTime,
    };
    setErrors(newErrors);
    return !newErrors.title && !newErrors.time;
  };

  const savePlan = async () => {
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
        tags: [], // Tags feature removed
        status: 'pending' as const,
        isPublic: false,
      };

      if (editingPlan) {
        await PlannerService.updatePlan(editingPlan.id!, planData);
      } else {
        await PlannerService.createPlan(planData);
      }

      onSave();
    } catch (error) {
      console.error('Error saving plan:', error);
      Alert.alert('Error', 'Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  // Tags functionality removed - not needed with priority and category
  // const addTag = useCallback(() => { ... }, [tagInput, planTags]);
  // const removeTag = useCallback((tag: string) => { ... }, [planTags]);

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

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        
        <Animated.View
          style={[
            styles.modalContent,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Header */}
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.modalHeader}
          >
            <View style={styles.headerTop}>
              {editingPlan && (
                <View style={styles.headerIconContainer}>
                  <Ionicons 
                    name="create-outline" 
                    size={28} 
                    color="#fff" 
                  />
                </View>
              )}
              {!editingPlan && <View style={{ width: 48 }} />}
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalTitle}>
              {editingPlan ? 'Edit Plan' : 'Create New Plan'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {editingPlan ? 'Update your plan details' : 'Fill in the details below'}
            </Text>
          </LinearGradient>

          <ScrollView 
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <View style={[
                styles.inputContainer, 
                errors.title && styles.inputError
              ]}>
                <Ionicons name="document-text-outline" size={20} color="#4facfe" />
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
                <Text style={styles.errorText}>Title is required</Text>
              )}
            </View>

            {/* Description Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Description</Text>
              <View style={[styles.inputContainer, styles.textAreaContainer]}>
                <Ionicons 
                  name="list-outline" 
                  size={20} 
                  color="#4facfe" 
                  style={styles.textAreaIcon} 
                />
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
                {planDescription.length}/500
              </Text>
            </View>

            {/* Date & Time Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>When</Text>
              <View style={styles.rowContainer}>
                <TouchableOpacity
                  style={[styles.inputContainer, styles.halfWidth]}
                  onPress={() => setDatePickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="calendar" size={20} color="#4facfe" />
                  <Text style={styles.inputText}>
                    {moment(planDate).format('MMM D')}
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
                  <Ionicons name="time" size={20} color="#4facfe" />
                  <Text style={[
                    styles.inputText,
                    !planTime && styles.placeholderText
                  ]}>
                    {planTime || 'Set time *'}
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.time && (
                <Text style={styles.errorText}>Time is required</Text>
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

            {/* Category Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Category</Text>
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
                    size={18} 
                    color="#fff" 
                  />
                </LinearGradient>
                <Text style={styles.inputText}>
                  {planCategory.charAt(0).toUpperCase() + planCategory.slice(1)}
                </Text>
                <Ionicons 
                  name={categoryPickerVisible ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#aaa" 
                />
              </TouchableOpacity>

              {categoryPickerVisible && (
                <View style={styles.pickerContainer}>
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
                        <Ionicons name="checkmark-circle" size={22} color="#4facfe" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Priority Section */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Priority</Text>
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
                    size={16} 
                    color="#fff" 
                  />
                </View>
                <Text style={styles.inputText}>
                  {planPriority.charAt(0).toUpperCase() + planPriority.slice(1)} Priority
                </Text>
                <Ionicons 
                  name={priorityPickerVisible ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color="#aaa" 
                />
              </TouchableOpacity>

              {priorityPickerVisible && (
                <View style={styles.pickerContainer}>
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
                        {pri.charAt(0).toUpperCase() + pri.slice(1)}
                      </Text>
                      {planPriority === pri && (
                        <Ionicons name="checkmark-circle" size={22} color="#4facfe" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
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
                    size={22} 
                    color="#fff" 
                  />
                  <Text style={styles.saveText}>
                    {isSaving ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                style={styles.cancelButton}
                activeOpacity={0.7}
                disabled={isSaving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalContent: { 
    width: '90%', 
    maxWidth: 440, 
    maxHeight: '92%', 
    backgroundColor: '#1a2744', 
    borderRadius: 24, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: { 
    padding: 24,
    paddingTop: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
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
    fontSize: 26, 
    fontWeight: '700', 
    color: '#fff',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  modalBody: { 
    padding: 20,
    paddingTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 8,
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
    borderRadius: 14, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 255, 255, 0.08)', 
    gap: 12,
  },
  inputError: {
    borderColor: 'rgba(255, 107, 107, 0.5)',
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  textAreaContainer: { 
    alignItems: 'flex-start',
    minHeight: 100,
  },
  textAreaIcon: { 
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  input: { 
    flex: 1, 
    fontSize: 16, 
    color: '#fff', 
    fontWeight: '400',
  },
  textArea: { 
    minHeight: 80, 
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  inputText: { 
    flex: 1, 
    fontSize: 16, 
    color: '#fff', 
    fontWeight: '500',
  },
  placeholderText: {
    color: '#666',
    fontWeight: '400',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#ff6b6b',
    marginTop: 6,
    marginLeft: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  categoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityIndicator: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: { 
    backgroundColor: 'rgba(255, 255, 255, 0.04)', 
    borderRadius: 14, 
    padding: 4, 
    marginTop: 8, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pickerOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    borderRadius: 10, 
    gap: 12,
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(79, 172, 254, 0.1)',
  },
  pickerIconBadge: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  priorityColorBadge: { 
    width: 36, 
    height: 36, 
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerText: { 
    flex: 1, 
    fontSize: 15, 
    color: '#fff', 
    fontWeight: '500',
  },
  tagsDisplayContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8, 
    marginTop: 12,
  },
  tagDisplay: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(79, 172, 254, 0.15)', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10, 
    gap: 6, 
    borderWidth: 1.5, 
    borderColor: 'rgba(79, 172, 254, 0.3)',
  },
  tagDisplayText: { 
    color: '#4facfe', 
    fontSize: 13, 
    fontWeight: '600',
  },
  actionButtons: {
    marginTop: 8,
    marginBottom: 8,
  },
  saveButtonContainer: { 
    marginBottom: 12,
  },
  saveButton: { 
    height: 56, 
    borderRadius: 14, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 10, 
    shadowColor: '#4facfe', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 12, 
    elevation: 8,
  },
  saveText: { 
    color: '#fff', 
    fontSize: 17, 
    fontWeight: '700',
  },
  cancelButton: { 
    alignItems: 'center', 
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  cancelText: { 
    color: '#ff6b6b', 
    fontSize: 16, 
    fontWeight: '600',
  },
});
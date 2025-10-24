
// File: app/Quiz/quiz-overview.tsx - Updated with Topic Management
import { convertAPIQuestionToInternalFormat, generateQuizFromAI } from '@/api/quizApi';
import { TopicSelectionModal } from '@/components/Interface/ai-quiz-modal';
import { QuizService, type Question, type Quiz } from '@/services/quiz-service';
import { useQuizStore } from '@/services/stores/quiz-store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const QuizOverview: React.FC = () => {
  const router = useRouter();
  const { quizId } = useLocalSearchParams();
  
  // Zustand store
  const {
    quizTitle,
    quizImage,
    questions,
    topics,
    isLoading,
    loadingMessage,
    setQuizTitle,
    setQuizImage,
    setQuestions,
    addQuestion,
    deleteQuestion,
    setLoading,
    loadQuizData,
    resetToDefaults,
    setIsFromOverview,
    addTopic,
    updateTopic,
    deleteTopic,
    extractTopicsFromQuestions
  } = useQuizStore();

  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showManageTopicsModal, setShowManageTopicsModal] = useState(false);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [editTopicInput, setEditTopicInput] = useState('');

  // Hardcoded quiz cover images
  const defaultQuizImages = [
    { id: 'quiz1', source: require('@/assets/covers/notebook1.jpg'), name: 'Classic Books' },
    { id: 'quiz2', source: require('@/assets/covers/notebook2.jpg'), name: 'Science Lab' },
    { id: 'quiz3', source: require('@/assets/covers/notebook3.jpg'), name: 'Mathematics' },
    { id: 'quiz4', source: require('@/assets/covers/notebook4.jpg'), name: 'History' },
    { id: 'quiz5', source: require('@/assets/covers/notebook5.jpg'), name: 'Technology' },
    { id: 'quiz6', source: require('@/assets/covers/notebook6.jpg'), name: 'Nature' },
  ];

  // Load existing quiz if editing
  useEffect(() => {
    if (quizId && typeof quizId === 'string') {
      loadQuiz(quizId);
    } else {
      // Reset to defaults when creating new quiz
      resetToDefaults();
    }
  }, [quizId]);

  // Auto-extract topics from questions when component mounts or questions change
  useEffect(() => {
    if (questions.length > 0 && topics.length === 0) {
      extractTopicsFromQuestions();
    }
  }, [questions.length]);

  const loadQuiz = async (id: string) => {
    try {
      setLoading(true, 'Loading quiz...');
      const quiz = await QuizService.getQuizById(id);
      if (quiz) {
        loadQuizData({
          title: quiz.title,
          image: '', // Set if you store images in quiz data
          questions: quiz.questions,
          topics: quiz.topics || []
        });
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      Alert.alert('Error', 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a quiz title.');
      return;
    }

    if (questions.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one question.');
      return;
    }

    const quiz: Omit<Quiz, 'uid' | 'id' | 'createdAt' | 'updatedAt'> = {
      title: quizTitle,
      questions,
      topics // Include topics in quiz data
    };

    const validation = QuizService.validateQuiz(quiz);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    try {
      setLoading(true, 'Saving quiz...');
      let savedQuizId: string;
      
      if (quizId && typeof quizId === 'string') {
        await QuizService.updateQuiz(quizId, quiz);
        savedQuizId = quizId;
      } else {
        savedQuizId = await QuizService.createQuiz(quiz);
      }

      Alert.alert(
        'Success',
        'Quiz saved successfully!',
        [
          {
            text: 'Preview Quiz',
            onPress: () => {
              resetToDefaults(); // Clear store before navigating
              router.push({
                pathname: './quiz-preview',
                params: { quizId: savedQuizId }
              });
            }
          },
          {
            text: 'Continue Editing',
            style: 'cancel'
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = () => {
    Alert.alert(
      'Select Quiz Image',
      'Choose an image source',
      [
        {
          text: 'Default Images',
          onPress: () => showDefaultImagePicker()
        },
        {
          text: 'Camera Roll',
          onPress: () => selectFromCameraRoll()
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const showDefaultImagePicker = () => {
    Alert.alert(
      'Choose Default Image',
      '',
      [
        ...defaultQuizImages.map(image => ({
          text: image.name,
          onPress: () => setQuizImage(image.id)
        })),
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const selectFromCameraRoll = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setQuizImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const getImageSource = (imageId: string) => {
    if (!imageId) return null;
    
    if (imageId.startsWith('http') || imageId.startsWith('file')) {
      return { uri: imageId };
    }
    const defaultImage = defaultQuizImages.find(img => img.id === imageId);
    return defaultImage ? defaultImage.source : null;
  };

  const handleQuestionTap = (questionIndex: number) => {
    // Set navigation state and navigate to quiz-create
    setIsFromOverview(true);
    router.push({
      pathname: './quiz-create',
      params: { questionIndex: questionIndex.toString() }
    });
  };

  const handleAddQuestion = () => {
    // Add a blank question
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: 'multiple_choice',
      question: '',
      image: '',
      options: ['', '', '', ''],
      correctAnswers: [0],
      timeLimit: 30,
      matchPairs: [],
      correctAnswer: '',
      topic: '', // Empty topic initially
      points: 1
    };

    addQuestion(newQuestion);
    
    // Navigate to edit the new question
    setIsFromOverview(true);
    router.push({
      pathname: './quiz-create',
      params: { questionIndex: (questions.length).toString() } // New question will be at this index
    });
  };

  const handleDeleteQuestion = (questionIndex: number) => {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteQuestion(questionIndex)
        }
      ]
    );
  };

  const handleTopicSelected = async (topic: string, questionType: string, questionCount: number, content?: string) => {
    try {
      setLoading(true, 'Generating questions...');
      
      const aiQuestions = await generateQuizFromAI(topic, questionCount, content, [questionType]);
      const convertedQuestions = aiQuestions.map((apiQuestion, index) => ({
        ...convertAPIQuestionToInternalFormat(apiQuestion),
        id: `ai_question_${Date.now()}_${index}`
      }));

      // Add to existing questions
      setQuestions([...questions, ...convertedQuestions]);
      
      if (!quizTitle.trim()) {
        setQuizTitle(topic);
      }
      
      // Extract any new topics from AI-generated questions
      extractTopicsFromQuestions();
      
      Alert.alert("Success", `Added ${convertedQuestions.length} question${convertedQuestions.length > 1 ? 's' : ''} to your quiz!`);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || 'Failed to generate quiz questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Discard Changes?',
      'Are you sure you want to discard your changes?',
      [
        { text: 'Keep Editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            resetToDefaults();
            router.back();
          }
        }
      ]
    );
  };

  // Topic Management Functions
  const handleAddTopic = () => {
    const trimmedTopic = newTopicInput.trim();
    
    if (!trimmedTopic) {
      Alert.alert('Validation Error', 'Topic name cannot be empty.');
      return;
    }

    if (trimmedTopic.length > 50) {
      Alert.alert('Validation Error', 'Topic name must be 50 characters or less.');
      return;
    }

    const success = addTopic(trimmedTopic);
    
    if (success) {
      setNewTopicInput('');
      Alert.alert('Success', `Topic "${trimmedTopic}" added successfully!`);
    } else {
      Alert.alert('Duplicate Topic', 'This topic already exists.');
    }
  };

  const handleStartEditTopic = (topic: string) => {
    setEditingTopic(topic);
    setEditTopicInput(topic);
  };

  const handleSaveEditTopic = () => {
    if (!editingTopic) return;
    
    const trimmedTopic = editTopicInput.trim();
    
    if (!trimmedTopic) {
      Alert.alert('Validation Error', 'Topic name cannot be empty.');
      return;
    }

    if (trimmedTopic.length > 50) {
      Alert.alert('Validation Error', 'Topic name must be 50 characters or less.');
      return;
    }

    const success = updateTopic(editingTopic, trimmedTopic);
    
    if (success) {
      setEditingTopic(null);
      setEditTopicInput('');
      Alert.alert('Success', 'Topic updated successfully!');
    } else {
      Alert.alert('Error', 'A topic with this name already exists.');
    }
  };

  const handleDeleteTopic = (topic: string) => {
    Alert.alert(
      'Delete Topic',
      `Are you sure you want to delete "${topic}"? Questions using this topic will have their topic cleared.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTopic(topic);
            Alert.alert('Success', 'Topic deleted successfully!');
          }
        }
      ]
    );
  };

  const getQuestionPreview = (question: Question): string => {
    if (question.type === 'matching' && question.matchPairs.length > 0) {
      return question.matchPairs
        .map(pair => pair.left)
        .filter(left => left.trim())
        .join(' | ');
    }
    return question.question || 'Untitled Question';
  };

  const getQuestionTypeLabel = (type: string): string => {
    switch (type) {
      case 'multiple_choice': return 'Multiple Choice';
      case 'fill_blank': return 'Fill in the Blank';
      case 'matching': return 'Matching';
      default: return 'Question';
    }
  };

  const renderQuestionItem = ({ item, index }: { item: Question; index: number }) => {
    const imageSource = item.image ? { uri: item.image } : getImageSource(quizImage);
    
    return (
      <TouchableOpacity
        style={styles.questionCard}
        onPress={() => handleQuestionTap(index)}
        onLongPress={() => handleDeleteQuestion(index)}
        activeOpacity={0.7}
      >
        <View style={styles.questionImageContainer}>
          {imageSource ? (
            <Image source={imageSource} style={styles.questionImage} />
          ) : (
            <View style={styles.questionImagePlaceholder}>
              <Ionicons name="help-circle" size={24} color="#64748b" />
            </View>
          )}
        </View>
        
        <View style={styles.questionContent}>
          <View style={styles.questionMetaRow}>
            <Text style={styles.questionMeta}>
              #{index + 1} • {getQuestionTypeLabel(item.type)}
            </Text>
            {item.topic && (
              <View style={styles.topicBadge}>
                <Ionicons name="pricetag" size={10} color="#8b5cf6" />
                <Text style={styles.topicBadgeText}>{item.topic}</Text>
              </View>
            )}
            {!item.topic && (
              <View style={styles.noTopicBadge}>
                <Text style={styles.noTopicBadgeText}>No Topic</Text>
              </View>
            )}
          </View>
          <Text style={styles.questionPreview} numberOfLines={2}>
            {getQuestionPreview(item)}
          </Text>
        </View>

        <View style={styles.questionArrow}>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#334155']}
      style={styles.container}
    >
      <SafeAreaView style={styles.container}>
        {/* Fixed Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Ionicons name="close" size={24} color="#94a3b8" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleSaveQuiz}
            disabled={isLoading}
          >
            <Ionicons name="checkmark" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quiz Image */}
          <TouchableOpacity style={styles.imageContainer} onPress={handleImagePicker}>
            {quizImage ? (
              <Image source={getImageSource(quizImage)} style={styles.quizImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={48} color="#64748b" />
                <Text style={styles.imagePlaceholderText}>Tap to add quiz image</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Quiz Title */}
          <TextInput
            style={styles.titleInput}
            placeholder="Enter quiz title..."
            placeholderTextColor="#64748b"
            value={quizTitle}
            onChangeText={setQuizTitle}
            multiline
          />

          {/* Topics Section */}
          <View style={styles.topicsSection}>
            <View style={styles.topicsHeader}>
              <Text style={styles.topicsTitle}>Topics ({topics.length})</Text>
              <TouchableOpacity
                style={styles.manageTopicsButton}
                onPress={() => setShowManageTopicsModal(true)}
              >
                <Ionicons name="pricetags" size={16} color="#ffffff" />
                <Text style={styles.manageTopicsButtonText}>Manage Topics</Text>
              </TouchableOpacity>
            </View>

            {topics.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.topicsScrollView}
              >
                {topics.map((topic, index) => (
                  <View key={index} style={styles.topicChip}>
                    <Ionicons name="pricetag" size={12} color="#8b5cf6" />
                    <Text style={styles.topicChipText}>{topic}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.noTopicsText}>
                No topics defined yet. Tap "Manage Topics" to add some!
              </Text>
            )}
          </View>

          {/* Questions Section */}
          <View style={styles.questionsSection}>
            <View style={styles.questionsHeader}>
              <Text style={styles.questionsTitle}>Questions</Text>
              <TouchableOpacity
                style={styles.generateAIButton}
                onPress={() => setShowTopicModal(true)}
                disabled={isLoading}
              >
                <Ionicons name="sparkles" size={16} color="#ffffff" />
                <Text style={styles.generateAIButtonText}>AI Generate</Text>
              </TouchableOpacity>
            </View>

            {questions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color="#475569" />
                <Text style={styles.emptyStateText}>No questions added yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Tap "Add Question" or "AI Generate" to get started
                </Text>
              </View>
            ) : (
              <FlatList
                data={questions}
                renderItem={renderQuestionItem}
                keyExtractor={(item, index) => `${item.id}_${index}`}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>

          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <Ionicons name="hourglass-outline" size={24} color="#8b5cf6" />
              <Text style={styles.loadingText}>{loadingMessage || 'Loading...'}</Text>
            </View>
          )}
        </ScrollView>

        {/* Floating Add Question Button */}
        <TouchableOpacity 
          style={[styles.fab, { opacity: isLoading ? 0.6 : 1 }]} 
          onPress={handleAddQuestion}
          disabled={isLoading}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
          <Text style={styles.fabText}>Add Question</Text>
        </TouchableOpacity>

        {/* Manage Topics Modal */}
        <Modal
          visible={showManageTopicsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowManageTopicsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manage Topics</Text>
                <TouchableOpacity
                  onPress={() => setShowManageTopicsModal(false)}
                  style={styles.modalCloseIcon}
                >
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Add New Topic */}
              <View style={styles.addTopicSection}>
                <TextInput
                  style={styles.topicInput}
                  placeholder="Enter new topic..."
                  placeholderTextColor="#64748b"
                  value={newTopicInput}
                  onChangeText={setNewTopicInput}
                  maxLength={50}
                />
                <TouchableOpacity
                  style={styles.addTopicButton}
                  onPress={handleAddTopic}
                >
                  <Ionicons name="add-circle" size={20} color="#ffffff" />
                  <Text style={styles.addTopicButtonText}>Add</Text>
                </TouchableOpacity>
              </View>

              {/* Topics List */}
              <ScrollView style={styles.topicsListContainer}>
                {topics.length === 0 ? (
                  <View style={styles.emptyTopicsList}>
                    <Ionicons name="pricetags-outline" size={48} color="#475569" />
                    <Text style={styles.emptyTopicsText}>No topics yet</Text>
                    <Text style={styles.emptyTopicsSubtext}>
                      Add topics to categorize your questions for better analytics
                    </Text>
                  </View>
                ) : (
                  topics.map((topic, index) => (
                    <View key={index} style={styles.topicListItem}>
                      {editingTopic === topic ? (
                        <>
                          <TextInput
                            style={styles.editTopicInput}
                            value={editTopicInput}
                            onChangeText={setEditTopicInput}
                            maxLength={50}
                            autoFocus
                          />
                          <TouchableOpacity
                            style={styles.saveEditButton}
                            onPress={handleSaveEditTopic}
                          >
                            <Ionicons name="checkmark" size={20} color="#10b981" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelEditButton}
                            onPress={() => {
                              setEditingTopic(null);
                              setEditTopicInput('');
                            }}
                          >
                            <Ionicons name="close" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <View style={styles.topicListItemContent}>
                            <Ionicons name="pricetag" size={16} color="#8b5cf6" />
                            <Text style={styles.topicListItemText}>{topic}</Text>
                            <Text style={styles.topicUsageCount}>
                              ({questions.filter(q => q.topic === topic).length} questions)
                            </Text>
                          </View>
                          <View style={styles.topicActions}>
                            <TouchableOpacity
                              style={styles.editTopicButton}
                              onPress={() => handleStartEditTopic(topic)}
                            >
                              <Ionicons name="pencil" size={18} color="#3b82f6" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.deleteTopicButton}
                              onPress={() => handleDeleteTopic(topic)}
                            >
                              <Ionicons name="trash" size={18} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Close Button */}
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowManageTopicsModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Topic Selection Modal */}
        <TopicSelectionModal
          visible={showTopicModal}
          onClose={() => setShowTopicModal(false)}
          onTopicSelected={handleTopicSelected}
        />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 4,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  imageContainer: {
    marginBottom: 20,
  },
  quizImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#334155',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
    textAlignVertical: 'top',
  },
  questionsSection: {
    marginBottom: 100,
  },
  questionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  generateAIButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  generateAIButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 8,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#94a3b8',
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  questionImageContainer: {
    marginRight: 12,
  },
  questionImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  questionImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionContent: {
    flex: 1,
  },
  questionMeta: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionPreview: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 20,
  },
  questionArrow: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    gap: 6,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
   topicsSection: {
    marginBottom: 24,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topicsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  manageTopicsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    gap: 4,
  },
  manageTopicsButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  topicsScrollView: {
    flexDirection: 'row',
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    gap: 4,
  },
  topicChipText: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: '600',
  },
  noTopicsText: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  questionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  topicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 3,
  },
  topicBadgeText: {
    color: '#c4b5fd',
    fontSize: 9,
    fontWeight: '600',
  },
  noTopicBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  noTopicBadgeText: {
    color: '#fca5a5',
    fontSize: 9,
    fontWeight: '600',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseIcon: {
    padding: 4,
  },
  addTopicSection: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  topicInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addTopicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 4,
  },
  addTopicButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  topicsListContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  emptyTopicsList: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTopicsText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  emptyTopicsSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  topicListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topicListItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topicListItemText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  topicUsageCount: {
    color: '#64748b',
    fontSize: 12,
  },
  topicActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editTopicButton: {
    padding: 6,
  },
  deleteTopicButton: {
    padding: 6,
  },
  editTopicInput: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 6,
    padding: 8,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#475569',
  },
  saveEditButton: {
    padding: 6,
    marginLeft: 8,
  },
  cancelEditButton: {
    padding: 6,
  },
  modalCloseButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  

});

export default QuizOverview;
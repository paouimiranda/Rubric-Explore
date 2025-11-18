// File: app/Quiz/quiz-overview.tsx - Updated with Firebase Storage Integration
import { convertAPIQuestionToInternalFormat, generateQuizFromAI } from '@/api/quizApi';
import { TopicSelectionModal } from '@/components/Interface/ai-quiz-modal';
import { CustomAlertModal } from '@/components/Interface/custom-alert-modal';
import { auth } from '@/firebase';
import { useBacklogLogger } from '@/hooks/useBackLogLogger'; // NEW: Added import
import { BACKLOG_EVENTS } from '@/services/backlogEvents';
import {
  deleteQuizImage,
  extractStoragePathFromUrl,
  getQuizImageSource,
  isFirebaseStorageUrl,
  pickImage,
  uploadQuizCoverImage
} from '@/services/image-service';
import { QuizService, type Question, type Quiz } from '@/services/quiz-service';
import { useQuizStore } from '@/services/stores/quiz-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface AlertState {
  visible: boolean;
  type: 'info' | 'success' | 'error' | 'warning';
  title: string;
  message: string;
  buttons: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'primary';
  }>;
}

const QuizOverview: React.FC = () => {
  const router = useRouter();
  const { quizId } = useLocalSearchParams();
  const { addBacklogEvent, logError } = useBacklogLogger();
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
  const [isPublic, setIsPublic] = useState(false);
  const [showPublicWarningModal, setShowPublicWarningModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  const defaultQuizImages = [
    { id: 'quiz1', name: 'Classic Books' },
    { id: 'quiz2', name: 'Science Lab' },
    { id: 'quiz3', name: 'Mathematics' },
    { id: 'quiz4', name: 'History' },
    { id: 'quiz5', name: 'Technology' },
    { id: 'quiz6', name: 'Nature' },
  ];

  const showAlert = (
    type: AlertState['type'],
    title: string,
    message: string,
    buttons?: AlertState['buttons']
  ) => {
    setAlert({
      visible: true,
      type,
      title,
      message,
      buttons: buttons || [
        {
          text: 'OK',
          onPress: () => setAlert(prev => ({ ...prev, visible: false })),
          style: 'primary',
        },
      ],
    });
  };

  useEffect(() => {
    if (quizId && typeof quizId === 'string') {
      loadQuiz(quizId);
    } else {
      resetToDefaults();
    }
  }, [quizId]);

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
          image: quiz.coverImage || '',
          questions: quiz.questions,
          topics: quiz.topics || []
        });
        setIsPublic(quiz.isPublic ?? false);
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      showAlert('error', 'Error', 'Failed to load quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) {
      showAlert('warning', 'Validation Error', 'Please enter a quiz title.');
      return;
    }

    if (questions.length === 0) {
      showAlert('warning', 'Validation Error', 'Please add at least one question.');
      return;
    }

    const quiz: Omit<Quiz, 'uid' | 'id' | 'createdAt' | 'updatedAt'> = {
      title: quizTitle,
      questions,
      coverImage: quizImage,
      topics,
      isPublic
    };

    const validation = QuizService.validateQuiz(quiz);
    if (!validation.isValid) {
      showAlert('error', 'Validation Error', validation.errors.join('\n'));
      return;
    }

    try {
      setLoading(true, 'Saving quiz...');
      let savedQuizId: string;
      
      if (quizId && typeof quizId === 'string') {
        await QuizService.updateQuiz(quizId, quiz);
        savedQuizId = quizId;
        addBacklogEvent(BACKLOG_EVENTS.USER_UPDATED_QUIZ, {
          quizId: savedQuizId,
          title: quizTitle,
          questionCount: questions.length,
          isPublic,
          userId: auth.currentUser?.uid,
        });
      } else {
        savedQuizId = await QuizService.createQuiz(quiz);
        addBacklogEvent(BACKLOG_EVENTS.USER_CREATED_QUIZ, {
          quizId: savedQuizId,
          title: quizTitle,
          questionCount: questions.length,
          isPublic,
          userId: auth.currentUser?.uid,
        });
      }

      showAlert(
        'success',
        'Success',
        'Quiz saved successfully!',
        [
          {
            text: 'Continue Editing',
            onPress: () => setAlert(prev => ({ ...prev, visible: false })),
            style: 'cancel'
          },
          {
            text: 'Preview Quiz',
            onPress: () => {
              setAlert(prev => ({ ...prev, visible: false }));
              resetToDefaults();
              router.push({
                pathname: './quiz-preview',
                params: { quizId: savedQuizId }
              });
            },
            style: 'primary'
          }
        ]
      );
    } catch (error: any) {
      showAlert('error', 'Error', error.message || 'Failed to save quiz. Please try again.');
      
    } finally {
      setLoading(false);
    }
  };

  const handleImagePicker = () => {
  setShowImagePickerModal(true);
};

  const showDefaultImagePicker = () => {
  setShowImagePickerModal(false);
  
  showAlert(
    'info',
    'Choose Default Cover',
    'Select from available quiz covers',
    defaultQuizImages.map(image => ({
      text: image.name,
      onPress: () => {
        setQuizImage(image.id);
        setAlert(prev => ({ ...prev, visible: false }));
      },
      style: 'default' as const
    })).concat([{
      text: 'Cancel',
      onPress: () => setAlert(prev => ({ ...prev, visible: false })),
      style: 'default' as const
    }])
  );
};

const handleRemoveImage = async () => {
  setShowImagePickerModal(false);
  
  showAlert(
    'warning',
    'Remove Cover Image',
    'Are you sure you want to remove the cover image?',
    [
      {
        text: 'Cancel',
        onPress: () => setAlert(prev => ({ ...prev, visible: false })),
        style: 'cancel'
      },
      {
        text: 'Remove',
        onPress: async () => {
          // Delete from Firebase Storage if it's a Firebase URL
          if (quizImage && isFirebaseStorageUrl(quizImage)) {
            const imagePath = extractStoragePathFromUrl(quizImage);
            if (imagePath) {
              await deleteQuizImage(imagePath).catch(err => 
                console.log('Image already deleted or not found')
              );
            }
          }
          
          setQuizImage('');
          setAlert(prev => ({ ...prev, visible: false }));
          showAlert('success', 'Success', 'Cover image removed successfully!');
        },
        style: 'primary'
      }
    ]
  );
};

  const selectFromCameraRoll = async () => {
    try {
      const imageAsset = await pickImage();
      if (!imageAsset) return;
      
      const currentQuizId = (quizId && typeof quizId === 'string') 
        ? quizId 
        : `temp_${Date.now()}`;
      
      const userId = auth.currentUser?.uid;
      if (!userId) {
        showAlert('error', 'Error', 'You must be logged in to upload images.');
        return;
      }
      
      setUploadingImage(true);
      
      try {
        // Delete old image if it's a Firebase URL
        if (quizImage && isFirebaseStorageUrl(quizImage)) {
          const oldPath = extractStoragePathFromUrl(quizImage);
          if (oldPath) {
            await deleteQuizImage(oldPath).catch(err => 
              console.log('Old image already deleted or not found')
            );
          }
        }
        
        // Upload new image
        const result = await uploadQuizCoverImage(
          currentQuizId,
          imageAsset.uri,
          userId
        );
        
        setQuizImage(result.url);
        showAlert('success', 'Success', 'Cover image uploaded successfully!');
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
        showAlert('error', 'Upload Failed', 'Failed to upload image. Please try again.');
      } finally {
        setUploadingImage(false);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      showAlert('error', 'Error', 'Failed to select image. Please try again.');
    }
  };

  const handleQuestionTap = (questionIndex: number) => {
    setIsFromOverview(true);
    router.push({
      pathname: './quiz-create',
      params: { questionIndex: questionIndex.toString() }
    });
  };

  const handleAddQuestion = () => {
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
      topic: '',
      points: 1
    };

    addQuestion(newQuestion);
    
    setIsFromOverview(true);
    router.push({
      pathname: './quiz-create',
      params: { questionIndex: (questions.length).toString() }
    });
  };

  const handleDeleteQuestion = (questionIndex: number) => {
    showAlert(
      'warning',
      'Delete Question',
      'Are you sure you want to delete this question?',
      [
        {
          text: 'Cancel',
          onPress: () => setAlert(prev => ({ ...prev, visible: false })),
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: async () => {
            const question = questions[questionIndex];
            
            // Delete image from Firebase Storage if it exists
            if (question.image && isFirebaseStorageUrl(question.image)) {
              const imagePath = extractStoragePathFromUrl(question.image);
              if (imagePath) {
                await deleteQuizImage(imagePath).catch(err => 
                  console.log('Image already deleted or not found')
                );
              }
            }
            addBacklogEvent(BACKLOG_EVENTS.USER_DELETED_QUIZ, {  // Adapted for question deletion
              questionId: questions[questionIndex].id,
              quizId: quizId || 'new',
              quizTitle,
              userId: auth.currentUser?.uid,
            });
            
            deleteQuestion(questionIndex);
            setAlert(prev => ({ ...prev, visible: false }));
          },
          style: 'primary'
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

      setQuestions([...questions, ...convertedQuestions]);
      
      if (!quizTitle.trim()) {
        setQuizTitle(topic);
      }
      addBacklogEvent(BACKLOG_EVENTS.USER_GENERATED_QUIZ_WITH_AI, {
        topic,
        questionCount,
        questionType,
        generatedQuestions: convertedQuestions.length,
        quizId: quizId || 'new',
        userId: auth.currentUser?.uid,
        fromNote: !!content,
      });
      extractTopicsFromQuestions();
      
      showAlert('success', 'Success', `Added ${convertedQuestions.length} question${convertedQuestions.length > 1 ? 's' : ''} to your quiz!`);
    } catch (error: any) {
      console.error(error);
      showAlert('error', 'Error', error.message || 'Failed to generate quiz questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    showAlert(
      'warning',
      'Discard Changes?',
      'Are you sure you want to discard your changes?',
      [
        {
          text: 'Keep Editing',
          onPress: () => setAlert(prev => ({ ...prev, visible: false })),
          style: 'cancel'
        },
        {
          text: 'Discard',
          onPress: () => {
            resetToDefaults();
            router.back();
            setAlert(prev => ({ ...prev, visible: false }));
          },
          style: 'primary'
        }
      ]
    );
  };

  const handlePublicToggle = (value: boolean) => {
    if (value) {
      setShowPublicWarningModal(true);
    } else {
      setIsPublic(false);
    }
  };

  const confirmSetPublic = () => {
    setIsPublic(true);
    setShowPublicWarningModal(false);
  };

  const handleAddTopic = () => {
    const trimmedTopic = newTopicInput.trim();
    
    if (!trimmedTopic) {
      showAlert('warning', 'Validation Error', 'Topic name cannot be empty.');
      return;
    }

    if (trimmedTopic.length > 50) {
      showAlert('warning', 'Validation Error', 'Topic name must be 50 characters or less.');
      return;
    }

    const success = addTopic(trimmedTopic);
    
    if (success) {
      setNewTopicInput('');
      showAlert('success', 'Success', `Topic "${trimmedTopic}" added successfully!`);
    } else {
      showAlert('warning', 'Duplicate Topic', 'This topic already exists.');
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
      showAlert('warning', 'Validation Error', 'Topic name cannot be empty.');
      return;
    }

    if (trimmedTopic.length > 50) {
      showAlert('warning', 'Validation Error', 'Topic name must be 50 characters or less.');
      return;
    }

    const success = updateTopic(editingTopic, trimmedTopic);
    
    if (success) {
      setEditingTopic(null);
      setEditTopicInput('');
      showAlert('success', 'Success', 'Topic updated successfully!');
    } else {
      showAlert('error', 'Error', 'A topic with this name already exists.');
    }
  };

  const handleDeleteTopic = (topic: string) => {
    showAlert(
      'warning',
      'Delete Topic',
      `Are you sure you want to delete "${topic}"? Questions using this topic will have their topic cleared.`,
      [
        {
          text: 'Cancel',
          onPress: () => setAlert(prev => ({ ...prev, visible: false })),
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: () => {
            deleteTopic(topic);
            setAlert(prev => ({ ...prev, visible: false }));
            showAlert('success', 'Success', 'Topic deleted successfully!');
          },
          style: 'primary'
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
    const imageSource = item.image 
      ? getQuizImageSource(item.image) 
      : null;
    
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
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Ionicons name="close" size={24} color="#94a3b8" />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.saveButton, { opacity: isLoading || uploadingImage ? 0.6 : 1 }]}
            onPress={handleSaveQuiz}
            disabled={isLoading || uploadingImage}
          >
            <Ionicons name="checkmark" size={20} color="#ffffff" />
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity 
            style={styles.imageContainer} 
            onPress={handleImagePicker}
            disabled={uploadingImage}
          >
            {quizImage ? (
              <>
                <Image source={getQuizImageSource(quizImage)} style={styles.quizImage} />
                {uploadingImage && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.uploadProgressText}>Uploading...</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                {uploadingImage ? (
                  <>
                    <ActivityIndicator size="large" color="#64748b" />
                    <Text style={styles.imagePlaceholderText}>Uploading...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="image-outline" size={48} color="#64748b" />
                    <Text style={styles.imagePlaceholderText}>Tap to add quiz image</Text>
                  </>
                )}
              </View>
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.titleInput}
            placeholder="Enter quiz title..."
            placeholderTextColor="#64748b"
            value={quizTitle}
            onChangeText={setQuizTitle}
            multiline
          />

          <View style={styles.privacySection}>
            <View style={styles.privacySectionHeader}>
              <View style={styles.privacyIconContainer}>
                <Ionicons 
                  name={isPublic ? "globe" : "lock-closed"} 
                  size={20} 
                  color={isPublic ? "#10b981" : "#64748b"} 
                />
              </View>
              <View style={styles.privacyTextContainer}>
                <Text style={styles.privacySectionTitle}>
                  {isPublic ? "Public Quiz" : "Private Quiz"}
                </Text>
                <Text style={styles.privacySectionDescription}>
                  {isPublic 
                    ? "Anyone can view and take this quiz" 
                    : "Only you can access this quiz"}
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={handlePublicToggle}
                trackColor={{ false: "#334155", true: "#10b981" }}
                thumbColor={isPublic ? "#ffffff" : "#94a3b8"}
                ios_backgroundColor="#334155"
              />
            </View>
            
            {isPublic && (
              <View style={styles.publicBadge}>
                <Ionicons name="globe-outline" size={14} color="#10b981" />
                <Text style={styles.publicBadgeText}>
                  This quiz is visible on your profile
                </Text>
              </View>
            )}
          </View>

          <View style={styles.topicsSection}>
            <View style={styles.topicsHeader}>
              <Text style={styles.topicsTitle}>Topics ({topics.length})</Text>
              <TouchableOpacity
                style={styles.manageTopicsButton}
                onPress={() => setShowManageTopicsModal(true)}
              >
                <Ionicons name="pricetags" size={16} color="#ffffff" />
                <Text style={styles.manageTopicsButtonText}>Manage Tags</Text>
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

          {isLoading && (
            <View style={styles.loadingContainer}>
              <Ionicons name="hourglass-outline" size={24} color="#8b5cf6" />
              <Text style={styles.loadingText}>{loadingMessage || 'Loading...'}</Text>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity 
          style={[styles.fab, { opacity: isLoading || uploadingImage ? 0.6 : 1 }]} 
          onPress={handleAddQuestion}
          disabled={isLoading || uploadingImage}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
          <Text style={styles.fabText}>Add Question</Text>
        </TouchableOpacity>

        {/* All modals remain the same as before */}
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

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowManageTopicsModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <TopicSelectionModal
          visible={showTopicModal}
          onClose={() => setShowTopicModal(false)}
          onTopicSelected={handleTopicSelected}
        />

        <Modal
          visible={showPublicWarningModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPublicWarningModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.warningModalContent}>
              <View style={styles.warningIconContainer}>
                <Ionicons name="alert-circle" size={48} color="#f59e0b" />
              </View>
              
              <Text style={styles.warningModalTitle}>Make Quiz Public?</Text>
              
              <Text style={styles.warningModalText}>
                This quiz will be visible on your profile and anyone will be able to view and take it.
              </Text>
              
              <View style={styles.warningModalActions}>
                <TouchableOpacity
                  style={styles.warningModalCancelBtn}
                  onPress={() => setShowPublicWarningModal(false)}
                >
                  <Text style={styles.warningModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.warningModalConfirmBtn}
                  onPress={confirmSetPublic}
                >
                  <Ionicons name="globe-outline" size={18} color="#ffffff" />
                  <Text style={styles.warningModalConfirmText}>Make Public</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <CustomAlertModal
          visible={alert.visible}
          type={alert.type}
          title={alert.title}
          message={alert.message}
          buttons={alert.buttons}
          onClose={() => setAlert(prev => ({ ...prev, visible: false }))}
        />

       <CustomAlertModal
        visible={showImagePickerModal}
        type="info"
        title="Select Quiz Cover"
        message="Choose an image source for your quiz"
        buttons={
          quizImage 
            ? [
                {
                  text: 'Camera Roll',
                  onPress: () => {
                    setShowImagePickerModal(false);
                    selectFromCameraRoll();
                  },
                  style: 'primary'
                },
                {
                  text: 'Remove Image',
                  onPress: handleRemoveImage,
                  style: 'default'
                },
                {
                  text: 'Cancel',
                  onPress: () => setShowImagePickerModal(false),
                  style: 'cancel'
                }
              ]
            : [
                {
                  text: 'Camera Roll',
                  onPress: () => {
                    setShowImagePickerModal(false);
                    selectFromCameraRoll();
                  },
                  style: 'primary'
                },
                
                {
                  text: 'Cancel',
                  onPress: () => setShowImagePickerModal(false),
                  style: 'cancel'
                }
              ]
        }
        onClose={() => setShowImagePickerModal(false)}
      />
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    position: 'relative',
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
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  uploadProgressText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
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
  privacySection: {
    marginBottom: 24,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  privacySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  privacyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  privacySectionDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  publicBadgeText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '500',
  },
  warningModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  warningIconContainer: {
    marginBottom: 16,
  },
  warningModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  warningModalText: {
    fontSize: 15,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  warningModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  warningModalCancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  warningModalCancelText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  warningModalConfirmBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  warningModalConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QuizOverview;
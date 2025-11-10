// File: app/Quiz/quiz-create.tsx - Updated with Firebase Storage Integration and Enhanced UI
import { convertAPIQuestionToInternalFormat, generateQuizFromAI } from '@/api/quizApi';
import { TopicSelectionModal } from '@/components/Interface/ai-quiz-modal';
import { auth } from '@/firebase';
import { useBacklogLogger } from '@/hooks/useBackLogLogger';
import { BACKLOG_EVENTS } from '@/services/backlogEvents';
import {
  deleteQuizImage,
  extractStoragePathFromUrl,
  getQuizImageSource,
  isFirebaseStorageUrl,
  pickImage,
  takePhoto,
  uploadQuestionImage
} from '@/services/image-service';
import { QuizService, type Question, type Quiz } from '@/services/quiz-service';
import { useQuizStore } from '@/services/stores/quiz-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const QuizMaker = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addBacklogEvent, logError } = useBacklogLogger();
  const {
    quizTitle,
    questions,
    topics,
    currentQuestionIndex,
    isLoading,
    loadingMessage,
    isFromOverview,
    setQuizTitle,
    updateQuestion,
    setCurrentQuestionIndex,
    setLoading,
    setIsFromOverview,
    addQuestion: addQuestionToStore,
    deleteQuestion: deleteQuestionFromStore,
    addTopic
  } = useQuizStore();

  const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);
  const [showQuestionTypeModal, setShowQuestionTypeModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showTopicSelectorModal, setShowTopicSelectorModal] = useState(false);
  const [showEllipsisMenu, setShowEllipsisMenu] = useState(false);
  const [customTimeLimit, setCustomTimeLimit] = useState('');
  const [newTopicInput, setNewTopicInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showQuestionFocusModal, setShowQuestionFocusModal] = useState(false);
  const [focusedQuestionText, setFocusedQuestionText] = useState('');

  const questionTypes = [
    { key: 'multiple_choice', label: 'Multiple Choice', icon: 'checkmark-circle-outline' },
    { key: 'fill_blank', label: 'Fill in the Blank', icon: 'create-outline' },
    { key: 'matching', label: 'Matching', icon: 'git-compare-outline' }
  ];

  const timeLimitPresets = [10, 15, 20, 30, 45, 60, 90, 120];

  useEffect(() => {
    const { questionIndex } = params;
    if (questionIndex && typeof questionIndex === 'string') {
      const index = parseInt(questionIndex, 10);
      if (!isNaN(index) && index >= 0 && index < questions.length) {
        setCurrentQuestionIndex(index);
      }
      setIsFromOverview(true);
    }
  }, [params.questionIndex, questions.length, setCurrentQuestionIndex, setIsFromOverview]);

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
    addQuestionToStore(newQuestion);
    setCurrentQuestionIndex(questions.length);
  };

  const handleQuestionChange = (text: string) => {
    const updated = { ...questions[currentQuestionIndex] };
    updated.question = text;
    updateQuestion(currentQuestionIndex, updated);
  };

  const handleOpenQuestionFocus = () => {
    setFocusedQuestionText(questions[currentQuestionIndex].question);
    setShowQuestionFocusModal(true);
  };

  const handleSaveQuestionFocus = () => {
    const updated = { ...questions[currentQuestionIndex] };
    updated.question = focusedQuestionText;
    updateQuestion(currentQuestionIndex, updated);
    setShowQuestionFocusModal(false);
  };

  const calculateFontSize = (text: string, baseSize: number = 15): number => {
    const length = text.length;
    if (length <= 20) return baseSize;
    if (length <= 30) return baseSize - 1;
    if (length <= 40) return baseSize - 2;
    return baseSize - 3; // minimum font size
  };

  const handleQuestionTypeChange = (type: Question['type']) => {
    const currentQ = { ...questions[currentQuestionIndex] };
    
    if (type === 'multiple_choice') {
      currentQ.type = type;
      currentQ.options = ['', '', '', ''];
      currentQ.correctAnswers = [0];
      currentQ.matchPairs = [];
      currentQ.correctAnswer = '';
    } else if (type === 'fill_blank') {
      currentQ.type = type;
      currentQ.options = [];
      currentQ.correctAnswers = [];
      currentQ.matchPairs = [];
      currentQ.correctAnswer = '';
    } else if (type === 'matching') {
      currentQ.type = type;
      currentQ.options = [];
      currentQ.correctAnswers = [];
      currentQ.matchPairs = [
        { left: '', right: '' },
        { left: '', right: '' },
        { left: '', right: '' }
      ];
      currentQ.correctAnswer = '';
    }
    
    updateQuestion(currentQuestionIndex, currentQ);
    setShowQuestionTypeModal(false);
  };

  const handleOptionChange = (oIndex: number, text: string) => {
    if (text.length > 50) return; // Enforce 50 character limit
    const updated = { ...questions[currentQuestionIndex] };
    updated.options[oIndex] = text;
    updateQuestion(currentQuestionIndex, updated);
  };

  const handleSetCorrectAnswer = (answerIndex: number) => {
    const updated = { ...questions[currentQuestionIndex] };
    
    if (updated.type === 'multiple_choice') {
      const currentAnswers = [...updated.correctAnswers];
      const index = currentAnswers.indexOf(answerIndex);
      
      if (index > -1) {
        currentAnswers.splice(index, 1);
      } else {
        currentAnswers.push(answerIndex);
      }
      
      if (currentAnswers.length === 0) {
        currentAnswers.push(answerIndex);
      }
      
      updated.correctAnswers = currentAnswers;
    }
    
    updateQuestion(currentQuestionIndex, updated);
  };

  const handleFillBlankAnswerChange = (text: string) => {
    const updated = { ...questions[currentQuestionIndex] };
    updated.correctAnswer = text;
    updateQuestion(currentQuestionIndex, updated);
  };

  const handleMatchPairChange = (pairIndex: number, side: 'left' | 'right', text: string) => {
    const updated = { ...questions[currentQuestionIndex] };
    const matchPairs = [...updated.matchPairs];
    matchPairs[pairIndex][side] = text;
    updated.matchPairs = matchPairs;
    updateQuestion(currentQuestionIndex, updated);
  };

  const handleAddMatchPair = () => {
    const updated = { ...questions[currentQuestionIndex] };
    const matchPairs = [...updated.matchPairs];
    matchPairs.push({ left: '', right: '' });
    updated.matchPairs = matchPairs;
    updateQuestion(currentQuestionIndex, updated);
  };

  const handleRemoveMatchPair = (pairIndex: number) => {
    const updated = { ...questions[currentQuestionIndex] };
    const matchPairs = [...updated.matchPairs];
    if (matchPairs.length > 2) {
      matchPairs.splice(pairIndex, 1);
      updated.matchPairs = matchPairs;
      updateQuestion(currentQuestionIndex, updated);
    }
  };

  const handleTimeLimitChange = (timeLimit: number) => {
    const updated = { ...questions[currentQuestionIndex] };
    updated.timeLimit = timeLimit;
    updateQuestion(currentQuestionIndex, updated);
    setShowTimeLimitModal(false);
  };

  const handleCustomTimeLimit = () => {
    const time = parseInt(customTimeLimit);
    if (time && time > 0 && time <= 300) {
      handleTimeLimitChange(time);
      setCustomTimeLimit('');
    } else {
      Alert.alert('Invalid Time', 'Please enter a time between 1 and 300 seconds');
    }
  };

  const handleTopicSelect = (topic: string) => {
    const updated = { ...questions[currentQuestionIndex] };
    updated.topic = topic;
    updateQuestion(currentQuestionIndex, updated);
    setShowTopicSelectorModal(false);
  };

  const handleAddNewTopicFromSelector = () => {
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
      const updated = { ...questions[currentQuestionIndex] };
      updated.topic = trimmedTopic;
      updateQuestion(currentQuestionIndex, updated);
      
      setNewTopicInput('');
      setShowTopicSelectorModal(false);
      Alert.alert('Success', `Topic "${trimmedTopic}" added and assigned!`);
    } else {
      Alert.alert('Duplicate Topic', 'This topic already exists.');
    }
  };

  const handleClearTopic = () => {
    const updated = { ...questions[currentQuestionIndex] };
    updated.topic = '';
    updateQuestion(currentQuestionIndex, updated);
  };

  const handleSelectImage = () => {
    Alert.alert(
      'Add Question Image',
      'Choose an image source',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Camera',
          onPress: selectFromCamera
        },
        {
          text: 'Photo Library',
          onPress: selectFromGallery
        },
        ...(questions[currentQuestionIndex].image && isFirebaseStorageUrl(questions[currentQuestionIndex].image) 
          ? [{
              text: 'Remove Image',
              onPress: handleRemoveImage,
              style: 'destructive' as const
            }]
          : []
        )
      ]
    );
  };

  const selectFromCamera = async () => {
    try {
      const imageAsset = await takePhoto();
      if (imageAsset) {
        await uploadQuestionImageToFirebase(imageAsset.uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const selectFromGallery = async () => {
    try {
      const imageAsset = await pickImage();
      if (imageAsset) {
        await uploadQuestionImageToFirebase(imageAsset.uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadQuestionImageToFirebase = async (localUri: string) => {
    const currentQuestion = questions[currentQuestionIndex];
    const quizId = Date.now().toString();
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to upload images.');
      return;
    }
    
    setUploadingImage(true);
    
    try {
      if (currentQuestion.image && isFirebaseStorageUrl(currentQuestion.image)) {
        const oldPath = extractStoragePathFromUrl(currentQuestion.image);
        if (oldPath) {
          await deleteQuizImage(oldPath).catch(err => 
            console.log('Old image already deleted or not found')
          );
        }
      }
      
      const result = await uploadQuestionImage(
        quizId,
        currentQuestion.id,
        localUri,
        userId
      );
      
      const updated = { ...currentQuestion };
      updated.image = result.url;
      updateQuestion(currentQuestionIndex, updated);
      
      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (currentQuestion.image && isFirebaseStorageUrl(currentQuestion.image)) {
      const imagePath = extractStoragePathFromUrl(currentQuestion.image);
      if (imagePath) {
        await deleteQuizImage(imagePath).catch(err => 
          console.log('Image already deleted or not found')
        );
      }
    }
    
    const updated = { ...currentQuestion };
    updated.image = '';
    updateQuestion(currentQuestionIndex, updated);
    
    Alert.alert('Success', 'Image removed successfully!');
  };

  const handleSaveQuiz = async () => {
    if (isFromOverview) {
      router.back();
      return;
    }

    if (!quizTitle.trim()) {
      Alert.alert('Validation Error', 'Please enter a quiz title.');
      return;
    }

    const quiz: Omit<Quiz, 'uid' | 'id' | 'createdAt' | 'updatedAt'> = {
      title: quizTitle,
      questions,
      topics,
      isPublic: false
    };

    const validation = QuizService.validateQuiz(quiz);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    try {
      setLoading(true, 'Saving quiz...');
      
      const quizId = await QuizService.createQuiz(quiz);
      addBacklogEvent(BACKLOG_EVENTS.USER_CREATED_QUIZ, {
        quizId,
        title: quizTitle,
        questionCount: questions.length,
        userId: auth.currentUser?.uid,
      });

      router.push({ 
        pathname: './quiz-preview',
        params: { quizId: quizId }
      });
    } catch (error: any) {
      Alert.alert('Storage Error', error.message || 'Failed to save the quiz.');
      logError(error, 'handleSaveQuiz');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = () => {
    if (questions.length <= 1) {
      Alert.alert('Cannot Delete', 'You must have at least one question.');
      return;
    }

    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const question = questions[currentQuestionIndex];
            
            if (question.image && isFirebaseStorageUrl(question.image)) {
              const imagePath = extractStoragePathFromUrl(question.image);
              if (imagePath) {
                await deleteQuizImage(imagePath).catch(err => 
                  console.log('Image already deleted or not found')
                );
              }
            }
            addBacklogEvent(BACKLOG_EVENTS.USER_DELETED_QUIZ, {  // Using USER_DELETED_QUIZ for question deletion
              questionId: questions[currentQuestionIndex].id,
              quizTitle,
              userId: auth.currentUser?.uid,
            });
            deleteQuestionFromStore(currentQuestionIndex);
          },
        },
      ]
    );
  };

  const handleGenerateQuizAI = () => {
    setShowTopicModal(true);
  };

  const handleTopicSelected = async (topic: string, questionType: string, questionCount: number, content?: string) => {
    Alert.alert(
      "Generate Quiz",
      content 
        ? `Generate ${questionCount} ${questionType.replace('_', ' ')} question${questionCount > 1 ? 's' : ''} from note: "${topic}"?` 
        : `Generate ${questionCount} ${questionType.replace('_', ' ')} question${questionCount > 1 ? 's' : ''} about "${topic}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Generate",
          onPress: async () => {
            setLoading(true, 'Generating quiz with AI...');
            
            try {
              const aiQuestions = await generateQuizFromAI(topic, questionCount, content, [questionType]);
              
              const convertedQuestions = aiQuestions.map((apiQuestion, index) => ({
                ...convertAPIQuestionToInternalFormat(apiQuestion),
                id: `ai_question_${Date.now()}_${index}`
              }));
              addBacklogEvent(BACKLOG_EVENTS.USER_GENERATED_QUIZ_WITH_AI, {
                topic,
                questionCount,
                questionType,
                generatedQuestions: convertedQuestions.length,
                userId: auth.currentUser?.uid,
                fromNote: !!content,
              });
              
              useQuizStore.getState().setQuestions([...questions, ...convertedQuestions]);
              
              if (!quizTitle.trim()) {
                setQuizTitle(topic);
              }
              
              Alert.alert("Success", `Added ${convertedQuestions.length} question${convertedQuestions.length > 1 ? 's' : ''} to your quiz!`);
            } catch (error: any) {
              console.error(error);
              Alert.alert("Error", error.message || 'Failed to generate quiz questions.');
              
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
  };

  const renderQuestionContent = () => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return null;
    
    switch (currentQuestion.type) {
      case 'multiple_choice':
        return (
          <View style={styles.answerGrid}>
            {currentQuestion.options.map((opt, oIndex) => (
              <TouchableOpacity
                key={oIndex}
                style={[
                  styles.answerBtn, 
                  answerColors[oIndex],
                  currentQuestion.correctAnswers.includes(oIndex) && styles.selectedAnswer
                ]}
                onPress={() => handleSetCorrectAnswer(oIndex)}
                activeOpacity={0.8}
              >
                <View style={styles.radioRow}>
                  <View style={styles.radioCircleOuter}>
                    {currentQuestion.correctAnswers.includes(oIndex) && (
                      <View style={styles.radioCircleInner} />
                    )}
                  </View>
                  <TextInput
                    placeholder={`Answer ${oIndex + 1}`}
                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                    value={opt}
                    onChangeText={(text) => handleOptionChange(oIndex, text)}
                    style={[
                      styles.answerInput,
                      { fontSize: calculateFontSize(opt) }
                    ]}
                    maxLength={50}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'fill_blank':
        return (
          <View style={styles.fillBlankContainer}>
            <Text style={styles.fillBlankLabel}>Correct Answer:</Text>
            <TextInput
              placeholder="Enter the correct answer"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={currentQuestion.correctAnswer}
              onChangeText={handleFillBlankAnswerChange}
              style={styles.fillBlankInput}
            />
            <Text style={styles.fillBlankHint}>
              Tip: Use underscores (_____) in your question to show where the blank should be
            </Text>
          </View>
        );

      case 'matching':
        return (
          <View style={styles.matchingContainer}>
            <Text style={styles.matchingLabel}>Match Pairs:</Text>
            {currentQuestion.matchPairs.map((pair, pIndex) => (
              <View key={pIndex} style={styles.matchPair}>
                <TextInput
                  placeholder={`Left ${pIndex + 1}`}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={pair.left}
                  onChangeText={(text) => handleMatchPairChange(pIndex, 'left', text)}
                  style={[styles.matchInput, styles.matchInputLeft]}
                />
                <Ionicons name="swap-horizontal" size={20} color="#fff" />
                <TextInput
                  placeholder={`Right ${pIndex + 1}`}
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={pair.right}
                  onChangeText={(text) => handleMatchPairChange(pIndex, 'right', text)}
                  style={[styles.matchInput, styles.matchInputRight]}
                />
                {currentQuestion.matchPairs.length > 2 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveMatchPair(pIndex)}
                    style={styles.removePairBtn}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={handleAddMatchPair}
              style={styles.addPairBtn}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addPairText}>Add Pair</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  const answerColors = [styles.color0, styles.color1, styles.color2, styles.color3];
  const currentQuestion = questions[currentQuestionIndex];
  const currentQuestionType = questionTypes.find(t => t.key === currentQuestion?.type);

  if (!currentQuestion) {
    return (
      <LinearGradient
        colors={['#0A1C3C', '#324762']}
        start={{ x: 1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>No question selected</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.saveBtn}>
              <Text style={styles.btnText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0A1C3C', '#324762']}
      start={{ x: 1, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setShowQuestionTypeModal(true)}
            style={styles.questionTypeDropdown}
          >
            <Ionicons name={currentQuestionType?.icon as any} size={20} color="#fff" />
            <Text style={styles.questionTypeDropdownText}>
              {currentQuestionType?.label}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => setShowEllipsisMenu(true)} 
              style={styles.ellipsisBtn}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleSaveQuiz} 
              style={styles.saveBtn}
              disabled={uploadingImage}
            >
              <Text style={styles.btnText}>
                {isFromOverview ? 'Done' : 'Save & Preview'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          <View style={styles.questionInputContainer}>
            <TouchableOpacity 
              style={styles.questionInputWrapper}
              onPress={handleOpenQuestionFocus}
              activeOpacity={0.8}
            >
              <Text 
                style={[
                  styles.questionInputDisplay,
                  !currentQuestion.question && { color: 'rgba(255, 255, 255, 0.5)' }
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {currentQuestion.question || 'Enter your question'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowTopicSelectorModal(true)}
              style={[
                styles.topicIconBtn,
                currentQuestion.topic && styles.topicIconBtnActive
              ]}
            >
              <Ionicons 
                name={currentQuestion.topic ? "pricetag" : "pricetag-outline"} 
                size={20} 
                color={currentQuestion.topic ? "#8b5cf6" : "#fff"} 
              />
              {currentQuestion.topic && (
                <View style={styles.topicIndicatorDot} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.imageContainer}>
            <TouchableOpacity
              style={styles.imageBox}
              onPress={handleSelectImage}
              disabled={uploadingImage}
            >
              {currentQuestion.image ? (
                <>
                  <Image 
                    source={getQuizImageSource(currentQuestion.image)}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  {uploadingImage && (
                    <View style={styles.uploadOverlay}>
                      <ActivityIndicator size="large" color="#ffffff" />
                      <Text style={styles.uploadingText}>Uploading...</Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.imagePlaceholderContent}>
                  {uploadingImage ? (
                    <>
                      <ActivityIndicator size="large" color="rgba(255, 255, 255, 0.3)" />
                      <Text style={styles.imagePlaceholder}>Uploading...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={48} color="rgba(255, 255, 255, 0.3)" />
                      <Text style={styles.imagePlaceholder}>Add Image</Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowTimeLimitModal(true)}
              style={styles.timeLimitPill}
            >
              <Ionicons name="time-outline" size={16} color="#fff" />
              <Text style={styles.timeLimitPillText}>
                {formatTime(currentQuestion.timeLimit)}
              </Text>
            </TouchableOpacity>
          </View>

          {renderQuestionContent()}
        </ScrollView>

        <View style={styles.bottomBar}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.questionNavBar}
            contentContainerStyle={styles.questionNavContent}
          >
            {questions.map((q, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.questionNavItem,
                  index === currentQuestionIndex && styles.questionNavItemActive
                ]}
                onPress={() => setCurrentQuestionIndex(index)}
              >
                <Text style={[
                  styles.questionNavText,
                  index === currentQuestionIndex && styles.questionNavTextActive
                ]}>
                  {index + 1}
                </Text>
                {q.topic && (
                  <View style={styles.navTopicIndicator} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {!isFromOverview && (
            <TouchableOpacity
              style={styles.addQuestionBtn}
              onPress={handleAddQuestion}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <Modal
          visible={showEllipsisMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEllipsisMenu(false)}
        >
          <TouchableOpacity 
            style={styles.ellipsisOverlay}
            activeOpacity={1}
            onPress={() => setShowEllipsisMenu(false)}
          >
            <View style={styles.ellipsisMenu}>
              {!isFromOverview && (
                <TouchableOpacity
                  style={styles.ellipsisMenuItem}
                  onPress={() => {
                    setShowEllipsisMenu(false);
                    handleGenerateQuizAI();
                  }}
                >
                  <Ionicons name="bulb-outline" size={20} color="#fff" />
                  <Text style={styles.ellipsisMenuText}>Generate with AI</Text>
                </TouchableOpacity>
              )}
              
              {questions.length > 1 && (
                <TouchableOpacity
                  style={[styles.ellipsisMenuItem, styles.ellipsisMenuItemDanger]}
                  onPress={() => {
                    setShowEllipsisMenu(false);
                    handleDeleteQuestion();
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  <Text style={[styles.ellipsisMenuText, styles.ellipsisMenuTextDanger]}>
                    Delete Question
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal
          visible={showTopicSelectorModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTopicSelectorModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Topic</Text>
                <TouchableOpacity
                  onPress={() => setShowTopicSelectorModal(false)}
                  style={styles.modalCloseIcon}
                >
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <View style={styles.addTopicInModalSection}>
                <Text style={styles.addTopicInModalLabel}>Add New Topic:</Text>
                <View style={styles.addTopicInModalRow}>
                  <TextInput
                    style={styles.newTopicInModalInput}
                    placeholder="Enter topic name..."
                    placeholderTextColor="#64748b"
                    value={newTopicInput}
                    onChangeText={setNewTopicInput}
                    maxLength={50}
                  />
                  <TouchableOpacity
                    style={styles.addTopicInModalBtn}
                    onPress={handleAddNewTopicFromSelector}
                  >
                    <Ionicons name="add-circle" size={20} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.topicsList}>
                {topics.length === 0 ? (
                  <View style={styles.emptyTopicsInModal}>
                    <Ionicons name="pricetags-outline" size={48} color="#475569" />
                    <Text style={styles.emptyTopicsInModalText}>No topics available</Text>
                    <Text style={styles.emptyTopicsInModalSubtext}>
                      Add topics in the quiz overview or create one above
                    </Text>
                  </View>
                ) : (
                  topics.map((topic, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.topicOption,
                        currentQuestion.topic === topic && styles.topicOptionSelected
                      ]}
                      onPress={() => handleTopicSelect(topic)}
                    >
                      <View style={styles.topicOptionContent}>
                        <Ionicons 
                          name={currentQuestion.topic === topic ? "checkmark-circle" : "pricetag"} 
                          size={20} 
                          color={currentQuestion.topic === topic ? "#10b981" : "#8b5cf6"} 
                        />
                        <Text style={[
                          styles.topicOptionText,
                          currentQuestion.topic === topic && styles.topicOptionTextSelected
                        ]}>
                          {topic}
                        </Text>
                      </View>
                      <Text style={styles.topicUsageInModal}>
                        {questions.filter(q => q.topic === topic).length} questions
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

              {currentQuestion.topic && (
                <TouchableOpacity
                  style={styles.clearTopicInModalBtn}
                  onPress={() => {
                    handleClearTopic();
                    setShowTopicSelectorModal(false);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color="#ef4444" />
                  <Text style={styles.clearTopicInModalText}>Clear Topic</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Modal>

        <Modal
          visible={showTimeLimitModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimeLimitModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Set Time Limit</Text>
                <TouchableOpacity
                  onPress={() => setShowTimeLimitModal(false)}
                  style={styles.modalCloseIcon}
                >
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.presetTimesContainer}>
                <Text style={styles.presetTimesLabel}>Presets:</Text>
                <View style={styles.presetTimesGrid}>
                  {timeLimitPresets.map((time) => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.presetTimeBtn,
                        currentQuestion.timeLimit === time && styles.presetTimeBtnActive
                      ]}
                      onPress={() => handleTimeLimitChange(time)}
                    >
                      <Text style={[
                        styles.presetTimeText,
                        currentQuestion.timeLimit === time && styles.presetTimeTextActive
                      ]}>
                        {formatTime(time)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.customTimeContainer}>
                <Text style={styles.customTimeLabel}>Custom (1-300 seconds):</Text>
                <View style={styles.customTimeRow}>
                  <TextInput
                    placeholder="Enter seconds"
                    placeholderTextColor="#64748b"
                    value={customTimeLimit}
                    onChangeText={setCustomTimeLimit}
                    keyboardType="numeric"
                    style={styles.customTimeInput}
                  />
                  <TouchableOpacity
                    onPress={handleCustomTimeLimit}
                    style={styles.customTimeBtn}
                  >
                    <Text style={styles.customTimeBtnText}>Set</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showQuestionTypeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowQuestionTypeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Question Type</Text>
                <TouchableOpacity
                  onPress={() => setShowQuestionTypeModal(false)}
                  style={styles.modalCloseIcon}
                >
                  <Ionicons name="close" size={24} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              
              {questionTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.questionTypeOption,
                    currentQuestion.type === type.key && styles.questionTypeOptionActive
                  ]}
                  onPress={() => handleQuestionTypeChange(type.key as Question['type'])}
                >
                  <Ionicons name={type.icon as any} size={24} color="#fff" />
                  <Text style={[
                    styles.questionTypeOptionText,
                    currentQuestion.type === type.key && styles.questionTypeOptionTextActive
                  ]}>
                    {type.label}
                  </Text>
                  {currentQuestion.type === type.key && (
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" style={{ marginLeft: 'auto' }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {!isFromOverview && (
          <TopicSelectionModal
            visible={showTopicModal}
            onClose={() => setShowTopicModal(false)}
            onTopicSelected={handleTopicSelected}
          />
        )}

        <Modal
          visible={showQuestionFocusModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowQuestionFocusModal(false)}
        >
          <TouchableOpacity 
            style={styles.focusModalOverlay}
            activeOpacity={1}
            onPress={() => setShowQuestionFocusModal(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.focusModalContent}
            >
              <View style={styles.focusModalHeader}>
                <Text style={styles.focusModalTitle}>Edit Question</Text>
                <TouchableOpacity
                  onPress={handleSaveQuestionFocus}
                  style={styles.focusModalDoneBtn}
                >
                  <Text style={styles.focusModalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              
              <TextInput
                placeholder="Enter your question"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={focusedQuestionText}
                onChangeText={setFocusedQuestionText}
                style={styles.focusModalInput}
                multiline
                autoFocus
                textAlignVertical="top"
              />
              
              <View style={styles.focusModalFooter}>
                <Text style={styles.focusModalCharCount}>
                  {focusedQuestionText.length} characters
                </Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <LottieView
              source={require('@/assets/animations/quiz-loading.json')}
              autoPlay
              loop
              style={{ width: 150, height: 150 }}
            />
            <Text style={styles.loadingText}>
              {loadingMessage || 'Processing...'}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
};

export default QuizMaker;

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionTypeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  questionTypeDropdownText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ellipsisBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  questionInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 12,
  },
  questionInputWrapper: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 18,
    minHeight: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
  },
  questionInputDisplay: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  topicIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },
  topicIconBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: 'rgba(139, 92, 246, 0.5)',
  },
  topicIndicatorDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8b5cf6',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  imageBox: {
    height: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  imagePlaceholderContent: {
    alignItems: 'center',
    gap: 12,
  },
  imagePlaceholder: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '600',
    fontSize: 15,
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
  },
  uploadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  timeLimitPill: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 25, 45, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  timeLimitPillText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  ellipsisOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  ellipsisMenu: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  ellipsisMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  ellipsisMenuItemDanger: {
    borderBottomWidth: 0,
  },
  ellipsisMenuText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  ellipsisMenuTextDanger: {
    color: '#ef4444',
  },
  answerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  answerBtn: {
    width: '48%',
    minHeight: 80,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedAnswer: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowOpacity: 0.4,
  },
  answerInput: {
    color: '#fff',
    textAlign: 'center',
    flex: 1,
    fontWeight: '600',
  },
  color0: { backgroundColor: '#ef4444' },
  color1: { backgroundColor: '#f59e0b' },
  color2: { backgroundColor: '#10b981' },
  color3: { backgroundColor: '#3b82f6' },
  radioRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  fillBlankContainer: {
    marginBottom: 20,
  },
  fillBlankLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  fillBlankInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  fillBlankHint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  matchingContainer: {
    marginBottom: 20,
  },
  matchingLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  matchPair: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  matchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  matchInputLeft: { flex: 1 },
  matchInputRight: { flex: 1 },
  removePairBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPairBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderStyle: 'dashed',
  },
  addPairText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionNavBar: {
    flex: 1,
    marginRight: 10,
  },
  questionNavContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  questionNavItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  questionNavItemActive: {
    backgroundColor: '#8b5cf6',
  },
  questionNavText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  questionNavTextActive: {
    color: '#fff',
  },
  navTopicIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  addQuestionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    color: 'white',
    marginTop: 12,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalCloseIcon: {
    padding: 4,
  },
  addTopicInModalSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  addTopicInModalLabel: {
    color: '#c4b5fd',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  addTopicInModalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  newTopicInModalInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addTopicInModalBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicsList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  emptyTopicsInModal: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTopicsInModalText: {
    fontSize: 16,
    color: '#94a3b8',
    fontWeight: '600',
  },
  emptyTopicsInModalSubtext: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  topicOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topicOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  topicOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  topicOptionText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  topicOptionTextSelected: {
    color: '#10b981',
  },
  topicUsageInModal: {
    color: '#64748b',
    fontSize: 12,
  },
  clearTopicInModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  clearTopicInModalText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  presetTimesContainer: {
    marginBottom: 20,
  },
  presetTimesLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  presetTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetTimeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  presetTimeBtnActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  presetTimeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  presetTimeTextActive: {
    color: '#fff',
  },
  customTimeContainer: {
    marginBottom: 20,
  },
  customTimeLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customTimeInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  customTimeBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  customTimeBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  questionTypeOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  questionTypeOptionActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8b5cf6',
  },
  questionTypeOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  questionTypeOptionTextActive: {
    color: '#fff',
  },
  focusModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  focusModalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  focusModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  focusModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  focusModalDoneBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  focusModalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  focusModalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 20,
    color: '#fff',
    fontSize: 18,
    minHeight: 200,
    maxHeight: 400,
    margin: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    lineHeight: 26,
  },
  focusModalFooter: {
    padding: 20,
    paddingTop: 0,
    alignItems: 'flex-end',
  },
  focusModalCharCount: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
  },
});
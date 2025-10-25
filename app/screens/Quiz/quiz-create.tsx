// File: app/Quiz/quiz-create.tsx - Complete Zustand Version with Topic Selector
import { convertAPIQuestionToInternalFormat, generateQuizFromAI } from '@/api/quizApi';
import { TopicSelectionModal } from '@/components/Interface/ai-quiz-modal';
import { QuizService, type Question, type Quiz } from '@/services/quiz-service';
import { useQuizStore } from '@/services/stores/quiz-store';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useState } from 'react';
import {
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

  // Zustand store
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

  // Local state for modals
  const [showTimeLimitModal, setShowTimeLimitModal] = useState(false);
  const [showQuestionTypeModal, setShowQuestionTypeModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showTopicSelectorModal, setShowTopicSelectorModal] = useState(false);
  const [customTimeLimit, setCustomTimeLimit] = useState('');
  const [newTopicInput, setNewTopicInput] = useState('');

  // Handle navigation from overview
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

  // Question type options
  const questionTypes = [
    { key: 'multiple_choice', label: 'Multiple Choice', icon: '☑️' },
    { key: 'fill_blank', label: 'Fill in the Blank', icon: '✏️' },
    { key: 'matching', label: 'Matching', icon: '🔗' }
  ];

  // Time limit presets (in seconds)
  const timeLimitPresets = [10, 15, 20, 30, 45, 60, 90, 120];

  // Question management methods
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

  // Topic management methods
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
      // Assign the new topic to current question
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

  const handleSelectImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const originalUri = result.assets[0].uri;
        const filename = originalUri.split('/').pop();
        const newPath = `${FileSystem.documentDirectory}${filename}`;

        await FileSystem.copyAsync({
          from: originalUri,
          to: newPath,
        });

        const updated = { ...questions[currentQuestionIndex] };
        updated.image = newPath;
        updateQuestion(currentQuestionIndex, updated);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
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
      isPublic: false //NEW LINE
    };

    const validation = QuizService.validateQuiz(quiz);
    if (!validation.isValid) {
      Alert.alert('Validation Error', validation.errors.join('\n'));
      return;
    }

    try {
      setLoading(true, 'Saving quiz...');
      
      const quizId = await QuizService.createQuiz(quiz);

      router.push({ 
        pathname: './quiz-preview',
        params: { quizId: quizId }
      });
    } catch (error: any) {
      Alert.alert('Storage Error', error.message || 'Failed to save the quiz.');
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
          onPress: () => deleteQuestionFromStore(currentQuestionIndex),
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
                    placeholderTextColor="#fff"
                    value={opt}
                    onChangeText={(text) => handleOptionChange(oIndex, text)}
                    style={styles.answerInput}
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
              placeholderTextColor="#fff"
              value={currentQuestion.correctAnswer}
              onChangeText={handleFillBlankAnswerChange}
              style={styles.fillBlankInput}
            />
            <Text style={styles.fillBlankHint}>
              💡 Tip: Use underscores (_____) in your question to show where the blank should be
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
                  placeholderTextColor="#fff"
                  value={pair.left}
                  onChangeText={(text) => handleMatchPairChange(pIndex, 'left', text)}
                  style={[styles.matchInput, styles.matchInputLeft]}
                />
                <Text style={styles.matchConnector}>↔</Text>
                <TextInput
                  placeholder={`Right ${pIndex + 1}`}
                  placeholderTextColor="#fff"
                  value={pair.right}
                  onChangeText={(text) => handleMatchPairChange(pIndex, 'right', text)}
                  style={[styles.matchInput, styles.matchInputRight]}
                />
                {currentQuestion.matchPairs.length > 2 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveMatchPair(pIndex)}
                    style={styles.removePairBtn}
                  >
                    <Text style={styles.removePairText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity
              onPress={handleAddMatchPair}
              style={styles.addPairBtn}
            >
              <Text style={styles.addPairText}>+ Add Pair</Text>
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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Go Back</Text>
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
        {/* Header with Quiz Title */}
        <View style={styles.header}>
          {isFromOverview && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={handleSaveQuiz} style={styles.saveBtn}>
            <Text style={styles.btnText}>
              {isFromOverview ? 'Done' : 'Save & Preview'}
            </Text>
          </TouchableOpacity>

          {!isFromOverview && (
            <TouchableOpacity onPress={handleGenerateQuizAI} style={styles.generateBtn}>
              <Text style={styles.btnText}>Generate with AI</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Main Content - Single Question View */}
        <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionNumber}>Question {currentQuestionIndex + 1}</Text>
            {questions.length > 1 && (
              <TouchableOpacity onPress={handleDeleteQuestion} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Question Type Selector */}
          <TouchableOpacity
            onPress={() => setShowQuestionTypeModal(true)}
            style={styles.questionTypeBtn}
          >
            <Text style={styles.questionTypeText}>
              {currentQuestionType?.icon} {currentQuestionType?.label}
            </Text>
            <Text style={styles.questionTypeArrow}>▼</Text>
          </TouchableOpacity>

          <TextInput
            placeholder="QUESTION"
            placeholderTextColor="#fff"
            value={currentQuestion.question}
            onChangeText={handleQuestionChange}
            style={styles.questionInput}
            multiline={currentQuestion.type === 'fill_blank'}
          />

          {/* Topic Selector Button */}
          <TouchableOpacity
            onPress={() => setShowTopicSelectorModal(true)}
            style={styles.topicSelectorBtn}
          >
            <View style={styles.topicSelectorContent}>
              <Ionicons name="pricetag" size={16} color="#fff" />
              <Text style={styles.topicSelectorText}>
                {currentQuestion.topic ? currentQuestion.topic : 'Select Topic (Optional)'}
              </Text>
            </View>
            {currentQuestion.topic ? (
              <TouchableOpacity
                onPress={handleClearTopic}
                style={styles.clearTopicBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            ) : (
              <Text style={styles.topicSelectorArrow}>▼</Text>
            )}
          </TouchableOpacity>

          {/* Time Limit Button */}
          <TouchableOpacity
            onPress={() => setShowTimeLimitModal(true)}
            style={styles.timeLimitBtn}
          >
            <Text style={styles.timeLimitBtnText}>
              ⏱️ Time Limit: {formatTime(currentQuestion.timeLimit)}
            </Text>
            <Text style={styles.timeLimitArrow}>▼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.imageBox}
            onPress={handleSelectImage}
          >
            {currentQuestion.image ? (
              <Image 
                source={{ uri: currentQuestion.image }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.imagePlaceholder}>Add Image</Text>
            )}
          </TouchableOpacity>

          {renderQuestionContent()}
        </ScrollView>

        {/* Bottom Navigation Bar */}
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
              <Text style={styles.addQuestionText}>+</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Topic Selector Modal */}
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

              {/* Add New Topic Section */}
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

              {/* Topics List */}
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

              {/* Clear Topic Button */}
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

        {/* Time Limit Modal */}
        <Modal
          visible={showTimeLimitModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimeLimitModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Set Time Limit</Text>
              
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

              <TouchableOpacity
                onPress={() => setShowTimeLimitModal(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Question Type Modal */}
        <Modal
          visible={showQuestionTypeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowQuestionTypeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Question Type</Text>
              
              {questionTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.questionTypeOption,
                    currentQuestion.type === type.key && styles.questionTypeOptionActive
                  ]}
                  onPress={() => handleQuestionTypeChange(type.key as Question['type'])}
                >
                  <Text style={styles.questionTypeOptionIcon}>{type.icon}</Text>
                  <Text style={[
                    styles.questionTypeOptionText,
                    currentQuestion.type === type.key && styles.questionTypeOptionTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                onPress={() => setShowQuestionTypeModal(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Topic Selection Modal - Only show when not from overview */}
        {!isFromOverview && (
          <TopicSelectionModal
            visible={showTopicModal}
            onClose={() => setShowTopicModal(false)}
            onTopicSelected={handleTopicSelected}
          />
        )}

        {/* Loading Overlay */}
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

// Add these new styles to your existing StyleSheet (keeping all existing styles)
const styles = StyleSheet.create({
  // ... keep all existing styles from the original file ...
  
  // New styles for topic selector
  topicSelectorBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  topicSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  topicSelectorText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  topicSelectorArrow: {
    color: '#fff',
    fontSize: 12,
  },
  clearTopicBtn: {
    padding: 4,
  },
  navTopicIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8b5cf6',
  },
  
  // Topic selector modal styles
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalCloseIcon: {
    padding: 4,
  },
  addTopicInModalSection: {
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
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
    borderRadius: 8,
    padding: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addTopicInModalBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 8,
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
  
  // Keep all other existing styles...
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    marginRight: 12,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: '#F5B3D7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  generateBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginLeft: 10
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteBtn: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  questionTypeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  questionTypeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  questionTypeArrow: {
    color: '#fff',
    fontSize: 12,
  },
  questionInput: {
    backgroundColor: '#5aa7b4',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    marginBottom: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    minHeight: 50,
  },
  timeLimitBtn: {
    backgroundColor: 'rgba(90, 167, 180, 0.8)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timeLimitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  timeLimitArrow: {
    color: '#fff',
    fontSize: 12,
  },
  imageBox: {
    height: 200,
    backgroundColor: '#ccc',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imagePlaceholder: {
    color: '#555',
    fontWeight: 'bold',
  },
  answerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  answerBtn: {
    width: '48%',
    height: 80,
    padding: 12,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  selectedAnswer: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  answerInput: {
    color: '#fff',
    textAlign: 'center',
    flex: 1,
    fontWeight: 'bold',
    fontSize: 16,
    textShadowColor: 'rgba(179, 179, 179, 0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  color0: { backgroundColor: '#FF999A' },
  color1: { backgroundColor: '#F9D976' },
  color2: { backgroundColor: '#90EE90' },
  color3: { backgroundColor: '#87E3E3' },
  radioRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  fillBlankContainer: {
    marginBottom: 20,
  },
  fillBlankLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  fillBlankInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  fillBlankHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  matchingContainer: {
    marginBottom: 20,
  },
  matchingLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  matchPair: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  matchInputLeft: {
    flex: 1,
    marginRight: 8,
  },
  matchInputRight: {
    flex: 1,
    marginLeft: 8,
  },
  matchConnector: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  removePairBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removePairText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addPairBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
  },
  addPairText: {
    color: '#fff',
    fontWeight: 'bold',
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
    backgroundColor: '#5aa7b4',
  },
  questionNavText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  questionNavTextActive: {
    color: '#fff',
  },
  addQuestionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#308394',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addQuestionText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
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
    backgroundColor: '#1e3a5f',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  presetTimesContainer: {
    marginBottom: 20,
  },
  presetTimesLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  presetTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetTimeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  presetTimeBtnActive: {
    backgroundColor: '#5aa7b4',
    borderColor: '#fff',
  },
  presetTimeText: {
    color: '#fff',
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    marginBottom: 10,
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customTimeInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  customTimeBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  customTimeBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalCloseBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  questionTypeOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  questionTypeOptionActive: {
    backgroundColor: '#5aa7b4',
    borderColor: '#fff',
  },
  questionTypeOptionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  questionTypeOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  questionTypeOptionTextActive: {
    color: '#fff',
  },
});
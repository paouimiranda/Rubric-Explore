// TopicSelectionModal.tsx - Enhanced with Recent Notes Sub-Tab
import { useAuth } from '@/app/contexts/AuthContext';
import { db, firestore } from '@/firebase';
import { getMergedNoteContent, getNotebooks, getNotesInNotebook } from '@/services/notes-service';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, doc, getDoc, getDocs, increment, limit, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CustomAlertModal } from './custom-alert-modal';

const DAILY_LIMIT = 3;

interface NotebookProperty {
  key: string;
  value: string;
}

interface Notebook {
  id: string;
  title: string;
  properties?: NotebookProperty[];
  tags?: string[];
  createdAt: Date;
}

interface Note {
  id: string;
  title: string;
  notebookId: string | null;
  tags?: string[];
  chunkCount: number;
  totalCharacters: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RecentNote {
  id: string;
  noteId: string;
  title: string;
  permission: 'view' | 'edit';
  visitedAt: Date;
  ownerName?: string;
}

interface TopicSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onTopicSelected: (topic: string, questionType: string, questionCount: number, content?: string) => void;
}

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

type NotesSubTab = 'my-notebooks' | 'recent';

export const TopicSelectionModal: React.FC<TopicSelectionModalProps> = ({
  visible,
  onClose,
  onTopicSelected,
}) => {
  const { user } = useAuth();
  const uid = user?.uid;
  
  const [usageCount, setUsageCount] = useState<number>(0);
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'manual' | 'notes'>('manual');
  const [notesSubTab, setNotesSubTab] = useState<NotesSubTab>('my-notebooks');
  const [manualTopic, setManualTopic] = useState('');
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [notePreviews, setNotePreviews] = useState<Record<string, string>>({});
  const [showQuestionCountDropdown, setShowQuestionCountDropdown] = useState(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState('multiple_choice');
  const [questionCount, setQuestionCount] = useState(10);
  const [showQuestionTypeDropdown, setShowQuestionTypeDropdown] = useState(false);

  const getTodayDate = () => new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!visible || !uid) {
      return;
    }
    const fetchAndResetUsageCount = async () => {
      setIsLoadingCount(true);
      try {
        const docRef = doc(firestore, 'QG_Limits', uid);
        const docSnap = await getDoc(docRef);
        const today = getTodayDate();
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          const lastReset = data?.lastResetDate;
          if (lastReset !== today) {
            await updateDoc(docRef, { usageCount: 0, lastResetDate: today });
            setUsageCount(0);
          } else {
            setUsageCount(data?.usageCount || 0);
          }
        } else {
          await setDoc(docRef, { usageCount: 0, lastResetDate: today });
          setUsageCount(0);
        }
      } catch (error) {
        console.error('Error fetching/resetting QG usage count:', error);
        showAlert('error', 'Error', 'Failed to load usage data.', [{ text: 'OK', onPress: () => {}, style: 'primary' }]);
      } finally {
        setIsLoadingCount(false);
      }
    };
    
    fetchAndResetUsageCount();
  }, [visible, uid]);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingGeneration, setPendingGeneration] = useState<{
    topic: string;
    type: string;
    count: number;
    content?: string;
  } | null>(null);

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

  const extractPlainTextFromHtml = (html: string): string => {
    if (!html) return '';
    
    let text = html;
    text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
    text = text.replace(/<img[^>]*>/gi, '');
    text = text.replace(/<video[^>]*>.*?<\/video>/gi, '');
    text = text.replace(/<audio[^>]*>.*?<\/audio>/gi, '');
    text = text.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
    text = text.replace(/<svg[^>]*>.*?<\/svg>/gi, '');
    text = text.replace(/<canvas[^>]*>.*?<\/canvas>/gi, '');
    text = text.replace(/<\/?(div|p|br|h[1-6]|li|tr)[^>]*>/gi, '\n');
    text = text.replace(/<\/?(ul|ol|table|tbody|thead)[^>]*>/gi, '\n\n');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#039;/g, "'");
    text = text.replace(/&apos;/g, "'");
    text = text.replace(/&mdash;/g, '—');
    text = text.replace(/&ndash;/g, '–');
    text = text.replace(/&hellip;/g, '…');
    text = text.replace(/\n\s*\n\s*\n+/g, '\n\n');
    text = text.replace(/[ \t]+/g, ' ');
    text = text.split('\n').map(line => line.trim()).join('\n');
    text = text.trim();
    
    return text;
  };

  const questionTypeOptions = [
    { key: 'multiple_choice', label: 'Multiple Choice', icon: 'checkmark-circle-outline' },
    { key: 'fill_blank', label: 'Fill in the Blank', icon: 'create-outline' },
    { key: 'matching', label: 'Matching', icon: 'git-compare-outline' }
  ];

  const getQuestionCountOptions = (type: string) => {
    if (type === 'matching') {
      return [1];
    }
    return [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  };

  useEffect(() => {
    if (selectedQuestionType === 'matching') {
      setQuestionCount(1);
    } else if (questionCount === 1 && selectedQuestionType !== 'matching') {
      setQuestionCount(10);
    }
  }, [selectedQuestionType]);

  useEffect(() => {
    if (visible && uid && activeTab === 'notes') {
      if (notesSubTab === 'my-notebooks') {
        fetchNotebooks();
      } else if (notesSubTab === 'recent') {
        fetchRecentNotes();
      }
    }
  }, [visible, uid, activeTab, notesSubTab]);

  const fetchNotebooks = async () => {
    if (!uid) return;
    
    try {
      setLoading(true);
      const data = await getNotebooks(uid);
      setNotebooks(data);
    } catch (error) {
      console.error('Error fetching notebooks:', error);
      showAlert('error', 'Error', 'Failed to load notebooks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentNotes = useCallback(async () => {
    if (!uid) return;
    
    setRecentLoading(true);
    try {
      const recentRef = collection(db, 'users', uid, 'recentSharedNotes');
      const q = query(recentRef, orderBy('visitedAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      
      const notes: RecentNote[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const noteRef = doc(db, 'notes', data.noteId);
        const noteSnap = await getDoc(noteRef);
        
        if (noteSnap.exists()) {
          notes.push({
            id: docSnap.id,
            noteId: data.noteId,
            title: noteSnap.data().title || 'Untitled Note',
            permission: data.permission,
            visitedAt: data.visitedAt?.toDate() || new Date(),
            ownerName: data.ownerName,
          });
        }
      }
      setRecentNotes(notes);
      
      // Generate previews for recent notes
      const previews: Record<string, string> = {};
      for (const note of notes) {
        try {
          const htmlContent = await getMergedNoteContent(note.noteId);
          const plainText = extractPlainTextFromHtml(htmlContent);
          previews[note.noteId] = plainText.slice(0, 80) || "No content";
        } catch (err) {
          console.error(`Error getting preview for note ${note.noteId}:`, err);
          previews[note.noteId] = "Error loading preview";
        }
      }
      setNotePreviews(previews);
    } catch (error) {
      console.error('Error fetching recent notes:', error);
      showAlert('error', 'Error', 'Failed to load recent notes. Please try again.');
    } finally {
      setRecentLoading(false);
    }
  }, [uid]);

  const fetchNotes = async (notebookId: string) => {
    if (!uid) return;
    
    try {
      setNotesLoading(true);
      const data = await getNotesInNotebook(notebookId, uid);
      setNotes(data as any);

      const previews: Record<string, string> = {};
      for (const note of data) {
        try {
          const htmlContent = await getMergedNoteContent(note.id);
          const plainText = extractPlainTextFromHtml(htmlContent);
          previews[note.id] = plainText.slice(0, 80) || "No content";
        } catch (err) {
          console.error(`Error getting preview for note ${note.id}:`, err);
          previews[note.id] = "Error loading preview";
        }
      }
      setNotePreviews(previews);
    } catch (error) {
      console.error('Error fetching notes:', error);
      showAlert('error', 'Error', 'Failed to load notes. Please try again.');
    } finally {
      setNotesLoading(false);
    }
  };

  const trackVisitedNote = async (
    noteId: string, 
    noteTitle: string, 
    permission: 'view' | 'edit',
    ownerName?: string
  ) => {
    if (!uid) return;
    
    try {
      const recentRef = doc(db, 'users', uid, 'recentSharedNotes', noteId);
      await setDoc(recentRef, {
        noteId,
        title: noteTitle,
        permission,
        visitedAt: serverTimestamp(),
        ownerName: ownerName || null,
      }, { merge: true });
    } catch (error) {
      console.error('Error tracking visited note:', error);
    }
  };

  const checkUsageAndProceed = async (
    topic: string,
    content?: string
  ) => {
    if (isLoadingCount) {
      showAlert('info', 'Loading', 'Please wait while we check your daily limit.', [{ text: 'OK', onPress: () => {}, style: 'primary' }]);
      return;
    }
    
    if (usageCount >= DAILY_LIMIT) {
      showAlert(
        'warning',
        'Daily Limit Reached',
        `You have used the question generation feature ${DAILY_LIMIT} times today. Please try again tomorrow.`,
        [{ text: 'OK', onPress: () => {}, style: 'primary' }]
      );
      return;
    }
    
    setPendingGeneration({
      topic: topic,
      type: selectedQuestionType,
      count: questionCount,
      content: content, 
    });
    setShowDisclaimer(true);
  };

  const handleNotebookSelect = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    fetchNotes(notebook.id);
  };

  const handleNoteSelect = async (noteId: string, noteTitle: string) => {
    try {
      const htmlContent = await getMergedNoteContent(noteId);

      if (!htmlContent || htmlContent.trim().length === 0) {
        showAlert('warning', 'Empty Note', 'This note has no content to generate questions from.');
        return;
      }

      const plainText = extractPlainTextFromHtml(htmlContent);

      if (!plainText || plainText.trim().length === 0) {
        showAlert(
          'warning',
          'No Text Content',
          'This note only contains images or other non-text elements. Please add some text to generate questions.'
        );
        return;
      }

      if (plainText.length < 50) {
        showAlert(
          'warning',
          'Insufficient Content',
          'This note has too little text content. Please add more content to generate meaningful questions.'
        );
        return;
      }

      await checkUsageAndProceed(noteTitle, plainText);
      console.log('📝 Successfully extracted plain text');
      console.log('📝 Original HTML length:', htmlContent.length);
      console.log('📝 Plain text length:', plainText.length);
      console.log('📝 Plain text preview (first 200 chars):', plainText.slice(0, 200));
    } catch (error) {
      console.error("Error loading note content:", error);
      showAlert('error', 'Error', "Failed to load the note's content. Please try again.");
    }
  };

  const handleRecentNoteSelect = async (recentNote: RecentNote) => {
    // Track the visit
    await trackVisitedNote(
      recentNote.noteId,
      recentNote.title,
      recentNote.permission,
      recentNote.ownerName
    );
    
    // Handle note selection
    await handleNoteSelect(recentNote.noteId, recentNote.title);
  };

  const handleManualSubmit = () => {
    if (!manualTopic.trim()) {
      showAlert('warning', 'Invalid Topic', 'Please enter a topic to generate questions.');
      return;
    }
    checkUsageAndProceed(manualTopic.trim());
  };

  const confirmGeneration = async () => {
    if (pendingGeneration) {
      if (uid) {
        try {
          const docRef = doc(firestore, 'QG_Limits', uid); 
          await updateDoc(docRef, { usageCount: increment(1) });
          setUsageCount(prev => prev + 1);
        } catch (error) {
          console.error('Error updating QG usage count:', error);
          showAlert('error', 'Error', 'Failed to update usage count, but proceeding with generation.', [{ text: 'OK', onPress: () => {}, style: 'primary' }]);
        }
      }

      onTopicSelected(
        pendingGeneration.topic,
        pendingGeneration.type,
        pendingGeneration.count,
        pendingGeneration.content
      );
      handleClose();
    }
  };

  const handleClose = () => {
    setManualTopic('');
    setSelectedNotebook(null);
    setNotes([]);
    setRecentNotes([]);
    setNotePreviews({});
    setActiveTab('manual');
    setNotesSubTab('my-notebooks');
    setSelectedQuestionType('multiple_choice');
    setQuestionCount(10);
    setShowQuestionTypeDropdown(false);
    setShowDisclaimer(false);
    setPendingGeneration(null);
    onClose();
  };

  const handleBackToNotebooks = () => {
    setSelectedNotebook(null);
    setNotes([]);
    setNotePreviews({});
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotebook = ({ item }: { item: Notebook }) => (
    <TouchableOpacity
      style={styles.notebookItem}
      onPress={() => handleNotebookSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemIconContainer}>
        <Ionicons name="book" size={24} color="#8b5cf6" />
      </View>
      <View style={styles.notebookContent}>
        <Text style={styles.notebookTitle}>{item.title}</Text>
        <Text style={styles.notebookDate}>
          {item.createdAt.toLocaleDateString()}
        </Text>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748b" />
    </TouchableOpacity>
  );

  const renderNote = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={styles.noteItem}
      onPress={() => handleNoteSelect(item.id, item.title)}
      activeOpacity={0.7}
    >
      <View style={styles.itemIconContainer}>
        <Ionicons name="document-text" size={24} color="#10b981" />
      </View>
      <View style={styles.noteContent}>
        <Text style={styles.noteTitle}>{item.title}</Text>
        <Text style={styles.notePreview} numberOfLines={2}>
          {notePreviews[item.id] || 'Loading...'}
        </Text>
        <Text style={styles.noteDate}>
          {item.createdAt.toLocaleDateString()}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748b" />
    </TouchableOpacity>
  );

  const renderRecentNote = ({ item }: { item: RecentNote }) => (
    <TouchableOpacity
      style={styles.recentNoteItem}
      onPress={() => handleRecentNoteSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.recentNoteIcon}>
        <Ionicons 
          name={item.permission === 'edit' ? 'create-outline' : 'eye-outline'} 
          size={20} 
          color={item.permission === 'edit' ? '#6366f1' : '#10b981'} 
        />
      </View>
      <View style={styles.recentNoteContent}>
        <Text style={styles.recentNoteTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.notePreview} numberOfLines={1}>
          {notePreviews[item.noteId] || 'Loading...'}
        </Text>
        <View style={styles.recentNoteMeta}>
          <View style={[
            styles.permissionBadge,
            item.permission === 'edit' ? styles.editBadge : styles.viewBadge
          ]}>
            <Text style={styles.permissionText}>
              {item.permission === 'edit' ? 'Edit' : 'View'}
            </Text>
          </View>
          <Text style={styles.recentNoteTime}>
            {formatTimeAgo(item.visitedAt)}
          </Text>
          {item.ownerName && (
            <Text style={styles.ownerName} numberOfLines={1}>
              by {item.ownerName}
            </Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748b" />
    </TouchableOpacity>
  );

  const renderContent = () => {
    const isSubmitDisabled = isLoadingCount || usageCount >= DAILY_LIMIT;
    
    if (activeTab === 'manual') {
      const selectedType = questionTypeOptions.find(type => type.key === selectedQuestionType);
      
      return (
        <View style={styles.manualTab}>
          <Text style={styles.sectionTitle}>Enter Topic</Text>
          
          <TextInput
            style={styles.topicInput}
            placeholder="e.g., 'World War II', 'JavaScript Basics'"
            placeholderTextColor="#64748b"
            value={manualTopic}
            onChangeText={setManualTopic}
            multiline
          />

          <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Question Type</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowQuestionTypeDropdown(!showQuestionTypeDropdown)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownButtonContent}>
                <Ionicons name={selectedType?.icon as any} size={20} color="#ffffff" />
                <Text style={styles.dropdownButtonText}>{selectedType?.label}</Text>
              </View>
              <Ionicons 
                name={showQuestionTypeDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#64748b" 
              />
            </TouchableOpacity>
            
            {showQuestionTypeDropdown && (
              <View style={styles.dropdownMenu}>
                {questionTypeOptions.map((type) => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.dropdownItem,
                      selectedQuestionType === type.key && styles.dropdownItemActive
                    ]}
                    onPress={() => {
                      setSelectedQuestionType(type.key);
                      setShowQuestionTypeDropdown(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={type.icon as any} 
                      size={20} 
                      color={selectedQuestionType === type.key ? "#ffffff" : "#94a3b8"} 
                    />
                    <Text style={[
                      styles.dropdownItemText,
                      selectedQuestionType === type.key && styles.dropdownItemTextActive
                    ]}>
                      {type.label}
                    </Text>
                    {selectedQuestionType === type.key && (
                      <Ionicons name="checkmark" size={20} color="#10b981" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.selectorContainer}>
            <Text style={styles.selectorLabel}>Number of Questions</Text>
            <TouchableOpacity
              style={[
                styles.dropdownButton,
                selectedQuestionType === 'matching' && styles.dropdownButtonDisabled
              ]}
              onPress={() => setShowQuestionCountDropdown(!showQuestionCountDropdown)}
              disabled={selectedQuestionType === 'matching'}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dropdownButtonText,
                selectedQuestionType === 'matching' && styles.dropdownButtonTextDisabled
              ]}>
                {questionCount}
              </Text>
              <Ionicons 
                name={showQuestionCountDropdown ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={selectedQuestionType === 'matching' ? "#64748b" : "#64748b"}
              />
            </TouchableOpacity>
            
            {showQuestionCountDropdown && selectedQuestionType !== 'matching' && (
              <View style={styles.dropdownMenu}>
                <ScrollView style={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
                  {Array.from({length: 15}, (_, i) => i + 1).map((count) => (
                    <TouchableOpacity
                      key={count}
                      style={[
                        styles.dropdownItem,
                        questionCount === count && styles.dropdownItemActive
                      ]}
                      onPress={() => {
                        setQuestionCount(count);
                        setShowQuestionCountDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        questionCount === count && styles.dropdownItemTextActive
                      ]}>
                        {count}
                      </Text>
                      {questionCount === count && (
                        <Ionicons name="checkmark" size={20} color="#10b981" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {selectedQuestionType === 'matching' && (
            <View style={styles.infoContainer}>
              <Ionicons name="information-circle" size={20} color="#60a5fa" />
              <Text style={styles.infoText}>
                Matching questions generate 1 comprehensive question with multiple pairs to match.
              </Text>
            </View>
          )}

          <View style={styles.usageContainer}>
            {isLoadingCount ? (
              <View style={styles.usageLoading}>
                <ActivityIndicator size="small" color="#667eea" />
                <Text style={styles.usageText}>Loading daily limit...</Text>
              </View>
            ) : (
              <View style={[styles.usageBadge, usageCount >= DAILY_LIMIT && styles.usageLimitReachedBadge]}>
                <Ionicons 
                  name={usageCount >= DAILY_LIMIT ? "warning" : "bar-chart-outline"} 
                  size={14} 
                  color={usageCount >= DAILY_LIMIT ? "#ef4444" : "#10b981"} 
                />
                <Text style={[styles.usageText, usageCount >= DAILY_LIMIT && styles.usageLimitReachedText]}>
                  Usage: {usageCount} / {DAILY_LIMIT} (Daily Limit)
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.submitBtn,
              { opacity: manualTopic.trim() && !isSubmitDisabled ? 1 : 0.5 }
            ]}
            onPress={handleManualSubmit}
            disabled={!manualTopic.trim() || isSubmitDisabled}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={20} color="#ffffff" />
            <Text style={styles.submitBtnText}>
              Generate {selectedQuestionType === 'matching' ? '1' : questionCount} Question{questionCount > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Notes tab with sub-tabs
    if (selectedNotebook) {
      return (
        <View style={styles.notesView}>
          <View style={styles.notesHeader}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBackToNotebooks}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.notesHeaderTitle} numberOfLines={1}>
              {selectedNotebook.title}
            </Text>
          </View>
          
          {notesLoading ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="hourglass-outline" size={48} color="#8b5cf6" />
              <Text style={styles.loadingText}>Loading notes...</Text>
            </View>
          ) : notes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color="#475569" />
              <Text style={styles.emptyText}>No notes in this notebook</Text>
              <Text style={styles.emptySubtext}>
                Add some notes to generate questions
              </Text>
            </View>
          ) : (
            <FlatList
              data={notes}
              renderItem={renderNote}
              keyExtractor={(item) => item.id}
              style={styles.notesList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      );
    }

    return (
      <View style={styles.notebooksView}>
        {/* Sub-tabs for Notes section */}
        <View style={styles.subTabsContainer}>
          <TouchableOpacity
            style={[
              styles.subTab,
              notesSubTab === 'my-notebooks' && styles.subTabActive
            ]}
            onPress={() => setNotesSubTab('my-notebooks')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="book-outline" 
              size={18} 
              color={notesSubTab === 'my-notebooks' ? '#8b5cf6' : '#64748b'} 
            />
            <Text style={[
              styles.subTabText,
              notesSubTab === 'my-notebooks' && styles.subTabTextActive
            ]}>
              My Notebooks
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.subTab,
              notesSubTab === 'recent' && styles.subTabActive
            ]}
            onPress={() => setNotesSubTab('recent')}
            activeOpacity={0.7}
          >
            <Ionicons 
              name="time-outline" 
              size={18} 
              color={notesSubTab === 'recent' ? '#8b5cf6' : '#64748b'} 
            />
            <Text style={[
              styles.subTabText,
              notesSubTab === 'recent' && styles.subTabTextActive
            ]}>
              Recent
            </Text>
          </TouchableOpacity>
        </View>

        {notesSubTab === 'my-notebooks' ? (
          <>
            <Text style={styles.sectionTitle}>Select from Your Notes</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="hourglass-outline" size={48} color="#8b5cf6" />
                <Text style={styles.loadingText}>Loading notebooks...</Text>
              </View>
            ) : notebooks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="book-outline" size={64} color="#475569" />
                <Text style={styles.emptyText}>No notebooks found</Text>
                <Text style={styles.emptySubtext}>
                  Create notebooks in the Notes section first
                </Text>
              </View>
            ) : (
              <FlatList
                data={notebooks}
                renderItem={renderNotebook}
                keyExtractor={(item) => item.id}
                style={styles.notebooksList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Recently Visited Notes</Text>
            {recentLoading ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="hourglass-outline" size={48} color="#8b5cf6" />
                <Text style={styles.loadingText}>Loading recent notes...</Text>
              </View>
            ) : recentNotes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="time-outline" size={64} color="#475569" />
                <Text style={styles.emptyText}>No Recent Notes</Text>
                <Text style={styles.emptySubtext}>
                  Notes you visit will appear here for quick access
                </Text>
              </View>
            ) : (
              <FlatList
                data={recentNotes}
                renderItem={renderRecentNote}
                keyExtractor={(item) => item.id}
                style={styles.notesList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <LinearGradient
          colors={['#0f172a', '#1e293b', '#334155']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Select Quiz Topic</Text>
              <TouchableOpacity 
                onPress={handleClose} 
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'manual' && styles.activeTab
                ]}
                onPress={() => setActiveTab('manual')}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="create-outline" 
                  size={20} 
                  color={activeTab === 'manual' ? '#ffffff' : '#64748b'} 
                />
                <Text style={[
                  styles.tabText,
                  activeTab === 'manual' && styles.activeTabText
                ]}>
                  Manual Topic
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'notes' && styles.activeTab
                ]}
                onPress={() => setActiveTab('notes')}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="document-text-outline" 
                  size={20} 
                  color={activeTab === 'notes' ? '#ffffff' : '#64748b'} 
                />
                <Text style={[
                  styles.tabText,
                  activeTab === 'notes' && styles.activeTabText
                ]}>
                  From Notes
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {renderContent()}
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Modal>

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        onClose={() => setAlert(prev => ({ ...prev, visible: false }))}
      />

      {/* Disclaimer Modal */}
      <Modal
        visible={showDisclaimer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisclaimer(false)}
      >
        <View style={styles.disclaimerOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowDisclaimer(false)}
          />

          <View style={styles.disclaimerContainer}>
            <View style={styles.disclaimerGlassCard}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)']}
                style={styles.disclaimerContent}
              >
                <View style={styles.disclaimerIconContainer}>
                  <LinearGradient
                    colors={['#f59e0b', '#d97706']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.disclaimerIconGradient}
                  >
                    <Ionicons name="warning" size={48} color="#ffffff" />
                  </LinearGradient>
                </View>

                <Text style={styles.disclaimerTitle}>Before You Start</Text>

                <View style={styles.disclaimerMessageContainer}>
                  <Ionicons name="shield-checkmark" size={20} color="#94a3b8" />
                  <Text style={styles.disclaimerMessage}>
                    AI-generated questions may contain errors or inaccuracies. Please review each question carefully before using them for study or assessment purposes.
                  </Text>
                </View>

                <View style={styles.disclaimerButtons}>
                  <TouchableOpacity
                    style={styles.disclaimerButtonWrapper}
                    onPress={() => setShowDisclaimer(false)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#475569', '#334155']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.disclaimerButton}
                    >
                      <Text style={styles.disclaimerButtonTextSecondary}>Cancel</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.disclaimerButtonWrapper}
                    onPress={confirmGeneration}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.disclaimerButton}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                      <Text style={styles.disclaimerButtonText}>I Understand</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  tabText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  manualTab: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  topicInput: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    gap: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  notebooksView: {
    flex: 1,
  },
  notebooksList: {
    flex: 1,
  },
  notebookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notebookContent: {
    flex: 1,
  },
  notebookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  notebookDate: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  notesView: {
    flex: 1,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  notesHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  notesList: {
    flex: 1,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noteContent: {
    flex: 1,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  notePreview: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 6,
    lineHeight: 20,
  },
  noteDate: {
    fontSize: 12,
    color: '#64748b',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  selectorContainer: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  dropdownButton: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dropdownButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  dropdownItemActive: {
    backgroundColor: '#334155',
  },
  dropdownItemText: {
    color: '#94a3b8',
    fontSize: 16,
    flex: 1,
  },
  dropdownItemTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#1e3a8a',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#1e40af',
  },
  infoText: {
    flex: 1,
    color: '#bfdbfe',
    fontSize: 14,
    lineHeight: 20,
  },
  subTabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    backgroundColor: '#1e293b',
    padding: 4,
    borderRadius: 10,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  subTabActive: {
    backgroundColor: '#334155',
  },
  subTabText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  subTabTextActive: {
    color: '#8b5cf6',
  },
  recentNoteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  recentNoteIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentNoteContent: {
    flex: 1,
  },
  recentNoteTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  recentNoteMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  permissionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  editBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  viewBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  permissionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  recentNoteTime: {
    color: '#64748b',
    fontSize: 12,
  },
  ownerName: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
  },
  usageContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  usageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  usageLimitReachedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  usageText: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: '600',
  },
  usageLimitReachedText: {
    color: "#ef4444",
  },
  usageLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  dropdownButtonDisabled: {
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  dropdownButtonTextDisabled: {
    color: '#64748b',
  },
  dropdownMenu: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    maxHeight: 150,
  },
  dropdownScrollView: {
    maxHeight: 150,
  },
  disclaimerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  disclaimerContainer: {
    width: '100%',
    maxWidth: 420,
  },
  disclaimerGlassCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    backgroundColor: '#1e293b',
  },
  disclaimerContent: {
    padding: 28,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  disclaimerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  disclaimerIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  disclaimerMessageContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  disclaimerMessage: {
    flex: 1,
    fontSize: 15,
    color: '#cbd5e1',
    lineHeight: 22,
  },
  disclaimerButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  disclaimerButtonWrapper: {
    flex: 1,
  },
  disclaimerButton: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  disclaimerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  disclaimerButtonTextSecondary: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
});
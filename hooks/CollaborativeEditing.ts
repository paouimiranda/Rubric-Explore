// hooks/useCollaborativeEditing.ts - FIXED with proper Firestore loading
import { useCallback, useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { CHUNK_CONFIG } from '../app/types/notebook';
import { collaborativeService, CollaborativeSession, UserInfo } from '../services/collaborative-service';

export interface CollaborativeState {
  isConnected: boolean;
  activeUsers: UserInfo[];
  title: string;
  content: string;
  updateTitle: (title: string) => void;
  updateContent: (content: string) => void;
  handleTitleChange: (newTitle: string, selectionStart?: number, selectionEnd?: number) => void;
  handleContentChange: (newContent: string, selectionStart?: number, selectionEnd?: number) => void;
  updateCursor: (field: 'title' | 'content', position: number) => void;
  titleInputRef: React.RefObject<TextInput | null>;
  contentInputRef: React.RefObject<TextInput | null>;
  activeChunkId: string | null;
  chunkCount: number;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  contentReady: boolean;
}

interface TextChange {
  index: number;
  delete: number;
  insert: string;
}

export function useCollaborativeEditing(
  noteId: string | null,
  user: { uid: string; displayName?: string | null } | null,
  initialTitle = '',
  initialContent = ''
): CollaborativeState {
  const [session, setSession] = useState<CollaborativeSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState<UserInfo[]>([]);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [activeChunkId, setActiveChunkId] = useState<string | null>(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  
  const titleInputRef = useRef<TextInput | null>(null);
  const contentInputRef = useRef<TextInput | null>(null);
  
  const previousValues = useRef({ title: '', content: '' });
  const isApplyingYjsUpdate = useRef({ title: false, content: false });
  const sessionRef = useRef<CollaborativeSession | null>(null);
  
  const hasInitialized = useRef(false);
  const initializationAttempts = useRef(0);
  const MAX_INIT_ATTEMPTS = 3;
  const INIT_TIMEOUT = 10000; // Increased to 10 seconds for Firestore

  const calculateTextChanges = (oldText: string, newText: string): TextChange[] => {
    const changes: TextChange[] = [];
    
    let start = 0;
    while (start < oldText.length && start < newText.length && oldText[start] === newText[start]) {
      start++;
    }
    
    let oldEnd = oldText.length;
    let newEnd = newText.length;
    while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }
    
    const deleteCount = oldEnd - start;
    const insertText = newText.slice(start, newEnd);
    
    if (deleteCount > 0 || insertText.length > 0) {
      changes.push({
        index: start,
        delete: deleteCount,
        insert: insertText
      });
    }
    
    return changes;
  };

  const applyChangesToYjs = (yText: any, changes: TextChange[]) => {
    changes.forEach(change => {
      if (change.delete > 0) {
        yText.delete(change.index, change.delete);
      }
      if (change.insert.length > 0) {
        yText.insert(change.index, change.insert);
      }
    });
  };

  const getChunkForPosition = useCallback((position: number): string | null => {
    if (!sessionRef.current) return null;

    const chunks = collaborativeService.getChunkSessions(noteId!);
    if (chunks.length === 0) return null;

    let currentPos = 0;
    for (const chunk of chunks) {
      const chunkLength = chunk.contentText.length;
      if (position <= currentPos + chunkLength) {
        return chunk.chunkId;
      }
      currentPos += chunkLength;
    }

    return chunks[chunks.length - 1].chunkId;
  }, [noteId]);

  const checkAndSplitChunk = useCallback(async (chunkId: string) => {
    if (!sessionRef.current || !noteId || !user) return;

    const chunkSession = collaborativeService.getChunkSession(noteId, chunkId);
    if (!chunkSession) return;

    const chunkContent = chunkSession.contentText.toString();
    
    if (chunkContent.length > CHUNK_CONFIG.SPLIT_THRESHOLD) {
      console.log(`Chunk ${chunkId} exceeds threshold, splitting...`);
      
      try {
        const { splitChunk, getNoteChunks } = await import('../services/notes-service');
        
        const chunkData = {
          id: chunkId,
          index: chunkSession.index,
          content: chunkContent,
          characterCount: chunkContent.length,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await splitChunk(noteId, chunkId, chunkData);
        
        const updatedChunks = await getNoteChunks(noteId);
        setChunkCount(updatedChunks.length);
        
        const newChunk = updatedChunks.find(c => c.index === chunkSession.index + 1);
        if (newChunk) {
          await collaborativeService.createChunkSession(
            noteId,
            newChunk.id,
            newChunk.index,
            {
              uid: user.uid,
              name: user.displayName || 'Anonymous',
              color: ''
            }
          );
        }
        
        const mergedContent = collaborativeService.getMergedContent(noteId);
        setContent(mergedContent);
        previousValues.current.content = mergedContent;
        
      } catch (error) {
        console.error('Error splitting chunk:', error);
      }
    }
  }, [noteId, user]);

  const updateUndoRedoState = useCallback(() => {
    if (!noteId) return;
    
    setCanUndo(collaborativeService.canUndo(noteId));
    setCanRedo(collaborativeService.canRedo(noteId));
  }, [noteId]);

  useEffect(() => {
    if (!noteId || !user?.uid) {
      console.log('🚫 Missing noteId or user, resetting state');
      setIsConnected(false);
      setContentReady(false);
      hasInitialized.current = false;
      initializationAttempts.current = 0;
      return;
    }

    if (hasInitialized.current) {
      console.log('✅ Already initialized, skipping');
      return;
    }

    let mounted = true;
    let cleanupFn: (() => void) | null = null;
    let retryTimeoutId: NodeJS.Timeout | null = null;
    let fallbackTimeoutId: NodeJS.Timeout | null = null;

    const initSession = async () => {
      try {
        initializationAttempts.current++;
        console.log(`🔗 Attempt ${initializationAttempts.current}/${MAX_INIT_ATTEMPTS}: Initializing session for:`, noteId);
        
        const userInfo = {
          uid: user.uid,
          name: user.displayName || 'Anonymous'
        };

        // ✅ CRITICAL: Wait for session creation with proper timeout
        const sessionPromise = collaborativeService.createSession(noteId, userInfo);
        
        // Race between session creation and timeout
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Session creation timeout')), 8000);
        });

        let collaborativeSession: CollaborativeSession;
        try {
          collaborativeSession = await Promise.race([sessionPromise, timeoutPromise]) as CollaborativeSession;
        } catch (timeoutError) {
          console.error('❌ Session creation timed out');
          throw new Error('Session initialization timed out');
        }
        
        if (!mounted) {
          console.log('⚠️ Component unmounted during init, destroying session');
          collaborativeSession.destroy();
          return;
        }

        const hasChunks = collaborativeSession.chunkSessions.size > 0;
        console.log(`📦 Session created - Chunks loaded: ${collaborativeSession.chunkSessions.size}`);

        // ✅ FIX: Retry if no chunks, but don't give up immediately
        if (!hasChunks && initializationAttempts.current < MAX_INIT_ATTEMPTS) {
          console.warn(`⚠️ No chunks loaded on attempt ${initializationAttempts.current}, retrying in 1s...`);
          collaborativeSession.destroy();
          
          retryTimeoutId = setTimeout(() => {
            if (mounted && !hasInitialized.current) {
              initSession();
            }
          }, 1000); // Increased retry delay
          return;
        }

        // ✅ FIX: After max retries, check if chunks exist in Firestore
        if (!hasChunks) {
          console.error('❌ No chunks after max retries - checking Firestore directly...');
          
          // Try to fetch from Firestore directly as last resort
          try {
            const { getNoteChunks } = await import('../services/notes-service');
            const firestoreChunks = await getNoteChunks(noteId);
            
            if (firestoreChunks.length === 0) {
              console.error('❌ No chunks in Firestore either - note may need migration');
              throw new Error('No chunks found - note needs migration');
            }
            
            console.log(`📦 Found ${firestoreChunks.length} chunks in Firestore, retrying one more time...`);
            collaborativeSession.destroy();
            
            retryTimeoutId = setTimeout(() => {
              if (mounted && !hasInitialized.current) {
                initSession();
              }
            }, 500);
            return;
          } catch (firestoreError) {
            console.error('❌ Failed to load from Firestore:', firestoreError);
            throw new Error('Failed to load note data from Firestore');
          }
        }

        // Clear any pending fallback timeout
        if (fallbackTimeoutId) {
          clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = null;
        }

        hasInitialized.current = true;
        sessionRef.current = collaborativeSession;
        setSession(collaborativeSession);
        setIsConnected(true);
        setChunkCount(collaborativeSession.chunkSessions.size);

        const chunkObservers = new Map<string, () => void>();
        let titleObserver: (() => void) | null = null;

        // Title observer
        if (collaborativeSession.titleSession) {
          let titleUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
          
          titleObserver = () => {
            if (!mounted || isApplyingYjsUpdate.current.title) return;
            
            if (titleUpdateTimeout) clearTimeout(titleUpdateTimeout);
            
            titleUpdateTimeout = setTimeout(() => {
              const newTitle = collaborativeSession.titleSession!.contentText.toString();
              
              if (newTitle !== previousValues.current.title) {
                console.log('📝 Applying Y.js title update:', newTitle);
                setTitle(newTitle);
                previousValues.current.title = newTitle;
              }
              
              updateUndoRedoState();
            }, 100);
          };

          collaborativeSession.titleSession.contentText.observe(titleObserver);
          
          // ✅ CRITICAL: Get title from Y.js (which loaded from Firestore)
          const yjsTitle = collaborativeSession.titleSession.contentText.toString();
          console.log('🏷️ Loading title - Y.js length:', yjsTitle.length);
          
          if (yjsTitle.length > 0) {
            console.log('✅ Using title from Firestore via Y.js:', yjsTitle.substring(0, 50));
            setTitle(yjsTitle);
            previousValues.current.title = yjsTitle;
          } else {
            console.log('📝 No title in Y.js, using empty string');
            setTitle('');
            previousValues.current.title = '';
          }
        }

        // Content observers
        collaborativeSession.chunkSessions.forEach((chunkSession) => {
          let observerTimeout: ReturnType<typeof setTimeout> | null = null;
          let updateCount = 0;
          let lastAppliedContent = '';
          
          const contentObserver = () => {
            if (!mounted || isApplyingYjsUpdate.current.content) return;
            
            if (observerTimeout) clearTimeout(observerTimeout);
            
            updateCount++;
            
            observerTimeout = setTimeout(() => {
              console.log(`📡 Yjs observer fired (batched ${updateCount} updates)`);
              updateCount = 0;
              
              const mergedContent = collaborativeService.getMergedContent(noteId);
              
              if (mergedContent !== lastAppliedContent && mergedContent !== previousValues.current.content) {
                console.log('📦 Applying Y.js content update, length:', mergedContent.length);
                setContent(mergedContent);
                previousValues.current.content = mergedContent;
                lastAppliedContent = mergedContent;
              }
              
              updateUndoRedoState();
            }, 300);
          };

          chunkSession.contentText.observe(contentObserver);
          chunkObservers.set(chunkSession.chunkId, contentObserver);
        });

        // ✅ CRITICAL: Get content from Y.js (which loaded from Firestore)
        const yjsContent = collaborativeService.getMergedContent(noteId);
        console.log('📄 Loading content - Y.js length:', yjsContent.length, 'chars');
        
        if (yjsContent.length > 0) {
          console.log('✅ Using content from Firestore via Y.js');
          setContent(yjsContent);
          previousValues.current.content = yjsContent;
        } else {
          console.log('📝 No content in Y.js, using empty string');
          setContent('');
          previousValues.current.content = '';
        }

        updateUndoRedoState();

        // ✅ CRITICAL: Set contentReady ONLY after data is loaded
        console.log('✅ Data loaded from Firestore - setting contentReady');
        setContentReady(true);

        const updateAwareness = () => {
          if (mounted) {
            setActiveUsers(collaborativeService.getSessionUsers(noteId));
          }
        };
        
        const awarenessInterval = setInterval(updateAwareness, 5000);
        updateAwareness();

        cleanupFn = () => {
          console.log('🧹 Cleaning up session');
          clearInterval(awarenessInterval);
          
          if (collaborativeSession.titleSession && titleObserver) {
            collaborativeSession.titleSession.contentText.unobserve(titleObserver);
          }
          
          collaborativeSession.chunkSessions.forEach((chunkSession) => {
            const observer = chunkObservers.get(chunkSession.chunkId);
            if (observer) {
              chunkSession.contentText.unobserve(observer);
            }
          });
          
          collaborativeSession.destroy();
          hasInitialized.current = false;
          initializationAttempts.current = 0;
        };

      } catch (error) {
        console.error('❌ Error initializing session:', error);
        
        // Only use fallback after ALL retries are exhausted
        if (initializationAttempts.current >= MAX_INIT_ATTEMPTS) {
          console.error('❌ Max retries reached, showing error state');
          
          if (mounted) {
            // Show error state instead of empty fallback
            setContentReady(true); // Allow user to see error
            setIsConnected(false);
            setTitle('⚠️ Failed to load note');
            setContent('Error: Could not load note content from server. Please check your connection and try again.');
          }
        } else {
          // Retry
          console.log(`🔄 Retrying in 1s (attempt ${initializationAttempts.current + 1}/${MAX_INIT_ATTEMPTS})`);
          retryTimeoutId = setTimeout(() => {
            if (mounted && !hasInitialized.current) {
              initSession();
            }
          }, 1000);
        }
        
        hasInitialized.current = false;
      }
    };

    // Set fallback timeout - only triggers if ALL retries fail
    fallbackTimeoutId = setTimeout(() => {
      if (mounted && !contentReady && !hasInitialized.current) {
        console.error('⚠️ Initialization timeout after all retries - showing error');
        setContentReady(true);
        setIsConnected(false);
        setTitle('⚠️ Load timeout');
        setContent('Error: Note loading timed out. Please go back and try again.');
      }
    }, INIT_TIMEOUT);

    initSession();

    return () => {
      mounted = false;
      if (retryTimeoutId) clearTimeout(retryTimeoutId);
      if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
      if (cleanupFn) cleanupFn();
    };
  }, [noteId, user?.uid, updateUndoRedoState]);

  const handleTitleChange = useCallback((newTitle: string, selectionStart?: number, selectionEnd?: number) => {
    if (!isConnected) {
      console.warn('⚠️ Not connected, ignoring title change');
      return;
    }
    
    console.log('✏️ Handling title change');
    
    setTitle(newTitle);
    
    if (sessionRef.current?.titleSession && noteId) {
      const changes = calculateTextChanges(previousValues.current.title, newTitle);
      
      if (changes.length > 0) {
        console.log('📤 Applying title changes to Yjs');
        isApplyingYjsUpdate.current.title = true;
        applyChangesToYjs(sessionRef.current.titleSession.contentText, changes);
        isApplyingYjsUpdate.current.title = false;
      }
      
      previousValues.current.title = newTitle;
      updateUndoRedoState();
    }
  }, [noteId, isConnected, updateUndoRedoState]);

  const handleContentChange = useCallback((newContent: string, selectionStart?: number, selectionEnd?: number) => {
    if (!isConnected) {
      console.warn('⚠️ Not connected, ignoring content change');
      return;
    }
    
    console.log('✏️ Handling content change, length:', newContent.length);
    
    setContent(newContent);
    
    if (sessionRef.current && noteId && user) {
      const changes = calculateTextChanges(previousValues.current.content, newContent);
      
      if (changes.length === 0) return;
      
      console.log('📤 Applying content changes to Yjs chunks');
      
      const chunks = collaborativeService.getChunkSessions(noteId);
      if (chunks.length === 0) return;
      
      isApplyingYjsUpdate.current.content = true;
      
      changes.forEach(change => {
        let globalPosition = change.index;
        let changeRemaining = change.delete;
        let insertText = change.insert;
        
        for (let i = 0; i < chunks.length; i++) {
          const chunkSession = chunks[i];
          const chunkContent = chunkSession.contentText.toString();
          const chunkLength = chunkContent.length;
          
          if (globalPosition < chunkLength) {
            const localPosition = globalPosition;
            
            if (changeRemaining > 0) {
              const deleteInThisChunk = Math.min(changeRemaining, chunkLength - localPosition);
              
              if (deleteInThisChunk > 0) {
                chunkSession.contentText.delete(localPosition, deleteInThisChunk);
                changeRemaining -= deleteInThisChunk;
              }
            }
            
            if (insertText.length > 0 && changeRemaining === 0) {
              chunkSession.contentText.insert(localPosition, insertText);
              insertText = '';
              
              const newChunkLength = chunkSession.contentText.length;
              if (newChunkLength > CHUNK_CONFIG.SPLIT_THRESHOLD) {
                setActiveChunkId(chunkSession.chunkId);
                setTimeout(() => checkAndSplitChunk(chunkSession.chunkId), 100);
              }
            }
            
            if (changeRemaining === 0 && insertText.length === 0) break;
            
            globalPosition = 0;
          } else {
            globalPosition -= chunkLength;
          }
        }
        
        if (insertText.length > 0 && chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          const lastChunkLength = lastChunk.contentText.length;
          lastChunk.contentText.insert(lastChunkLength, insertText);
          
          if (lastChunk.contentText.length > CHUNK_CONFIG.SPLIT_THRESHOLD) {
            setActiveChunkId(lastChunk.chunkId);
            setTimeout(() => checkAndSplitChunk(lastChunk.chunkId), 100);
          }
        }
      });
      
      isApplyingYjsUpdate.current.content = false;
      previousValues.current.content = newContent;
      updateUndoRedoState();
    }
  }, [noteId, user, isConnected, checkAndSplitChunk, updateUndoRedoState]);

  const updateTitle = useCallback((newTitle: string) => {
    handleTitleChange(newTitle);
  }, [handleTitleChange]);

  const updateContent = useCallback((newContent: string) => {
    handleContentChange(newContent);
  }, [handleContentChange]);

  const updateCursor = useCallback((field: 'title' | 'content', position: number) => {
    if (!sessionRef.current || !noteId || !user?.uid) return;

    if (field === 'content') {
      const chunkId = getChunkForPosition(position);
      if (chunkId) setActiveChunkId(chunkId);
    }

    const text = field === 'title' ? title : content;
    const lines = text.substring(0, position).split('\n');
    const cursor = {
      line: lines.length - 1,
      column: lines[lines.length - 1].length,
      chunkId: field === 'content' ? activeChunkId || undefined : undefined
    };

    collaborativeService.updateUserAwareness(noteId, user.uid, cursor);
  }, [noteId, user?.uid, title, content, activeChunkId, getChunkForPosition]);

  const undo = useCallback(() => {
    if (!noteId) return;
    
    const success = collaborativeService.undo(noteId);
    if (success) updateUndoRedoState();
  }, [noteId, updateUndoRedoState]);

  const redo = useCallback(() => {
    if (!noteId) return;
    
    const success = collaborativeService.redo(noteId);
    if (success) updateUndoRedoState();
  }, [noteId, updateUndoRedoState]);

  return {
    isConnected,
    activeUsers,
    title,
    content,
    updateTitle,
    updateContent,
    handleTitleChange,
    handleContentChange,
    updateCursor,
    titleInputRef,
    contentInputRef,
    activeChunkId,
    chunkCount,
    undo,
    redo,
    canUndo,
    canRedo,
    contentReady,
  };
}
// hooks/useCollaborativeEditing.ts - FIXED initialization
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
  const INIT_TIMEOUT = 5000; // 5 second timeout

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
    let timeoutId: NodeJS.Timeout | null = null;

    // ✅ FIX: Add fallback timeout to prevent infinite loading
    const fallbackTimeout = setTimeout(() => {
      if (mounted && !contentReady) {
        console.warn('⚠️ Initialization timeout - using fallback values');
        setTitle(initialTitle);
        setContent(initialContent);
        previousValues.current = { title: initialTitle, content: initialContent };
        setContentReady(true); // ✅ CRITICAL: Always set contentReady
        setIsConnected(false);
      }
    }, INIT_TIMEOUT);

    const initSession = async () => {
      try {
        initializationAttempts.current++;
        console.log(`🔗 Attempt ${initializationAttempts.current}: Initializing session for:`, noteId);
        
        const userInfo = {
          uid: user.uid,
          name: user.displayName || 'Anonymous'
        };

        const collaborativeSession = await collaborativeService.createSession(noteId, userInfo);
        
        if (!mounted) {
          console.log('⚠️ Component unmounted during init, destroying session');
          collaborativeSession.destroy();
          return;
        }

        const hasChunks = collaborativeSession.chunkSessions.size > 0;
        console.log(`📦 Session created - Chunks: ${collaborativeSession.chunkSessions.size}`);

        // ✅ FIX: Retry logic that DOESN'T leave UI hanging
        if (!hasChunks && initializationAttempts.current < MAX_INIT_ATTEMPTS) {
          console.warn(`⚠️ No chunks on attempt ${initializationAttempts.current}, retrying...`);
          collaborativeSession.destroy();
          
          // Schedule retry
          timeoutId = setTimeout(() => {
            if (mounted && !hasInitialized.current) {
              initSession();
            }
          }, 500);
          return;
        }

        // ✅ FIX: If still no chunks after retries, use fallback
        if (!hasChunks) {
          console.error('❌ No chunks after max retries - using fallback');
          setTitle(initialTitle);
          setContent(initialContent);
          previousValues.current = { title: initialTitle, content: initialContent };
          setContentReady(true); // ✅ Set ready even on failure
          setIsConnected(false);
          clearTimeout(fallbackTimeout);
          return;
        }

        // Clear fallback timeout since we succeeded
        clearTimeout(fallbackTimeout);

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
                console.log('📝 Applying Y.js title update');
                setTitle(newTitle);
                previousValues.current.title = newTitle;
              }
              
              updateUndoRedoState();
            }, 100);
          };

          collaborativeSession.titleSession.contentText.observe(titleObserver);
          
          const yjsTitle = collaborativeSession.titleSession.contentText.toString();
          console.log('🏷️ Title - Y.js:', yjsTitle || '(empty)', '| Initial:', initialTitle || '(empty)');
          
          if (yjsTitle.length > 0) {
            setTitle(yjsTitle);
            previousValues.current.title = yjsTitle;
          } else if (initialTitle && initialTitle.length > 0) {
            isApplyingYjsUpdate.current.title = true;
            collaborativeSession.titleSession.contentText.insert(0, initialTitle);
            isApplyingYjsUpdate.current.title = false;
            setTitle(initialTitle);
            previousValues.current.title = initialTitle;
          } else {
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
                console.log('📦 Applying Y.js content update');
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

        // Initialize content
        const yjsContent = collaborativeService.getMergedContent(noteId);
        console.log('📄 Content - Y.js:', yjsContent.length, 'chars | Initial:', initialContent?.length || 0, 'chars');
        
        if (yjsContent.length > 0) {
          setContent(yjsContent);
          previousValues.current.content = yjsContent;
        } else if (initialContent && initialContent.length > 0) {
          const firstChunk = Array.from(collaborativeSession.chunkSessions.values())[0];
          if (firstChunk) {
            isApplyingYjsUpdate.current.content = true;
            firstChunk.contentText.insert(0, initialContent);
            isApplyingYjsUpdate.current.content = false;
            setContent(initialContent);
            previousValues.current.content = initialContent;
          } else {
            setContent('');
            previousValues.current.content = '';
          }
        } else {
          setContent('');
          previousValues.current.content = '';
        }

        updateUndoRedoState();

        // ✅ CRITICAL: Always set contentReady to true
        console.log('✅ Initialization complete - setting contentReady');
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
        
        // ✅ FIX: Always set contentReady even on error
        if (mounted) {
          console.log('⚠️ Using fallback after error');
          setTitle(initialTitle);
          setContent(initialContent);
          previousValues.current = { title: initialTitle, content: initialContent };
          setContentReady(true); // ✅ CRITICAL
          setIsConnected(false);
        }
        
        hasInitialized.current = false;
        clearTimeout(fallbackTimeout);
      }
    };

    initSession();

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (cleanupFn) cleanupFn();
    };
  }, [noteId, user?.uid, updateUndoRedoState]);

  // Rest of the hooks remain the same...
  const handleTitleChange = useCallback((newTitle: string, selectionStart?: number, selectionEnd?: number) => {
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
  }, [noteId, updateUndoRedoState]);

  const handleContentChange = useCallback((newContent: string, selectionStart?: number, selectionEnd?: number) => {
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
  }, [noteId, user, checkAndSplitChunk, updateUndoRedoState]);

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
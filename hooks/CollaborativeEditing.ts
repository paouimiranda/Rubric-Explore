// hooks/useCollaborativeEditing.ts - Optimized for cursor preservation with undo/redo
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
  // NEW: Undo/Redo methods
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
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
  
  // NEW: Undo/Redo state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  
  const titleInputRef = useRef<TextInput | null>(null);
  const contentInputRef = useRef<TextInput | null>(null);
  
  const previousValues = useRef({ title: '', content: '' });
  const isApplyingYjsUpdate = useRef({ title: false, content: false });
  const sessionRef = useRef<CollaborativeSession | null>(null);

  // Calculate text changes for granular updates
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

  // NEW: Update undo/redo state
  const updateUndoRedoState = useCallback(() => {
    if (!noteId) return;
    
    setCanUndo(collaborativeService.canUndo(noteId));
    setCanRedo(collaborativeService.canRedo(noteId));
  }, [noteId]);

  /**
   * OPTIMIZED YJS OBSERVERS
   * - Longer debounce (300ms) to reduce cursor disruption
   * - Smart batching for rapid updates
   * - Only triggers React updates when content actually changes
   */
  useEffect(() => {
    if (!noteId || !user?.uid) {
      setIsConnected(false);
      return;
    }

    let mounted = true;
    let cleanupFn: (() => void) | null = null;

    const initSession = async () => {
      try {
        console.log('🔗 Initializing chunk-based collaborative session for:', noteId);
        
        const userInfo = {
          uid: user.uid,
          name: user.displayName || 'Anonymous'
        };

        const collaborativeSession = await collaborativeService.createSession(noteId, userInfo);
        
        if (!mounted) {
          collaborativeSession.destroy();
          return;
        }

        sessionRef.current = collaborativeSession;
        setSession(collaborativeSession);
        setIsConnected(true);
        setChunkCount(collaborativeSession.chunkSessions.size);

        const chunkObservers = new Map<string, () => void>();
        let titleObserver: (() => void) | null = null;

        // Title observer with debouncing
        if (collaborativeSession.titleSession) {
          let titleUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
          
          titleObserver = () => {
            if (!mounted || isApplyingYjsUpdate.current.title) return;
            
            if (titleUpdateTimeout) clearTimeout(titleUpdateTimeout);
            
            titleUpdateTimeout = setTimeout(() => {
              const newTitle = collaborativeSession.titleSession!.contentText.toString();
              
              // Only update if content actually changed
              if (newTitle !== previousValues.current.title) {
                console.log('📝 Applying Y.js title update');
                setTitle(newTitle);
                previousValues.current.title = newTitle;
              }
              
              // Update undo/redo state
              updateUndoRedoState();
            }, 100);
          };

          collaborativeSession.titleSession.contentText.observe(titleObserver);
          
          const currentTitle = collaborativeSession.titleSession.contentText.toString();
          if (currentTitle.length === 0 && initialTitle) {
            isApplyingYjsUpdate.current.title = true;
            collaborativeSession.titleSession.contentText.insert(0, initialTitle);
            isApplyingYjsUpdate.current.title = false;
            setTitle(initialTitle);
            previousValues.current.title = initialTitle;
          } else {
            setTitle(currentTitle || initialTitle);
            previousValues.current.title = currentTitle || initialTitle;
          }
        }

        /**
         * CURSOR-FRIENDLY CONTENT OBSERVERS
         * - 300ms debounce (better for cursor stability)
         * - Batches all updates during typing bursts
         * - Only updates React state when content differs
         */
        collaborativeSession.chunkSessions.forEach((chunkSession) => {
          let observerTimeout: ReturnType<typeof setTimeout> | null = null;
          let updateCount = 0;
          let lastAppliedContent = '';
          
          const contentObserver = () => {
            if (!mounted || isApplyingYjsUpdate.current.content) return;
            
            if (observerTimeout) {
              clearTimeout(observerTimeout);
            }
            
            updateCount++;
            
            // CURSOR-FRIENDLY: Longer debounce reduces interruptions
            observerTimeout = setTimeout(() => {
              console.log(`📡 Yjs observer fired (batched ${updateCount} updates)`);
              updateCount = 0;
              
              const mergedContent = collaborativeService.getMergedContent(noteId);
              
              // Critical: Only update if content actually changed
              if (mergedContent !== lastAppliedContent && mergedContent !== previousValues.current.content) {
                console.log('📦 Applying Y.js content update from chunks');
                setContent(mergedContent);
                previousValues.current.content = mergedContent;
                lastAppliedContent = mergedContent;
              } else {
                console.log('⏭️ Skipping duplicate content update');
              }
              
              // Update undo/redo state
              updateUndoRedoState();
            }, 300); // Longer debounce for better cursor stability
          };

          chunkSession.contentText.observe(contentObserver);
          chunkObservers.set(chunkSession.chunkId, contentObserver);
        });

        // Initialize content
        const mergedContent = collaborativeService.getMergedContent(noteId);
        
        if (mergedContent.length === 0 && initialContent) {
          const firstChunk = Array.from(collaborativeSession.chunkSessions.values())[0];
          if (firstChunk) {
            isApplyingYjsUpdate.current.content = true;
            firstChunk.contentText.insert(0, initialContent);
            isApplyingYjsUpdate.current.content = false;
            setContent(initialContent);
            previousValues.current.content = initialContent;
          }
        } else {
          setContent(mergedContent || initialContent);
          previousValues.current.content = mergedContent || initialContent;
        }

        // Initialize undo/redo state
        updateUndoRedoState();

        const updateAwareness = () => {
          if (mounted) {
            setActiveUsers(collaborativeService.getSessionUsers(noteId));
          }
        };
        
        const awarenessInterval = setInterval(updateAwareness, 5000);
        updateAwareness();

        cleanupFn = () => {
          console.log('🧹 Cleaning up chunk-based session');
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
        };

      } catch (error) {
        console.error('❌ Error initializing chunk-based session:', error);
        setIsConnected(false);
        if (mounted) {
          setTitle(initialTitle);
          setContent(initialContent);
          previousValues.current = { title: initialTitle, content: initialContent };
        }
      }
    };

    initSession();

    return () => {
      mounted = false;
      if (cleanupFn) {
        cleanupFn();
      }
    };
  }, [noteId, user?.uid, updateUndoRedoState]);

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
      
      if (changes.length === 0) {
        return;
      }
      
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
            
            if (changeRemaining === 0 && insertText.length === 0) {
              break;
            }
            
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
      if (chunkId) {
        setActiveChunkId(chunkId);
      }
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

  // NEW: Undo method
  const undo = useCallback(() => {
    if (!noteId) return;
    
    const success = collaborativeService.undo(noteId);
    if (success) {
      // Content will be updated via Yjs observer
      updateUndoRedoState();
    }
  }, [noteId, updateUndoRedoState]);

  // NEW: Redo method
  const redo = useCallback(() => {
    if (!noteId) return;
    
    const success = collaborativeService.redo(noteId);
    if (success) {
      // Content will be updated via Yjs observer
      updateUndoRedoState();
    }
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
    // NEW: Expose undo/redo
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
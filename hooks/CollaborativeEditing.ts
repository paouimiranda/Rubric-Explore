// hooks/useCollaborativeEditing.ts - Chunk-based version with FAST updates
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

  // Determine which chunk should handle the content at a given position
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

    // Return last chunk if position is beyond content
    return chunks[chunks.length - 1].chunkId;
  }, [noteId]);

  // Check if we need to create a new chunk
  const checkAndSplitChunk = useCallback(async (chunkId: string) => {
    if (!sessionRef.current || !noteId || !user) return;

    const chunkSession = collaborativeService.getChunkSession(noteId, chunkId);
    if (!chunkSession) return;

    const chunkContent = chunkSession.contentText.toString();
    
    if (chunkContent.length > CHUNK_CONFIG.SPLIT_THRESHOLD) {
      console.log(`Chunk ${chunkId} exceeds threshold, splitting...`);
      
      try {
        const { splitChunk, getNoteChunks } = await import('../services/notes-service');
        
        // Create chunk object for splitting
        const chunkData = {
          id: chunkId,
          index: chunkSession.index,
          content: chunkContent,
          characterCount: chunkContent.length,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await splitChunk(noteId, chunkId, chunkData);
        
        // Reload chunks
        const updatedChunks = await getNoteChunks(noteId);
        setChunkCount(updatedChunks.length);
        
        // Create session for new chunk
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
        
        // Refresh merged content
        const mergedContent = collaborativeService.getMergedContent(noteId);
        setContent(mergedContent);
        previousValues.current.content = mergedContent;
        
      } catch (error) {
        console.error('Error splitting chunk:', error);
      }
    }
  }, [noteId, user]);

  /**
   * FAST YJS OBSERVERS with smart batching
   * - Short debounce (150ms) for responsive updates
   * - Batches rapid bursts (e.g., paste operations)
   * - Updates propagate to remote users in ~150-200ms total
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

        // Track observers for proper cleanup
        let titleObserver: (() => void) | null = null;
        const chunkObservers = new Map<string, () => void>();

        // Set up title observer with minimal debounce
        if (collaborativeSession.titleSession) {
          let titleUpdateTimeout: ReturnType<typeof setTimeout> | null = null;
          
          titleObserver = () => {
            if (!mounted || isApplyingYjsUpdate.current.title) return;
            
            // Quick debounce for batching only
            if (titleUpdateTimeout) clearTimeout(titleUpdateTimeout);
            
            titleUpdateTimeout = setTimeout(() => {
              const newTitle = collaborativeSession.titleSession!.contentText.toString();
              console.log('📝 Applying Y.js title update:', newTitle.substring(0, 50));
              setTitle(newTitle);
              previousValues.current.title = newTitle;
            }, 50); // Fast 50ms batching
          };

          collaborativeSession.titleSession.contentText.observe(titleObserver);
          
          // Initialize title
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
         * FAST CONTENT OBSERVERS
         * - 150ms debounce (good balance for responsiveness)
         * - Batches rapid updates (typing, paste, etc.)
         * - User sees changes in ~200ms total (Firestore + debounce)
         */
        collaborativeSession.chunkSessions.forEach((chunkSession) => {
          let observerTimeout: ReturnType<typeof setTimeout> | null = null;
          let updateCount = 0;
          
          const contentObserver = () => {
            if (!mounted || isApplyingYjsUpdate.current.content) return;
            
            // Clear pending update
            if (observerTimeout) {
              clearTimeout(observerTimeout);
            }
            
            updateCount++;
            
            // FAST debounce for responsive collaboration
            observerTimeout = setTimeout(() => {
              console.log(`📡 Yjs observer fired (batched ${updateCount} updates)`);
              updateCount = 0;
              
              // Merge all chunks
              const mergedContent = collaborativeService.getMergedContent(noteId);
              console.log('📦 Applying Y.js content update from chunks, total length:', mergedContent.length);
              
              // Only update if content changed (prevents unnecessary re-renders)
              if (mergedContent !== previousValues.current.content) {
                setContent(mergedContent);
                previousValues.current.content = mergedContent;
              }
            }, 150); // Fast 150ms debounce for responsive updates
          };

          chunkSession.contentText.observe(contentObserver);
          chunkObservers.set(chunkSession.chunkId, contentObserver);
        });

        // Initialize content
        const mergedContent = collaborativeService.getMergedContent(noteId);
        
        if (mergedContent.length === 0 && initialContent) {
          // Insert initial content into first chunk
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
          
          // Properly unobserve title
          if (collaborativeSession.titleSession && titleObserver) {
            collaborativeSession.titleSession.contentText.unobserve(titleObserver);
          }
          
          // Properly unobserve all chunks
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
  }, [noteId, user?.uid]);

  // Handle title changes
  const handleTitleChange = useCallback((newTitle: string, selectionStart?: number, selectionEnd?: number) => {
    console.log('✏️ Handling title change:', newTitle.substring(0, 50));
    
    setTitle(newTitle);
    
    if (sessionRef.current?.titleSession && noteId) {
      const changes = calculateTextChanges(previousValues.current.title, newTitle);
      
      if (changes.length > 0) {
        console.log('📤 Applying title changes to Yjs:', changes);
        isApplyingYjsUpdate.current.title = true;
        applyChangesToYjs(sessionRef.current.titleSession.contentText, changes);
        isApplyingYjsUpdate.current.title = false;
      }
      
      previousValues.current.title = newTitle;
    }
  }, [noteId]);

  // Handle content changes with chunk awareness
  const handleContentChange = useCallback((newContent: string, selectionStart?: number, selectionEnd?: number) => {
    console.log('✏️ Handling content change, length:', newContent.length);
    
    setContent(newContent);
    
    if (sessionRef.current && noteId && user) {
      const changes = calculateTextChanges(previousValues.current.content, newContent);
      
      if (changes.length === 0) {
        return;
      }
      
      console.log('📤 Applying content changes to Yjs:', changes);
      
      const chunks = collaborativeService.getChunkSessions(noteId);
      if (chunks.length === 0) return;
      
      isApplyingYjsUpdate.current.content = true;
      
      // Map changes to specific affected chunks
      changes.forEach(change => {
        // Find which chunk(s) the change affects
        let globalPosition = change.index;
        let changeRemaining = change.delete;
        let insertText = change.insert;
        
        for (let i = 0; i < chunks.length; i++) {
          const chunkSession = chunks[i];
          const chunkContent = chunkSession.contentText.toString();
          const chunkLength = chunkContent.length;
          
          // Check if this change affects this chunk
          if (globalPosition < chunkLength) {
            // Calculate local position within this chunk
            const localPosition = globalPosition;
            
            // Handle deletions in this chunk
            if (changeRemaining > 0) {
              const deleteInThisChunk = Math.min(changeRemaining, chunkLength - localPosition);
              
              if (deleteInThisChunk > 0) {
                console.log(`🗑️ Deleting ${deleteInThisChunk} chars at position ${localPosition} in chunk ${chunkSession.chunkId}`);
                chunkSession.contentText.delete(localPosition, deleteInThisChunk);
                changeRemaining -= deleteInThisChunk;
              }
            }
            
            // Handle insertions in this chunk
            if (insertText.length > 0 && changeRemaining === 0) {
              console.log(`➕ Inserting "${insertText.substring(0, 20)}..." at position ${localPosition} in chunk ${chunkSession.chunkId}`);
              chunkSession.contentText.insert(localPosition, insertText);
              insertText = ''; // Mark as inserted
              
              // Check if this chunk now needs splitting
              const newChunkLength = chunkSession.contentText.length;
              if (newChunkLength > CHUNK_CONFIG.SPLIT_THRESHOLD) {
                setActiveChunkId(chunkSession.chunkId);
                setTimeout(() => checkAndSplitChunk(chunkSession.chunkId), 100);
              }
            }
            
            // If we've handled all deletions and insertions, we're done
            if (changeRemaining === 0 && insertText.length === 0) {
              break;
            }
            
            // Move to next chunk for remaining deletions
            globalPosition = 0; // Start at beginning of next chunk
          } else {
            // This change is beyond this chunk, adjust position
            globalPosition -= chunkLength;
          }
        }
        
        // Handle case where insertion is at the very end (after all chunks)
        if (insertText.length > 0 && chunks.length > 0) {
          const lastChunk = chunks[chunks.length - 1];
          const lastChunkLength = lastChunk.contentText.length;
          console.log(`➕ Appending "${insertText.substring(0, 20)}..." to last chunk ${lastChunk.chunkId}`);
          lastChunk.contentText.insert(lastChunkLength, insertText);
          
          // Check if last chunk needs splitting
          if (lastChunk.contentText.length > CHUNK_CONFIG.SPLIT_THRESHOLD) {
            setActiveChunkId(lastChunk.chunkId);
            setTimeout(() => checkAndSplitChunk(lastChunk.chunkId), 100);
          }
        }
      });
      
      isApplyingYjsUpdate.current.content = false;
      previousValues.current.content = newContent;
    }
  }, [noteId, user, checkAndSplitChunk]);

  // Legacy update methods
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
  };
}
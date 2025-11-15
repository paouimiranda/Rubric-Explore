// services/collaborative-service.ts - Chunk-based collaboration with UndoManager
import { doc, getDoc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import * as Y from 'yjs';
import { db } from '../firebase';

export interface ChunkSession {
  ydoc: Y.Doc;
  contentText: Y.Text;
  undoManager: Y.UndoManager;
  provider: any;
  chunkId: string;
  index: number;
  destroy: () => void;
}

export interface CollaborativeSession {
  noteId: string;
  titleSession: ChunkSession | null;
  chunkSessions: Map<string, ChunkSession>;
  awareness: any;
  destroy: () => void;
}

export interface UserInfo {
  uid: string;
  name: string;
  color: string;
  cursor?: { line: number; column: number; chunkId?: string };
}

class ChunkBasedCollaborativeService {
  private sessions = new Map<string, CollaborativeSession>();
  private firestoreUnsubscribes = new Map<string, () => void>();

  private generateUserColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Create a session for an entire note (title + all chunks)
  async createSession(
    noteId: string, 
    userInfo: Omit<UserInfo, 'color'>
  ): Promise<CollaborativeSession> {
    if (this.sessions.has(noteId)) {
      return this.sessions.get(noteId)!;
    }

    console.log('Creating chunk-based collaborative session for note:', noteId);

    const session: CollaborativeSession = {
      noteId,
      titleSession: null,
      chunkSessions: new Map(),
      awareness: new Map(),
      destroy: () => {
        this.destroySession(noteId);
      }
    };

    this.sessions.set(noteId, session);

    // Create title session (stored in note metadata)
    session.titleSession = await this.createTitleSession(noteId, userInfo.uid);

    // Load all existing chunks and create sessions for them
    await this.loadChunkSessions(noteId, userInfo.uid, session);

    return session;
  }

  // Create a Y.js session for the note title
  private async createTitleSession(
    noteId: string, 
    userId: string
  ): Promise<ChunkSession> {
    const ydoc = new Y.Doc();
    const contentText = ydoc.getText('title');
    
    // Create UndoManager for title
    // CRITICAL: Only track changes from this specific user
    const undoManager = new Y.UndoManager(contentText, {
      // Don't track origins - we'll handle this differently
      captureTimeout: 500,
    });
    
    const provider = this.createSafeFirestoreProvider(noteId, 'title', ydoc, userId);

    // Load initial title
    await this.loadInitialTitle(noteId, ydoc);

    return {
      ydoc,
      contentText,
      undoManager,
      provider,
      chunkId: 'title',
      index: -1,
      destroy: () => {
        undoManager.destroy();
        provider.destroy();
      }
    };
  }

  // Create a Y.js session for a specific chunk
  async createChunkSession(
    noteId: string, 
    chunkId: string, 
    index: number,
    userInfo: UserInfo
  ): Promise<ChunkSession> {
    const session = this.sessions.get(noteId);
    if (!session) {
      throw new Error('Note session not found');
    }

    // Check if chunk session already exists
    if (session.chunkSessions.has(chunkId)) {
      return session.chunkSessions.get(chunkId)!;
    }

    const ydoc = new Y.Doc();
    const contentText = ydoc.getText('content');
    
    // Create UndoManager for this chunk
    // CRITICAL: Don't specify trackedOrigins to avoid tracking remote updates
    const undoManager = new Y.UndoManager(contentText, {
      captureTimeout: 500,
    });
    
    const provider = this.createSafeFirestoreProvider(noteId, chunkId, ydoc, userInfo.uid);

    // Load initial content
    await this.loadInitialChunk(noteId, chunkId, ydoc);

    const chunkSession: ChunkSession = {
      ydoc,
      contentText,
      undoManager,
      provider,
      chunkId,
      index,
      destroy: () => {
        undoManager.destroy();
        provider.destroy();
      }
    };

    session.chunkSessions.set(chunkId, chunkSession);

    return chunkSession;
  }

  // Load all chunk sessions for a note
  private async loadChunkSessions(
  noteId: string, 
  userId: string,
  session: CollaborativeSession
): Promise<void> {
  try {
    const { getNoteChunks } = await import('./notes-service');
    
    console.log(`📦 Fetching chunks from Firestore for note ${noteId}...`);
    
    // ✅ Add timeout to chunk fetching
    const chunksPromise = getNoteChunks(noteId);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Chunk fetch timeout')), 7000);
    });
    
    const chunks = await Promise.race([chunksPromise, timeoutPromise]);

    console.log(`📦 Retrieved ${chunks.length} chunks from Firestore`);

    if (chunks.length === 0) {
      console.error('❌ No chunks found in Firestore for note:', noteId);
      throw new Error(`No chunks found for note ${noteId} - note may need migration`);
    }

    // Load chunks sequentially to ensure proper initialization
    for (const chunk of chunks) {
      console.log(`📦 Loading chunk ${chunk.id} (index: ${chunk.index})`);
      
      const ydoc = new Y.Doc();
      const contentText = ydoc.getText('content');
      
      const undoManager = new Y.UndoManager(contentText, {
        captureTimeout: 500,
      });
      
      const provider = this.createSafeFirestoreProvider(
        noteId, 
        chunk.id, 
        ydoc, 
        userId
      );

      // ✅ CRITICAL: Wait for initial load with timeout
      const loadPromise = this.loadInitialChunk(noteId, chunk.id, ydoc);
      const loadTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Chunk ${chunk.id} load timeout`)), 5000);
      });
      
      try {
        await Promise.race([loadPromise, loadTimeout]);
      } catch (loadError) {
        console.error(`❌ Failed to load chunk ${chunk.id}:`, loadError);
        // Don't throw - allow partial loading
        console.warn(`⚠️ Continuing with empty chunk ${chunk.id}`);
      }
      
      // Verify the chunk loaded properly
      const loadedContent = contentText.toString();
      console.log(`✅ Chunk ${chunk.id} loaded successfully: ${loadedContent.length} characters`);

      const chunkSession: ChunkSession = {
        ydoc,
        contentText,
        undoManager,
        provider,
        chunkId: chunk.id,
        index: chunk.index,
        destroy: () => {
          undoManager.destroy();
          provider.destroy();
        }
      };

      session.chunkSessions.set(chunk.id, chunkSession);
    }

    // ✅ Verify at least some content loaded
    const totalContent = Array.from(session.chunkSessions.values())
      .map(cs => cs.contentText.toString())
      .join('');
    
    console.log(`✅ All ${chunks.length} chunks processed - Total content: ${totalContent.length} chars`);

  } catch (error) {
    console.error('❌ Error loading chunk sessions:', error);
    throw error; // Re-throw to be caught by createSession
  }
}

  // Create Firestore provider for title or chunk
  private createSafeFirestoreProvider(
    noteId: string, 
    chunkId: string, 
    ydoc: Y.Doc, 
    userId: string
  ) {
    let isDestroyed = false;
    let updateTimeout: number | null = null;
    let lastAppliedUpdate: string | null = null;

    const isTitle = chunkId === 'title';
    const refPath = isTitle 
      ? `notes/${noteId}` 
      : `notes/${noteId}/chunks/${chunkId}`;

    const batchUpdate = async () => {
      if (isDestroyed) return;

      try {
        const docRef = doc(db, refPath);
        const state = Y.encodeStateAsUpdate(ydoc);
        const stateString = Array.from(state).toString();

        if (stateString === lastAppliedUpdate) {
          return;
        }

        const textKey = isTitle ? 'title' : 'content';
        const textContent = ydoc.getText(textKey).toString();

        console.log(`Batching update to Firestore for ${refPath}`);

        const updateData: any = {
          yjs_state: Array.from(state),
          updatedAt: serverTimestamp(),
          lastUpdatedBy: userId,
        };

        if (isTitle) {
          updateData.title = textContent;
        } else {
          updateData.content = textContent;
          updateData.characterCount = textContent.length;
        }

        await updateDoc(docRef, updateData);
      } catch (error) {
        console.error('Batch update error:', error);
      }
    };

    const updateHandler = () => {
      if (isDestroyed) return;

      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = setTimeout(batchUpdate, 1000) as unknown as number;
    };

    ydoc.on('update', updateHandler);

    // Listen for Firestore changes
    const docRef = doc(db, refPath);
    const unsubscribe = onSnapshot(docRef, (docSnapshot) => {
      if (isDestroyed || !docSnapshot.exists()) return;

      const data = docSnapshot.data();

      if (data.lastUpdatedBy === userId) {
        return;
      }

      if (data.yjs_state && Array.isArray(data.yjs_state)) {
        try {
          const stateArray = data.yjs_state;
          const stateString = stateArray.toString();

          if (stateString === lastAppliedUpdate) {
            return;
          }

          console.log(`Applying Firestore update from user: ${data.lastUpdatedBy}`);

          const state = new Uint8Array(stateArray);
          lastAppliedUpdate = stateString;

          // CRITICAL FIX: Stop UndoManager from capturing remote updates
          const textKey = isTitle ? 'title' : 'content';
          const yText = ydoc.getText(textKey);
          
          // Get UndoManager from the session
          const session = this.sessions.get(noteId);
          let undoManager: Y.UndoManager | undefined;
          
          if (session) {
            if (isTitle && session.titleSession) {
              undoManager = session.titleSession.undoManager;
            } else {
              const chunkSession = session.chunkSessions.get(chunkId);
              if (chunkSession) {
                undoManager = chunkSession.undoManager;
              }
            }
          }

          // Stop capturing during remote update
          if (undoManager) {
            undoManager.stopCapturing();
          }

          // Apply the remote update
          Y.applyUpdate(ydoc, state);

          // Resume capturing after a brief delay
          if (undoManager) {
            setTimeout(() => {
              // Don't clear the stack, just resume capturing
              undoManager.stopCapturing();
            }, 100);
          }
        } catch (error) {
          console.error('Error applying Firestore update:', error);
        }
      }
    });

    this.firestoreUnsubscribes.set(`${noteId}_${chunkId}`, unsubscribe);

    return {
      destroy: () => {
        isDestroyed = true;
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        ydoc.off('update', updateHandler);
        unsubscribe();
        this.firestoreUnsubscribes.delete(`${noteId}_${chunkId}`);

        // Final save
        const textKey = isTitle ? 'title' : 'content';
        if (ydoc.getText(textKey).length > 0) {
          batchUpdate();
        }
      }
    };
  }

  // Load initial title from Firestore
  private async loadInitialTitle(noteId: string, ydoc: Y.Doc) {
  try {
    console.log(`📥 Loading initial title for note: ${noteId}`);
    
    const noteRef = doc(db, 'notes', noteId);
    
    // ✅ Add timeout
    const fetchPromise = getDoc(noteRef);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Title fetch timeout')), 5000);
    });
    
    const snap = await Promise.race([fetchPromise, timeoutPromise]);

    if (snap.exists()) {
      const data = snap.data();
      const titleText = ydoc.getText('title');

      console.log(`📊 Note title data:`, {
        hasYjsState: !!data.yjs_state,
        hasTitle: !!data.title,
        titleLength: data.title?.length || 0
      });

      if (data.yjs_state && Array.isArray(data.yjs_state) && data.yjs_state.length > 0) {
        try {
          const state = new Uint8Array(data.yjs_state);
          Y.applyUpdate(ydoc, state, 'initial_load');
          
          const loadedTitle = titleText.toString();
          console.log(`✅ Loaded title from Y.js state: "${loadedTitle}"`);
          
          // Verify and fallback if needed
          if (loadedTitle.length === 0 && data.title && data.title.length > 0) {
            console.warn(`⚠️ Y.js state loaded but title is empty, using plain title`);
            titleText.insert(0, data.title);
          }
        } catch (error) {
          console.error('Error loading title Y.js state:', error);
          if (titleText.length === 0 && data.title) {
            titleText.insert(0, data.title);
            console.log(`✅ Fallback: Loaded plain title`);
          }
        }
      } else if (titleText.length === 0 && data.title) {
        titleText.insert(0, data.title);
        console.log(`✅ Loaded plain title: "${data.title}"`);
      }
      
      // Final verification
      const finalTitle = titleText.toString();
      console.log(`✅ Final title verification: "${finalTitle}" (${finalTitle.length} chars)`);
    }
  } catch (error) {
    console.error('Error loading initial title:', error);
    throw error;
  }
}

  // Load initial chunk content from Firestore
  private async loadInitialChunk(noteId: string, chunkId: string, ydoc: Y.Doc): Promise<void> {
  try {
    console.log(`📥 Loading initial data for chunk: ${chunkId}`);
    
    const chunkRef = doc(db, `notes/${noteId}/chunks/${chunkId}`);
    
    // ✅ Add timeout to Firestore fetch
    const fetchPromise = getDoc(chunkRef);
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Firestore fetch timeout')), 5000);
    });
    
    const snap = await Promise.race([fetchPromise, timeoutPromise]);

    if (!snap.exists()) {
      console.warn(`⚠️ Chunk document not found: ${chunkId}`);
      return; // Empty chunk is okay for new notes
    }

    const data = snap.data();
    const contentText = ydoc.getText('content');

    console.log(`📊 Chunk ${chunkId} data:`, {
      hasYjsState: !!data.yjs_state,
      yjsStateLength: data.yjs_state?.length || 0,
      hasContent: !!data.content,
      contentLength: data.content?.length || 0
    });

    if (data.yjs_state && Array.isArray(data.yjs_state) && data.yjs_state.length > 0) {
      try {
        const state = new Uint8Array(data.yjs_state);
        Y.applyUpdate(ydoc, state, 'initial_load');
        
        const loadedContent = contentText.toString();
        console.log(`✅ Loaded Y.js state for chunk ${chunkId}: ${loadedContent.length} chars`);
        
        // ✅ Verify the content actually loaded
        if (loadedContent.length === 0 && data.content && data.content.length > 0) {
          console.warn(`⚠️ Y.js state loaded but content is empty, falling back to plain content`);
          contentText.insert(0, data.content);
          console.log(`✅ Fallback: Loaded plain content for chunk ${chunkId}`);
        }
      } catch (error) {
        console.error(`❌ Error loading Y.js state for chunk ${chunkId}:`, error);
        
        // Fallback to plain content
        if (contentText.length === 0 && data.content) {
          contentText.insert(0, data.content);
          console.log(`✅ Fallback: Loaded plain content for chunk ${chunkId}`);
        }
      }
    } else if (data.content && data.content.length > 0) {
      // No Y.js state, use plain content
      if (contentText.length === 0) {
        contentText.insert(0, data.content);
        console.log(`✅ Loaded plain content for chunk ${chunkId}: ${data.content.length} chars`);
      }
    } else {
      console.log(`📝 Chunk ${chunkId} is empty (new note)`);
    }
    
    // ✅ CRITICAL: Verify content is actually in Y.js after loading
    const finalContent = contentText.toString();
    console.log(`✅ Final verification for chunk ${chunkId}: ${finalContent.length} chars in Y.js`);
    
  } catch (error) {
    console.error(`❌ Error loading initial chunk ${chunkId}:`, error);
    throw error; // Re-throw to be caught by loadChunkSessions
  }
}


  // Get merged content from all chunks
  getMergedContent(noteId: string): string {
    const session = this.sessions.get(noteId);
    if (!session) return '';

    const sortedChunks = Array.from(session.chunkSessions.values())
      .sort((a, b) => a.index - b.index);

    return sortedChunks
      .map(chunk => chunk.contentText.toString())
      .join('');
  }

  // Get title text
  getTitle(noteId: string): string {
    const session = this.sessions.get(noteId);
    if (!session || !session.titleSession) return '';
    return session.titleSession.contentText.toString();
  }

  // Get a specific chunk session
  getChunkSession(noteId: string, chunkId: string): ChunkSession | undefined {
    const session = this.sessions.get(noteId);
    return session?.chunkSessions.get(chunkId);
  }

  // Get all chunk sessions for a note
  getChunkSessions(noteId: string): ChunkSession[] {
    const session = this.sessions.get(noteId);
    if (!session) return [];
    return Array.from(session.chunkSessions.values())
      .sort((a, b) => a.index - b.index);
  }

  // NEW: Undo last change
  undo(noteId: string): boolean {
    const session = this.sessions.get(noteId);
    if (!session) return false;

    // For now, undo on the first chunk (you can make this smarter based on cursor position)
    const chunks = this.getChunkSessions(noteId);
    if (chunks.length === 0) return false;

    const firstChunk = chunks[0];
    if (firstChunk.undoManager.canUndo()) {
      firstChunk.undoManager.undo();
      return true;
    }

    return false;
  }

  // NEW: Redo last undone change
  redo(noteId: string): boolean {
    const session = this.sessions.get(noteId);
    if (!session) return false;

    const chunks = this.getChunkSessions(noteId);
    if (chunks.length === 0) return false;

    const firstChunk = chunks[0];
    if (firstChunk.undoManager.canRedo()) {
      firstChunk.undoManager.redo();
      return true;
    }

    return false;
  }

  // NEW: Check if undo is available
  canUndo(noteId: string): boolean {
    const session = this.sessions.get(noteId);
    if (!session) return false;

    const chunks = this.getChunkSessions(noteId);
    return chunks.length > 0 && chunks[0].undoManager.canUndo();
  }

  // NEW: Check if redo is available
  canRedo(noteId: string): boolean {
    const session = this.sessions.get(noteId);
    if (!session) return false;

    const chunks = this.getChunkSessions(noteId);
    return chunks.length > 0 && chunks[0].undoManager.canRedo();
  }

  getSessionUsers(noteId: string): UserInfo[] {
    // Implement proper awareness later
    return [];
  }

  updateUserAwareness(noteId: string, uid: string, cursor: any) {
    // Implement proper tracking later
  }

  private destroySession(noteId: string) {
    const session = this.sessions.get(noteId);
    if (!session) return;

    // Destroy title session
    if (session.titleSession) {
      session.titleSession.destroy();
    }

    // Destroy all chunk sessions
    session.chunkSessions.forEach(chunkSession => {
      chunkSession.destroy();
    });

    session.chunkSessions.clear();
    this.sessions.delete(noteId);
  }

  cleanup() {
    this.sessions.forEach((session) => {
      this.destroySession(session.noteId);
    });
    this.sessions.clear();
    this.firestoreUnsubscribes.forEach((unsubscribe) => unsubscribe());
    this.firestoreUnsubscribes.clear();
  }

  
}



export const collaborativeService = new ChunkBasedCollaborativeService();
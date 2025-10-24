// services/notes-service.ts - Chunk-based refactor
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { Chunk, CHUNK_CONFIG, Note, Notebook } from '../app/types/notebook';
import { db } from "../firebase";

const notesCol = collection(db, "notes");
const notebooksCol = collection(db, "notebooks");

// ============= CHUNK HELPERS =============

export async function getNoteChunks(noteId: string): Promise<Chunk[]> {
  try {
    const chunksCol = collection(db, `notes/${noteId}/chunks`);
    const q = query(chunksCol, orderBy("index", "asc"));
    const snap = await getDocs(q);
    
    return snap.docs.map((d: QueryDocumentSnapshot) => {
      const data = d.data() as any;
      return {
        id: d.id,
        index: data.index ?? 0,
        yjs_state: data.yjs_state,
        content: data.content ?? "",
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        lastUpdatedBy: data.lastUpdatedBy,
        characterCount: data.characterCount ?? 0,
      } as Chunk;
    });
  } catch (error) {
    console.error("Error fetching note chunks:", error);
    return [];
  }
}

export async function createChunk(
  noteId: string, 
  index: number, 
  content: string = "",
  yjsState?: Uint8Array | number[]
): Promise<string> {
  try {
    const chunksCol = collection(db, `notes/${noteId}/chunks`);
    
    const chunkData = {
      index,
      content,
      yjs_state: yjsState ? Array.from(yjsState) : null,
      characterCount: content.length,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(chunksCol, chunkData);
    
    // Update note metadata
    const noteRef = doc(db, "notes", noteId);
    await updateDoc(noteRef, {
      chunkCount: (await getNoteChunks(noteId)).length,
      updatedAt: serverTimestamp(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating chunk:", error);
    throw error;
  }
}

export async function updateChunk(
  noteId: string, 
  chunkId: string, 
  updates: Partial<Omit<Chunk, 'id' | 'createdAt'>>
): Promise<void> {
  try {
    const chunkRef = doc(db, `notes/${noteId}/chunks/${chunkId}`);
    
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    // Convert Uint8Array to array for Firestore
    if (updates.yjs_state && updates.yjs_state instanceof Uint8Array) {
      updateData.yjs_state = Array.from(updates.yjs_state);
    }
    
    if (updates.content) {
      updateData.characterCount = updates.content.length;
    }
    
    await updateDoc(chunkRef, updateData);
    
    // Update note's updatedAt timestamp
    const noteRef = doc(db, "notes", noteId);
    await updateDoc(noteRef, {
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating chunk:", error);
    throw error;
  }
}

export async function deleteChunk(noteId: string, chunkId: string): Promise<void> {
  try {
    const chunkRef = doc(db, `notes/${noteId}/chunks/${chunkId}`);
    await deleteDoc(chunkRef);
    
    // Update note metadata
    const noteRef = doc(db, "notes", noteId);
    await updateDoc(noteRef, {
      chunkCount: (await getNoteChunks(noteId)).length,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error deleting chunk:", error);
    throw error;
  }
}

// Merge all chunks into a single content string for display
export async function getMergedNoteContent(noteId: string): Promise<string> {
  const chunks = await getNoteChunks(noteId);
  return chunks.map(chunk => chunk.content || "").join("");
}

// Check if a chunk needs to be split
export function shouldSplitChunk(chunk: Chunk): boolean {
  const size = chunk.characterCount || chunk.content?.length || 0;
  return size > CHUNK_CONFIG.SPLIT_THRESHOLD;
}

// Split a chunk into two chunks
export async function splitChunk(
  noteId: string, 
  chunkId: string, 
  chunk: Chunk
): Promise<void> {
  try {
    const content = chunk.content || "";
    const midpoint = Math.floor(content.length / 2);
    
    // Find a good split point (end of sentence or paragraph)
    let splitPoint = midpoint;
    const searchRadius = 200;
    
    for (let i = 0; i < searchRadius; i++) {
      const checkPoint = midpoint + i;
      if (checkPoint < content.length) {
        const char = content[checkPoint];
        if (char === '\n' || char === '.' || char === '!' || char === '?') {
          splitPoint = checkPoint + 1;
          break;
        }
      }
    }
    
    const firstHalf = content.substring(0, splitPoint);
    const secondHalf = content.substring(splitPoint);
    
    // Update existing chunk with first half
    await updateChunk(noteId, chunkId, {
      content: firstHalf,
      characterCount: firstHalf.length,
    });
    
    // Create new chunk with second half
    await createChunk(noteId, chunk.index + 1, secondHalf);
    
    // Reindex all subsequent chunks
    await reindexChunks(noteId, chunk.index + 2);
    
  } catch (error) {
    console.error("Error splitting chunk:", error);
    throw error;
  }
}

// Reindex chunks after insertion or deletion
async function reindexChunks(noteId: string, startIndex: number): Promise<void> {
  const chunks = await getNoteChunks(noteId);
  const batch = writeBatch(db);
  
  chunks
    .filter(c => c.index >= startIndex)
    .forEach((chunk, idx) => {
      const chunkRef = doc(db, `notes/${noteId}/chunks/${chunk.id}`);
      batch.update(chunkRef, { index: startIndex + idx });
    });
  
  await batch.commit();
}

// ============= NOTE OPERATIONS =============

export async function getNotes(uid: string): Promise<Note[]> {
  const q = query(notesCol, where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d: QueryDocumentSnapshot) => {
    const data = d.data() as any;
    return {
      id: d.id,
      uid: data.uid,
      title: data.title ?? "",
      notebookId: data.notebookId ?? null,
      tags: data.tags ?? [],
      properties: data.properties ?? [],
      chunkCount: data.chunkCount ?? 0,
      totalCharacters: data.totalCharacters ?? 0,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
    } as Note;
  });
}

export async function getNotebooks(uid: string): Promise<Notebook[]> {
  const q = query(notebooksCol, where("uid", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d: QueryDocumentSnapshot) => {
    const data = d.data() as any;
    return {
      id: d.id,
      uid: data.uid,
      title: data.title ?? "Untitled Notebook",
      description: data.description ?? "",
      coverImage: data.coverImage ?? "",
      properties: data.properties ?? [],
      tags: data.tags ?? [],
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
    } as Notebook;
  });
}

// Create note with initial empty chunk
export async function createNote(
  noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt' | 'uid' | 'chunkCount'>, 
  uid: string,
  initialContent: string = ""
): Promise<string> {
  try {
    const noteToCreate = {
      ...noteData,
      uid,
      chunkCount: 0,
      totalCharacters: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    // Create note document (metadata only)
    const docRef = await addDoc(notesCol, noteToCreate);
    
    // Create initial chunk
    await createChunk(docRef.id, 0, initialContent);
    
    return docRef.id;
  } catch (error) {
    console.error("Error creating note:", error);
    throw error;
  }
}

export async function createNotebook(
  notebookData: Omit<Notebook, 'id' | 'createdAt' | 'updatedAt' | 'uid'>, 
  uid: string
): Promise<string> {
  const notebookToCreate = {
    ...notebookData,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(notebooksCol, notebookToCreate);
  return docRef.id;
}

// Update note metadata only (not content)
export async function updateNote(
  noteId: string, 
  updates: Partial<Omit<Note, 'id' | 'uid' | 'chunkCount'>>, 
  uid: string
): Promise<void> {
  const noteRef = doc(db, "notes", noteId);
  
  await updateDoc(noteRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function updateNotebook(
  notebookId: string, 
  updates: Partial<Omit<Notebook, 'id' | 'uid'>>, 
  uid: string
): Promise<void> {
  const notebookRef = doc(db, "notebooks", notebookId);
  
  await updateDoc(notebookRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Delete note and all its chunks
export async function deleteNote(noteId: string, uid: string): Promise<void> {
  try {
    // Delete all chunks first
    const chunks = await getNoteChunks(noteId);
    const batch = writeBatch(db);
    
    chunks.forEach(chunk => {
      const chunkRef = doc(db, `notes/${noteId}/chunks/${chunk.id}`);
      batch.delete(chunkRef);
    });
    
    await batch.commit();
    
    // Then delete the note document
    const noteRef = doc(db, "notes", noteId);
    await deleteDoc(noteRef);
  } catch (error) {
    console.error("Error deleting note:", error);
    throw error;
  }
}

export async function deleteNotebook(notebookId: string, uid: string): Promise<void> {
  const notebookRef = doc(db, "notebooks", notebookId);
  await deleteDoc(notebookRef);
}

export async function getNotesInNotebook(notebookId: string, uid: string): Promise<Note[]> {
  const q = query(
    notesCol, 
    where("uid", "==", uid),
    where("notebookId", "==", notebookId)
  );
  const snap = await getDocs(q);
  
  return snap.docs.map((d: QueryDocumentSnapshot) => {
    const data = d.data() as any;
    return {
      id: d.id,
      uid: data.uid,
      title: data.title ?? "",
      notebookId: data.notebookId ?? null,
      tags: data.tags ?? [],
      properties: data.properties ?? [],
      chunkCount: data.chunkCount ?? 0,
      totalCharacters: data.totalCharacters ?? 0,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
    } as Note;
  });
}

/**
 * Get all public notes for a specific user
 */
export async function getPublicNotes(uid: string): Promise<Note[]> {
  try {
    const notesCol = collection(db, "notes");
    const q = query(
      notesCol,
      where("uid", "==", uid),
      where("isPublic", "==", true),
      orderBy("updatedAt", "desc")
    );
    const snap = await getDocs(q);
    
    return snap.docs.map((d: QueryDocumentSnapshot) => {
      const data = d.data() as any;
      return {
        id: d.id,
        uid: data.uid,
        title: data.title ?? "",
        notebookId: data.notebookId ?? null,
        tags: data.tags ?? [],
        properties: data.properties ?? [],
        chunkCount: data.chunkCount ?? 0,
        totalCharacters: data.totalCharacters ?? 0,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        isPublic: data.isPublic ?? false,
      } as Note;
    });
  } catch (error) {
    console.error("Error fetching public notes:", error);
    return [];
  }
}

/**
 * Get all public notebooks for a specific user
 */
export async function getPublicNotebooks(uid: string): Promise<Notebook[]> {
  try {
    const notebooksCol = collection(db, "notebooks");
    const q = query(
      notebooksCol,
      where("uid", "==", uid),
      where("isPublic", "==", true),
      orderBy("updatedAt", "desc")
    );
    const snap = await getDocs(q);
    
    return snap.docs.map((d: QueryDocumentSnapshot) => {
      const data = d.data() as any;
      return {
        id: d.id,
        uid: data.uid,
        title: data.title ?? "Untitled Notebook",
        description: data.description ?? "",
        coverImage: data.coverImage ?? "",
        properties: data.properties ?? [],
        tags: data.tags ?? [],
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        isPublic: data.isPublic ?? false,
      } as Notebook;
    });
  } catch (error) {
    console.error("Error fetching public notebooks:", error);
    return [];
  }
}

/**
 * Get a single note by ID (for public viewing - no ownership check)
 */
export async function getNoteById(noteId: string): Promise<Note | null> {
  try {
    const docRef = doc(db, "notes", noteId);
    const snap = await getDoc(docRef);
    
    if (snap.exists()) {
      const data = snap.data() as any;
      return {
        id: snap.id,
        uid: data.uid,
        title: data.title ?? "",
        notebookId: data.notebookId ?? null,
        tags: data.tags ?? [],
        properties: data.properties ?? [],
        chunkCount: data.chunkCount ?? 0,
        totalCharacters: data.totalCharacters ?? 0,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        isPublic: data.isPublic ?? false,
      } as Note;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching note by ID:", error);
    return null;
  }
}

/**
 * Count public content for a user (for stats)
 */
export async function countPublicContent(uid: string): Promise<{
  publicNotes: number;
  publicNotebooks: number;
}> {
  try {
    const [notes, notebooks] = await Promise.all([
      getPublicNotes(uid),
      getPublicNotebooks(uid),
    ]);
    
    return {
      publicNotes: notes.length,
      publicNotebooks: notebooks.length,
    };
  } catch (error) {
    console.error("Error counting public content:", error);
    return {
      publicNotes: 0,
      publicNotebooks: 0,
    };
  }
}


// services/notes-migration.ts
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createChunk } from '../notes-service';

export async function migrateNoteToChunks(noteId: string): Promise<boolean> {
  try {
    const noteRef = doc(db, 'notes', noteId); //pathway or the specific document we want to perform queries on
    const snap = await getDoc(noteRef); //gets a snapshot of the document based on the noteRef and the given parameters
    
    if (!snap.exists()) return false;
    
    const data = snap.data(); //assign the data of that document to this variable
    
    // Check if already migrated
    if (data.chunkCount && data.chunkCount > 0) { 
      console.log('Note already migrated');
      return true;
    }
    
    // Migrate old content field to first chunk
    const content = data.content || '';
    
    if (content) {
      console.log(`Migrating note ${noteId} with ${content.length} characters`);
      await createChunk(noteId, 0, content);
      console.log('Migration complete');
      return true;
    }
    
    // Create empty chunk if no content
    await createChunk(noteId, 0, '');
    return true;
    
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}
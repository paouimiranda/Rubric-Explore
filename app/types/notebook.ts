// notebook.ts (for declaring types and interfaces for the notes module)
export interface NotebookProperty {
  key: string;
  value: string;
}

export interface Notebook {
  id: string;
  uid: string;
  title: string;
  description?: string;
  coverImage?: string;
  properties?: NotebookProperty[];
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  color: string;
  collaborators?: { [userUid: string]: Collaborator };
}

// Note metadata only - no content field
export interface Note {
  id: string;
  uid: string;
  notebookId?: string;
  title: string;
  properties?: NotebookProperty[];
  createdAt: Date;
  updatedAt: Date;
  category?: string;
  pinned?: boolean;
  tags?: string[];
  
  collaborators?: { [userUid: string]: Collaborator };
  
  // Metadata for chunk management
  chunkCount?: number; // Total number of chunks
  totalCharacters?: number; // Total characters across all chunks
  lastUpdatedBy?: string;
  collaborationVersion?: number;
  
  activeSessions?: {
    [sessionId: string]: {
      userId: string;
      joinedAt: Date;
      lastActivity: Date;
    };
  };
}

// New Chunk interface
export interface Chunk {
  id: string;
  index: number; // Order of chunk in the note
  yjs_state?: Uint8Array | number[]; // Y.js state for this chunk
  content?: string; // Fallback plain text
  createdAt: Date;
  updatedAt: Date;
  lastUpdatedBy?: string;
  characterCount?: number; // Track size for splitting logic
}

export interface Collaborator {
  permission: 'view' | 'edit';
  joinedAt: Date;
  via: 'share_link' | 'direct_invite';
  displayName?: string;
  email?: string;
}

export interface CollaborationMetadata {
  isActive: boolean;
  activeUsers: number;
  lastSyncAt: Date;
  conflictResolution?: 'manual' | 'auto' | 'latest_wins';
}

export interface CollaborativeEvent {
  type: 'user_joined' | 'user_left' | 'content_changed' | 'cursor_moved';
  userId: string;
  noteId: string;
  timestamp: Date;
  data?: any;
}

export interface CollaborativeUser {
  uid: string;
  displayName: string;
  email?: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
    field: 'title' | 'content';
    chunkId?: string; // NEW: Track which chunk user is editing
  };
  lastActivity: Date;
  isTyping?: boolean;
  activeChunkId?: string; // NEW: Track which chunk user is currently in
}

// Constants for chunk management
export const CHUNK_CONFIG = {
  MAX_CHUNK_SIZE: 20000, // ~20KB max per chunk
  OPTIMAL_CHUNK_SIZE: 15000, // Try to keep chunks around 15KB
  MIN_CHUNK_SIZE: 5000, // Don't create tiny chunks
  SPLIT_THRESHOLD: 18000, // Start thinking about splitting at 18KB
};

export interface RichTextFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  background?: string;
  header?: 1 | 2 | 3 | 4 | 5 | 6;
  list?: 'bullet' | 'ordered' | 'checkbox';
  align?: 'left' | 'center' | 'right' | 'justify';
}
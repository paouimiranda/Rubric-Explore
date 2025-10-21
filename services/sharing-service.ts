// services/sharing-service.ts (for NOTES)
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { Note } from '../app/types/notebook';
import { db } from '../firebase';

export type SharePermission = 'view' | 'edit';
export type ShareMethod = 'public_url' | 'email_invite' | 'share_code';

export interface ShareToken {
  id: string;
  noteId: string;
  createdBy: string;
  method: ShareMethod;
  permission: SharePermission;
  token: string;
  expiresAt: Date | null;
  usageCount: number;
  maxUses: number | null;
  createdAt: Date;
  isActive: boolean;
  inviteeEmail?: string; // For email invites
  inviteeName?: string;  // For named invites
}

export interface ShareLinkOptions {
  permission: SharePermission;
  expiresIn?: number; // hours, null for never expires
  maxUses?: number; // null for unlimited
  requireAuth?: boolean;
  inviteeEmail?: string;
  inviteeName?: string;
}

class SharingService {
  
  // Generate a secure random token
  private generateToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Generate a shorter share code (for easy sharing)
  private generateShareCode(): string {
    const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Create a shareable link for a note
  async createShareLink(
    noteId: string, 
    creatorUid: string, 
    method: ShareMethod = 'public_url',
    options: ShareLinkOptions
  ): Promise<ShareToken> {
    try {
      // Verify the user owns the note
      const noteRef = doc(db, 'notes', noteId);
      const noteSnap = await getDoc(noteRef);
      
      if (!noteSnap.exists()) {
        throw new Error('Note not found');
      }

      const noteData = noteSnap.data();
      if (noteData.uid !== creatorUid) {
        throw new Error('You do not have permission to share this note');
      }

      // Generate token based on method
      const token = method === 'share_code' 
        ? this.generateShareCode() 
        : this.generateToken();

      // Calculate expiration
      const expiresAt = options.expiresIn 
        ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000)
        : null;

      // Create share token document
      const shareData = {
        noteId,
        createdBy: creatorUid,
        method,
        permission: options.permission,
        token,
        expiresAt,
        usageCount: 0,
        maxUses: options.maxUses || null,
        createdAt: serverTimestamp(),
        isActive: true,
        inviteeEmail: options.inviteeEmail || null,
        inviteeName: options.inviteeName || null,
      };

      const shareRef = await addDoc(collection(db, 'shareTokens'), shareData);

      // Add collaborator to the note if it's an edit permission
      if (options.permission === 'edit') {
        await this.addCollaboratorToNote(noteId, shareRef.id, options.permission);
      }

      return {
        id: shareRef.id,
        ...shareData,
        createdAt: new Date(),
        expiresAt,
      } as ShareToken;

    } catch (error) {
      console.error('Error creating share link:', error);
      throw error;
    }
  }

  // Add collaborator access to note document
  private async addCollaboratorToNote(
    noteId: string, 
    shareTokenId: string, 
    permission: SharePermission
  ) {
    const noteRef = doc(db, 'notes', noteId);
    const noteSnap = await getDoc(noteRef);
    
    if (noteSnap.exists()) {
      const noteData = noteSnap.data();
      const collaborators = noteData.collaborators || {};
      
      collaborators[shareTokenId] = {
        permission,
        joinedAt: serverTimestamp(),
        via: 'share_link'
      };

      await updateDoc(noteRef, { collaborators });
    }
  }

  // Validate and use a share token
  async useShareToken(token: string, userUid?: string): Promise<{
    note: Note;
    permission: SharePermission;
    shareToken: ShareToken;
  }> {
    try {
      // Find the share token
      const tokensRef = collection(db, 'shareTokens');
      const q = query(tokensRef, where('token', '==', token), where('isActive', '==', true));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        throw new Error('Invalid or expired share link');
      }

      const shareDoc = querySnap.docs[0];
      const shareData = shareDoc.data() as any;
      const shareToken: ShareToken = {
        id: shareDoc.id,
        ...shareData,
        createdAt: shareData.createdAt?.toDate() || new Date(),
        expiresAt: shareData.expiresAt?.toDate() || null,
      };

      // Check if token has expired
      if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
        await updateDoc(doc(db, 'shareTokens', shareDoc.id), { isActive: false });
        throw new Error('This share link has expired');
      }

      // Check usage limits
      if (shareToken.maxUses && shareToken.usageCount >= shareToken.maxUses) {
        await updateDoc(doc(db, 'shareTokens', shareDoc.id), { isActive: false });
        throw new Error('This share link has reached its usage limit');
      }

      // Get the note
      const noteRef = doc(db, 'notes', shareToken.noteId);
      const noteSnap = await getDoc(noteRef);

      if (!noteSnap.exists()) {
        throw new Error('The shared note no longer exists');
      }

      const noteData = noteSnap.data();
      const note: Note = {
        id: noteSnap.id,
        ...noteData,
        createdAt: noteData.createdAt?.toDate() || new Date(),
        updatedAt: noteData.updatedAt?.toDate() || new Date(),
      } as Note;

      // Increment usage count
      await updateDoc(doc(db, 'shareTokens', shareDoc.id), {
        usageCount: shareToken.usageCount + 1
      });

      // If user is authenticated and has edit permission, add them as collaborator
      if (userUid && shareToken.permission === 'edit') {
        await this.addUserAsCollaborator(shareToken.noteId, userUid, shareToken.permission);
      }

      return { note, permission: shareToken.permission, shareToken };

    } catch (error) {
      console.error('Error using share token:', error);
      throw error;
    }
  }

  // Add authenticated user as collaborator
  private async addUserAsCollaborator(
    noteId: string, 
    userUid: string, 
    permission: SharePermission
  ) {
    const noteRef = doc(db, 'notes', noteId);
    const noteSnap = await getDoc(noteRef);
    
    if (noteSnap.exists()) {
      const noteData = noteSnap.data();
      const collaborators = noteData.collaborators || {};
      
      // Don't add if user is already the owner
      if (noteData.uid === userUid) return;
      
      // Don't overwrite existing collaborator entry
      if (!collaborators[userUid]) {
        collaborators[userUid] = {
          permission,
          joinedAt: serverTimestamp(),
          via: 'share_link'
        };

        await updateDoc(noteRef, { collaborators });
      }
    }
  }

  // Get all share tokens for a note
  async getShareTokensForNote(noteId: string, creatorUid: string): Promise<ShareToken[]> {
    try {
      const tokensRef = collection(db, 'shareTokens');
      const q = query(
        tokensRef, 
        where('noteId', '==', noteId),
        where('createdBy', '==', creatorUid)
      );
      const querySnap = await getDocs(q);

      return querySnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate() || null,
      })) as ShareToken[];

    } catch (error) {
      console.error('Error getting share tokens:', error);
      throw error;
    }
  }

  // Revoke a share token
  async revokeShareToken(tokenId: string, creatorUid: string): Promise<void> {
    try {
      const tokenRef = doc(db, 'shareTokens', tokenId);
      const tokenSnap = await getDoc(tokenRef);

      if (!tokenSnap.exists()) {
        throw new Error('Share token not found');
      }

      const tokenData = tokenSnap.data();
      if (tokenData.createdBy !== creatorUid) {
        throw new Error('You do not have permission to revoke this token');
      }

      await updateDoc(tokenRef, { isActive: false });

    } catch (error) {
      console.error('Error revoking share token:', error);
      throw error;
    }
  }

  // Delete a share token completely
  async deleteShareToken(tokenId: string, creatorUid: string): Promise<void> {
    try {
      const tokenRef = doc(db, 'shareTokens', tokenId);
      const tokenSnap = await getDoc(tokenRef);

      if (!tokenSnap.exists()) {
        throw new Error('Share token not found');
      }

      const tokenData = tokenSnap.data();
      if (tokenData.createdBy !== creatorUid) {
        throw new Error('You do not have permission to delete this token');
      }

      await deleteDoc(tokenRef);

    } catch (error) {
      console.error('Error deleting share token:', error);
      throw error;
    }
  }

  // Generate various types of shareable URLs/codes
  generateShareUrl(token: string): string {
    // Replace with your actual app URL scheme
    const baseUrl = __DEV__ 
      ? 'http://localhost:3000/shared' 
      : 'https://yourapp.com/shared';
    
    return `${baseUrl}/${token}`;
  }

  generateDeepLink(token: string): string {
    // Replace with your app's deep link scheme
    return `yourapp://shared/${token}`;
  }

  // Generate QR code data (you'll need a QR code library to display this)
  generateQRCodeData(token: string): string {
    return this.generateDeepLink(token);
  }
}

export const sharingService = new SharingService();
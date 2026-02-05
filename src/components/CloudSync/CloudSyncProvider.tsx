import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { authService } from '../../services/AuthService';
import { cloudDataService } from '../../services/CloudDataService';
import { dataMigrationService } from '../../services/DataMigrationService';
import { VoiceNote, Document } from '../../types';

interface CloudSyncContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncTime: Date | null;
  voiceNotes: VoiceNote[];
  documents: Document[];
  signOut: () => Promise<void>;
  syncData: () => Promise<void>;
  saveVoiceNote: (note: VoiceNote, audioBlob?: Blob) => Promise<void>;
  saveDocument: (document: Document) => Promise<void>;
  deleteVoiceNote: (noteId: string) => Promise<void>;
}

const CloudSyncContext = createContext<CloudSyncContextType | null>(null);

export const useCloudSync = () => {
  const context = useContext(CloudSyncContext);
  if (!context) {
    throw new Error('useCloudSync must be used within a CloudSyncProvider');
  }
  return context;
};

interface CloudSyncProviderProps {
  children: ReactNode;
}

export const CloudSyncProvider: React.FC<CloudSyncProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setIsLoading(false);
      
      if (user) {
        // Start real-time sync when user is authenticated
        startRealTimeSync(user.uid);
      } else {
        // Clear data when user signs out
        setVoiceNotes([]);
        setDocuments([]);
        setSyncStatus('idle');
        setLastSyncTime(null);
      }
    });

    return unsubscribe;
  }, []);

  // Start real-time synchronization
  const startRealTimeSync = (userId: string) => {
    // Real-time voice notes sync (FREE)
    const unsubscribeVoiceNotes = cloudDataService.onVoiceNotesChanged(userId, (notes) => {
      setVoiceNotes(notes);
      setLastSyncTime(new Date());
      setSyncStatus('synced');
      
      // Also update localStorage for offline access
      localStorage.setItem('voiceNotes', JSON.stringify(notes));
    });

    // Real-time documents sync (FREE)
    const unsubscribeDocuments = cloudDataService.onDocumentsChanged(userId, (docs) => {
      setDocuments(docs);
      setLastSyncTime(new Date());
      setSyncStatus('synced');
      
      // Also update localStorage for offline access
      localStorage.setItem('documents', JSON.stringify(docs));
    });

    // Cleanup function will be called when user signs out or component unmounts
    return () => {
      unsubscribeVoiceNotes();
      unsubscribeDocuments();
    };
  };

  // Manual sync function
  const syncData = async () => {
    if (!user) return;

    setSyncStatus('syncing');
    try {
      // Get latest data from cloud
      const [cloudVoiceNotes, cloudDocuments] = await Promise.all([
        cloudDataService.getVoiceNotes(user.uid),
        cloudDataService.getDocuments(user.uid)
      ]);

      setVoiceNotes(cloudVoiceNotes);
      setDocuments(cloudDocuments);
      setLastSyncTime(new Date());
      setSyncStatus('synced');

      // Update localStorage
      localStorage.setItem('voiceNotes', JSON.stringify(cloudVoiceNotes));
      localStorage.setItem('documents', JSON.stringify(cloudDocuments));

    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  };

  // Save voice note to cloud
  const saveVoiceNote = async (note: VoiceNote, audioBlob?: Blob) => {
    if (!user) throw new Error('User not authenticated');

    setSyncStatus('syncing');
    try {
      await cloudDataService.saveVoiceNote(user.uid, note, audioBlob);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      setSyncStatus('error');
      throw error;
    }
  };

  // Save document to cloud
  const saveDocument = async (document: Document) => {
    if (!user) throw new Error('User not authenticated');

    setSyncStatus('syncing');
    try {
      await cloudDataService.saveDocument(user.uid, document);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      setSyncStatus('error');
      throw error;
    }
  };

  // Delete voice note from cloud
  const deleteVoiceNote = async (noteId: string) => {
    if (!user) throw new Error('User not authenticated');

    setSyncStatus('syncing');
    try {
      await cloudDataService.deleteVoiceNote(user.uid, noteId);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (error) {
      setSyncStatus('error');
      throw error;
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  };

  const value: CloudSyncContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    syncStatus,
    lastSyncTime,
    voiceNotes,
    documents,
    signOut,
    syncData,
    saveVoiceNote,
    saveDocument,
    deleteVoiceNote
  };

  return (
    <CloudSyncContext.Provider value={value}>
      {children}
    </CloudSyncContext.Provider>
  );
};
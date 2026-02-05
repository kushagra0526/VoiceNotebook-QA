import React, { useState } from 'react';
import { ContentItem, VoiceMetadata, FileMetadata } from '../../types';
import styles from './ContentManager.module.css';

interface ContentManagerProps {
  items: ContentItem[];
  onDelete: (id: string) => void;
  onView: (item: ContentItem) => void;
}

export const ContentManager: React.FC<ContentManagerProps> = ({ items, onDelete, onView }) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<ContentItem | null>(null);

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      onDelete(id);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const handleView = (item: ContentItem) => {
    setViewingItem(item);
    onView(item);
  };

  const closeModal = () => {
    setViewingItem(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}></div>
          <h3>Nothing here yet</h3>
          <p>Record a voice note or upload a file to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>{items.length} {items.length === 1 ? 'item' : 'items'}</h2>
      </div>
      
      <div className={styles.grid}>
        {items.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardType}>
                {item.type === 'voice' ? '🎤' : '📄'}
              </div>
              <div className={styles.cardActions}>
                <button
                  onClick={() => handleView(item)}
                  className={styles.viewButton}
                  title="View content"
                >
                  👁️
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className={`${styles.deleteButton} ${deleteConfirm === item.id ? styles.confirmDelete : ''}`}
                  title={deleteConfirm === item.id ? 'Click again to confirm' : 'Delete item'}
                >
                  {deleteConfirm === item.id ? '✓' : '🗑️'}
                </button>
              </div>
            </div>
            
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardPreview}>
                {item.content.length > 100 
                  ? item.content.substring(0, 100) + '...'
                  : item.content
                }
              </p>
              
              <div className={styles.cardMeta}>
                <div className={styles.timestamp}>
                  {item.timestamp.toLocaleDateString()} {item.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                
                {item.type === 'voice' && (
                  <div className={styles.voiceMeta}>
                    Duration: {formatDuration((item.metadata as VoiceMetadata).duration || 0)}
                  </div>
                )}
                
                {item.type === 'file' && (
                  <div className={styles.fileMeta}>
                    {formatFileSize((item.metadata as FileMetadata).fileSize)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {viewingItem && (
        <div className={styles.modal} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{viewingItem.title}</h2>
              <button onClick={closeModal} className={styles.closeButton}>
                ✕
              </button>
            </div>
            
            <div className={styles.modalBody}>
              {viewingItem.type === 'voice' && (
                <div className={styles.voiceNote}>
                  <p className={styles.voiceLabel}>📝 Converted Voice Text:</p>
                </div>
              )}
              
              <div className={styles.contentText}>
                <h3>Content:</h3>
                <div className={styles.fullContent}>
                  {viewingItem.content}
                </div>
              </div>
              
              <div className={styles.itemDetails}>
                <h3>Details:</h3>
                <div className={styles.detailsGrid}>
                  <div>
                    <strong>Type:</strong> {viewingItem.type === 'voice' ? 'Voice Text' : 'File'}
                  </div>
                  <div>
                    <strong>Created:</strong> {viewingItem.timestamp.toLocaleString()}
                  </div>
                  
                  {viewingItem.type === 'file' && (
                    <>
                      <div>
                        <strong>File Name:</strong> {(viewingItem.metadata as FileMetadata).fileName}
                      </div>
                      <div>
                        <strong>File Size:</strong> {formatFileSize((viewingItem.metadata as FileMetadata).fileSize)}
                      </div>
                    </>
                  )}
                  
                  {viewingItem.type === 'voice' && (
                    <div>
                      <strong>Duration:</strong> {formatDuration((viewingItem.metadata as VoiceMetadata).duration || 0)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
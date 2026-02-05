import React, { useState, useRef } from 'react';
import { ProcessedFile } from '../../types';
import { FileProcessingService } from '../../services/FileProcessingService';
import styles from './FileUploader.module.css';

interface FileUploaderProps {
  onFileProcessed: (fileData: ProcessedFile) => void;
  onError: (error: string) => void;
  acceptedTypes: string[];
  maxFileSize: number;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  onFileProcessed, 
  onError, 
  acceptedTypes, 
  maxFileSize 
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileService] = useState(() => new FileProcessingService());

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    console.log('=== FILE PROCESSING START ===');
    console.log('Processing file:', file.name, 'Size:', file.size, 'Type:', file.type);
    setIsProcessing(true);
    
    try {
      const validation = fileService.validateFile(file);
      console.log('File validation result:', validation);
      
      if (!validation.isValid) {
        throw new Error(validation.error || 'File validation failed');
      }

      console.log('Extracting text from file...');
      const content = await fileService.extractTextFromFile(file);
      console.log('Extracted content length:', content?.length);
      console.log('Extracted content preview:', content?.substring(0, 200));
      
      const processedFile: ProcessedFile = {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        content,
        originalFile: file
      };

      console.log('ProcessedFile object:', {
        fileName: processedFile.fileName,
        contentLength: processedFile.content.length,
        contentPreview: processedFile.content.substring(0, 100)
      });
      
      onFileProcessed(processedFile);
      console.log('=== FILE PROCESSING COMPLETE ===');
    } catch (error) {
      console.error('File processing error:', error);
      onError(`Failed to process file: ${error}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropzone} ${isDragOver ? styles.dragOver : ''} ${isProcessing ? styles.processing : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className={styles.hiddenInput}
        />
        
        <div className={styles.uploadIcon}>
          {isProcessing ? (
            <div className={styles.spinner}></div>
          ) : (
            <div className={styles.fileIcon}></div>
          )}
        </div>
        
        <div className={styles.uploadText}>
          {isProcessing ? (
            <div>
              <p>Processing file...</p>
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                Extracting text content from your document
              </p>
            </div>
          ) : (
            <>
              <p className={styles.primaryText}>
                Drop files here or click to browse
              </p>
              <p className={styles.secondaryText}>
                {acceptedTypes.join(', ')} files up to {formatFileSize(maxFileSize)}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
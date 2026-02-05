// Core data model interfaces
export interface ContentItem {
  id: string;
  type: 'voice' | 'file';
  title: string;
  content: string;
  timestamp: Date;
  metadata: VoiceMetadata | FileMetadata;
}

export interface VoiceMetadata {
  duration: number;
  audioBlob: Blob;
  confidence: number;
}

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  originalFile: File;
}

export interface SearchResult {
  item: ContentItem;
  relevanceScore: number;
  matchedSegments: string[];
  highlightedContent: string;
}

export interface ProcessedFile {
  fileName: string;
  fileSize: number;
  fileType: string;
  content: string;
  originalFile: File;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Database schema interfaces
export interface ContentItemRecord {
  id: string;
  type: 'voice' | 'file';
  title: string;
  content: string;
  timestamp: number;
  metadata: string; // JSON serialized
  audioData?: ArrayBuffer;
  fileData?: ArrayBuffer;
}

export interface SearchIndexRecord {
  id: string;
  contentId: string;
  words: string[];
  ngrams: string[];
}

// Re-export analytics types
export * from './analytics';
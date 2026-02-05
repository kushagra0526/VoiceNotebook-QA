import Dexie, { Table } from 'dexie';
import { ContentItem, ProcessedFile, ContentItemRecord, VoiceMetadata, FileMetadata } from '../types';

class VoiceDocumentDatabase extends Dexie {
  contentItems!: Table<ContentItemRecord>;

  constructor() {
    super('VoiceDocumentDatabase');
    this.version(1).stores({
      contentItems: '++id, type, title, content, timestamp'
    });
  }
}

export class DatabaseService {
  private db: VoiceDocumentDatabase;

  constructor() {
    this.db = new VoiceDocumentDatabase();
  }

  async saveVoiceRecording(text: string, audioBlob: Blob): Promise<string> {
    const id = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Only store basic metadata, NO audio data
    const metadata: VoiceMetadata = {
      duration: 0,
      audioBlob: new Blob(), // Empty blob, we don't store audio
      confidence: 0.9
    };

    // Use the first 50 characters of the transcribed text as title, or fallback
    const title = text.length > 0 
      ? (text.length > 50 ? text.substring(0, 50) + '...' : text)
      : `Voice Text ${new Date().toLocaleString()}`;

    const record: ContentItemRecord = {
      id,
      type: 'voice',
      title,
      content: text, // ONLY store the converted text
      timestamp: Date.now(),
      metadata: JSON.stringify(metadata)
      // NO audioData - we don't store the audio file
    };

    await this.db.contentItems.add(record);
    return id;
  }

  async saveFile(fileData: ProcessedFile): Promise<string> {
    console.log('=== DATABASE SAVE FILE START ===');
    console.log('DatabaseService: Saving file:', fileData.fileName);
    console.log('File content length:', fileData.content.length);
    console.log('File content preview:', fileData.content.substring(0, 200));
    
    const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Don't store the actual file data, just metadata
    const metadata: FileMetadata = {
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      fileType: fileData.fileType,
      originalFile: fileData.originalFile
    };

    // Create a clean title from filename
    const title = fileData.fileName.replace(/\.[^/.]+$/, ""); // Remove extension

    const record: ContentItemRecord = {
      id,
      type: 'file',
      title,
      content: fileData.content, // Store the extracted text content
      timestamp: Date.now(),
      metadata: JSON.stringify(metadata)
      // Don't store fileData - we only need the text content
    };

    console.log('DatabaseService: Record to save:', { 
      id, 
      title: record.title, 
      contentLength: record.content.length,
      contentPreview: record.content.substring(0, 100)
    });
    
    await this.db.contentItems.add(record);
    console.log('DatabaseService: File saved successfully with ID:', id);
    console.log('=== DATABASE SAVE FILE COMPLETE ===');
    return id;
  }

  async getAllItems(): Promise<ContentItem[]> {
    const records = await this.db.contentItems.orderBy('timestamp').reverse().toArray();
    
    return records.map(record => this.recordToContentItem(record));
  }

  async deleteItem(id: string): Promise<void> {
    await this.db.contentItems.delete(id);
  }

  async searchContent(query: string): Promise<ContentItem[]> {
    const lowerQuery = query.toLowerCase();
    const records = await this.db.contentItems
      .filter(item => 
        item.content.toLowerCase().includes(lowerQuery) ||
        item.title.toLowerCase().includes(lowerQuery)
      )
      .toArray();
    
    return records.map(record => this.recordToContentItem(record));
  }

  private recordToContentItem(record: ContentItemRecord): ContentItem {
    const metadata = JSON.parse(record.metadata);
    
    // For voice items, we only have text content, no audio
    if (record.type === 'voice') {
      metadata.audioBlob = new Blob(); // Empty blob since we don't store audio
    }

    return {
      id: record.id,
      type: record.type,
      title: record.title,
      content: record.content, // This is the converted text from voice
      timestamp: new Date(record.timestamp),
      metadata
    };
  }
}
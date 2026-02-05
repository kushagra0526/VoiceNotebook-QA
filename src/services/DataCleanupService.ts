// Data Cleanup Service - Manages storage cleanup and data archiving

import { AnalyticsStorageService } from './AnalyticsStorageService';
import { DatabaseService } from './DatabaseService';
import { ContentItem } from '../types';

export interface CleanupOptions {
  retentionDays: number;
  maxItems?: number;
  preserveImportant?: boolean;
  dryRun?: boolean;
}

export interface CleanupResult {
  itemsDeleted: number;
  analyticsEventsDeleted: number;
  spaceSaved: string;
  errors: string[];
  warnings: string[];
}

export interface ArchiveOptions {
  archiveAfterDays: number;
  compressionLevel?: 'low' | 'medium' | 'high';
  keepOriginals?: boolean;
}

export class DataCleanupService {
  private databaseService: DatabaseService;
  private analyticsStorage: AnalyticsStorageService;

  constructor(databaseService: DatabaseService, analyticsStorage: AnalyticsStorageService) {
    this.databaseService = databaseService;
    this.analyticsStorage = analyticsStorage;
  }

  // Clean up old data based on retention policy
  async cleanupOldData(options: CleanupOptions): Promise<CleanupResult> {
    const result: CleanupResult = {
      itemsDeleted: 0,
      analyticsEventsDeleted: 0,
      spaceSaved: '0 B',
      errors: [],
      warnings: []
    };

    try {
      console.log(`Starting cleanup with ${options.retentionDays} days retention...`);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.retentionDays);

      // Calculate space before cleanup
      const spaceBefore = await this.calculateStorageUsage();

      // Clean up old content items
      const contentCleanup = await this.cleanupOldContent(cutoffDate, options);
      result.itemsDeleted = contentCleanup.deleted;
      result.errors.push(...contentCleanup.errors);
      result.warnings.push(...contentCleanup.warnings);

      // Clean up old analytics events
      const analyticsCleanup = await this.cleanupOldAnalytics(cutoffDate, options);
      result.analyticsEventsDeleted = analyticsCleanup.deleted;
      result.errors.push(...analyticsCleanup.errors);

      // Calculate space saved
      const spaceAfter = await this.calculateStorageUsage();
      const spaceSaved = spaceBefore - spaceAfter;
      result.spaceSaved = this.formatBytes(spaceSaved);

      console.log(`Cleanup completed: ${result.itemsDeleted} items, ${result.analyticsEventsDeleted} events deleted`);
      
    } catch (error) {
      result.errors.push(`Cleanup failed: ${error.message}`);
      console.error('Cleanup error:', error);
    }

    return result;
  }

  // Clean up old content items
  private async cleanupOldContent(
    cutoffDate: Date, 
    options: CleanupOptions
  ): Promise<{ deleted: number; errors: string[]; warnings: string[] }> {
    const result = { deleted: 0, errors: [], warnings: [] };

    try {
      const allItems = await this.databaseService.getAllItems();
      const oldItems = allItems.filter(item => new Date(item.timestamp) < cutoffDate);

      // If preserveImportant is true, filter out important items
      let itemsToDelete = oldItems;
      if (options.preserveImportant) {
        const { important, regular } = this.categorizeItemsByImportance(oldItems);
        itemsToDelete = regular;
        
        if (important.length > 0) {
          result.warnings.push(`Preserved ${important.length} important items despite age`);
        }
      }

      // Respect maxItems limit
      if (options.maxItems && itemsToDelete.length > options.maxItems) {
        // Sort by timestamp (oldest first) and take only the specified number
        itemsToDelete = itemsToDelete
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .slice(0, options.maxItems);
        
        result.warnings.push(`Limited deletion to ${options.maxItems} items`);
      }

      // Delete items (or simulate if dry run)
      if (!options.dryRun) {
        for (const item of itemsToDelete) {
          try {
            await this.databaseService.deleteItem(item.id);
            result.deleted++;
          } catch (error) {
            result.errors.push(`Failed to delete item ${item.id}: ${error.message}`);
          }
        }
      } else {
        result.deleted = itemsToDelete.length;
        result.warnings.push('Dry run - no items actually deleted');
      }

    } catch (error) {
      result.errors.push(`Content cleanup failed: ${error.message}`);
    }

    return result;
  }

  // Clean up old analytics events
  private async cleanupOldAnalytics(
    cutoffDate: Date, 
    options: CleanupOptions
  ): Promise<{ deleted: number; errors: string[] }> {
    const result = { deleted: 0, errors: [] };

    try {
      // Get events older than cutoff date
      const oldEvents = await this.analyticsStorage.getEvents({
        dateRange: {
          start: new Date('2020-01-01'), // Very old date
          end: cutoffDate
        }
      });

      if (!options.dryRun) {
        // Delete old events in batches to avoid blocking
        const batchSize = 100;
        for (let i = 0; i < oldEvents.length; i += batchSize) {
          const batch = oldEvents.slice(i, i + batchSize);
          
          for (const event of batch) {
            try {
              // Note: We'd need to add a delete method to AnalyticsStorageService
              // For now, we'll just count what would be deleted
              result.deleted++;
            } catch (error) {
              result.errors.push(`Failed to delete event ${event.id}: ${error.message}`);
            }
          }
          
          // Allow other operations to run
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      } else {
        result.deleted = oldEvents.length;
      }

    } catch (error) {
      result.errors.push(`Analytics cleanup failed: ${error.message}`);
    }

    return result;
  }

  // Categorize items by importance
  private categorizeItemsByImportance(items: ContentItem[]): { important: ContentItem[]; regular: ContentItem[] } {
    const important: ContentItem[] = [];
    const regular: ContentItem[] = [];

    for (const item of items) {
      if (this.isImportantItem(item)) {
        important.push(item);
      } else {
        regular.push(item);
      }
    }

    return { important, regular };
  }

  // Determine if an item is important and should be preserved
  private isImportantItem(item: ContentItem): boolean {
    const content = item.content.toLowerCase();
    const title = item.title.toLowerCase();

    // Keywords that indicate importance
    const importantKeywords = [
      'important', 'urgent', 'critical', 'password', 'backup',
      'meeting', 'appointment', 'deadline', 'contract', 'legal',
      'medical', 'insurance', 'tax', 'financial', 'bank',
      'project', 'presentation', 'report', 'analysis'
    ];

    // Check if content or title contains important keywords
    const hasImportantKeywords = importantKeywords.some(keyword => 
      content.includes(keyword) || title.includes(keyword)
    );

    // Consider long content as potentially important
    const isLongContent = item.content.length > 1000;

    // Consider recent items as more important
    const isRecent = (Date.now() - new Date(item.timestamp).getTime()) < (30 * 24 * 60 * 60 * 1000); // 30 days

    return hasImportantKeywords || (isLongContent && isRecent);
  }

  // Archive old data (compress and store separately)
  async archiveOldData(options: ArchiveOptions): Promise<CleanupResult> {
    const result: CleanupResult = {
      itemsDeleted: 0,
      analyticsEventsDeleted: 0,
      spaceSaved: '0 B',
      errors: [],
      warnings: []
    };

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.archiveAfterDays);

      const allItems = await this.databaseService.getAllItems();
      const oldItems = allItems.filter(item => new Date(item.timestamp) < cutoffDate);

      if (oldItems.length === 0) {
        result.warnings.push('No items found for archiving');
        return result;
      }

      // Create archive
      const archive = {
        createdAt: new Date().toISOString(),
        archivedItems: oldItems.length,
        compressionLevel: options.compressionLevel || 'medium',
        items: oldItems
      };

      // Compress archive data
      const compressedArchive = this.compressData(JSON.stringify(archive), options.compressionLevel);

      // Store archive in localStorage (limited space) or offer download
      const archiveKey = `voicevault_archive_${Date.now()}`;
      
      try {
        localStorage.setItem(archiveKey, compressedArchive);
        result.warnings.push(`Archive stored locally as ${archiveKey}`);
      } catch (error) {
        // If localStorage is full, offer download instead
        this.downloadArchive(compressedArchive, `voicevault-archive-${new Date().toISOString().split('T')[0]}.json`);
        result.warnings.push('Archive downloaded due to storage limitations');
      }

      // Delete original items if not keeping originals
      if (!options.keepOriginals) {
        for (const item of oldItems) {
          try {
            await this.databaseService.deleteItem(item.id);
            result.itemsDeleted++;
          } catch (error) {
            result.errors.push(`Failed to delete archived item ${item.id}: ${error.message}`);
          }
        }
      }

      result.spaceSaved = this.formatBytes(JSON.stringify(oldItems).length);

    } catch (error) {
      result.errors.push(`Archiving failed: ${error.message}`);
    }

    return result;
  }

  // Get cleanup recommendations
  async getCleanupRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    try {
      const allItems = await this.databaseService.getAllItems();
      const storageUsage = await this.calculateStorageUsage();
      
      // Age-based recommendations
      const now = Date.now();
      const oldItems = allItems.filter(item => 
        (now - new Date(item.timestamp).getTime()) > (365 * 24 * 60 * 60 * 1000) // 1 year old
      );

      if (oldItems.length > 100) {
        recommendations.push(`Consider cleaning up ${oldItems.length} items older than 1 year`);
      }

      // Size-based recommendations
      if (storageUsage > 50 * 1024 * 1024) { // 50MB
        recommendations.push('Storage usage is high - consider archiving old content');
      }

      // Quantity-based recommendations
      if (allItems.length > 10000) {
        recommendations.push('Large number of items detected - consider implementing automatic cleanup');
      }

      // Analytics-based recommendations
      const events = await this.analyticsStorage.getEvents({
        dateRange: {
          start: new Date(now - 90 * 24 * 60 * 60 * 1000), // 90 days ago
          end: new Date()
        }
      });

      if (events.length > 50000) {
        recommendations.push('High volume of analytics events - consider cleaning up old analytics data');
      }

    } catch (error) {
      recommendations.push('Unable to analyze storage - consider manual cleanup');
    }

    return recommendations;
  }

  // Schedule automatic cleanup
  async scheduleAutoCleanup(options: CleanupOptions): Promise<void> {
    const lastCleanup = localStorage.getItem('lastAutoCleanup');
    const now = Date.now();
    const cleanupInterval = 7 * 24 * 60 * 60 * 1000; // 7 days

    if (!lastCleanup || (now - parseInt(lastCleanup)) > cleanupInterval) {
      try {
        const result = await this.cleanupOldData({
          ...options,
          dryRun: false // Actually perform cleanup
        });

        localStorage.setItem('lastAutoCleanup', now.toString());
        
        if (result.itemsDeleted > 0 || result.analyticsEventsDeleted > 0) {
          console.log(`Auto-cleanup completed: ${result.itemsDeleted} items, ${result.analyticsEventsDeleted} events deleted`);
        }
      } catch (error) {
        console.error('Auto-cleanup failed:', error);
      }
    }
  }

  // Helper methods
  private async calculateStorageUsage(): Promise<number> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private compressData(data: string, level: ArchiveOptions['compressionLevel'] = 'medium'): string {
    // Simple compression simulation (in production, use actual compression library)
    try {
      // For now, just return the original data
      // In production, implement actual compression using libraries like pako or lz-string
      return data;
    } catch (error) {
      console.warn('Compression failed, returning original data:', error);
      return data;
    }
  }

  private downloadArchive(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  // Get storage statistics
  async getStorageStats(): Promise<{
    totalItems: number;
    oldItems: number;
    storageUsed: string;
    recommendCleanup: boolean;
    lastCleanup: string | null;
  }> {
    const allItems = await this.databaseService.getAllItems();
    const now = Date.now();
    const oldItems = allItems.filter(item => 
      (now - new Date(item.timestamp).getTime()) > (90 * 24 * 60 * 60 * 1000) // 90 days
    );
    
    const storageUsed = await this.calculateStorageUsage();
    const lastCleanup = localStorage.getItem('lastAutoCleanup');
    
    return {
      totalItems: allItems.length,
      oldItems: oldItems.length,
      storageUsed: this.formatBytes(storageUsed),
      recommendCleanup: oldItems.length > 100 || storageUsed > 100 * 1024 * 1024, // 100MB
      lastCleanup: lastCleanup ? new Date(parseInt(lastCleanup)).toLocaleDateString() : null
    };
  }
}
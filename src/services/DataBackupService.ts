// Data Backup Service - Export/Import functionality for data protection

import { DatabaseService } from './DatabaseService';
import { AnalyticsService } from './AnalyticsService';
import { ContentItem } from '../types';

export interface BackupData {
  version: string;
  exportDate: string;
  appVersion: string;
  metadata: BackupMetadata;
  content: {
    items: ContentItem[];
    totalItems: number;
    voiceNotes: number;
    documents: number;
  };
  analytics: {
    userAnalytics: any;
    events: any[];
    goals: any[];
    insights: any[];
    recommendations: any[];
  };
  settings: {
    theme: any;
    preferences: any;
  };
}

export interface BackupMetadata {
  userId?: string;
  deviceInfo: string;
  browserInfo: string;
  storageUsed: string;
  itemsCount: number;
  dateRange: {
    oldest: string;
    newest: string;
  };
}

export interface ImportResult {
  success: boolean;
  itemsImported: number;
  errors: string[];
  warnings: string[];
}

export class DataBackupService {
  private databaseService: DatabaseService;
  private analyticsService: AnalyticsService;

  constructor(databaseService: DatabaseService, analyticsService: AnalyticsService) {
    this.databaseService = databaseService;
    this.analyticsService = analyticsService;
  }

  // Export all user data
  async exportAllData(): Promise<BackupData> {
    try {
      console.log('Starting data export...');
      
      // Get all content items
      const contentItems = await this.databaseService.getAllItems();
      console.log(`Exporting ${contentItems.length} content items`);
      
      // Get analytics data
      const userAnalytics = await this.analyticsService.getUserAnalytics();
      const analyticsData = await this.analyticsService.exportAnalyticsData();
      
      // Parse analytics data if it's a string
      let parsedAnalytics;
      try {
        parsedAnalytics = typeof analyticsData === 'string' 
          ? JSON.parse(analyticsData) 
          : analyticsData;
      } catch (error) {
        console.warn('Failed to parse analytics data:', error);
        parsedAnalytics = {
          userAnalytics: null,
          events: [],
          goals: [],
          insights: [],
          recommendations: []
        };
      }

      // Get storage info
      const storageInfo = await this.getStorageInfo();
      
      // Calculate date range
      const dateRange = this.calculateDateRange(contentItems);
      
      // Create backup data
      const backup: BackupData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        metadata: {
          deviceInfo: this.getDeviceInfo(),
          browserInfo: this.getBrowserInfo(),
          storageUsed: storageInfo,
          itemsCount: contentItems.length,
          dateRange,
        },
        content: {
          items: contentItems,
          totalItems: contentItems.length,
          voiceNotes: contentItems.filter(item => item.type === 'voice').length,
          documents: contentItems.filter(item => item.type === 'file').length,
        },
        analytics: {
          userAnalytics,
          events: parsedAnalytics.events || [],
          goals: parsedAnalytics.goals || [],
          insights: parsedAnalytics.insights || [],
          recommendations: parsedAnalytics.recommendations || [],
        },
        settings: {
          theme: this.getThemeSettings(),
          preferences: this.getUserPreferences(),
        },
      };

      console.log('Data export completed successfully');
      return backup;
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  // Download backup as JSON file
  async downloadBackup(filename?: string): Promise<void> {
    try {
      const backup = await this.exportAllData();
      const jsonString = JSON.stringify(backup, null, 2);
      
      const defaultFilename = `voicevault-backup-${new Date().toISOString().split('T')[0]}.json`;
      const finalFilename = filename || defaultFilename;
      
      this.downloadFile(jsonString, finalFilename, 'application/json');
      
      // Track export event
      await this.analyticsService.trackEvent('data_exported', {
        itemsCount: backup.content.totalItems,
        fileSize: jsonString.length,
        exportType: 'manual'
      });
      
    } catch (error) {
      console.error('Failed to download backup:', error);
      throw error;
    }
  }

  // Import data from backup
  async importData(backupJson: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      itemsImported: 0,
      errors: [],
      warnings: []
    };

    try {
      // Parse backup data
      const backup: BackupData = JSON.parse(backupJson);
      
      // Validate backup format
      if (!this.validateBackupFormat(backup)) {
        result.errors.push('Invalid backup format');
        return result;
      }

      // Check version compatibility
      if (!this.isVersionCompatible(backup.version)) {
        result.warnings.push(`Backup version ${backup.version} may not be fully compatible`);
      }

      // Import content items
      let importedCount = 0;
      for (const item of backup.content.items) {
        try {
          if (item.type === 'voice') {
            await this.databaseService.saveVoiceRecording(item.content, new Blob());
          } else if (item.type === 'file') {
            // Create a ProcessedFile object for import
            const processedFile = {
              fileName: item.title,
              fileSize: item.content.length,
              fileType: 'text/plain',
              content: item.content,
              originalFile: new File([item.content], item.title, { type: 'text/plain' })
            };
            await this.databaseService.saveFile(processedFile);
          }
          importedCount++;
        } catch (error) {
          result.errors.push(`Failed to import item "${item.title}": ${error.message}`);
        }
      }

      result.itemsImported = importedCount;
      result.success = result.errors.length === 0 || importedCount > 0;

      // Track import event
      await this.analyticsService.trackEvent('data_imported', {
        itemsImported: importedCount,
        totalItems: backup.content.totalItems,
        errors: result.errors.length,
        importType: 'manual'
      });

      console.log(`Import completed: ${importedCount} items imported, ${result.errors.length} errors`);
      
    } catch (error) {
      result.errors.push(`Import failed: ${error.message}`);
      console.error('Import error:', error);
    }

    return result;
  }

  // Auto-backup functionality
  async scheduleAutoBackup(intervalDays: number = 7): Promise<void> {
    const lastBackup = localStorage.getItem('lastAutoBackup');
    const now = Date.now();
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000;

    if (!lastBackup || (now - parseInt(lastBackup)) > intervalMs) {
      try {
        await this.createAutoBackup();
        localStorage.setItem('lastAutoBackup', now.toString());
      } catch (error) {
        console.error('Auto-backup failed:', error);
      }
    }
  }

  private async createAutoBackup(): Promise<void> {
    try {
      const backup = await this.exportAllData();
      const jsonString = JSON.stringify(backup);
      
      // Store in localStorage as emergency backup (limited size)
      const maxSize = 5 * 1024 * 1024; // 5MB limit for localStorage
      if (jsonString.length < maxSize) {
        localStorage.setItem('voicevault_auto_backup', jsonString);
        localStorage.setItem('voicevault_auto_backup_date', new Date().toISOString());
      }
      
      // Also offer download
      const shouldDownload = confirm(
        '📦 Auto-backup ready! Would you like to download a backup file to your computer for extra safety?'
      );
      
      if (shouldDownload) {
        await this.downloadBackup(`voicevault-auto-backup-${new Date().toISOString().split('T')[0]}.json`);
      }

      // Track auto-backup
      await this.analyticsService.trackEvent('auto_backup_created', {
        itemsCount: backup.content.totalItems,
        fileSize: jsonString.length,
        stored: jsonString.length < maxSize
      });

    } catch (error) {
      console.error('Auto-backup creation failed:', error);
      throw error;
    }
  }

  // Restore from auto-backup
  async restoreFromAutoBackup(): Promise<ImportResult | null> {
    const autoBackup = localStorage.getItem('voicevault_auto_backup');
    const backupDate = localStorage.getItem('voicevault_auto_backup_date');
    
    if (!autoBackup) {
      return null;
    }

    const confirmRestore = confirm(
      `📦 Auto-backup found from ${backupDate ? new Date(backupDate).toLocaleDateString() : 'unknown date'}. Restore this backup?`
    );

    if (confirmRestore) {
      return await this.importData(autoBackup);
    }

    return null;
  }

  // Validate backup format
  private validateBackupFormat(backup: any): boolean {
    return (
      backup &&
      typeof backup === 'object' &&
      backup.version &&
      backup.content &&
      Array.isArray(backup.content.items)
    );
  }

  // Check version compatibility
  private isVersionCompatible(version: string): boolean {
    // Simple version check - in production, implement proper semver comparison
    const supportedVersions = ['1.0.0', '1.0.1', '1.1.0'];
    return supportedVersions.includes(version);
  }

  // Helper methods
  private async getStorageInfo(): Promise<string> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        return this.formatBytes(used);
      }
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private calculateDateRange(items: ContentItem[]): { oldest: string; newest: string } {
    if (items.length === 0) {
      const now = new Date().toISOString();
      return { oldest: now, newest: now };
    }

    const dates = items.map(item => new Date(item.timestamp).getTime());
    const oldest = new Date(Math.min(...dates)).toISOString();
    const newest = new Date(Math.max(...dates)).toISOString();
    
    return { oldest, newest };
  }

  private getDeviceInfo(): string {
    return `${navigator.platform} - ${navigator.userAgent.split(' ')[0]}`;
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private getThemeSettings(): any {
    return {
      mode: localStorage.getItem('theme-mode') || 'dark',
      preferences: localStorage.getItem('theme-config') || '{}'
    };
  }

  private getUserPreferences(): any {
    return {
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notifications: localStorage.getItem('notifications-enabled') || 'true'
    };
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  // Get backup statistics
  async getBackupStats(): Promise<{
    lastAutoBackup: string | null;
    autoBackupSize: string;
    hasAutoBackup: boolean;
    recommendBackup: boolean;
  }> {
    const lastBackup = localStorage.getItem('voicevault_auto_backup_date');
    const autoBackup = localStorage.getItem('voicevault_auto_backup');
    const autoBackupSize = autoBackup ? this.formatBytes(autoBackup.length) : '0 B';
    
    // Recommend backup if no backup in last 7 days or no backup exists
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recommendBackup = !lastBackup || new Date(lastBackup).getTime() < weekAgo;

    return {
      lastAutoBackup: lastBackup,
      autoBackupSize,
      hasAutoBackup: !!autoBackup,
      recommendBackup
    };
  }
}
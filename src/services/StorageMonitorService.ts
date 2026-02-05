// Storage Monitor Service - Tracks storage usage and warns users

export interface StorageInfo {
  used: number;
  quota: number;
  usedFormatted: string;
  quotaFormatted: string;
  percentage: number;
  warning: boolean;
  critical: boolean;
  estimatedDaysLeft?: number;
}

export interface StorageAlert {
  type: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action?: string;
}

export class StorageMonitorService {
  private readonly WARNING_THRESHOLD = 75; // 75%
  private readonly CRITICAL_THRESHOLD = 90; // 90%
  private readonly CHECK_INTERVAL = 60000; // 1 minute
  
  private listeners: Array<(alert: StorageAlert) => void> = [];
  private lastCheck: StorageInfo | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  // Start automatic monitoring
  startMonitoring(): void {
    if (this.monitoringInterval) return;
    
    this.monitoringInterval = setInterval(async () => {
      await this.checkAndAlert();
    }, this.CHECK_INTERVAL);
    
    // Initial check
    this.checkAndAlert();
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Get current storage usage
  async getStorageInfo(): Promise<StorageInfo> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (used / quota) * 100 : 0;

        const info: StorageInfo = {
          used,
          quota,
          usedFormatted: this.formatBytes(used),
          quotaFormatted: this.formatBytes(quota),
          percentage: Math.round(percentage * 100) / 100,
          warning: percentage >= this.WARNING_THRESHOLD,
          critical: percentage >= this.CRITICAL_THRESHOLD,
        };

        // Calculate estimated days left based on usage trend
        if (this.lastCheck && this.lastCheck.used < used) {
          const usageRate = used - this.lastCheck.used; // bytes per check interval
          const remainingSpace = quota - used;
          const checksUntilFull = remainingSpace / usageRate;
          const daysUntilFull = (checksUntilFull * this.CHECK_INTERVAL) / (1000 * 60 * 60 * 24);
          
          if (daysUntilFull > 0 && daysUntilFull < 365) {
            info.estimatedDaysLeft = Math.round(daysUntilFull);
          }
        }

        this.lastCheck = info;
        return info;
      }
      
      // Fallback for browsers without Storage API
      return {
        used: 0,
        quota: 0,
        usedFormatted: '0 B',
        quotaFormatted: 'Unknown',
        percentage: 0,
        warning: false,
        critical: false,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      throw new Error('Unable to check storage usage');
    }
  }

  // Check storage and send alerts if needed
  private async checkAndAlert(): Promise<void> {
    try {
      const info = await this.getStorageInfo();
      
      if (info.critical) {
        this.sendAlert({
          type: 'critical',
          title: '🚨 Storage Critical!',
          message: `Storage is ${info.percentage}% full (${info.usedFormatted} / ${info.quotaFormatted}). Please export your data immediately to prevent data loss.`,
          action: 'Export Data Now'
        });
      } else if (info.warning) {
        const daysText = info.estimatedDaysLeft 
          ? ` You have approximately ${info.estimatedDaysLeft} days left at current usage.`
          : '';
        
        this.sendAlert({
          type: 'warning',
          title: '⚠️ Storage Warning',
          message: `Storage is ${info.percentage}% full (${info.usedFormatted} / ${info.quotaFormatted}).${daysText} Consider exporting old data.`,
          action: 'Manage Storage'
        });
      }
    } catch (error) {
      console.error('Storage monitoring error:', error);
    }
  }

  // Add alert listener
  onAlert(callback: (alert: StorageAlert) => void): void {
    this.listeners.push(callback);
  }

  // Remove alert listener
  offAlert(callback: (alert: StorageAlert) => void): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Send alert to all listeners
  private sendAlert(alert: StorageAlert): void {
    this.listeners.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in storage alert callback:', error);
      }
    });
  }

  // Format bytes to human readable format
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get storage breakdown by database
  async getStorageBreakdown(): Promise<Record<string, StorageInfo>> {
    const breakdown: Record<string, StorageInfo> = {};
    
    try {
      // This is an approximation since we can't get exact per-database usage
      const totalInfo = await this.getStorageInfo();
      
      // Estimate based on typical usage patterns
      const contentEstimate = totalInfo.used * 0.7; // ~70% for content
      const analyticsEstimate = totalInfo.used * 0.25; // ~25% for analytics
      const otherEstimate = totalInfo.used * 0.05; // ~5% for other data
      
      breakdown.content = {
        ...totalInfo,
        used: contentEstimate,
        usedFormatted: this.formatBytes(contentEstimate),
        percentage: (contentEstimate / totalInfo.quota) * 100,
        warning: false,
        critical: false,
      };
      
      breakdown.analytics = {
        ...totalInfo,
        used: analyticsEstimate,
        usedFormatted: this.formatBytes(analyticsEstimate),
        percentage: (analyticsEstimate / totalInfo.quota) * 100,
        warning: false,
        critical: false,
      };
      
      breakdown.other = {
        ...totalInfo,
        used: otherEstimate,
        usedFormatted: this.formatBytes(otherEstimate),
        percentage: (otherEstimate / totalInfo.quota) * 100,
        warning: false,
        critical: false,
      };
      
    } catch (error) {
      console.error('Failed to get storage breakdown:', error);
    }
    
    return breakdown;
  }

  // Clear all storage (dangerous - use with caution)
  async clearAllStorage(): Promise<void> {
    if (!confirm('⚠️ This will delete ALL your data permanently. Are you sure?')) {
      return;
    }
    
    if (!confirm('🚨 FINAL WARNING: This cannot be undone. All voice notes, files, and analytics will be lost forever. Continue?')) {
      return;
    }
    
    try {
      // Clear IndexedDB databases
      await this.clearDatabase('VoiceDocumentDatabase');
      await this.clearDatabase('VoiceVaultAnalytics');
      
      // Clear other storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cache if available
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      console.log('All storage cleared successfully');
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw new Error('Failed to clear storage completely');
    }
  }

  private async clearDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteReq = indexedDB.deleteDatabase(dbName);
      
      deleteReq.onerror = () => reject(deleteReq.error);
      deleteReq.onsuccess = () => resolve();
      deleteReq.onblocked = () => {
        console.warn(`Database ${dbName} deletion blocked`);
        resolve(); // Continue anyway
      };
    });
  }

  // Get storage recommendations
  async getStorageRecommendations(): Promise<string[]> {
    const info = await this.getStorageInfo();
    const recommendations: string[] = [];
    
    if (info.percentage > 50) {
      recommendations.push('Export and delete old voice notes you no longer need');
      recommendations.push('Remove large uploaded documents that are archived elsewhere');
      recommendations.push('Clear old analytics data (older than 6 months)');
    }
    
    if (info.percentage > 75) {
      recommendations.push('🚨 URGENT: Export all data as backup before continuing');
      recommendations.push('Consider migrating to cloud storage solution');
      recommendations.push('Delete non-essential content immediately');
    }
    
    if (info.percentage > 90) {
      recommendations.push('🔥 CRITICAL: Stop using the app until storage is freed');
      recommendations.push('Export data immediately to prevent data loss');
      recommendations.push('Delete at least 20% of content to continue safely');
    }
    
    return recommendations;
  }
}
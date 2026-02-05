import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, Button, Modal, ModalContent, ModalHeader, Badge, Spinner } from '../ui';
import { StorageMonitorService, StorageInfo, StorageAlert } from '../../services/StorageMonitorService';
import { DataBackupService, BackupData, ImportResult } from '../../services/DataBackupService';
import { DataCleanupService, CleanupResult, CleanupOptions } from '../../services/DataCleanupService';
import { PerformanceOptimizationService } from '../../services/PerformanceOptimizationService';
import styles from './StorageManager.module.css';

interface StorageManagerProps {
  storageMonitor: StorageMonitorService;
  backupService: DataBackupService;
  cleanupService: DataCleanupService;
  performanceService: PerformanceOptimizationService;
}

export const StorageManager: React.FC<StorageManagerProps> = ({
  storageMonitor,
  backupService,
  cleanupService,
  performanceService,
}) => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'backup' | 'cleanup' | 'performance'>('overview');
  const [showAlert, setShowAlert] = useState<StorageAlert | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [backupStats, setBackupStats] = useState<any>(null);
  const [storageStats, setStorageStats] = useState<any>(null);

  useEffect(() => {
    loadStorageData();
    
    // Listen for storage alerts
    const handleAlert = (alert: StorageAlert) => {
      setShowAlert(alert);
    };
    
    storageMonitor.onAlert(handleAlert);
    
    return () => {
      storageMonitor.offAlert(handleAlert);
    };
  }, []);

  const loadStorageData = async () => {
    try {
      setIsLoading(true);
      
      const [storage, backup, cleanup] = await Promise.all([
        storageMonitor.getStorageInfo(),
        backupService.getBackupStats(),
        cleanupService.getStorageStats(),
      ]);
      
      setStorageInfo(storage);
      setBackupStats(backup);
      setStorageStats(cleanup);
    } catch (error) {
      console.error('Failed to load storage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      await backupService.downloadBackup();
      await loadStorageData(); // Refresh stats
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const content = await file.text();
      const result = await backupService.importData(content);
      
      if (result.success) {
        alert(`Import successful! ${result.itemsImported} items imported.`);
        await loadStorageData();
      } else {
        alert(`Import failed: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Import failed: ' + error.message);
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleCleanup = async (options: CleanupOptions) => {
    try {
      setIsCleaning(true);
      const result = await cleanupService.cleanupOldData(options);
      setCleanupResult(result);
      
      if (result.errors.length === 0) {
        alert(`Cleanup completed! ${result.itemsDeleted} items deleted, ${result.spaceSaved} saved.`);
      } else {
        alert(`Cleanup completed with errors: ${result.errors.join(', ')}`);
      }
      
      await loadStorageData();
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert('Cleanup failed: ' + error.message);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleOptimizePerformance = async () => {
    try {
      await performanceService.optimizeDatabase();
      alert('Performance optimization completed!');
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Optimization failed: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <p>Checking your storage...</p>
      </div>
    );
  }

  return (
    <div className={styles.storageManager}>
      <div className={styles.header}>
        <h2 className={styles.title}>Storage Management</h2>
        <div className={styles.tabs}>
          {(['overview', 'backup', 'cleanup', 'performance'] as const).map(tab => (
            <button
              key={tab}
              className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Storage Alert */}
      {showAlert && (
        <div className={`${styles.alert} ${styles[showAlert.type]}`}>
          <div className={styles.alertContent}>
            <strong>{showAlert.title}</strong>
            <p>{showAlert.message}</p>
          </div>
          <button 
            className={styles.alertClose}
            onClick={() => setShowAlert(null)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}

      <div className={styles.content}>
        {activeTab === 'overview' && (
          <OverviewTab 
            storageInfo={storageInfo}
            storageStats={storageStats}
            onRefresh={loadStorageData}
          />
        )}
        
        {activeTab === 'backup' && (
          <BackupTab
            backupStats={backupStats}
            isExporting={isExporting}
            isImporting={isImporting}
            onExport={handleExportData}
            onImport={handleImportData}
          />
        )}
        
        {activeTab === 'cleanup' && (
          <CleanupTab
            storageStats={storageStats}
            isCleaning={isCleaning}
            cleanupResult={cleanupResult}
            onCleanup={handleCleanup}
          />
        )}
        
        {activeTab === 'performance' && (
          <PerformanceTab
            performanceService={performanceService}
            onOptimize={handleOptimizePerformance}
          />
        )}
      </div>
    </div>
  );
};

interface OverviewTabProps {
  storageInfo: StorageInfo | null;
  storageStats: any;
  onRefresh: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ storageInfo, storageStats, onRefresh }) => (
  <div className={styles.overviewTab}>
    <div className={styles.statsGrid}>
      <Card className={styles.statCard}>
        <CardHeader title="Storage Usage" />
        <CardContent>
          {storageInfo && (
            <div className={styles.storageUsage}>
              <div className={styles.usageBar}>
                <div 
                  className={styles.usageFill}
                  style={{ 
                    width: `${storageInfo.percentage}%`,
                    backgroundColor: storageInfo.critical ? '#EF4444' : storageInfo.warning ? '#F59E0B' : '#10B981'
                  }}
                />
              </div>
              <div className={styles.usageText}>
                <span>{storageInfo.usedFormatted} / {storageInfo.quotaFormatted}</span>
                <span className={styles.percentage}>{storageInfo.percentage.toFixed(1)}%</span>
              </div>
              {storageInfo.estimatedDaysLeft && (
                <p className={styles.estimate}>
                  Estimated {storageInfo.estimatedDaysLeft} days remaining
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={styles.statCard}>
        <CardHeader title="Content Statistics" />
        <CardContent>
          {storageStats && (
            <div className={styles.contentStats}>
              <div className={styles.statRow}>
                <span>Total Items:</span>
                <span>{storageStats.totalItems}</span>
              </div>
              <div className={styles.statRow}>
                <span>Old Items (90+ days):</span>
                <span>{storageStats.oldItems}</span>
              </div>
              <div className={styles.statRow}>
                <span>Storage Used:</span>
                <span>{storageStats.storageUsed}</span>
              </div>
              {storageStats.recommendCleanup && (
                <Badge variant="warning" size="sm">
                  Cleanup Recommended
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    <Card className={styles.actionsCard}>
      <CardHeader title="Quick Actions" />
      <CardContent>
        <div className={styles.quickActions}>
          <Button variant="primary" onClick={onRefresh}>
            Refresh Storage Info
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Optimize Performance
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

interface BackupTabProps {
  backupStats: any;
  isExporting: boolean;
  isImporting: boolean;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const BackupTab: React.FC<BackupTabProps> = ({ 
  backupStats, 
  isExporting, 
  isImporting, 
  onExport, 
  onImport 
}) => (
  <div className={styles.backupTab}>
    <Card className={styles.backupCard}>
      <CardHeader title="Data Backup & Restore" />
      <CardContent>
        <div className={styles.backupActions}>
          <div className={styles.exportSection}>
            <h4>Export Data</h4>
            <p>Save a copy of all your notes and files to your computer.</p>
            <Button 
              variant="primary" 
              onClick={onExport}
              isLoading={isExporting}
              disabled={isExporting}
            >
              {isExporting ? 'Exporting...' : 'Export All Data'}
            </Button>
          </div>

          <div className={styles.importSection}>
            <h4>Import Data</h4>
            <p>Bring back your notes and files from a saved backup.</p>
            <div className={styles.fileInput}>
              <input
                type="file"
                accept=".json"
                onChange={onImport}
                disabled={isImporting}
                id="import-file"
                className={styles.hiddenInput}
              />
              <label htmlFor="import-file" className={styles.fileLabel}>
                {isImporting ? 'Importing...' : 'Choose Backup File'}
              </label>
            </div>
          </div>
        </div>

        {backupStats && (
          <div className={styles.backupStats}>
            <h4>Backup Statistics</h4>
            <div className={styles.statRow}>
              <span>Last Auto-Backup:</span>
              <span>{backupStats.lastAutoBackup ? new Date(backupStats.lastAutoBackup).toLocaleDateString() : 'Never'}</span>
            </div>
            <div className={styles.statRow}>
              <span>Auto-Backup Size:</span>
              <span>{backupStats.autoBackupSize}</span>
            </div>
            {backupStats.recommendBackup && (
              <Badge variant="warning" size="sm">
                Backup Recommended
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  </div>
);

interface CleanupTabProps {
  storageStats: any;
  isCleaning: boolean;
  cleanupResult: CleanupResult | null;
  onCleanup: (options: CleanupOptions) => void;
}

const CleanupTab: React.FC<CleanupTabProps> = ({ 
  storageStats, 
  isCleaning, 
  cleanupResult, 
  onCleanup 
}) => {
  const [retentionDays, setRetentionDays] = useState(90);
  const [preserveImportant, setPreserveImportant] = useState(true);
  const [dryRun, setDryRun] = useState(true);

  const handleCleanup = () => {
    onCleanup({
      retentionDays,
      preserveImportant,
      dryRun
    });
  };

  return (
    <div className={styles.cleanupTab}>
      <Card className={styles.cleanupCard}>
        <CardHeader title="Data Cleanup" />
        <CardContent>
          <div className={styles.cleanupOptions}>
            <div className={styles.option}>
              <label>Retention Period (days):</label>
              <input
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(parseInt(e.target.value))}
                min="1"
                max="365"
              />
            </div>

            <div className={styles.option}>
              <label>
                <input
                  type="checkbox"
                  checked={preserveImportant}
                  onChange={(e) => setPreserveImportant(e.target.checked)}
                />
                Preserve important items
              </label>
            </div>

            <div className={styles.option}>
              <label>
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                />
                Dry run (preview only)
              </label>
            </div>
          </div>

          <Button 
            variant={dryRun ? "secondary" : "danger"}
            onClick={handleCleanup}
            isLoading={isCleaning}
            disabled={isCleaning}
          >
            {isCleaning ? 'Cleaning...' : dryRun ? 'Preview Cleanup' : 'Clean Up Data'}
          </Button>

          {cleanupResult && (
            <div className={styles.cleanupResult}>
              <h4>Cleanup Result</h4>
              <div className={styles.resultStats}>
                <div className={styles.statRow}>
                  <span>Items Deleted:</span>
                  <span>{cleanupResult.itemsDeleted}</span>
                </div>
                <div className={styles.statRow}>
                  <span>Events Deleted:</span>
                  <span>{cleanupResult.analyticsEventsDeleted}</span>
                </div>
                <div className={styles.statRow}>
                  <span>Space Saved:</span>
                  <span>{cleanupResult.spaceSaved}</span>
                </div>
              </div>
              
              {cleanupResult.errors.length > 0 && (
                <div className={styles.errors}>
                  <h5>Errors:</h5>
                  {cleanupResult.errors.map((error, index) => (
                    <p key={index} className={styles.error}>{error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

interface PerformanceTabProps {
  performanceService: PerformanceOptimizationService;
  onOptimize: () => void;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({ performanceService, onOptimize }) => {
  const [metrics, setMetrics] = useState(performanceService.getPerformanceMetrics());
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    const loadPerformanceData = () => {
      setMetrics(performanceService.getPerformanceMetrics());
      setRecommendations(performanceService.getPerformanceRecommendations());
    };

    loadPerformanceData();
    const interval = setInterval(loadPerformanceData, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [performanceService]);

  return (
    <div className={styles.performanceTab}>
      <Card className={styles.metricsCard}>
        <CardHeader title="Performance Metrics" />
        <CardContent>
          <div className={styles.metricsGrid}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Load Time:</span>
              <span className={styles.metricValue}>{metrics.loadTime.toFixed(0)}ms</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Search Time:</span>
              <span className={styles.metricValue}>{metrics.searchTime.toFixed(0)}ms</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Memory Usage:</span>
              <span className={styles.metricValue}>{(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Cache Hit Rate:</span>
              <span className={styles.metricValue}>{(metrics.cacheHitRate * 100).toFixed(1)}%</span>
            </div>
          </div>

          <Button variant="primary" onClick={onOptimize}>
            Optimize Performance
          </Button>
        </CardContent>
      </Card>

      {recommendations.length > 0 && (
        <Card className={styles.recommendationsCard}>
          <CardHeader title="Performance Recommendations" />
          <CardContent>
            <ul className={styles.recommendations}>
              {recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { ContentItem, ProcessedFile, SearchResult } from '../../types';
import { DatabaseService, SearchService, AnalyticsService } from '../../services';
import { AnalyticsCollectionService } from '../../services/AnalyticsCollectionService';
import { GamificationService } from '../../services/GamificationService';
import { StorageMonitorService } from '../../services/StorageMonitorService';
import { DataBackupService } from '../../services/DataBackupService';
import { DataCleanupService } from '../../services/DataCleanupService';
import { PerformanceOptimizationService } from '../../services/PerformanceOptimizationService';
import { VoiceRecorder, FileUploader, SearchInterface, ContentManager } from '../';
import { ThemeProvider, Button, Modal, ModalContent, ModalHeader } from '../ui';
import { Dashboard } from '../Dashboard/Dashboard';
import { AnalyticsPanel } from '../AnalyticsPanel/AnalyticsPanel';
import { GamificationPanel } from '../Gamification/GamificationPanel';
import { StorageManager } from '../StorageManager/StorageManager';
import { StorageAlert } from '../StorageAlert/StorageAlert';
import { AchievementNotification, LevelUpNotification } from '../Gamification/AchievementNotification';
import styles from './EnhancedApp.module.css';

type ViewMode = 'dashboard' | 'content' | 'analytics' | 'gamification' | 'storage';

export const EnhancedApp: React.FC = () => {
  // Core state
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [searchView, setSearchView] = useState<'all' | 'search'>('all');

  // Services
  const [databaseService] = useState(() => new DatabaseService());
  const [searchService] = useState(() => new SearchService());
  const [analyticsService] = useState(() => new AnalyticsService());
  const [collectionService, setCollectionService] = useState<AnalyticsCollectionService | null>(null);
  const [gamificationService, setGamificationService] = useState<GamificationService | null>(null);
  
  // Storage and performance services
  const [storageMonitor] = useState(() => new StorageMonitorService());
  const [backupService, setBackupService] = useState<DataBackupService | null>(null);
  const [cleanupService, setCleanupService] = useState<DataCleanupService | null>(null);
  const [performanceService, setPerformanceService] = useState<PerformanceOptimizationService | null>(null);

  // Analytics state
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(true);

  // Gamification state
  const [showAchievement, setShowAchievement] = useState(null);
  const [showLevelUp, setShowLevelUp] = useState(null);

  // Storage state
  const [storageAlert, setStorageAlert] = useState(null);

  // Modal state
  const [showGoalModal, setShowGoalModal] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize analytics service
      await analyticsService.initialize();
      
      // Initialize collection service
      const collection = new AnalyticsCollectionService(analyticsService);
      setCollectionService(collection);
      
      // Initialize gamification service
      const gamification = new GamificationService(collection.storageService);
      setGamificationService(gamification);
      
      // Initialize storage and performance services
      const backup = new DataBackupService(databaseService, analyticsService);
      const cleanup = new DataCleanupService(databaseService, collection.storageService);
      const performance = new PerformanceOptimizationService(databaseService, collection.storageService);
      
      setBackupService(backup);
      setCleanupService(cleanup);
      setPerformanceService(performance);
      
      // Schedule auto-backup and cleanup
      await backup.scheduleAutoBackup(7); // Weekly auto-backup
      await cleanup.scheduleAutoCleanup({ retentionDays: 365, preserveImportant: true });
      
      // Load initial data
      await loadAllItems();
      await loadAnalytics();
      
      setIsAnalyticsLoading(false);
    } catch (error) {
      console.error('Failed to initialize app:', error);
      setError('Failed to initialize application');
      setIsAnalyticsLoading(false);
    }
  };

  const loadAllItems = async () => {
    try {
      const items = await databaseService.getAllItems();
      setContentItems(items);
      
      // Update analytics with current content
      if (analyticsService) {
        await analyticsService.updateUserAnalytics(items);
      }
    } catch (error) {
      setError(`Failed to load content: ${error}`);
    }
  };

  const loadAnalytics = async () => {
    try {
      const analytics = await analyticsService.getUserAnalytics();
      setUserAnalytics(analytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleVoiceRecording = async (text: string) => {
    try {
      // Track recording start
      await collectionService?.trackVoiceRecordingStart();
      
      const startTime = Date.now();
      await databaseService.saveVoiceRecording(text, new Blob());
      const duration = (Date.now() - startTime) / 1000;
      
      // Track successful recording
      await collectionService?.trackVoiceRecordingComplete(
        duration,
        text.length,
        'medium'
      );
      
      await loadAllItems();
      await loadAnalytics();
      setError(null);
      
      // Check for achievements
      await checkAchievements();
    } catch (error) {
      await collectionService?.trackVoiceRecordingFailed(0, error.toString());
      setError(`Failed to save voice text: ${error}`);
    }
  };

  const handleFileUpload = async (fileData: ProcessedFile) => {
    try {
      // Track upload start
      await collectionService?.trackFileUploadStart(fileData.fileSize, fileData.fileType);
      
      const startTime = Date.now();
      await databaseService.saveFile(fileData);
      const processingTime = (Date.now() - startTime) / 1000;
      
      // Track successful upload
      await collectionService?.trackFileUploadComplete(
        fileData.fileSize,
        fileData.fileType,
        processingTime,
        fileData.content.length
      );
      
      await loadAllItems();
      await loadAnalytics();
      setError(null);
      
      // Check for achievements
      await checkAchievements();
    } catch (error) {
      await collectionService?.trackFileUploadFailed(
        fileData.fileSize,
        fileData.fileType,
        error.toString()
      );
      setError(`Failed to save file: ${error}`);
    }
  };

  const handleSearch = async (query: string, isVoiceSearch: boolean) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchView('all');
      return;
    }

    setIsSearching(true);
    const startTime = Date.now();
    
    try {
      // Track search start
      await collectionService?.trackSearchStart(query, isVoiceSearch ? 'voice' : 'text');
      
      const results = await searchService.performSearch(query, contentItems);
      const searchDuration = (Date.now() - startTime) / 1000;
      
      // Track search completion
      await collectionService?.trackSearchComplete(
        query,
        results.length,
        isVoiceSearch ? 'voice' : 'text',
        searchDuration
      );
      
      setSearchResults(results);
      setSearchView('search');
      setError(null);
    } catch (error) {
      setError(`Search failed: ${error}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const item = contentItems.find(item => item.id === id);
      if (item) {
        await collectionService?.trackContentDelete(id, item.type);
      }
      
      await databaseService.deleteItem(id);
      await loadAllItems();
      await loadAnalytics();
      
      if (searchView === 'search' && searchResults.length > 0) {
        const updatedResults = searchResults.filter(result => result.item.id !== id);
        setSearchResults(updatedResults);
      }
      
      setError(null);
    } catch (error) {
      setError(`Failed to delete item: ${error}`);
    }
  };

  const handleViewItem = async (item: ContentItem) => {
    await collectionService?.trackContentView(item.id, item.type, 0);
  };

  const checkAchievements = async () => {
    if (!gamificationService || !userAnalytics) return;
    
    try {
      const events = await analyticsService.getEvents({
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        },
      });
      
      const newAchievements = await gamificationService.checkAchievements(userAnalytics, events);
      
      if (newAchievements.length > 0) {
        // Show first achievement (in real app, you might queue them)
        setShowAchievement(newAchievements[0]);
      }
    } catch (error) {
      console.error('Failed to check achievements:', error);
    }
  };

  const handleQuickAction = async (action: string) => {
    await collectionService?.trackFeatureUsage('quick_action', 'dashboard', { action });
    
    switch (action) {
      case 'record':
        setCurrentView('content');
        break;
      case 'upload':
        setCurrentView('content');
        break;
      case 'search':
        setCurrentView('content');
        break;
      case 'goals':
        setShowGoalModal(true);
        break;
    }
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(null), 5000);
  };

  const clearError = () => {
    setError(null);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            analyticsService={analyticsService}
            onQuickAction={handleQuickAction}
          />
        );
      
      case 'analytics':
        return (
          <AnalyticsPanel
            analyticsService={analyticsService}
            userAnalytics={userAnalytics}
          />
        );
      
      case 'gamification':
        return gamificationService ? (
          <GamificationPanel
            gamificationService={gamificationService}
            userAnalytics={userAnalytics}
            onCreateGoal={() => setShowGoalModal(true)}
          />
        ) : null;
      
      case 'storage':
        return (backupService && cleanupService && performanceService) ? (
          <StorageManager
            storageMonitor={storageMonitor}
            backupService={backupService}
            cleanupService={cleanupService}
            performanceService={performanceService}
          />
        ) : null;
      
      case 'content':
      default:
        return (
          <div className={styles.contentView}>
            {contentItems.length === 0 ? (
              <div className={styles.welcomeSection}>
                <div className={styles.welcomeContent}>
                  <h2>Your Personal Voice Notebook</h2>
                  <p>Capture your thoughts, ideas, and important moments. Record voice notes or upload documents to build your personal knowledge base.</p>
                  
                  <div className={styles.features}>
                    <div className={styles.feature}>
                      <div className={styles.featureIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" y1="19" x2="12" y2="23"/>
                          <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                      </div>
                      <h3>Voice Notes</h3>
                      <p>Record your thoughts and ideas as you speak</p>
                    </div>
                    <div className={styles.feature}>
                      <div className={styles.featureIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14,2 14,8 20,8"/>
                          <line x1="16" y1="13" x2="8" y2="13"/>
                          <line x1="16" y1="17" x2="8" y2="17"/>
                          <polyline points="10,9 9,9 8,9"/>
                        </svg>
                      </div>
                      <h3>Document Storage</h3>
                      <p>Upload and organize your important documents</p>
                    </div>
                    <div className={styles.feature}>
                      <div className={styles.featureIcon}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8"/>
                          <path d="M21 21l-4.35-4.35"/>
                        </svg>
                      </div>
                      <h3>Quick Search</h3>
                      <p>Find what you need when you need it</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={styles.inputSection}>
              <div className={styles.inputCard}>
                <h3 className={styles.cardTitle}>
                  <span className={styles.cardIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  </span>
                  Record Voice Note
                </h3>
                <VoiceRecorder
                  onTranscriptionComplete={handleVoiceRecording}
                  onError={handleError}
                />
              </div>
              
              <div className={styles.inputCard}>
                <h3 className={styles.cardTitle}>
                  <span className={styles.cardIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </span>
                  Upload Document
                </h3>
                <FileUploader
                  onFileProcessed={handleFileUpload}
                  onError={handleError}
                  acceptedTypes={['.txt', '.pdf', '.doc', '.docx']}
                  maxFileSize={10 * 1024 * 1024}
                />
              </div>
            </div>
            
            <SearchInterface
              onSearch={handleSearch}
              results={searchResults}
              isLoading={isSearching}
            />
            
            <div className={styles.contentSection}>
              {searchView === 'search' ? (
                <div>
                  <div className={styles.viewToggle}>
                    <Button 
                      onClick={() => setSearchView('all')}
                      variant="ghost"
                    >
                      ← Back to all
                    </Button>
                  </div>
                  {searchResults.length > 0 && (
                    <ContentManager
                      items={searchResults.map(result => result.item)}
                      onDelete={handleDeleteItem}
                      onView={handleViewItem}
                    />
                  )}
                </div>
              ) : (
                <ContentManager
                  items={contentItems}
                  onDelete={handleDeleteItem}
                  onView={handleViewItem}
                />
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <ThemeProvider>
      <div className={styles.app}>
        {/* Navigation */}
        <nav className={styles.navigation}>
          <div className={styles.navBrand}>
            <div className={styles.logo}>
              <div className={styles.logoIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </div>
              <span className={styles.logoText}>VoiceVault</span>
            </div>
          </div>
          
          <div className={styles.navItems}>
            <button
              className={`${styles.navItem} ${currentView === 'dashboard' ? styles.active : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <span className={styles.navIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </span>
              Dashboard
            </button>
            <button
              className={`${styles.navItem} ${currentView === 'content' ? styles.active : ''}`}
              onClick={() => setCurrentView('content')}
            >
              <span className={styles.navIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </span>
              Content
            </button>
            <button
              className={`${styles.navItem} ${currentView === 'analytics' ? styles.active : ''}`}
              onClick={() => setCurrentView('analytics')}
            >
              <span className={styles.navIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                </svg>
              </span>
              Analytics
            </button>
            <button
              className={`${styles.navItem} ${currentView === 'gamification' ? styles.active : ''}`}
              onClick={() => setCurrentView('gamification')}
            >
              <span className={styles.navIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                  <path d="M4 22h16"/>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
                </svg>
              </span>
              Goals & Achievements
            </button>
            <button
              className={`${styles.navItem} ${currentView === 'storage' ? styles.active : ''}`}
              onClick={() => setCurrentView('storage')}
            >
              <span className={styles.navIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                </svg>
              </span>
              Storage & Backup
            </button>
          </div>
          
          {userAnalytics && (
            <div className={styles.navUser}>
              <div className={styles.userLevel}>
                Level {userAnalytics.level}
              </div>
              <div className={styles.userXP}>
                {userAnalytics.xp} XP
              </div>
            </div>
          )}
        </nav>

        {/* Error Banner */}
        {error && (
          <div className={styles.errorBanner}>
            <span>{error}</span>
            <button onClick={clearError} className={styles.errorClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* Main Content */}
        <main className={styles.main}>
          {isAnalyticsLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner} />
              <p>Setting things up...</p>
            </div>
          ) : (
            renderCurrentView()
          )}
        </main>

        {/* Goal Creation Modal */}
        <Modal
          isOpen={showGoalModal}
          onClose={() => setShowGoalModal(false)}
          title="Create New Goal"
          size="md"
        >
          <ModalContent>
            <div className={styles.goalForm}>
              <p>Goal creation form would go here...</p>
              <div className={styles.modalActions}>
                <Button variant="ghost" onClick={() => setShowGoalModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setShowGoalModal(false)}>
                  Create Goal
                </Button>
              </div>
            </div>
          </ModalContent>
        </Modal>

        {/* Achievement Notifications */}
        <AchievementNotification
          achievement={showAchievement}
          onClose={() => setShowAchievement(null)}
        />
        
        {showLevelUp && (
          <LevelUpNotification
            level={showLevelUp.level}
            xp={showLevelUp.xp}
            onClose={() => setShowLevelUp(null)}
          />
        )}
      </div>
    </ThemeProvider>
  );
};
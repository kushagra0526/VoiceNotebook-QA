// Analytics Collection Service - Real-time data collection and processing

import { AnalyticsService } from './AnalyticsService';
import { ContentItem } from '../types';
import { EventType, EventData } from '../types/analytics';

export class AnalyticsCollectionService {
  private analyticsService: AnalyticsService;
  private sessionStartTime: Date;
  private lastActivityTime: Date;
  private activityBuffer: Array<{ type: EventType; data: EventData; timestamp: Date }> = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isActive: boolean = true;

  constructor(analyticsService: AnalyticsService) {
    this.analyticsService = analyticsService;
    this.sessionStartTime = new Date();
    this.lastActivityTime = new Date();
    this.initializeCollection();
  }

  private initializeCollection(): void {
    // Flush activity buffer every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushActivityBuffer();
    }, 30000);

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleSessionPause();
      } else {
        this.handleSessionResume();
      }
    });

    // Track beforeunload for session end
    window.addEventListener('beforeunload', () => {
      this.handleSessionEnd();
    });
  }

  // === VOICE RECORDING TRACKING ===

  async trackVoiceRecordingStart(): Promise<void> {
    await this.bufferEvent('voice_recording_started', {
      timestamp: new Date(),
    });
  }

  async trackVoiceRecordingComplete(duration: number, transcriptionLength: number, audioQuality: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    await this.bufferEvent('voice_recording_completed', {
      duration,
      transcriptionLength,
      audioQuality,
      success: true,
    });

    // Update real-time productivity metrics
    await this.updateProductivityMetrics('voice_recording', duration);
  }

  async trackVoiceRecordingFailed(duration: number, errorMessage: string): Promise<void> {
    await this.bufferEvent('voice_recording_failed', {
      duration,
      errorMessage,
      success: false,
    });
  }

  // === FILE UPLOAD TRACKING ===

  async trackFileUploadStart(fileSize: number, fileType: string): Promise<void> {
    await this.bufferEvent('file_upload_started', {
      fileSize,
      fileType,
      timestamp: new Date(),
    });
  }

  async trackFileUploadComplete(fileSize: number, fileType: string, processingTime: number, contentLength: number): Promise<void> {
    await this.bufferEvent('file_upload_completed', {
      fileSize,
      fileType,
      processingTime,
      contentLength,
      success: true,
    });

    // Update real-time productivity metrics
    await this.updateProductivityMetrics('file_upload', processingTime);
  }

  async trackFileUploadFailed(fileSize: number, fileType: string, errorMessage: string): Promise<void> {
    await this.bufferEvent('file_upload_failed', {
      fileSize,
      fileType,
      errorMessage,
      success: false,
    });
  }

  // === SEARCH TRACKING ===

  async trackSearchStart(query: string, searchType: 'text' | 'voice'): Promise<void> {
    await this.bufferEvent('search_performed', {
      query,
      searchType,
      timestamp: new Date(),
    });
  }

  async trackSearchComplete(query: string, resultsCount: number, searchType: 'text' | 'voice', searchDuration: number): Promise<void> {
    await this.bufferEvent('search_performed', {
      query,
      resultsCount,
      searchType,
      duration: searchDuration,
      success: resultsCount > 0,
    });

    // Track search efficiency
    await this.updateSearchMetrics(query, resultsCount, searchType);
  }

  async trackSearchResultClick(query: string, resultIndex: number, contentId: string): Promise<void> {
    await this.bufferEvent('search_result_clicked', {
      query,
      selectedResultIndex: resultIndex,
      contentId,
    });
  }

  // === CONTENT INTERACTION TRACKING ===

  async trackContentView(contentId: string, contentType: 'voice' | 'file', viewDuration: number): Promise<void> {
    await this.bufferEvent('item_viewed', {
      contentId,
      contentType,
      duration: viewDuration,
    });
  }

  async trackContentDelete(contentId: string, contentType: 'voice' | 'file'): Promise<void> {
    await this.bufferEvent('item_deleted', {
      contentId,
      contentType,
    });
  }

  // === FEATURE USAGE TRACKING ===

  async trackFeatureUsage(featureName: string, featureCategory: string, context?: Record<string, any>): Promise<void> {
    await this.bufferEvent('feature_used', {
      featureName,
      featureCategory,
      ...context,
    });
  }

  async trackError(errorType: string, errorMessage: string, context?: Record<string, any>): Promise<void> {
    await this.bufferEvent('error_occurred', {
      errorMessage,
      errorType,
      ...context,
    });
  }

  // === GOAL AND ACHIEVEMENT TRACKING ===

  async trackGoalCreated(goalId: string, goalType: string, targetValue: number): Promise<void> {
    await this.bufferEvent('goal_created', {
      goalId,
      goalType,
      targetValue,
    });
  }

  async trackGoalCompleted(goalId: string, goalType: string, finalValue: number): Promise<void> {
    await this.bufferEvent('goal_completed', {
      goalId,
      goalType,
      currentValue: finalValue,
    });
  }

  async trackAchievementUnlocked(achievementId: string, achievementType: string, value: number): Promise<void> {
    await this.bufferEvent('achievement_unlocked', {
      goalId: achievementId, // Reusing goalId field for achievement
      goalType: achievementType,
      currentValue: value,
    });
  }

  // === SESSION MANAGEMENT ===

  private async handleSessionPause(): Promise<void> {
    this.isActive = false;
    await this.flushActivityBuffer();
  }

  private async handleSessionResume(): Promise<void> {
    this.isActive = true;
    this.lastActivityTime = new Date();
  }

  private async handleSessionEnd(): Promise<void> {
    const sessionDuration = Date.now() - this.sessionStartTime.getTime();
    
    await this.bufferEvent('session_ended', {
      duration: sessionDuration / 1000 / 60, // Convert to minutes
      sessionDuration: sessionDuration,
    });

    await this.flushActivityBuffer();
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
  }

  // === REAL-TIME METRICS UPDATES ===

  private async updateProductivityMetrics(activityType: 'voice_recording' | 'file_upload', duration: number): Promise<void> {
    try {
      // Update daily usage in real-time
      const today = new Date();
      const userAnalytics = await this.analyticsService.getUserAnalytics();
      
      if (userAnalytics) {
        const todayUsage = userAnalytics.dailyUsage.find(usage => 
          new Date(usage.date).toDateString() === today.toDateString()
        );

        if (todayUsage) {
          if (activityType === 'voice_recording') {
            todayUsage.recordingMinutes += duration / 60; // Convert seconds to minutes
            todayUsage.itemsCreated += 1;
          } else if (activityType === 'file_upload') {
            todayUsage.documentsProcessed += 1;
            todayUsage.itemsCreated += 1;
          }
          
          todayUsage.timeSpent += duration / 60;
          
          // Recalculate productivity score
          const newScore = this.calculateQuickProductivityScore(todayUsage);
          todayUsage.productivityScore = newScore;
          
          await this.analyticsService.updateUserAnalytics({
            dailyUsage: userAnalytics.dailyUsage,
            totalItems: userAnalytics.totalItems + 1,
            productivityScore: newScore,
          });
        }
      }
    } catch (error) {
      console.error('Failed to update productivity metrics:', error);
    }
  }

  private async updateSearchMetrics(query: string, resultsCount: number, searchType: 'text' | 'voice'): Promise<void> {
    try {
      const userAnalytics = await this.analyticsService.getUserAnalytics();
      
      if (userAnalytics) {
        // Update search count
        const updatedAnalytics = {
          ...userAnalytics,
          searchesPerformed: userAnalytics.searchesPerformed + 1,
        };

        // Update most searched terms
        const searchTerm = query.toLowerCase();
        const existingTerm = updatedAnalytics.mostSearchedTerms.find(term => term.term === searchTerm);
        
        if (existingTerm) {
          existingTerm.count += 1;
          existingTerm.lastSearched = new Date();
          existingTerm.averageResultsFound = (existingTerm.averageResultsFound + resultsCount) / 2;
        } else {
          updatedAnalytics.mostSearchedTerms.push({
            term: searchTerm,
            count: 1,
            lastSearched: new Date(),
            averageResultsFound: resultsCount,
          });
        }

        // Keep only top 20 search terms
        updatedAnalytics.mostSearchedTerms = updatedAnalytics.mostSearchedTerms
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);

        await this.analyticsService.updateUserAnalytics(updatedAnalytics);
      }
    } catch (error) {
      console.error('Failed to update search metrics:', error);
    }
  }

  private calculateQuickProductivityScore(dailyUsage: any): number {
    let score = 0;
    
    // Content creation score (40% weight)
    score += Math.min(dailyUsage.itemsCreated * 10, 40);
    
    // Search activity score (20% weight)
    score += Math.min(dailyUsage.searchCount * 2, 20);
    
    // Time engagement score (20% weight)
    score += Math.min((dailyUsage.timeSpent / 60) * 10, 20);
    
    // Consistency bonus (20% weight)
    score += dailyUsage.itemsCreated > 0 ? 20 : 0;
    
    return Math.min(Math.round(score), 100);
  }

  // === ACTIVITY BUFFERING ===

  private async bufferEvent(type: EventType, data: EventData): Promise<void> {
    this.lastActivityTime = new Date();
    
    this.activityBuffer.push({
      type,
      data,
      timestamp: new Date(),
    });

    // If buffer is getting large, flush immediately
    if (this.activityBuffer.length >= 10) {
      await this.flushActivityBuffer();
    }
  }

  private async flushActivityBuffer(): Promise<void> {
    if (this.activityBuffer.length === 0) return;

    const eventsToFlush = [...this.activityBuffer];
    this.activityBuffer = [];

    try {
      // Process events in batch
      for (const event of eventsToFlush) {
        await this.analyticsService.trackEvent(event.type, event.data);
      }
    } catch (error) {
      console.error('Failed to flush activity buffer:', error);
      // Re-add failed events to buffer for retry
      this.activityBuffer.unshift(...eventsToFlush);
    }
  }

  // === BATCH PROCESSING ===

  async processContentBatch(contentItems: ContentItem[]): Promise<void> {
    try {
      // Update analytics with current content state
      await this.analyticsService.updateUserAnalytics(contentItems);
      
      // Process any pending goals
      await this.checkGoalProgress(contentItems);
      
      // Generate insights if enough data
      if (contentItems.length >= 10) {
        await this.analyticsService.generateInsights();
        await this.analyticsService.generateRecommendations();
      }
    } catch (error) {
      console.error('Failed to process content batch:', error);
    }
  }

  private async checkGoalProgress(contentItems: ContentItem[]): Promise<void> {
    try {
      const goals = await this.analyticsService.getGoals('active');
      
      for (const goal of goals) {
        let currentValue = 0;
        
        switch (goal.type) {
          case 'daily_recordings':
            const today = new Date().toDateString();
            currentValue = contentItems.filter(item => 
              item.type === 'voice' && 
              new Date(item.timestamp).toDateString() === today
            ).length;
            break;
            
          case 'daily_uploads':
            const todayUploads = new Date().toDateString();
            currentValue = contentItems.filter(item => 
              item.type === 'file' && 
              new Date(item.timestamp).toDateString() === todayUploads
            ).length;
            break;
            
          case 'weekly_items':
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            currentValue = contentItems.filter(item => 
              new Date(item.timestamp) >= weekAgo
            ).length;
            break;
            
          case 'monthly_items':
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            currentValue = contentItems.filter(item => 
              new Date(item.timestamp) >= monthAgo
            ).length;
            break;
        }
        
        if (currentValue !== goal.current) {
          await this.analyticsService.updateGoalProgress(goal.id, currentValue);
          
          if (currentValue >= goal.target && goal.status !== 'completed') {
            await this.trackGoalCompleted(goal.id, goal.type, currentValue);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check goal progress:', error);
    }
  }

  // === PERFORMANCE MONITORING ===

  async trackPerformanceMetric(metricName: string, value: number, unit: string): Promise<void> {
    await this.bufferEvent('feature_used', {
      featureName: 'performance_metric',
      featureCategory: 'performance',
      metricName,
      value,
      unit,
    });
  }

  async trackLoadTime(componentName: string, loadTime: number): Promise<void> {
    await this.trackPerformanceMetric(`${componentName}_load_time`, loadTime, 'ms');
  }

  async trackUserInteraction(interactionType: string, element: string, duration?: number): Promise<void> {
    await this.bufferEvent('feature_used', {
      featureName: 'user_interaction',
      featureCategory: 'ui',
      interactionType,
      element,
      duration,
    });
  }

  // === CLEANUP ===

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Flush any remaining events
    this.flushActivityBuffer();
  }
}
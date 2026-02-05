// Main Analytics Service - Orchestrates analytics functionality

import { AnalyticsStorageService } from './AnalyticsStorageService';
import { AnalyticsCalculationService } from './AnalyticsCalculationService';
import {
  UserAnalytics,
  DailyUsageData,
  ProductivityMetrics,
  AnalyticsEvent,
  Goal,
  ProductivityInsight,
  Recommendation,
  AnalyticsTimeRange,
  WeeklyUsageData,
  MonthlyUsageData,
} from '../types/analytics';
import { ContentItem } from '../types';

export class AnalyticsService {
  private storageService: AnalyticsStorageService;
  private calculationService: AnalyticsCalculationService;
  private initialized: boolean = false;

  constructor() {
    this.storageService = new AnalyticsStorageService();
    this.calculationService = new AnalyticsCalculationService();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize with default analytics if none exist
      const existingAnalytics = await this.storageService.getUserAnalytics();
      if (!existingAnalytics) {
        await this.createInitialAnalytics();
      }

      this.initialized = true;
      console.log('Analytics service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize analytics service:', error);
      throw error;
    }
  }

  // === USER ANALYTICS METHODS ===

  async getUserAnalytics(): Promise<UserAnalytics | null> {
    await this.ensureInitialized();
    return await this.storageService.getUserAnalytics();
  }

  async updateUserAnalytics(contentItems: ContentItem[]): Promise<UserAnalytics> {
    await this.ensureInitialized();

    const events = await this.storageService.getEvents({
      dateRange: {
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
        end: new Date(),
      },
    });

    const dailyUsage = await this.storageService.getDailyUsageRange(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      new Date()
    );

    // Calculate updated analytics
    const analytics: UserAnalytics = {
      // Basic metrics
      totalItems: contentItems.length,
      voiceRecordings: contentItems.filter(item => item.type === 'voice').length,
      documentsUploaded: contentItems.filter(item => item.type === 'file').length,
      searchesPerformed: events.filter(event => event.type === 'search_performed').length,

      // Time-based metrics
      dailyUsage,
      weeklyUsage: this.calculationService.calculateWeeklyUsage(dailyUsage),
      monthlyUsage: this.calculationService.calculateMonthlyUsage(
        this.calculationService.calculateWeeklyUsage(dailyUsage)
      ),

      // Productivity metrics
      productivityScore: this.calculationService.calculateProductivityScore(dailyUsage, contentItems),
      streakDays: this.calculateCurrentStreak(dailyUsage),
      level: this.calculateUserLevel(contentItems.length, events.length),
      xp: this.calculateExperiencePoints(contentItems.length, events.length),

      // Usage patterns
      peakUsageHours: this.calculationService.analyzePeakUsageHours(events),
      mostActiveDay: this.calculationService.findMostActiveDay(dailyUsage),
      averageSessionDuration: this.calculationService.calculateAverageSessionDuration(events),
      totalTimeSpent: dailyUsage.reduce((sum, day) => sum + day.timeSpent, 0),

      // Content insights
      mostSearchedTerms: this.calculationService.analyzeSearchTerms(events),
      contentCategories: this.calculationService.categorizeContent(contentItems),
      averageContentLength: contentItems.length > 0 
        ? contentItems.reduce((sum, item) => sum + item.content.length, 0) / contentItems.length 
        : 0,

      // Engagement metrics
      lastActiveDate: new Date(),
      accountCreatedDate: await this.getAccountCreatedDate(),
      totalSessions: new Set(events.map(event => event.sessionId)).size,
      averageItemsPerSession: contentItems.length > 0 && events.length > 0 
        ? contentItems.length / new Set(events.map(event => event.sessionId)).size 
        : 0,
    };

    await this.storageService.saveUserAnalytics(analytics);
    return analytics;
  }

  // === EVENT TRACKING ===

  async trackEvent(type: AnalyticsEvent['type'], data: AnalyticsEvent['data']): Promise<void> {
    await this.ensureInitialized();
    await this.storageService.trackEvent(type, data);
  }

  async trackVoiceRecording(duration: number, transcriptionLength: number, success: boolean): Promise<void> {
    await this.trackEvent(success ? 'voice_recording_completed' : 'voice_recording_failed', {
      duration,
      transcriptionLength,
      success,
    });
  }

  async trackFileUpload(fileSize: number, fileType: string, processingTime: number, success: boolean): Promise<void> {
    await this.trackEvent(success ? 'file_upload_completed' : 'file_upload_failed', {
      fileSize,
      fileType,
      processingTime,
      success,
    });
  }

  async trackSearch(query: string, resultsCount: number, searchType: 'text' | 'voice'): Promise<void> {
    await this.trackEvent('search_performed', {
      query,
      resultsCount,
      searchType,
    });
  }

  async trackItemAction(action: 'viewed' | 'deleted', contentId: string, contentType: 'voice' | 'file'): Promise<void> {
    await this.trackEvent(action === 'viewed' ? 'item_viewed' : 'item_deleted', {
      contentId,
      contentType,
    });
  }

  // === PRODUCTIVITY METRICS ===

  async getProductivityMetrics(timeRange: AnalyticsTimeRange = '30d'): Promise<ProductivityMetrics> {
    await this.ensureInitialized();

    const dateRange = this.getDateRangeFromTimeRange(timeRange);
    const events = await this.storageService.getEvents({ dateRange });
    const dailyUsage = await this.storageService.getDailyUsageRange(dateRange.start, dateRange.end);
    const goals = await this.storageService.getGoals('active');

    // Calculate metrics
    const totalItems = dailyUsage.reduce((sum, day) => sum + day.itemsCreated, 0);
    const totalSearches = dailyUsage.reduce((sum, day) => sum + day.searchCount, 0);
    const totalTime = dailyUsage.reduce((sum, day) => sum + day.timeSpent, 0);
    const searchEvents = events.filter(event => event.type === 'search_performed');
    const successfulSearches = searchEvents.filter(event => (event.data.resultsCount || 0) > 0);

    const metrics: ProductivityMetrics = {
      // Core productivity indicators
      itemsPerHour: totalTime > 0 ? (totalItems / (totalTime / 60)) : 0,
      searchEfficiency: searchEvents.length > 0 ? (successfulSearches.length / searchEvents.length) * 100 : 0,
      contentUtilization: totalItems > 0 ? (successfulSearches.length / totalItems) * 100 : 0,
      sessionProductivity: this.calculateSessionProductivity(events),

      // Trend analysis
      weeklyTrend: this.calculationService.calculateTrendData(
        this.getWeeklyValues(dailyUsage, 'itemsCreated'),
        this.getWeeklyDates(dailyUsage)
      ),
      monthlyTrend: this.calculationService.calculateTrendData(
        this.getMonthlyValues(dailyUsage, 'itemsCreated'),
        this.getMonthlyDates(dailyUsage)
      ),

      // Comparative metrics
      previousWeekComparison: await this.calculatePreviousWeekComparison(dailyUsage),
      previousMonthComparison: await this.calculatePreviousMonthComparison(dailyUsage),

      // Goals
      dailyGoals: goals.filter(goal => goal.type.includes('daily')),
      weeklyGoals: goals.filter(goal => goal.type.includes('weekly')),
      monthlyGoals: goals.filter(goal => goal.type.includes('monthly')),

      // Insights and recommendations
      insights: await this.generateInsights(),
      recommendations: await this.generateRecommendations(),
    };

    return metrics;
  }

  // === GOALS MANAGEMENT ===

  async createGoal(goal: Omit<Goal, 'id' | 'createdDate' | 'status'>): Promise<Goal> {
    await this.ensureInitialized();

    const newGoal: Goal = {
      ...goal,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdDate: new Date(),
      status: 'active',
    };

    await this.storageService.saveGoal(newGoal);
    return newGoal;
  }

  async updateGoalProgress(goalId: string, currentValue: number): Promise<void> {
    await this.ensureInitialized();

    const goals = await this.storageService.getGoals();
    const goal = goals.find(g => g.id === goalId);

    if (goal) {
      const updates: Partial<Goal> = { current: currentValue };
      
      if (currentValue >= goal.target) {
        updates.status = 'completed';
      }

      await this.storageService.updateGoal(goalId, updates);
    }
  }

  async getGoals(status?: Goal['status']): Promise<Goal[]> {
    await this.ensureInitialized();
    return await this.storageService.getGoals(status);
  }

  // === INSIGHTS AND RECOMMENDATIONS ===

  async generateInsights(): Promise<ProductivityInsight[]> {
    await this.ensureInitialized();

    const userAnalytics = await this.getUserAnalytics();
    if (!userAnalytics) return [];

    const events = await this.storageService.getEvents({
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date(),
      },
    });

    const insights = this.calculationService.generateInsights(
      userAnalytics,
      userAnalytics.dailyUsage,
      events
    );

    // Save insights to storage
    for (const insight of insights) {
      await this.storageService.saveInsight(insight);
    }

    return insights;
  }

  async generateRecommendations(): Promise<Recommendation[]> {
    await this.ensureInitialized();

    const userAnalytics = await this.getUserAnalytics();
    const insights = await this.storageService.getInsights();
    const goals = await this.storageService.getGoals('active');

    if (!userAnalytics) return [];

    const recommendations = this.calculationService.generateRecommendations(
      userAnalytics,
      insights,
      goals
    );

    // Save recommendations to storage
    for (const recommendation of recommendations) {
      await this.storageService.saveRecommendation(recommendation);
    }

    return recommendations;
  }

  // === UTILITY METHODS ===

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async createInitialAnalytics(): Promise<void> {
    const initialAnalytics: UserAnalytics = {
      totalItems: 0,
      voiceRecordings: 0,
      documentsUploaded: 0,
      searchesPerformed: 0,
      dailyUsage: [],
      weeklyUsage: [],
      monthlyUsage: [],
      productivityScore: 0,
      streakDays: 0,
      level: 1,
      xp: 0,
      peakUsageHours: [],
      mostActiveDay: 'Monday',
      averageSessionDuration: 0,
      totalTimeSpent: 0,
      mostSearchedTerms: [],
      contentCategories: [],
      averageContentLength: 0,
      lastActiveDate: new Date(),
      accountCreatedDate: new Date(),
      totalSessions: 0,
      averageItemsPerSession: 0,
    };

    await this.storageService.saveUserAnalytics(initialAnalytics);
  }

  private calculateCurrentStreak(dailyUsage: DailyUsageData[]): number {
    if (dailyUsage.length === 0) return 0;

    const sortedUsage = dailyUsage.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const usage of sortedUsage) {
      const usageDate = new Date(usage.date);
      usageDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - usageDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak && usage.itemsCreated > 0) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateUserLevel(totalItems: number, totalEvents: number): number {
    const xp = this.calculateExperiencePoints(totalItems, totalEvents);
    return Math.floor(xp / 1000) + 1; // 1000 XP per level
  }

  private calculateExperiencePoints(totalItems: number, totalEvents: number): number {
    return (totalItems * 100) + (totalEvents * 10); // 100 XP per item, 10 XP per event
  }

  private async getAccountCreatedDate(): Promise<Date> {
    const events = await this.storageService.getEvents({ limit: 1 });
    return events.length > 0 ? events[0].timestamp : new Date();
  }

  private getDateRangeFromTimeRange(timeRange: AnalyticsTimeRange): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (timeRange) {
      case '24h':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'all':
        start.setFullYear(2020); // Arbitrary early date
        break;
    }

    return { start, end };
  }

  private calculateSessionProductivity(events: AnalyticsEvent[]): number {
    const sessions = new Map<string, number>();
    
    events.forEach(event => {
      if (event.type === 'voice_recording_completed' || event.type === 'file_upload_completed') {
        sessions.set(event.sessionId, (sessions.get(event.sessionId) || 0) + 1);
      }
    });

    const productivityScores = Array.from(sessions.values());
    return productivityScores.length > 0 
      ? productivityScores.reduce((sum, score) => sum + score, 0) / productivityScores.length 
      : 0;
  }

  private getWeeklyValues(dailyUsage: DailyUsageData[], metric: keyof DailyUsageData): number[] {
    const weeks = this.calculationService.calculateWeeklyUsage(dailyUsage);
    return weeks.map(week => {
      switch (metric) {
        case 'itemsCreated':
          return week.averageDailyUsage * 7;
        case 'searchCount':
          return week.totalSearches;
        case 'timeSpent':
          return week.totalTimeSpent;
        default:
          return 0;
      }
    });
  }

  private getWeeklyDates(dailyUsage: DailyUsageData[]): Date[] {
    const weeks = this.calculationService.calculateWeeklyUsage(dailyUsage);
    return weeks.map(week => week.weekStart);
  }

  private getMonthlyValues(dailyUsage: DailyUsageData[], metric: keyof DailyUsageData): number[] {
    const months = this.calculationService.calculateMonthlyUsage(
      this.calculationService.calculateWeeklyUsage(dailyUsage)
    );
    return months.map(month => {
      switch (metric) {
        case 'itemsCreated':
          return month.totalItems;
        case 'searchCount':
          return month.totalSearches;
        case 'timeSpent':
          return month.totalTimeSpent;
        default:
          return 0;
      }
    });
  }

  private getMonthlyDates(dailyUsage: DailyUsageData[]): Date[] {
    const months = this.calculationService.calculateMonthlyUsage(
      this.calculationService.calculateWeeklyUsage(dailyUsage)
    );
    return months.map(month => new Date(month.year, month.month, 1));
  }

  private async calculatePreviousWeekComparison(dailyUsage: DailyUsageData[]) {
    const thisWeek = dailyUsage.slice(-7);
    const lastWeek = dailyUsage.slice(-14, -7);
    
    const thisWeekItems = thisWeek.reduce((sum, day) => sum + day.itemsCreated, 0);
    const lastWeekItems = lastWeek.reduce((sum, day) => sum + day.itemsCreated, 0);
    
    return this.calculationService.calculateComparison(thisWeekItems, lastWeekItems);
  }

  private async calculatePreviousMonthComparison(dailyUsage: DailyUsageData[]) {
    const thisMonth = dailyUsage.slice(-30);
    const lastMonth = dailyUsage.slice(-60, -30);
    
    const thisMonthItems = thisMonth.reduce((sum, day) => sum + day.itemsCreated, 0);
    const lastMonthItems = lastMonth.reduce((sum, day) => sum + day.itemsCreated, 0);
    
    return this.calculationService.calculateComparison(thisMonthItems, lastMonthItems);
  }

  // === EXPORT AND CLEANUP ===

  async exportAnalyticsData(): Promise<string> {
    await this.ensureInitialized();
    return await this.storageService.exportAnalyticsData();
  }

  async getStorageUsage() {
    return await this.storageService.getStorageUsage();
  }

  async cleanupOldData(retentionDays: number = 90): Promise<void> {
    await this.ensureInitialized();
    await this.storageService.cleanupOldData(retentionDays);
  }
}
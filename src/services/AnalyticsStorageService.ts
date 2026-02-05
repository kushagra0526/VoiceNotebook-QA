// Analytics Storage Service - IndexedDB implementation for analytics data

import Dexie, { Table } from 'dexie';
import {
  AnalyticsRecord,
  AnalyticsQuery,
  UserAnalytics,
  DailyUsageData,
  AnalyticsEvent,
  Goal,
  ProductivityInsight,
  Recommendation,
  AggregationOptions,
  AggregationResult,
} from '../types/analytics';

class AnalyticsDatabase extends Dexie {
  // Tables
  analytics!: Table<AnalyticsRecord>;
  events!: Table<AnalyticsEvent>;
  goals!: Table<Goal>;
  insights!: Table<ProductivityInsight>;
  recommendations!: Table<Recommendation>;

  constructor() {
    super('VoiceVaultAnalytics');
    
    this.version(1).stores({
      analytics: '++id, type, timestamp, version',
      events: '++id, type, timestamp, sessionId, userId',
      goals: '++id, type, status, deadline, createdDate',
      insights: '++id, type, category, generatedDate, impact',
      recommendations: '++id, type, priority, category, createdDate, dismissedDate',
    });
  }
}

export class AnalyticsStorageService {
  private db: AnalyticsDatabase;
  private currentSessionId: string;

  constructor() {
    this.db = new AnalyticsDatabase();
    this.currentSessionId = this.generateSessionId();
    this.initializeSession();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeSession(): Promise<void> {
    try {
      await this.trackEvent('session_started', {});
    } catch (error) {
      console.error('Failed to initialize analytics session:', error);
    }
  }

  // === USER ANALYTICS METHODS ===

  async saveUserAnalytics(analytics: UserAnalytics): Promise<void> {
    try {
      const record: AnalyticsRecord = {
        id: 'user_analytics_current',
        type: 'user_analytics',
        data: analytics,
        timestamp: Date.now(),
        version: 1,
      };

      await this.db.analytics.put(record);
    } catch (error) {
      console.error('Failed to save user analytics:', error);
      throw error;
    }
  }

  async getUserAnalytics(): Promise<UserAnalytics | null> {
    try {
      const record = await this.db.analytics.get('user_analytics_current');
      return record ? record.data : null;
    } catch (error) {
      console.error('Failed to get user analytics:', error);
      return null;
    }
  }

  async updateUserAnalytics(updates: Partial<UserAnalytics>): Promise<void> {
    try {
      const current = await this.getUserAnalytics();
      if (current) {
        const updated = { ...current, ...updates };
        await this.saveUserAnalytics(updated);
      }
    } catch (error) {
      console.error('Failed to update user analytics:', error);
      throw error;
    }
  }

  // === DAILY USAGE METHODS ===

  async saveDailyUsage(date: Date, usage: DailyUsageData): Promise<void> {
    try {
      const dateKey = this.formatDateKey(date);
      const record: AnalyticsRecord = {
        id: `daily_usage_${dateKey}`,
        type: 'daily_usage',
        data: usage,
        timestamp: date.getTime(),
        version: 1,
      };

      await this.db.analytics.put(record);
    } catch (error) {
      console.error('Failed to save daily usage:', error);
      throw error;
    }
  }

  async getDailyUsage(date: Date): Promise<DailyUsageData | null> {
    try {
      const dateKey = this.formatDateKey(date);
      const record = await this.db.analytics.get(`daily_usage_${dateKey}`);
      return record ? record.data : null;
    } catch (error) {
      console.error('Failed to get daily usage:', error);
      return null;
    }
  }

  async getDailyUsageRange(startDate: Date, endDate: Date): Promise<DailyUsageData[]> {
    try {
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();

      const records = await this.db.analytics
        .where('type')
        .equals('daily_usage')
        .and(record => record.timestamp >= startTimestamp && record.timestamp <= endTimestamp)
        .toArray();

      return records.map(record => record.data).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (error) {
      console.error('Failed to get daily usage range:', error);
      return [];
    }
  }

  // === EVENT TRACKING METHODS ===

  async trackEvent(type: AnalyticsEvent['type'], data: AnalyticsEvent['data'], metadata?: AnalyticsEvent['metadata']): Promise<void> {
    try {
      const event: AnalyticsEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        timestamp: new Date(),
        sessionId: this.currentSessionId,
        data,
        metadata: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          screenResolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          ...metadata,
        },
      };

      await this.db.events.add(event);
      
      // Update real-time analytics
      await this.updateRealTimeMetrics(event);
    } catch (error) {
      console.error('Failed to track event:', error);
      // Don't throw to avoid breaking user experience
    }
  }

  async getEvents(query: AnalyticsQuery = {}): Promise<AnalyticsEvent[]> {
    try {
      let collection = this.db.events.orderBy('timestamp');

      if (query.dateRange) {
        collection = collection.filter(event => 
          event.timestamp >= query.dateRange!.start && 
          event.timestamp <= query.dateRange!.end
        );
      }

      if (query.limit) {
        collection = collection.limit(query.limit);
      }

      if (query.offset) {
        collection = collection.offset(query.offset);
      }

      return await collection.toArray();
    } catch (error) {
      console.error('Failed to get events:', error);
      return [];
    }
  }

  // === GOAL MANAGEMENT METHODS ===

  async saveGoal(goal: Goal): Promise<void> {
    try {
      await this.db.goals.put(goal);
      await this.trackEvent('goal_created', {
        goalId: goal.id,
        goalType: goal.type,
        targetValue: goal.target,
      });
    } catch (error) {
      console.error('Failed to save goal:', error);
      throw error;
    }
  }

  async getGoals(status?: Goal['status']): Promise<Goal[]> {
    try {
      if (status) {
        return await this.db.goals.where('status').equals(status).toArray();
      }
      return await this.db.goals.toArray();
    } catch (error) {
      console.error('Failed to get goals:', error);
      return [];
    }
  }

  async updateGoal(goalId: string, updates: Partial<Goal>): Promise<void> {
    try {
      await this.db.goals.update(goalId, updates);
      
      if (updates.status === 'completed') {
        await this.trackEvent('goal_completed', {
          goalId,
          goalType: updates.type,
          currentValue: updates.current,
        });
      }
    } catch (error) {
      console.error('Failed to update goal:', error);
      throw error;
    }
  }

  // === INSIGHTS AND RECOMMENDATIONS ===

  async saveInsight(insight: ProductivityInsight): Promise<void> {
    try {
      await this.db.insights.put(insight);
    } catch (error) {
      console.error('Failed to save insight:', error);
      throw error;
    }
  }

  async getInsights(category?: string): Promise<ProductivityInsight[]> {
    try {
      if (category) {
        return await this.db.insights.where('category').equals(category).toArray();
      }
      return await this.db.insights.orderBy('generatedDate').reverse().toArray();
    } catch (error) {
      console.error('Failed to get insights:', error);
      return [];
    }
  }

  async saveRecommendation(recommendation: Recommendation): Promise<void> {
    try {
      await this.db.recommendations.put(recommendation);
    } catch (error) {
      console.error('Failed to save recommendation:', error);
      throw error;
    }
  }

  async getRecommendations(dismissed: boolean = false): Promise<Recommendation[]> {
    try {
      if (dismissed) {
        return await this.db.recommendations.where('dismissedDate').above(0).toArray();
      } else {
        return await this.db.recommendations.where('dismissedDate').equals(undefined).toArray();
      }
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }

  // === AGGREGATION AND ANALYTICS ===

  async aggregateData(options: AggregationOptions): Promise<AggregationResult[]> {
    try {
      const { groupBy, metrics, dateRange, filters } = options;
      const events = await this.getEvents({ dateRange, filters });

      const grouped = this.groupEventsByPeriod(events, groupBy);
      const results: AggregationResult[] = [];

      for (const [period, periodEvents] of grouped.entries()) {
        const data: Record<string, number> = {};
        
        for (const metric of metrics) {
          data[metric] = this.calculateMetric(periodEvents, metric);
        }

        results.push({
          period,
          data,
          count: periodEvents.length,
          metadata: {
            groupBy,
            dateRange,
            calculatedAt: new Date(),
          },
        });
      }

      return results;
    } catch (error) {
      console.error('Failed to aggregate data:', error);
      return [];
    }
  }

  // === UTILITY METHODS ===

  private async updateRealTimeMetrics(event: AnalyticsEvent): Promise<void> {
    try {
      const today = new Date();
      const todayUsage = await this.getDailyUsage(today) || this.createEmptyDailyUsage(today);

      // Update metrics based on event type
      switch (event.type) {
        case 'voice_recording_completed':
          todayUsage.recordingMinutes += event.data.duration || 0;
          todayUsage.itemsCreated += 1;
          break;
        case 'file_upload_completed':
          todayUsage.documentsProcessed += 1;
          todayUsage.itemsCreated += 1;
          break;
        case 'search_performed':
          todayUsage.searchCount += 1;
          break;
        case 'item_deleted':
          todayUsage.itemsDeleted += 1;
          break;
      }

      await this.saveDailyUsage(today, todayUsage);
    } catch (error) {
      console.error('Failed to update real-time metrics:', error);
    }
  }

  private createEmptyDailyUsage(date: Date): DailyUsageData {
    return {
      date,
      recordingMinutes: 0,
      documentsProcessed: 0,
      searchCount: 0,
      timeSpent: 0,
      sessionsCount: 1,
      itemsCreated: 0,
      itemsDeleted: 0,
      productivityScore: 0,
    };
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private groupEventsByPeriod(events: AnalyticsEvent[], groupBy: string): Map<string, AnalyticsEvent[]> {
    const grouped = new Map<string, AnalyticsEvent[]>();

    for (const event of events) {
      const period = this.getPeriodKey(event.timestamp, groupBy);
      if (!grouped.has(period)) {
        grouped.set(period, []);
      }
      grouped.get(period)!.push(event);
    }

    return grouped;
  }

  private getPeriodKey(date: Date, groupBy: string): string {
    switch (groupBy) {
      case 'hour':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      case 'day':
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil(weekStart.getDate() / 7)}`;
      case 'month':
        return `${date.getFullYear()}-${date.getMonth()}`;
      case 'year':
        return `${date.getFullYear()}`;
      default:
        return date.toISOString();
    }
  }

  private calculateMetric(events: AnalyticsEvent[], metric: string): number {
    switch (metric) {
      case 'count':
        return events.length;
      case 'duration':
        return events.reduce((sum, event) => sum + (event.data.duration || 0), 0);
      case 'success_rate':
        const successful = events.filter(event => event.data.success !== false).length;
        return events.length > 0 ? (successful / events.length) * 100 : 0;
      default:
        return 0;
    }
  }

  // === CLEANUP AND MAINTENANCE ===

  async cleanupOldData(retentionDays: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffTimestamp = cutoffDate.getTime();

      // Clean up old events
      await this.db.events.where('timestamp').below(cutoffDate).delete();

      // Clean up old daily usage data
      await this.db.analytics
        .where('type')
        .equals('daily_usage')
        .and(record => record.timestamp < cutoffTimestamp)
        .delete();

      console.log(`Cleaned up analytics data older than ${retentionDays} days`);
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  async exportAnalyticsData(): Promise<string> {
    try {
      const data = {
        userAnalytics: await this.getUserAnalytics(),
        events: await this.getEvents({ limit: 1000 }),
        goals: await this.getGoals(),
        insights: await this.getInsights(),
        recommendations: await this.getRecommendations(),
        exportedAt: new Date().toISOString(),
      };

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export analytics data:', error);
      throw error;
    }
  }

  async getStorageUsage(): Promise<{ used: number; quota: number; percentage: number }> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (used / quota) * 100 : 0;

        return { used, quota, percentage };
      }
      return { used: 0, quota: 0, percentage: 0 };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, quota: 0, percentage: 0 };
    }
  }
}
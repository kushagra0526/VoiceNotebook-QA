// Analytics Calculation Service - Handles metric calculations and productivity scoring

import {
  UserAnalytics,
  DailyUsageData,
  ProductivityMetrics,
  TrendData,
  ComparisonData,
  SearchTerm,
  ContentCategory,
  Milestone,
  ProductivityInsight,
  Recommendation,
  AnalyticsEvent,
  Goal,
  WeeklyUsageData,
  MonthlyUsageData,
} from '../types/analytics';
import { ContentItem } from '../types';

export class AnalyticsCalculationService {
  
  // === PRODUCTIVITY SCORE CALCULATION ===
  
  calculateProductivityScore(dailyUsage: DailyUsageData[], contentItems: ContentItem[]): number {
    if (dailyUsage.length === 0) return 0;

    const recentDays = dailyUsage.slice(-7); // Last 7 days
    let totalScore = 0;

    for (const day of recentDays) {
      let dayScore = 0;

      // Content creation score (40% weight)
      const contentScore = Math.min((day.itemsCreated * 10), 40);
      dayScore += contentScore;

      // Search activity score (20% weight)
      const searchScore = Math.min((day.searchCount * 2), 20);
      dayScore += searchScore;

      // Time engagement score (20% weight)
      const timeScore = Math.min((day.timeSpent / 60) * 10, 20); // Convert minutes to hours
      dayScore += timeScore;

      // Consistency score (20% weight)
      const consistencyScore = day.itemsCreated > 0 ? 20 : 0;
      dayScore += consistencyScore;

      totalScore += Math.min(dayScore, 100);
    }

    return Math.round(totalScore / recentDays.length);
  }

  // === TREND ANALYSIS ===

  calculateTrendData(data: number[], dates: Date[]): TrendData[] {
    const trends: TrendData[] = [];

    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      const previous = i > 0 ? data[i - 1] : current;
      const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (change > 5) trend = 'up';
      else if (change < -5) trend = 'down';

      trends.push({
        date: dates[i],
        value: current,
        change,
        trend,
      });
    }

    return trends;
  }

  calculateComparison(current: number, previous: number): ComparisonData {
    const change = current - previous;
    const changePercentage = previous !== 0 ? (change / previous) * 100 : 0;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (changePercentage > 5) trend = 'up';
    else if (changePercentage < -5) trend = 'down';

    return {
      current,
      previous,
      change,
      changePercentage,
      trend,
    };
  }

  // === USAGE PATTERN ANALYSIS ===

  analyzePeakUsageHours(events: AnalyticsEvent[]): number[] {
    const hourCounts = new Array(24).fill(0);

    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourCounts[hour]++;
    });

    // Find top 3 peak hours
    const hourIndices = Array.from({ length: 24 }, (_, i) => i);
    hourIndices.sort((a, b) => hourCounts[b] - hourCounts[a]);
    
    return hourIndices.slice(0, 3);
  }

  findMostActiveDay(dailyUsage: DailyUsageData[]): string {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayCounts = new Array(7).fill(0);

    dailyUsage.forEach(usage => {
      const dayOfWeek = new Date(usage.date).getDay();
      dayCounts[dayOfWeek] += usage.itemsCreated + usage.searchCount;
    });

    const maxIndex = dayCounts.indexOf(Math.max(...dayCounts));
    return dayNames[maxIndex];
  }

  calculateAverageSessionDuration(events: AnalyticsEvent[]): number {
    const sessions = new Map<string, { start: Date; end: Date }>();

    events.forEach(event => {
      const sessionId = event.sessionId;
      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { start: event.timestamp, end: event.timestamp });
      } else {
        const session = sessions.get(sessionId)!;
        if (event.timestamp > session.end) {
          session.end = event.timestamp;
        }
      }
    });

    const durations = Array.from(sessions.values()).map(session => 
      (session.end.getTime() - session.start.getTime()) / (1000 * 60) // Convert to minutes
    );

    return durations.length > 0 ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length : 0;
  }

  // === CONTENT ANALYSIS ===

  analyzeSearchTerms(events: AnalyticsEvent[]): SearchTerm[] {
    const searchEvents = events.filter(event => event.type === 'search_performed');
    const termMap = new Map<string, SearchTerm>();

    searchEvents.forEach(event => {
      const query = event.data.query?.toLowerCase() || '';
      if (query) {
        const words = query.split(/\s+/).filter(word => word.length > 2);
        
        words.forEach(word => {
          if (termMap.has(word)) {
            const term = termMap.get(word)!;
            term.count++;
            term.lastSearched = event.timestamp;
            term.averageResultsFound = (term.averageResultsFound + (event.data.resultsCount || 0)) / 2;
          } else {
            termMap.set(word, {
              term: word,
              count: 1,
              lastSearched: event.timestamp,
              averageResultsFound: event.data.resultsCount || 0,
            });
          }
        });
      }
    });

    return Array.from(termMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 terms
  }

  categorizeContent(contentItems: ContentItem[]): ContentCategory[] {
    const categories = new Map<string, ContentCategory>();

    contentItems.forEach(item => {
      // Simple categorization based on content analysis
      const category = this.determineContentCategory(item.content);
      
      if (categories.has(category)) {
        const cat = categories.get(category)!;
        cat.count++;
        cat.averageLength = (cat.averageLength + item.content.length) / 2;
        cat.lastUpdated = new Date(Math.max(cat.lastUpdated.getTime(), item.timestamp.getTime()));
      } else {
        categories.set(category, {
          name: category,
          count: 1,
          percentage: 0,
          averageLength: item.content.length,
          lastUpdated: item.timestamp,
          tags: [],
        });
      }
    });

    // Calculate percentages
    const totalItems = contentItems.length;
    const categoryArray = Array.from(categories.values());
    
    categoryArray.forEach(category => {
      category.percentage = totalItems > 0 ? (category.count / totalItems) * 100 : 0;
    });

    return categoryArray.sort((a, b) => b.count - a.count);
  }

  private determineContentCategory(content: string): string {
    const lowerContent = content.toLowerCase();
    
    // Simple keyword-based categorization
    if (lowerContent.includes('meeting') || lowerContent.includes('call') || lowerContent.includes('discussion')) {
      return 'Meetings';
    } else if (lowerContent.includes('idea') || lowerContent.includes('brainstorm') || lowerContent.includes('concept')) {
      return 'Ideas';
    } else if (lowerContent.includes('task') || lowerContent.includes('todo') || lowerContent.includes('reminder')) {
      return 'Tasks';
    } else if (lowerContent.includes('note') || lowerContent.includes('memo') || lowerContent.includes('summary')) {
      return 'Notes';
    } else if (lowerContent.includes('project') || lowerContent.includes('plan') || lowerContent.includes('strategy')) {
      return 'Projects';
    } else {
      return 'General';
    }
  }

  // === MILESTONE DETECTION ===

  detectMilestones(userAnalytics: UserAnalytics, events: AnalyticsEvent[]): Milestone[] {
    const milestones: Milestone[] = [];

    // First recording milestone
    const firstRecording = events.find(event => event.type === 'voice_recording_completed');
    if (firstRecording) {
      milestones.push({
        id: 'first_recording',
        type: 'first_recording',
        title: 'First Voice Recording',
        description: 'Congratulations on your first voice recording!',
        achievedDate: firstRecording.timestamp,
        value: 1,
        icon: '🎤',
      });
    }

    // Items milestones
    const itemMilestones = [10, 25, 50, 100, 250, 500, 1000];
    itemMilestones.forEach(milestone => {
      if (userAnalytics.totalItems >= milestone) {
        milestones.push({
          id: `items_${milestone}`,
          type: 'items_milestone',
          title: `${milestone} Items Created`,
          description: `You've created ${milestone} items! Keep up the great work!`,
          achievedDate: new Date(), // This should be calculated from events
          value: milestone,
          icon: '📝',
        });
      }
    });

    // Streak milestones
    const streakMilestones = [7, 14, 30, 60, 100];
    streakMilestones.forEach(milestone => {
      if (userAnalytics.streakDays >= milestone) {
        milestones.push({
          id: `streak_${milestone}`,
          type: 'streak_milestone',
          title: `${milestone} Day Streak`,
          description: `Amazing! You've maintained a ${milestone} day streak!`,
          achievedDate: new Date(),
          value: milestone,
          icon: '🔥',
        });
      }
    });

    return milestones;
  }

  // === INSIGHTS GENERATION ===

  generateInsights(userAnalytics: UserAnalytics, dailyUsage: DailyUsageData[], events: AnalyticsEvent[]): ProductivityInsight[] {
    const insights: ProductivityInsight[] = [];

    // Usage pattern insights
    const peakHours = this.analyzePeakUsageHours(events);
    if (peakHours.length > 0) {
      insights.push({
        id: 'peak_usage_pattern',
        type: 'usage_pattern',
        title: 'Peak Usage Hours Identified',
        description: `You're most productive during ${peakHours.map(h => `${h}:00`).join(', ')}. Consider scheduling important tasks during these times.`,
        impact: 'medium',
        category: 'Time Management',
        actionable: true,
        relatedMetrics: ['session_duration', 'items_created'],
        generatedDate: new Date(),
      });
    }

    // Productivity trend insights
    if (dailyUsage.length >= 7) {
      const recentWeek = dailyUsage.slice(-7);
      const previousWeek = dailyUsage.slice(-14, -7);
      
      const recentAvg = recentWeek.reduce((sum, day) => sum + day.itemsCreated, 0) / 7;
      const previousAvg = previousWeek.reduce((sum, day) => sum + day.itemsCreated, 0) / 7;
      
      if (recentAvg > previousAvg * 1.2) {
        insights.push({
          id: 'productivity_increase',
          type: 'productivity_trend',
          title: 'Productivity Increasing',
          description: `Your productivity has increased by ${Math.round(((recentAvg - previousAvg) / previousAvg) * 100)}% this week!`,
          impact: 'high',
          category: 'Performance',
          actionable: false,
          relatedMetrics: ['items_created', 'productivity_score'],
          generatedDate: new Date(),
        });
      }
    }

    // Content analysis insights
    const searchEvents = events.filter(event => event.type === 'search_performed');
    const searchSuccessRate = searchEvents.length > 0 ? 
      searchEvents.filter(event => (event.data.resultsCount || 0) > 0).length / searchEvents.length : 0;

    if (searchSuccessRate < 0.7 && searchEvents.length > 10) {
      insights.push({
        id: 'search_optimization',
        type: 'search_behavior',
        title: 'Search Results Could Be Improved',
        description: `Only ${Math.round(searchSuccessRate * 100)}% of your searches return results. Consider using more specific keywords or organizing your content better.`,
        impact: 'medium',
        category: 'Content Organization',
        actionable: true,
        relatedMetrics: ['search_success_rate', 'content_utilization'],
        generatedDate: new Date(),
      });
    }

    return insights;
  }

  // === RECOMMENDATIONS GENERATION ===

  generateRecommendations(userAnalytics: UserAnalytics, insights: ProductivityInsight[], goals: Goal[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Goal-based recommendations
    const activeGoals = goals.filter(goal => goal.status === 'active');
    activeGoals.forEach(goal => {
      const progress = goal.current / goal.target;
      const daysLeft = Math.ceil((goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      if (progress < 0.5 && daysLeft < 7) {
        recommendations.push({
          id: `goal_urgency_${goal.id}`,
          type: 'goal_setting',
          title: `Focus on "${goal.title}"`,
          description: `You have ${daysLeft} days left to reach your goal. Consider dedicating more time to this objective.`,
          actionText: 'Review Goal',
          priority: 'high',
          category: 'Goals',
          estimatedImpact: 'High - Goal completion',
          implementationEffort: 'medium',
          relatedGoals: [goal.id],
          createdDate: new Date(),
        });
      }
    });

    // Usage pattern recommendations
    if (userAnalytics.averageSessionDuration < 15) {
      recommendations.push({
        id: 'session_duration',
        type: 'time_management',
        title: 'Extend Your Sessions',
        description: 'Your average session is quite short. Try batching similar tasks to improve efficiency.',
        actionText: 'Learn More',
        priority: 'medium',
        category: 'Productivity',
        estimatedImpact: 'Medium - Better focus',
        implementationEffort: 'easy',
        relatedGoals: [],
        createdDate: new Date(),
      });
    }

    // Content organization recommendations
    if (userAnalytics.totalItems > 50 && userAnalytics.mostSearchedTerms.length < 5) {
      recommendations.push({
        id: 'content_tagging',
        type: 'content_organization',
        title: 'Improve Content Organization',
        description: 'With many items created, consider adding tags or categories to make content easier to find.',
        actionText: 'Organize Content',
        priority: 'medium',
        category: 'Organization',
        estimatedImpact: 'High - Better findability',
        implementationEffort: 'medium',
        relatedGoals: [],
        createdDate: new Date(),
      });
    }

    return recommendations;
  }

  // === WEEKLY AND MONTHLY AGGREGATIONS ===

  calculateWeeklyUsage(dailyUsage: DailyUsageData[]): WeeklyUsageData[] {
    const weeks = new Map<string, DailyUsageData[]>();

    dailyUsage.forEach(day => {
      const date = new Date(day.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, []);
      }
      weeks.get(weekKey)!.push(day);
    });

    return Array.from(weeks.entries()).map(([weekKey, days]) => {
      const weekStart = new Date(weekKey);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const totalRecordingMinutes = days.reduce((sum, day) => sum + day.recordingMinutes, 0);
      const totalDocuments = days.reduce((sum, day) => sum + day.documentsProcessed, 0);
      const totalSearches = days.reduce((sum, day) => sum + day.searchCount, 0);
      const totalTimeSpent = days.reduce((sum, day) => sum + day.timeSpent, 0);
      const averageDailyUsage = days.reduce((sum, day) => sum + day.itemsCreated, 0) / days.length;

      const peakDay = days.reduce((peak, day) => 
        day.itemsCreated > peak.itemsCreated ? day : peak
      );

      return {
        weekStart,
        weekEnd,
        totalRecordingMinutes,
        totalDocuments,
        totalSearches,
        totalTimeSpent,
        averageDailyUsage,
        peakDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(peakDay.date).getDay()],
        productivityTrend: 'stable' as const, // This would be calculated based on comparison with previous week
      };
    });
  }

  calculateMonthlyUsage(weeklyUsage: WeeklyUsageData[]): MonthlyUsageData[] {
    const months = new Map<string, WeeklyUsageData[]>();

    weeklyUsage.forEach(week => {
      const monthKey = `${week.weekStart.getFullYear()}-${week.weekStart.getMonth()}`;
      if (!months.has(monthKey)) {
        months.set(monthKey, []);
      }
      months.get(monthKey)!.push(week);
    });

    return Array.from(months.entries()).map(([monthKey, weeks]) => {
      const [year, month] = monthKey.split('-').map(Number);
      const totalItems = weeks.reduce((sum, week) => sum + (week.averageDailyUsage * 7), 0);
      const totalSearches = weeks.reduce((sum, week) => sum + week.totalSearches, 0);
      const totalTimeSpent = weeks.reduce((sum, week) => sum + week.totalTimeSpent, 0);
      const averageWeeklyUsage = weeks.reduce((sum, week) => sum + week.averageDailyUsage, 0) / weeks.length;

      return {
        month,
        year,
        totalItems: Math.round(totalItems),
        totalSearches,
        totalTimeSpent,
        averageWeeklyUsage,
        growthRate: 0, // This would be calculated based on comparison with previous month
        milestones: [], // This would be populated with milestones achieved during the month
      };
    });
  }
}
// Analytics Data Models and Interfaces

export interface UserAnalytics {
  // Basic metrics
  totalItems: number;
  voiceRecordings: number;
  documentsUploaded: number;
  searchesPerformed: number;
  
  // Time-based metrics
  dailyUsage: DailyUsageData[];
  weeklyUsage: WeeklyUsageData[];
  monthlyUsage: MonthlyUsageData[];
  
  // Productivity metrics
  productivityScore: number;
  streakDays: number;
  level: number;
  xp: number;
  
  // Usage patterns
  peakUsageHours: number[];
  mostActiveDay: string;
  averageSessionDuration: number;
  totalTimeSpent: number; // in minutes
  
  // Content insights
  mostSearchedTerms: SearchTerm[];
  contentCategories: ContentCategory[];
  averageContentLength: number;
  
  // Engagement metrics
  lastActiveDate: Date;
  accountCreatedDate: Date;
  totalSessions: number;
  averageItemsPerSession: number;
}

export interface DailyUsageData {
  date: Date;
  recordingMinutes: number;
  documentsProcessed: number;
  searchCount: number;
  timeSpent: number; // in minutes
  sessionsCount: number;
  itemsCreated: number;
  itemsDeleted: number;
  productivityScore: number;
}

export interface WeeklyUsageData {
  weekStart: Date;
  weekEnd: Date;
  totalRecordingMinutes: number;
  totalDocuments: number;
  totalSearches: number;
  totalTimeSpent: number;
  averageDailyUsage: number;
  peakDay: string;
  productivityTrend: 'up' | 'down' | 'stable';
}

export interface MonthlyUsageData {
  month: number;
  year: number;
  totalItems: number;
  totalSearches: number;
  totalTimeSpent: number;
  averageWeeklyUsage: number;
  growthRate: number; // percentage
  milestones: Milestone[];
}

export interface SearchTerm {
  term: string;
  count: number;
  lastSearched: Date;
  averageResultsFound: number;
  category?: string;
}

export interface ContentCategory {
  name: string;
  count: number;
  percentage: number;
  averageLength: number;
  lastUpdated: Date;
  tags: string[];
}

export interface Milestone {
  id: string;
  type: MilestoneType;
  title: string;
  description: string;
  achievedDate: Date;
  value: number;
  icon: string;
}

export type MilestoneType = 
  | 'first_recording'
  | 'first_upload'
  | 'first_search'
  | 'items_milestone'
  | 'search_milestone'
  | 'streak_milestone'
  | 'time_milestone'
  | 'productivity_milestone';

export interface ProductivityMetrics {
  // Core productivity indicators
  itemsPerHour: number;
  searchEfficiency: number; // successful searches / total searches
  contentUtilization: number; // searched items / total items
  sessionProductivity: number;
  
  // Trend analysis
  weeklyTrend: TrendData[];
  monthlyTrend: TrendData[];
  
  // Comparative metrics
  previousWeekComparison: ComparisonData;
  previousMonthComparison: ComparisonData;
  
  // Goals and targets
  dailyGoals: Goal[];
  weeklyGoals: Goal[];
  monthlyGoals: Goal[];
  
  // Insights and recommendations
  insights: ProductivityInsight[];
  recommendations: Recommendation[];
}

export interface TrendData {
  date: Date;
  value: number;
  change: number; // percentage change from previous period
  trend: 'up' | 'down' | 'stable';
}

export interface ComparisonData {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface Goal {
  id: string;
  type: GoalType;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline: Date;
  createdDate: Date;
  status: 'active' | 'completed' | 'paused' | 'failed';
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export type GoalType = 
  | 'daily_recordings'
  | 'daily_uploads'
  | 'daily_searches'
  | 'weekly_items'
  | 'monthly_items'
  | 'streak_days'
  | 'productivity_score'
  | 'time_spent';

export interface ProductivityInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  category: string;
  actionable: boolean;
  relatedMetrics: string[];
  generatedDate: Date;
}

export type InsightType = 
  | 'usage_pattern'
  | 'productivity_trend'
  | 'content_analysis'
  | 'search_behavior'
  | 'time_optimization'
  | 'goal_progress';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  actionText: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  estimatedImpact: string;
  implementationEffort: 'easy' | 'medium' | 'hard';
  relatedGoals: string[];
  createdDate: Date;
  dismissedDate?: Date;
}

export type RecommendationType = 
  | 'workflow_optimization'
  | 'content_organization'
  | 'search_improvement'
  | 'time_management'
  | 'goal_setting'
  | 'feature_discovery';

// Event tracking interfaces
export interface AnalyticsEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  sessionId: string;
  userId?: string;
  data: EventData;
  metadata: EventMetadata;
}

export type EventType = 
  | 'voice_recording_started'
  | 'voice_recording_completed'
  | 'voice_recording_failed'
  | 'file_upload_started'
  | 'file_upload_completed'
  | 'file_upload_failed'
  | 'search_performed'
  | 'search_result_clicked'
  | 'item_deleted'
  | 'item_viewed'
  | 'session_started'
  | 'session_ended'
  | 'goal_created'
  | 'goal_completed'
  | 'achievement_unlocked'
  | 'feature_used'
  | 'error_occurred';

export interface EventData {
  // Common properties
  duration?: number;
  success?: boolean;
  errorMessage?: string;
  
  // Voice recording specific
  transcriptionLength?: number;
  audioQuality?: 'low' | 'medium' | 'high';
  
  // File upload specific
  fileSize?: number;
  fileType?: string;
  processingTime?: number;
  
  // Search specific
  query?: string;
  resultsCount?: number;
  selectedResultIndex?: number;
  searchType?: 'text' | 'voice';
  
  // Content specific
  contentId?: string;
  contentType?: 'voice' | 'file';
  contentLength?: number;
  
  // Goal specific
  goalId?: string;
  goalType?: GoalType;
  targetValue?: number;
  currentValue?: number;
  
  // Feature specific
  featureName?: string;
  featureCategory?: string;
  
  // Custom properties
  [key: string]: any;
}

export interface EventMetadata {
  userAgent?: string;
  platform?: string;
  screenResolution?: string;
  timezone?: string;
  language?: string;
  referrer?: string;
  sessionDuration?: number;
  pageUrl?: string;
}

// Storage interfaces for IndexedDB
export interface AnalyticsRecord {
  id: string;
  type: 'user_analytics' | 'daily_usage' | 'event' | 'goal' | 'insight' | 'recommendation';
  data: any;
  timestamp: number;
  version: number;
}

export interface AnalyticsQuery {
  type?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Aggregation and calculation interfaces
export interface AggregationOptions {
  groupBy: 'hour' | 'day' | 'week' | 'month' | 'year';
  metrics: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
}

export interface AggregationResult {
  period: string;
  data: Record<string, number>;
  count: number;
  metadata: {
    groupBy: string;
    dateRange: {
      start: Date;
      end: Date;
    };
    calculatedAt: Date;
  };
}

// Export utility types
export type AnalyticsTimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
export type MetricType = 'count' | 'sum' | 'average' | 'min' | 'max' | 'trend';
export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
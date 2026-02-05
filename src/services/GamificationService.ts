// Gamification Service - Handles achievements, goals, and XP system

import { AnalyticsStorageService } from './AnalyticsStorageService';
import { 
  Goal, 
  Achievement, 
  Milestone, 
  GoalType, 
  MilestoneType,
  UserAnalytics,
  AnalyticsEvent 
} from '../types/analytics';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: AchievementRequirement[];
  xpReward: number;
  hidden?: boolean;
}

export interface AchievementRequirement {
  type: 'count' | 'streak' | 'time' | 'score' | 'combo';
  metric: string;
  value: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all-time';
}

export class GamificationService {
  private storageService: AnalyticsStorageService;
  private achievementDefinitions: Map<string, AchievementDefinition> = new Map();
  private userLevel: number = 1;
  private userXP: number = 0;

  constructor(storageService: AnalyticsStorageService) {
    this.storageService = storageService;
    this.initializeAchievements();
  }

  private initializeAchievements(): void {
    const achievements: AchievementDefinition[] = [
      // First Steps Achievements
      {
        id: 'first_voice_note',
        title: 'First Words',
        description: 'Record your first voice note',
        icon: '🎤',
        category: 'Getting Started',
        rarity: 'common',
        requirements: [{ type: 'count', metric: 'voice_recordings', value: 1 }],
        xpReward: 100,
      },
      {
        id: 'first_file_upload',
        title: 'Digital Packrat',
        description: 'Upload your first document',
        icon: '📄',
        category: 'Getting Started',
        rarity: 'common',
        requirements: [{ type: 'count', metric: 'file_uploads', value: 1 }],
        xpReward: 100,
      },
      {
        id: 'first_search',
        title: 'Seeker',
        description: 'Perform your first search',
        icon: '🔍',
        category: 'Getting Started',
        rarity: 'common',
        requirements: [{ type: 'count', metric: 'searches', value: 1 }],
        xpReward: 50,
      },

      // Content Creation Achievements
      {
        id: 'voice_enthusiast',
        title: 'Voice Enthusiast',
        description: 'Record 10 voice notes',
        icon: '🎙️',
        category: 'Content Creation',
        rarity: 'common',
        requirements: [{ type: 'count', metric: 'voice_recordings', value: 10 }],
        xpReward: 250,
      },
      {
        id: 'content_creator',
        title: 'Content Creator',
        description: 'Create 50 items total',
        icon: '📝',
        category: 'Content Creation',
        rarity: 'rare',
        requirements: [{ type: 'count', metric: 'total_items', value: 50 }],
        xpReward: 500,
      },
      {
        id: 'prolific_creator',
        title: 'Prolific Creator',
        description: 'Create 100 items total',
        icon: '🏆',
        category: 'Content Creation',
        rarity: 'epic',
        requirements: [{ type: 'count', metric: 'total_items', value: 100 }],
        xpReward: 1000,
      },

      // Streak Achievements
      {
        id: 'consistent_user',
        title: 'Consistent User',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        category: 'Consistency',
        rarity: 'rare',
        requirements: [{ type: 'streak', metric: 'daily_usage', value: 7 }],
        xpReward: 300,
      },
      {
        id: 'dedication_master',
        title: 'Dedication Master',
        description: 'Maintain a 30-day streak',
        icon: '💎',
        category: 'Consistency',
        rarity: 'epic',
        requirements: [{ type: 'streak', metric: 'daily_usage', value: 30 }],
        xpReward: 1500,
      },
      {
        id: 'legendary_dedication',
        title: 'Legendary Dedication',
        description: 'Maintain a 100-day streak',
        icon: '👑',
        category: 'Consistency',
        rarity: 'legendary',
        requirements: [{ type: 'streak', metric: 'daily_usage', value: 100 }],
        xpReward: 5000,
      },

      // Productivity Achievements
      {
        id: 'productivity_novice',
        title: 'Productivity Novice',
        description: 'Achieve a productivity score of 70+',
        icon: '📈',
        category: 'Productivity',
        rarity: 'common',
        requirements: [{ type: 'score', metric: 'productivity_score', value: 70 }],
        xpReward: 200,
      },
      {
        id: 'efficiency_expert',
        title: 'Efficiency Expert',
        description: 'Achieve a productivity score of 90+',
        icon: '⚡',
        category: 'Productivity',
        rarity: 'rare',
        requirements: [{ type: 'score', metric: 'productivity_score', value: 90 }],
        xpReward: 500,
      },
      {
        id: 'productivity_legend',
        title: 'Productivity Legend',
        description: 'Maintain 90+ productivity for a week',
        icon: '🚀',
        category: 'Productivity',
        rarity: 'legendary',
        requirements: [
          { type: 'score', metric: 'productivity_score', value: 90, timeframe: 'weekly' }
        ],
        xpReward: 2000,
      },

      // Search Achievements
      {
        id: 'search_explorer',
        title: 'Search Explorer',
        description: 'Perform 50 searches',
        icon: '🗺️',
        category: 'Discovery',
        rarity: 'common',
        requirements: [{ type: 'count', metric: 'searches', value: 50 }],
        xpReward: 300,
      },
      {
        id: 'information_hunter',
        title: 'Information Hunter',
        description: 'Achieve 90% search success rate',
        icon: '🎯',
        category: 'Discovery',
        rarity: 'rare',
        requirements: [{ type: 'score', metric: 'search_success_rate', value: 90 }],
        xpReward: 400,
      },

      // Time-based Achievements
      {
        id: 'marathon_session',
        title: 'Marathon Session',
        description: 'Spend 2+ hours in a single session',
        icon: '⏰',
        category: 'Engagement',
        rarity: 'rare',
        requirements: [{ type: 'time', metric: 'session_duration', value: 120 }],
        xpReward: 350,
      },
      {
        id: 'time_investor',
        title: 'Time Investor',
        description: 'Spend 50+ hours total',
        icon: '💰',
        category: 'Engagement',
        rarity: 'epic',
        requirements: [{ type: 'time', metric: 'total_time', value: 3000 }],
        xpReward: 800,
      },

      // Special Achievements
      {
        id: 'early_bird',
        title: 'Early Bird',
        description: 'Use the app before 7 AM',
        icon: '🌅',
        category: 'Special',
        rarity: 'rare',
        requirements: [{ type: 'combo', metric: 'early_usage', value: 1 }],
        xpReward: 200,
        hidden: true,
      },
      {
        id: 'night_owl',
        title: 'Night Owl',
        description: 'Use the app after 11 PM',
        icon: '🦉',
        category: 'Special',
        rarity: 'rare',
        requirements: [{ type: 'combo', metric: 'late_usage', value: 1 }],
        xpReward: 200,
        hidden: true,
      },
      {
        id: 'perfectionist',
        title: 'Perfectionist',
        description: 'Complete all daily goals for a week',
        icon: '✨',
        category: 'Special',
        rarity: 'epic',
        requirements: [{ type: 'combo', metric: 'perfect_week', value: 1 }],
        xpReward: 1000,
      },
    ];

    achievements.forEach(achievement => {
      this.achievementDefinitions.set(achievement.id, achievement);
    });
  }

  // === GOAL MANAGEMENT ===

  async createGoal(goalData: Omit<Goal, 'id' | 'createdDate' | 'status'>): Promise<Goal> {
    const goal: Goal = {
      ...goalData,
      id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdDate: new Date(),
      status: 'active',
    };

    await this.storageService.saveGoal(goal);
    
    // Track goal creation event
    await this.storageService.trackEvent('goal_created', {
      goalId: goal.id,
      goalType: goal.type,
      targetValue: goal.target,
    });

    return goal;
  }

  async updateGoalProgress(goalId: string, currentValue: number): Promise<boolean> {
    const goals = await this.storageService.getGoals();
    const goal = goals.find(g => g.id === goalId);

    if (!goal) return false;

    const wasCompleted = goal.status === 'completed';
    const updates: Partial<Goal> = { current: currentValue };

    if (currentValue >= goal.target && !wasCompleted) {
      updates.status = 'completed';
      
      // Award XP for goal completion
      const xpReward = this.calculateGoalXP(goal);
      await this.awardXP(xpReward, `Completed goal: ${goal.title}`);
      
      // Track goal completion
      await this.storageService.trackEvent('goal_completed', {
        goalId: goal.id,
        goalType: goal.type,
        currentValue,
      });

      // Check for related achievements
      await this.checkGoalAchievements(goal);
    }

    await this.storageService.updateGoal(goalId, updates);
    return updates.status === 'completed';
  }

  private calculateGoalXP(goal: Goal): number {
    const baseXP = 100;
    const difficultyMultiplier = Math.max(1, goal.target / 10);
    const priorityMultiplier = goal.priority === 'high' ? 1.5 : goal.priority === 'medium' ? 1.2 : 1;
    
    return Math.round(baseXP * difficultyMultiplier * priorityMultiplier);
  }

  async getActiveGoals(): Promise<Goal[]> {
    return await this.storageService.getGoals('active');
  }

  async getCompletedGoals(): Promise<Goal[]> {
    return await this.storageService.getGoals('completed');
  }

  // === ACHIEVEMENT SYSTEM ===

  async checkAchievements(userAnalytics: UserAnalytics, events: AnalyticsEvent[]): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];
    const existingAchievements = await this.getUnlockedAchievements();
    const existingIds = new Set(existingAchievements.map(a => a.id));

    for (const [id, definition] of this.achievementDefinitions) {
      if (existingIds.has(id)) continue;

      const isUnlocked = await this.checkAchievementRequirements(definition, userAnalytics, events);
      
      if (isUnlocked) {
        const achievement: Achievement = {
          id: definition.id,
          title: definition.title,
          description: definition.description,
          icon: definition.icon,
          category: definition.category,
          progress: definition.requirements[0].value,
          maxProgress: definition.requirements[0].value,
          unlocked: true,
          unlockedAt: new Date(),
          rarity: definition.rarity,
        };

        await this.unlockAchievement(achievement, definition.xpReward);
        newAchievements.push(achievement);
      }
    }

    return newAchievements;
  }

  private async checkAchievementRequirements(
    definition: AchievementDefinition,
    userAnalytics: UserAnalytics,
    events: AnalyticsEvent[]
  ): Promise<boolean> {
    for (const requirement of definition.requirements) {
      const currentValue = await this.getMetricValue(requirement, userAnalytics, events);
      
      if (currentValue < requirement.value) {
        return false;
      }
    }
    
    return true;
  }

  private async getMetricValue(
    requirement: AchievementRequirement,
    userAnalytics: UserAnalytics,
    events: AnalyticsEvent[]
  ): Promise<number> {
    switch (requirement.metric) {
      case 'voice_recordings':
        return userAnalytics.voiceRecordings;
      case 'file_uploads':
        return userAnalytics.documentsUploaded;
      case 'total_items':
        return userAnalytics.totalItems;
      case 'searches':
        return userAnalytics.searchesPerformed;
      case 'productivity_score':
        return userAnalytics.productivityScore;
      case 'daily_usage':
        return userAnalytics.streakDays;
      case 'search_success_rate':
        const searchEvents = events.filter(e => e.type === 'search_performed');
        const successfulSearches = searchEvents.filter(e => (e.data.resultsCount || 0) > 0);
        return searchEvents.length > 0 ? (successfulSearches.length / searchEvents.length) * 100 : 0;
      case 'session_duration':
        return userAnalytics.averageSessionDuration;
      case 'total_time':
        return userAnalytics.totalTimeSpent;
      case 'early_usage':
        return events.some(e => e.timestamp.getHours() < 7) ? 1 : 0;
      case 'late_usage':
        return events.some(e => e.timestamp.getHours() >= 23) ? 1 : 0;
      case 'perfect_week':
        return await this.checkPerfectWeek() ? 1 : 0;
      default:
        return 0;
    }
  }

  private async checkPerfectWeek(): Promise<boolean> {
    const goals = await this.storageService.getGoals('completed');
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentCompletedGoals = goals.filter(goal => 
      goal.type.includes('daily') && 
      new Date(goal.createdDate) >= weekAgo
    );
    
    return recentCompletedGoals.length >= 7; // At least one daily goal per day
  }

  private async unlockAchievement(achievement: Achievement, xpReward: number): Promise<void> {
    // Save achievement
    await this.storageService.saveInsight({
      id: `achievement_${achievement.id}`,
      type: 'productivity_trend',
      title: `Achievement Unlocked: ${achievement.title}`,
      description: achievement.description,
      impact: 'high',
      category: 'Achievements',
      actionable: false,
      relatedMetrics: [],
      generatedDate: new Date(),
    });

    // Award XP
    await this.awardXP(xpReward, `Achievement: ${achievement.title}`);

    // Track achievement unlock
    await this.storageService.trackEvent('achievement_unlocked', {
      goalId: achievement.id,
      goalType: achievement.category,
      currentValue: xpReward,
    });
  }

  async getUnlockedAchievements(): Promise<Achievement[]> {
    const insights = await this.storageService.getInsights('Achievements');
    
    return insights.map(insight => ({
      id: insight.id.replace('achievement_', ''),
      title: insight.title.replace('Achievement Unlocked: ', ''),
      description: insight.description,
      icon: '🏆', // Default icon, would be stored in insight metadata in real implementation
      category: 'Achievement',
      progress: 100,
      maxProgress: 100,
      unlocked: true,
      unlockedAt: insight.generatedDate,
      rarity: 'common' as const,
    }));
  }

  async getAchievementProgress(): Promise<Array<{ achievement: AchievementDefinition; progress: number }>> {
    // This would return progress for all achievements, including locked ones
    // Implementation would calculate current progress for each achievement
    return [];
  }

  // === XP AND LEVELING SYSTEM ===

  async awardXP(amount: number, reason: string): Promise<{ newLevel: number; leveledUp: boolean }> {
    const currentXP = this.userXP;
    const currentLevel = this.userLevel;
    
    this.userXP += amount;
    const newLevel = this.calculateLevel(this.userXP);
    const leveledUp = newLevel > currentLevel;
    
    if (leveledUp) {
      this.userLevel = newLevel;
      
      // Track level up event
      await this.storageService.trackEvent('achievement_unlocked', {
        goalId: `level_${newLevel}`,
        goalType: 'level_up',
        currentValue: newLevel,
      });
    }

    // Update user analytics
    const userAnalytics = await this.storageService.getUserAnalytics();
    if (userAnalytics) {
      await this.storageService.saveUserAnalytics({
        ...userAnalytics,
        xp: this.userXP,
        level: this.userLevel,
      });
    }

    return { newLevel, leveledUp };
  }

  private calculateLevel(xp: number): number {
    // XP required for each level increases exponentially
    // Level 1: 0 XP, Level 2: 1000 XP, Level 3: 2500 XP, etc.
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }

  getXPForNextLevel(currentXP: number): number {
    const currentLevel = this.calculateLevel(currentXP);
    const nextLevelXP = Math.pow(currentLevel, 2) * 100;
    return nextLevelXP - currentXP;
  }

  // === MILESTONE SYSTEM ===

  async checkMilestones(userAnalytics: UserAnalytics): Promise<Milestone[]> {
    const milestones: Milestone[] = [];
    
    // Content milestones
    const contentMilestones = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
    for (const milestone of contentMilestones) {
      if (userAnalytics.totalItems === milestone) {
        milestones.push({
          id: `items_${milestone}`,
          type: 'items_milestone',
          title: `${milestone} Items Created`,
          description: `Congratulations! You've created ${milestone} items.`,
          achievedDate: new Date(),
          value: milestone,
          icon: milestone >= 100 ? '🏆' : milestone >= 50 ? '🥇' : '📝',
        });
      }
    }

    // Streak milestones
    const streakMilestones = [3, 7, 14, 30, 60, 100, 365];
    for (const milestone of streakMilestones) {
      if (userAnalytics.streakDays === milestone) {
        milestones.push({
          id: `streak_${milestone}`,
          type: 'streak_milestone',
          title: `${milestone} Day Streak`,
          description: `Amazing! You've maintained a ${milestone} day streak!`,
          achievedDate: new Date(),
          value: milestone,
          icon: milestone >= 100 ? '👑' : milestone >= 30 ? '🔥' : '⚡',
        });
      }
    }

    // Search milestones
    const searchMilestones = [10, 50, 100, 500, 1000];
    for (const milestone of searchMilestones) {
      if (userAnalytics.searchesPerformed === milestone) {
        milestones.push({
          id: `searches_${milestone}`,
          type: 'search_milestone',
          title: `${milestone} Searches Performed`,
          description: `You're becoming a search expert with ${milestone} searches!`,
          achievedDate: new Date(),
          value: milestone,
          icon: '🔍',
        });
      }
    }

    return milestones;
  }

  // === GOAL ACHIEVEMENTS ===

  private async checkGoalAchievements(completedGoal: Goal): Promise<void> {
    const allGoals = await this.storageService.getGoals();
    const completedGoals = allGoals.filter(g => g.status === 'completed');
    
    // Check for goal-related achievements
    if (completedGoals.length === 1) {
      await this.unlockAchievement({
        id: 'first_goal',
        title: 'Goal Getter',
        description: 'Complete your first goal',
        icon: '🎯',
        category: 'Goals',
        progress: 1,
        maxProgress: 1,
        unlocked: true,
        unlockedAt: new Date(),
        rarity: 'common',
      }, 150);
    }
    
    if (completedGoals.length === 10) {
      await this.unlockAchievement({
        id: 'goal_master',
        title: 'Goal Master',
        description: 'Complete 10 goals',
        icon: '🏆',
        category: 'Goals',
        progress: 10,
        maxProgress: 10,
        unlocked: true,
        unlockedAt: new Date(),
        rarity: 'rare',
      }, 500);
    }
  }

  // === DAILY CHALLENGES ===

  async generateDailyChallenges(): Promise<Goal[]> {
    const challenges: Omit<Goal, 'id' | 'createdDate' | 'status'>[] = [
      {
        type: 'daily_recordings',
        title: 'Voice Note Challenge',
        description: 'Record 3 voice notes today',
        target: 3,
        current: 0,
        unit: 'notes',
        deadline: this.getEndOfDay(),
        priority: 'medium',
        category: 'Daily Challenge',
      },
      {
        type: 'daily_searches',
        title: 'Search Explorer',
        description: 'Perform 5 searches today',
        target: 5,
        current: 0,
        unit: 'searches',
        deadline: this.getEndOfDay(),
        priority: 'low',
        category: 'Daily Challenge',
      },
      {
        type: 'time_spent',
        title: 'Focused Session',
        description: 'Spend 30 minutes in the app today',
        target: 30,
        current: 0,
        unit: 'minutes',
        deadline: this.getEndOfDay(),
        priority: 'high',
        category: 'Daily Challenge',
      },
    ];

    const createdChallenges: Goal[] = [];
    for (const challenge of challenges) {
      const created = await this.createGoal(challenge);
      createdChallenges.push(created);
    }

    return createdChallenges;
  }

  private getEndOfDay(): Date {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }

  // === LEADERBOARD AND SOCIAL FEATURES ===

  async getUserRank(): Promise<{ rank: number; totalUsers: number; percentile: number }> {
    // In a real implementation, this would compare with other users
    // For now, return mock data
    return {
      rank: Math.floor(Math.random() * 1000) + 1,
      totalUsers: 10000,
      percentile: Math.random() * 100,
    };
  }

  async getLeaderboard(category: 'xp' | 'streak' | 'items' | 'productivity' = 'xp'): Promise<Array<{
    rank: number;
    username: string;
    value: number;
    isCurrentUser: boolean;
  }>> {
    // Mock leaderboard data
    return [
      { rank: 1, username: 'ProductivityMaster', value: 15000, isCurrentUser: false },
      { rank: 2, username: 'VoiceNoteNinja', value: 12500, isCurrentUser: false },
      { rank: 3, username: 'You', value: this.userXP, isCurrentUser: true },
      { rank: 4, username: 'ContentCreator', value: 8900, isCurrentUser: false },
      { rank: 5, username: 'SearchExpert', value: 7800, isCurrentUser: false },
    ];
  }
}
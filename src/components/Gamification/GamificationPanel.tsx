import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, Button, Badge, Spinner } from '../ui';
import { Goal, Achievement, UserAnalytics } from '../../types/analytics';
import { GamificationService } from '../../services/GamificationService';
import { AchievementNotification, LevelUpNotification, StreakNotification } from './AchievementNotification';
import styles from './GamificationPanel.module.css';

interface GamificationPanelProps {
  gamificationService: GamificationService;
  userAnalytics: UserAnalytics | null;
  onCreateGoal?: () => void;
}

export const GamificationPanel: React.FC<GamificationPanelProps> = ({
  gamificationService,
  userAnalytics,
  onCreateGoal,
}) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'goals' | 'achievements' | 'leaderboard'>('goals');
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);
  const [showLevelUp, setShowLevelUp] = useState<{ level: number; xp: number } | null>(null);
  const [showStreak, setShowStreak] = useState<number | null>(null);

  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = async () => {
    try {
      setIsLoading(true);
      const [activeGoals, unlockedAchievements] = await Promise.all([
        gamificationService.getActiveGoals(),
        gamificationService.getUnlockedAchievements(),
      ]);
      
      setGoals(activeGoals);
      setAchievements(unlockedAchievements);
    } catch (error) {
      console.error('Failed to load gamification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDailyChallenge = async () => {
    try {
      const challenges = await gamificationService.generateDailyChallenges();
      setGoals(prev => [...prev, ...challenges]);
    } catch (error) {
      console.error('Failed to create daily challenges:', error);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <p>Loading gamification data...</p>
      </div>
    );
  }

  if (!userAnalytics) {
    return (
      <div className={styles.emptyState}>
        <p>No user data available</p>
      </div>
    );
  }

  return (
    <div className={styles.gamificationPanel}>
      <div className={styles.header}>
        <div className={styles.userLevel}>
          <div className={styles.levelBadge}>
            <span className={styles.levelNumber}>Level {userAnalytics.level}</span>
            <div className={styles.xpBar}>
              <div 
                className={styles.xpProgress}
                style={{ width: `${(userAnalytics.xp % 1000) / 10}%` }}
              />
            </div>
            <span className={styles.xpText}>
              {userAnalytics.xp % 1000} / 1000 XP
            </span>
          </div>
        </div>
        
        <div className={styles.streakInfo}>
          <div className={styles.streakBadge}>
            <span className={styles.streakIcon}>STREAK</span>
            <div className={styles.streakDetails}>
              <span className={styles.streakNumber}>{userAnalytics.streakDays}</span>
              <span className={styles.streakLabel}>Day Streak</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'goals' ? styles.active : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Goals ({goals.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'achievements' ? styles.active : ''}`}
          onClick={() => setActiveTab('achievements')}
        >
          Achievements ({achievements.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'leaderboard' ? styles.active : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          Leaderboard
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'goals' && (
          <GoalsTab 
            goals={goals}
            onCreateGoal={onCreateGoal}
            onCreateChallenge={handleCreateDailyChallenge}
          />
        )}
        
        {activeTab === 'achievements' && (
          <AchievementsTab 
            achievements={achievements}
            userAnalytics={userAnalytics}
          />
        )}
        
        {activeTab === 'leaderboard' && (
          <LeaderboardTab 
            gamificationService={gamificationService}
            userAnalytics={userAnalytics}
          />
        )}
      </div>

      {/* Notifications */}
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
      
      {showStreak && (
        <StreakNotification
          days={showStreak}
          onClose={() => setShowStreak(null)}
        />
      )}
    </div>
  );
};

interface GoalsTabProps {
  goals: Goal[];
  onCreateGoal?: () => void;
  onCreateChallenge: () => void;
}

const GoalsTab: React.FC<GoalsTabProps> = ({ goals, onCreateGoal, onCreateChallenge }) => {
  const activeGoals = goals.filter(goal => goal.status === 'active');
  const dailyChallenges = goals.filter(goal => goal.category === 'Daily Challenge');

  return (
    <div className={styles.goalsTab}>
      <div className={styles.goalsHeader}>
        <h3>Your Goals</h3>
        <div className={styles.goalsActions}>
          <Button variant="ghost" size="sm" onClick={onCreateChallenge}>
            Daily Challenges
          </Button>
          <Button variant="primary" size="sm" onClick={onCreateGoal}>
            Create Goal
          </Button>
        </div>
      </div>

      {dailyChallenges.length > 0 && (
        <Card className={styles.challengesCard}>
          <CardHeader title="Daily Challenges" />
          <CardContent>
            <div className={styles.challengesList}>
              {dailyChallenges.map(challenge => (
                <GoalItem key={challenge.id} goal={challenge} isChallenge />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className={styles.goalsList}>
        {activeGoals.length === 0 ? (
          <div className={styles.emptyGoals}>
            <div className={styles.emptyIcon}>GOALS</div>
            <h4>No active goals</h4>
            <p>Set goals to track your progress and earn XP!</p>
            <Button variant="primary" onClick={onCreateGoal}>
              Create Your First Goal
            </Button>
          </div>
        ) : (
          activeGoals.map(goal => (
            <GoalItem key={goal.id} goal={goal} />
          ))
        )}
      </div>
    </div>
  );
};

interface GoalItemProps {
  goal: Goal;
  isChallenge?: boolean;
}

const GoalItem: React.FC<GoalItemProps> = ({ goal, isChallenge = false }) => {
  const progress = Math.min((goal.current / goal.target) * 100, 100);
  const isCompleted = goal.status === 'completed';
  const daysLeft = Math.ceil((goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Card className={`${styles.goalCard} ${isChallenge ? styles.challenge : ''} ${isCompleted ? styles.completed : ''}`}>
      <CardContent>
        <div className={styles.goalHeader}>
          <div className={styles.goalInfo}>
            <h4 className={styles.goalTitle}>{goal.title}</h4>
            <p className={styles.goalDescription}>{goal.description}</p>
          </div>
          <div className={styles.goalMeta}>
            <Badge 
              variant={goal.priority === 'high' ? 'danger' : goal.priority === 'medium' ? 'warning' : 'default'}
              size="sm"
            >
              {goal.priority}
            </Badge>
            {daysLeft > 0 && (
              <span className={styles.deadline}>
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </span>
            )}
          </div>
        </div>
        
        <div className={styles.goalProgress}>
          <div className={styles.progressInfo}>
            <span className={styles.progressText}>
              {goal.current} / {goal.target} {goal.unit}
            </span>
            <span className={styles.progressPercent}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface AchievementsTabProps {
  achievements: Achievement[];
  userAnalytics: UserAnalytics;
}

const AchievementsTab: React.FC<AchievementsTabProps> = ({ achievements, userAnalytics }) => {
  const categories = ['Getting Started', 'Content Creation', 'Consistency', 'Productivity', 'Discovery'];

  return (
    <div className={styles.achievementsTab}>
      <div className={styles.achievementsStats}>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{achievements.length}</span>
          <span className={styles.statLabel}>Unlocked</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{userAnalytics.level}</span>
          <span className={styles.statLabel}>Level</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber}>{userAnalytics.xp}</span>
          <span className={styles.statLabel}>Total XP</span>
        </div>
      </div>

      <div className={styles.achievementCategories}>
        {categories.map(category => {
          const categoryAchievements = achievements.filter(a => a.category === category);
          
          return (
            <Card key={category} className={styles.categoryCard}>
              <CardHeader 
                title={category}
                action={
                  <Badge variant="secondary" size="sm">
                    {categoryAchievements.length}
                  </Badge>
                }
              />
              <CardContent>
                <div className={styles.achievementGrid}>
                  {categoryAchievements.map(achievement => (
                    <AchievementItem key={achievement.id} achievement={achievement} />
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

interface AchievementItemProps {
  achievement: Achievement;
}

const AchievementItem: React.FC<AchievementItemProps> = ({ achievement }) => {
  const rarityColors = {
    common: 'var(--color-border)',
    rare: 'var(--color-primary)',
    epic: 'var(--color-secondary)',
    legendary: 'var(--color-accent-orange)',
  };

  return (
    <div 
      className={`${styles.achievementItem} ${styles[achievement.rarity]}`}
      style={{ borderColor: rarityColors[achievement.rarity] }}
    >
      <div className={styles.achievementIcon}>{achievement.icon}</div>
      <div className={styles.achievementDetails}>
        <h5 className={styles.achievementTitle}>{achievement.title}</h5>
        <p className={styles.achievementDescription}>{achievement.description}</p>
        <div className={styles.achievementMeta}>
          <Badge variant="secondary" size="sm">
            {achievement.rarity}
          </Badge>
          {achievement.unlockedAt && (
            <span className={styles.unlockedDate}>
              {achievement.unlockedAt.toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface LeaderboardTabProps {
  gamificationService: GamificationService;
  userAnalytics: UserAnalytics;
}

const LeaderboardTab: React.FC<LeaderboardTabProps> = ({ gamificationService, userAnalytics }) => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<any>(null);
  const [category, setCategory] = useState<'xp' | 'streak' | 'items' | 'productivity'>('xp');

  useEffect(() => {
    loadLeaderboard();
  }, [category]);

  const loadLeaderboard = async () => {
    try {
      const [leaderboardData, rankData] = await Promise.all([
        gamificationService.getLeaderboard(category),
        gamificationService.getUserRank(),
      ]);
      
      setLeaderboard(leaderboardData);
      setUserRank(rankData);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  return (
    <div className={styles.leaderboardTab}>
      <div className={styles.leaderboardHeader}>
        <h3>Leaderboard</h3>
        <div className={styles.categorySelector}>
          {(['xp', 'streak', 'items', 'productivity'] as const).map(cat => (
            <Button
              key={cat}
              variant={category === cat ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setCategory(cat)}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {userRank && (
        <Card className={styles.userRankCard}>
          <CardContent>
            <div className={styles.userRankInfo}>
              <span className={styles.rankPosition}>#{userRank.rank}</span>
              <div className={styles.rankDetails}>
                <span className={styles.rankLabel}>Your Rank</span>
                <span className={styles.rankPercentile}>
                  Top {Math.round(userRank.percentile)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={styles.leaderboardList}>
        {leaderboard.map((entry, index) => (
          <div 
            key={entry.rank}
            className={`${styles.leaderboardEntry} ${entry.isCurrentUser ? styles.currentUser : ''}`}
          >
            <div className={styles.entryRank}>
              {entry.rank <= 3 ? (
                <span className={styles.medal}>
                  {entry.rank === 1 ? 'GOLD' : entry.rank === 2 ? 'SILVER' : 'BRONZE'}
                </span>
              ) : (
                <span className={styles.rankNumber}>#{entry.rank}</span>
              )}
            </div>
            <div className={styles.entryInfo}>
              <span className={styles.entryName}>{entry.username}</span>
              <span className={styles.entryValue}>
                {entry.value.toLocaleString()} {category === 'xp' ? 'XP' : category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
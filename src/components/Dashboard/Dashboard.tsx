import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, Badge, Spinner } from '../ui';
import { UserAnalytics, ProductivityMetrics, Goal } from '../../types/analytics';
import { AnalyticsService } from '../../services';
import styles from './Dashboard.module.css';

interface DashboardProps {
  analyticsService: AnalyticsService;
  onQuickAction?: (action: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ analyticsService, onQuickAction }) => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [metrics, setMetrics] = useState<ProductivityMetrics | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [analyticsData, metricsData, goalsData] = await Promise.all([
        analyticsService.getUserAnalytics(),
        analyticsService.getProductivityMetrics('30d'),
        analyticsService.getGoals('active'),
      ]);

      setAnalytics(analyticsData);
      setMetrics(metricsData);
      setGoals(goalsData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <p>Getting your information ready...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={styles.errorContainer}>
        <p>{error || 'No analytics data available'}</p>
        <button onClick={loadDashboardData} className={styles.retryButton}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <div className={styles.welcome}>
          <h1 className={styles.title}>Good to see you again</h1>
          <p className={styles.subtitle}>Here's what you've been working on</p>
        </div>
        <div className={styles.level}>
          <Badge variant="primary" size="lg">
            Level {analytics.level}
          </Badge>
          <div className={styles.xp}>
            <span>{analytics.xp} XP</span>
            <div className={styles.xpBar}>
              <div 
                className={styles.xpProgress} 
                style={{ width: `${Math.min((analytics.xp % 1000) / 1000 * 100, 100)}px` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <StatCard
          title="Total Items"
          value={analytics.totalItems}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
          color="primary"
        />
        <StatCard
          title="Voice Notes"
          value={analytics.voiceRecordings}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>}
          color="secondary"
        />
        <StatCard
          title="Documents"
          value={analytics.documentsUploaded}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>}
          color="success"
        />
        <StatCard
          title="Searches"
          value={analytics.searchesPerformed}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>}
          color="warning"
        />
      </div>

      <div className={styles.mainContent}>
        <div className={styles.leftColumn}>
          <ProductivityCard analytics={analytics} metrics={metrics} />
          <RecentActivityCard analytics={analytics} />
        </div>
        
        <div className={styles.rightColumn}>
          <QuickActionsCard onAction={onQuickAction} />
          <GoalsCard goals={goals} />
          <AchievementsCard analytics={analytics} />
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card className={`${styles.statCard} ${styles[color]}`}>
    <CardContent>
      <div className={styles.statHeader}>
        <span className={styles.statIcon}>{icon}</span>
      </div>
      <div className={styles.statValue}>
        <AnimatedCounter value={value} />
      </div>
      <div className={styles.statTitle}>{title}</div>
    </CardContent>
  </Card>
);

interface ProductivityCardProps {
  analytics: UserAnalytics;
  metrics: ProductivityMetrics | null;
}

const ProductivityCard: React.FC<ProductivityCardProps> = ({ analytics, metrics }) => (
  <Card className={styles.productivityCard}>
    <CardHeader title="Productivity Score" />
    <CardContent>
      <div className={styles.scoreContainer}>
        <div className={styles.scoreCircle}>
          <svg className={styles.scoreRing} viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="8"
              strokeDasharray={`${analytics.productivityScore * 2.83} 283`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              className={styles.scoreProgress}
            />
          </svg>
          <div className={styles.scoreText}>
            <span className={styles.scoreNumber}>{analytics.productivityScore}</span>
            <span className={styles.scoreLabel}>Score</span>
          </div>
        </div>
        
        <div className={styles.scoreDetails}>
          <div className={styles.scoreMetric}>
            <span className={styles.metricLabel}>Streak</span>
            <span className={styles.metricValue}>
              {analytics.streakDays} days
            </span>
          </div>
          <div className={styles.scoreMetric}>
            <span className={styles.metricLabel}>Avg Session</span>
            <span className={styles.metricValue}>
              {Math.round(analytics.averageSessionDuration)} min
            </span>
          </div>
          <div className={styles.scoreMetric}>
            <span className={styles.metricLabel}>Peak Time</span>
            <span className={styles.metricValue}>
              {analytics.peakUsageHours[0] || 9}:00
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

interface RecentActivityCardProps {
  analytics: UserAnalytics;
}

const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ analytics }) => {
  const recentDays = analytics.dailyUsage.slice(-7);
  
  return (
    <Card className={styles.activityCard}>
      <CardHeader title="Recent Activity" />
      <CardContent>
        <div className={styles.activityChart}>
          {recentDays.map((day, index) => (
            <div key={index} className={styles.activityBar}>
              <div 
                className={styles.barFill}
                style={{ 
                  height: `${Math.max(day.itemsCreated * 10, 5)}px` 
                }}
              />
              <span className={styles.barLabel}>
                {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
        <div className={styles.activitySummary}>
          <span>Most active: {analytics.mostActiveDay}</span>
          <span>{analytics.totalTimeSpent} min total</span>
        </div>
      </CardContent>
    </Card>
  );
};

interface QuickActionsCardProps {
  onAction?: (action: string) => void;
}

const QuickActionsCard: React.FC<QuickActionsCardProps> = ({ onAction }) => (
  <Card className={styles.quickActions}>
    <CardHeader title="Quick Actions" />
    <CardContent>
      <div className={styles.actionGrid}>
        <button 
          className={styles.actionButton}
          onClick={() => onAction?.('record')}
        >
          <span className={styles.actionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          </span>
          <span>Record Note</span>
        </button>
        <button 
          className={styles.actionButton}
          onClick={() => onAction?.('upload')}
        >
          <span className={styles.actionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
          </span>
          <span>Upload File</span>
        </button>
        <button 
          className={styles.actionButton}
          onClick={() => onAction?.('search')}
        >
          <span className={styles.actionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
          </span>
          <span>Search</span>
        </button>
        <button 
          className={styles.actionButton}
          onClick={() => onAction?.('goals')}
        >
          <span className={styles.actionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11H1l6-6 6 6"/>
              <path d="M9 17l3 3 3-3"/>
              <path d="M22 18.5c0 .3-.2.5-.5.5h-1c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h1c.3 0 .5.2.5.5z"/>
              <path d="M23 13.5c0 .3-.2.5-.5.5h-1c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h1c.3 0 .5.2.5.5z"/>
              <path d="M23 8.5c0 .3-.2.5-.5.5h-1c-.3 0-.5-.2-.5-.5s.2-.5.5-.5h1c.3 0 .5.2.5.5z"/>
            </svg>
          </span>
          <span>Set Goal</span>
        </button>
      </div>
    </CardContent>
  </Card>
);

interface GoalsCardProps {
  goals: Goal[];
}

const GoalsCard: React.FC<GoalsCardProps> = ({ goals }) => (
  <Card className={styles.goalsCard}>
    <CardHeader title="Active Goals" />
    <CardContent>
      {goals.length === 0 ? (
        <p className={styles.emptyState}>Ready to set your first goal?</p>
      ) : (
        <div className={styles.goalsList}>
          {goals.slice(0, 3).map(goal => (
            <div key={goal.id} className={styles.goalItem}>
              <div className={styles.goalInfo}>
                <span className={styles.goalTitle}>{goal.title}</span>
                <span className={styles.goalProgress}>
                  {goal.current} / {goal.target} {goal.unit}
                </span>
              </div>
              <div className={styles.goalBar}>
                <div 
                  className={styles.goalFill}
                  style={{ width: `${Math.min((goal.current / goal.target) * 200, 200)}px` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardContent>
  </Card>
);

interface AchievementsCardProps {
  analytics: UserAnalytics;
}

const AchievementsCard: React.FC<AchievementsCardProps> = ({ analytics }) => {
  const achievements = [
    { 
      id: 'first_note', 
      title: 'First Note', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>, 
      unlocked: analytics.voiceRecordings > 0 
    },
    { 
      id: 'first_upload', 
      title: 'First Upload', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>, 
      unlocked: analytics.documentsUploaded > 0 
    },
    { 
      id: 'ten_items', 
      title: '10 Items', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, 
      unlocked: analytics.totalItems >= 10 
    },
    { 
      id: 'week_streak', 
      title: 'Week Streak', 
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>, 
      unlocked: analytics.streakDays >= 7 
    },
  ];

  return (
    <Card className={styles.achievementsCard}>
      <CardHeader title="Achievements" />
      <CardContent>
        <div className={styles.achievementGrid}>
          {achievements.map(achievement => (
            <div 
              key={achievement.id} 
              className={`${styles.achievement} ${achievement.unlocked ? styles.unlocked : styles.locked}`}
            >
              <span className={styles.achievementIcon}>{achievement.icon}</span>
              <span className={styles.achievementTitle}>{achievement.title}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

interface AnimatedCounterProps {
  value: number;
  duration?: number;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, duration = 1000 }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setDisplayValue(Math.floor(progress * value));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
};
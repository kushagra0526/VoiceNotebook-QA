import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardContent, Button, Badge } from '../ui';
import { ProductivityMetrics, AnalyticsTimeRange, TrendData, UserAnalytics } from '../../types/analytics';
import { AnalyticsService } from '../../services';
import styles from './AnalyticsPanel.module.css';

interface AnalyticsPanelProps {
  analyticsService: AnalyticsService;
  userAnalytics: UserAnalytics | null;
}

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ analyticsService, userAnalytics }) => {
  const [metrics, setMetrics] = useState<ProductivityMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [activeChart, setActiveChart] = useState<'productivity' | 'usage' | 'content'>('productivity');

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  const loadMetrics = async () => {
    try {
      setIsLoading(true);
      const metricsData = await analyticsService.getProductivityMetrics(timeRange);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const timeRangeOptions = [
    { value: '7d' as AnalyticsTimeRange, label: '7 Days' },
    { value: '30d' as AnalyticsTimeRange, label: '30 Days' },
    { value: '90d' as AnalyticsTimeRange, label: '90 Days' },
    { value: '1y' as AnalyticsTimeRange, label: '1 Year' },
  ];

  const chartData = useMemo(() => {
    if (!metrics || !userAnalytics) return null;

    switch (activeChart) {
      case 'productivity':
        return {
          title: 'Productivity Trends',
          data: metrics.weeklyTrend,
          color: 'var(--color-primary)',
          unit: 'Score',
        };
      case 'usage':
        return {
          title: 'Usage Patterns',
          data: userAnalytics.dailyUsage.slice(-30).map(day => ({
            date: new Date(day.date),
            value: day.timeSpent,
            change: 0,
            trend: 'stable' as const,
          })),
          color: 'var(--color-secondary)',
          unit: 'Minutes',
        };
      case 'content':
        return {
          title: 'Content Creation',
          data: userAnalytics.dailyUsage.slice(-30).map(day => ({
            date: new Date(day.date),
            value: day.itemsCreated,
            change: 0,
            trend: 'stable' as const,
          })),
          color: 'var(--color-accent-green)',
          unit: 'Items',
        };
      default:
        return null;
    }
  }, [metrics, userAnalytics, activeChart]);

  if (!userAnalytics) {
    return (
      <div className={styles.emptyState}>
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className={styles.analyticsPanel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Analytics Dashboard</h2>
        <div className={styles.controls}>
          <div className={styles.timeRangeSelector}>
            {timeRangeOptions.map(option => (
              <Button
                key={option.value}
                variant={timeRange === option.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <MetricCard
          title="Items per Hour"
          value={metrics?.itemsPerHour || 0}
          unit="items/hr"
          trend={metrics?.previousWeekComparison.trend || 'stable'}
          change={metrics?.previousWeekComparison.changePercentage || 0}
          icon="SPEED"
        />
        <MetricCard
          title="Search Efficiency"
          value={metrics?.searchEfficiency || 0}
          unit="%"
          trend={metrics?.previousWeekComparison.trend || 'stable'}
          change={5.2}
          icon="ACCURACY"
        />
        <MetricCard
          title="Content Utilization"
          value={metrics?.contentUtilization || 0}
          unit="%"
          trend="up"
          change={8.7}
          icon="USAGE"
        />
        <MetricCard
          title="Session Productivity"
          value={metrics?.sessionProductivity || 0}
          unit="score"
          trend="stable"
          change={-1.2}
          icon="PERFORMANCE"
        />
      </div>

      <div className={styles.chartsSection}>
        <Card className={styles.chartCard}>
          <CardHeader 
            title="Trends Analysis"
            action={
              <div className={styles.chartTabs}>
                <button
                  className={`${styles.chartTab} ${activeChart === 'productivity' ? styles.active : ''}`}
                  onClick={() => setActiveChart('productivity')}
                >
                  Productivity
                </button>
                <button
                  className={`${styles.chartTab} ${activeChart === 'usage' ? styles.active : ''}`}
                  onClick={() => setActiveChart('usage')}
                >
                  Usage
                </button>
                <button
                  className={`${styles.chartTab} ${activeChart === 'content' ? styles.active : ''}`}
                  onClick={() => setActiveChart('content')}
                >
                  Content
                </button>
              </div>
            }
          />
          <CardContent>
            {isLoading ? (
              <div className={styles.chartLoading}>
                <div className={styles.loadingSpinner} />
                <p>Loading chart data...</p>
              </div>
            ) : chartData ? (
              <LineChart data={chartData} />
            ) : (
              <div className={styles.noData}>
                <p>No data available for selected time range</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className={styles.sideCharts}>
          <Card className={styles.pieCard}>
            <CardHeader title="Content Distribution" />
            <CardContent>
              <PieChart data={userAnalytics.contentCategories} />
            </CardContent>
          </Card>

          <Card className={styles.heatmapCard}>
            <CardHeader title="Usage Heatmap" />
            <CardContent>
              <UsageHeatmap peakHours={userAnalytics.peakUsageHours} />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className={styles.insightsSection}>
        <Card className={styles.insightsCard}>
          <CardHeader title="Key Insights" />
          <CardContent>
            <div className={styles.insightsList}>
              <InsightItem
                icon="TRENDING"
                title="Productivity Trending Up"
                description={`Your productivity score increased by ${Math.abs(metrics?.previousWeekComparison.changePercentage || 0).toFixed(1)}% this week`}
                type="positive"
              />
              <InsightItem
                icon="PEAK"
                title="Peak Performance Time"
                description={`You're most productive at ${userAnalytics.peakUsageHours[0] || 9}:00. Schedule important tasks then.`}
                type="neutral"
              />
              <InsightItem
                icon="OPTIMIZE"
                title="Search Optimization"
                description="Consider organizing content better to improve search efficiency"
                type="suggestion"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  icon: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, unit, trend, change, icon }) => (
  <Card className={`${styles.metricCard} ${styles[trend]}`}>
    <CardContent>
      <div className={styles.metricHeader}>
        <span className={styles.metricIcon}>{icon}</span>
        <Badge 
          variant={trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'default'}
          size="sm"
        >
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </Badge>
      </div>
      <div className={styles.metricValue}>
        {value.toFixed(1)}
        <span className={styles.metricUnit}>{unit}</span>
      </div>
      <div className={styles.metricTitle}>{title}</div>
    </CardContent>
  </Card>
);

interface LineChartProps {
  data: {
    title: string;
    data: TrendData[];
    color: string;
    unit: string;
  };
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const maxValue = Math.max(...data.data.map(d => d.value));
  const minValue = Math.min(...data.data.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className={styles.lineChart}>
      <div className={styles.chartHeader}>
        <h4>{data.title}</h4>
        <span className={styles.chartUnit}>{data.unit}</span>
      </div>
      
      <div className={styles.chartContainer}>
        <svg className={styles.chartSvg} viewBox="0 0 400 200">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={data.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={data.color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {[0, 1, 2, 3, 4].map(i => (
            <line
              key={i}
              x1="0"
              y1={i * 40}
              x2="400"
              y2={i * 40}
              stroke="var(--color-border)"
              strokeWidth="1"
              opacity="0.3"
            />
          ))}
          
          {/* Data line */}
          <path
            d={`M ${data.data.map((point, index) => {
              const x = (index / (data.data.length - 1)) * 400;
              const y = 200 - ((point.value - minValue) / range) * 180;
              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')}`}
            fill="none"
            stroke={data.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Area fill */}
          <path
            d={`M ${data.data.map((point, index) => {
              const x = (index / (data.data.length - 1)) * 400;
              const y = 200 - ((point.value - minValue) / range) * 180;
              return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ')} L 400 200 L 0 200 Z`}
            fill="url(#chartGradient)"
          />
          
          {/* Data points */}
          {data.data.map((point, index) => {
            const x = (index / (data.data.length - 1)) * 400;
            const y = 200 - ((point.value - minValue) / range) * 180;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill={data.color}
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>
      
      <div className={styles.chartLabels}>
        {data.data.map((point, index) => (
          <span key={index} className={styles.chartLabel}>
            {point.date.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </span>
        ))}
      </div>
    </div>
  );
};

interface PieChartProps {
  data: Array<{ name: string; count: number; percentage: number }>;
}

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const colors = [
    'var(--color-primary)',
    'var(--color-secondary)',
    'var(--color-accent-green)',
    'var(--color-accent-orange)',
    'var(--color-accent-red)',
  ];

  let cumulativePercentage = 0;

  return (
    <div className={styles.pieChart}>
      <svg className={styles.pieSvg} viewBox="0 0 200 200">
        {data.slice(0, 5).map((segment, index) => {
          const startAngle = (cumulativePercentage / 100) * 360;
          const endAngle = ((cumulativePercentage + segment.percentage) / 100) * 360;
          cumulativePercentage += segment.percentage;

          const startAngleRad = (startAngle * Math.PI) / 180;
          const endAngleRad = (endAngle * Math.PI) / 180;

          const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

          const x1 = 100 + 80 * Math.cos(startAngleRad);
          const y1 = 100 + 80 * Math.sin(startAngleRad);
          const x2 = 100 + 80 * Math.cos(endAngleRad);
          const y2 = 100 + 80 * Math.sin(endAngleRad);

          const pathData = [
            `M 100 100`,
            `L ${x1} ${y1}`,
            `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            `Z`
          ].join(' ');

          return (
            <path
              key={index}
              d={pathData}
              fill={colors[index]}
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      
      <div className={styles.pieLabels}>
        {data.slice(0, 5).map((segment, index) => (
          <div key={index} className={styles.pieLabel}>
            <div 
              className={styles.pieLabelColor}
              style={{ backgroundColor: colors[index] }}
            />
            <span className={styles.pieLabelText}>
              {segment.name} ({segment.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface UsageHeatmapProps {
  peakHours: number[];
}

const UsageHeatmap: React.FC<UsageHeatmapProps> = ({ peakHours }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className={styles.heatmap}>
      <div className={styles.heatmapGrid}>
        {days.map(day => (
          <div key={day} className={styles.heatmapRow}>
            <span className={styles.dayLabel}>{day}</span>
            {hours.map(hour => {
              const intensity = peakHours.includes(hour) ? 0.8 : Math.random() * 0.4;
              return (
                <div
                  key={hour}
                  className={styles.heatmapCell}
                  style={{
                    backgroundColor: `rgba(0, 102, 255, ${intensity})`,
                  }}
                  title={`${day} ${hour}:00`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className={styles.heatmapLegend}>
        <span>Less</span>
        <div className={styles.legendGradient} />
        <span>More</span>
      </div>
    </div>
  );
};

interface InsightItemProps {
  icon: string;
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral' | 'suggestion';
}

const InsightItem: React.FC<InsightItemProps> = ({ icon, title, description, type }) => (
  <div className={`${styles.insightItem} ${styles[type]}`}>
    <div className={styles.insightIcon}>{icon}</div>
    <div className={styles.insightContent}>
      <h4 className={styles.insightTitle}>{title}</h4>
      <p className={styles.insightDescription}>{description}</p>
    </div>
  </div>
);
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Achievement } from '../../types/analytics';
import styles from './AchievementNotification.module.css';

interface AchievementNotificationProps {
  achievement: Achievement | null;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onClose,
  autoClose = true,
  duration = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      setIsAnimating(true);
      
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    }
  }, [achievement, autoClose, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  if (!achievement || !isVisible) return null;

  const rarityColors = {
    common: 'var(--color-border)',
    rare: 'var(--color-primary)',
    epic: 'var(--color-secondary)',
    legendary: 'var(--gradient-warning)',
  };

  return createPortal(
    <div className={styles.overlay}>
      <div className={`${styles.notification} ${isAnimating ? styles.animate : styles.exit}`}>
        <div className={styles.confetti}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={styles.confettiPiece}
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
              }}
            />
          ))}
        </div>
        
        <div 
          className={styles.card}
          style={{ borderColor: rarityColors[achievement.rarity] }}
        >
          <div className={styles.header}>
            <div className={styles.badge}>
              <span className={styles.badgeText}>Achievement Unlocked!</span>
            </div>
            <button className={styles.closeButton} onClick={handleClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div className={styles.content}>
            <div className={styles.iconContainer}>
              <div className={`${styles.icon} ${styles[achievement.rarity]}`}>
                {achievement.icon}
              </div>
              <div className={styles.glow} />
            </div>
            
            <div className={styles.details}>
              <h3 className={styles.title}>{achievement.title}</h3>
              <p className={styles.description}>{achievement.description}</p>
              <div className={styles.meta}>
                <span className={`${styles.rarity} ${styles[achievement.rarity]}`}>
                  {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
                </span>
                <span className={styles.category}>{achievement.category}</span>
              </div>
            </div>
          </div>
          
          <div className={styles.footer}>
            <div className={styles.progress}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: '100%' }}
                />
              </div>
              <span className={styles.progressText}>
                {achievement.progress} / {achievement.maxProgress}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface LevelUpNotificationProps {
  level: number;
  xp: number;
  onClose: () => void;
}

export const LevelUpNotification: React.FC<LevelUpNotificationProps> = ({
  level,
  xp,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!isVisible) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div className={`${styles.levelUpNotification} ${isVisible ? styles.animate : styles.exit}`}>
        <div className={styles.levelUpContent}>
          <div className={styles.levelUpIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
              <path d="M4 22h16"/>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
            </svg>
          </div>
          <h2 className={styles.levelUpTitle}>Level Up!</h2>
          <div className={styles.levelUpDetails}>
            <div className={styles.levelNumber}>Level {level}</div>
            <div className={styles.xpAmount}>{xp} XP</div>
          </div>
          <div className={styles.levelUpEffects}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className={styles.sparkle}
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface XPGainNotificationProps {
  amount: number;
  reason: string;
  position?: { x: number; y: number };
  onComplete?: () => void;
}

export const XPGainNotification: React.FC<XPGainNotificationProps> = ({
  amount,
  reason,
  position,
  onComplete,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onComplete?.(), 300);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const style = position ? {
    position: 'fixed' as const,
    left: position.x,
    top: position.y,
    zIndex: 9999,
  } : {};

  return (
    <div 
      className={`${styles.xpGain} ${isVisible ? styles.animate : styles.exit}`}
      style={style}
    >
      <div className={styles.xpAmount}>+{amount} XP</div>
      <div className={styles.xpReason}>{reason}</div>
    </div>
  );
};

interface StreakNotificationProps {
  days: number;
  onClose: () => void;
}

export const StreakNotification: React.FC<StreakNotificationProps> = ({
  days,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getStreakMessage = (days: number) => {
    if (days >= 100) return "Legendary streak!";
    if (days >= 30) return "Amazing dedication!";
    if (days >= 7) return "Great consistency!";
    return "Keep it up!";
  };

  return createPortal(
    <div className={styles.overlay}>
      <div className={`${styles.streakNotification} ${isVisible ? styles.animate : styles.exit}`}>
        <div className={styles.streakContent}>
          <div className={styles.streakIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          </div>
          <div className={styles.streakDays}>{days}</div>
          <div className={styles.streakLabel}>Day Streak</div>
          <div className={styles.streakMessage}>{getStreakMessage(days)}</div>
        </div>
      </div>
    </div>,
    document.body
  );
};
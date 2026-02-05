import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui';
import { StorageAlert as StorageAlertType } from '../../services/StorageMonitorService';
import styles from './StorageAlert.module.css';

interface StorageAlertProps {
  alert: StorageAlertType | null;
  onClose: () => void;
  onAction?: () => void;
}

export const StorageAlert: React.FC<StorageAlertProps> = ({ alert, onClose, onAction }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (alert) {
      setIsVisible(true);
    }
  }, [alert]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleAction = () => {
    if (onAction) {
      onAction();
    }
    handleClose();
  };

  if (!alert || !isVisible) return null;

  const alertContent = (
    <div className={styles.overlay}>
      <div className={`${styles.alert} ${styles[alert.type]} ${isVisible ? styles.animate : styles.exit}`}>
        <div className={styles.icon}>
          {alert.type === 'critical' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
        </div>
        
        <div className={styles.content}>
          <h3 className={styles.title}>{alert.title}</h3>
          <p className={styles.message}>{alert.message}</p>
        </div>
        
        <div className={styles.actions}>
          {alert.action && (
            <Button variant="primary" size="sm" onClick={handleAction}>
              {alert.action}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(alertContent, document.body);
};

// Storage status indicator component
interface StorageStatusProps {
  percentage: number;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const StorageStatus: React.FC<StorageStatusProps> = ({ 
  percentage, 
  size = 'md', 
  showText = true 
}) => {
  const getStatusColor = (pct: number) => {
    if (pct >= 90) return '#EF4444'; // Critical - Red
    if (pct >= 75) return '#F59E0B'; // Warning - Orange
    if (pct >= 50) return '#8B5CF6'; // Medium - Purple
    return '#10B981'; // Good - Green
  };

  const getStatusText = (pct: number) => {
    if (pct >= 90) return 'Critical';
    if (pct >= 75) return 'High';
    if (pct >= 50) return 'Medium';
    return 'Good';
  };

  return (
    <div className={`${styles.storageStatus} ${styles[size]}`}>
      <div className={styles.statusBar}>
        <div 
          className={styles.statusFill}
          style={{ 
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: getStatusColor(percentage)
          }}
        />
      </div>
      {showText && (
        <div className={styles.statusText}>
          <span className={styles.statusPercentage}>{percentage.toFixed(1)}%</span>
          <span 
            className={styles.statusLabel}
            style={{ color: getStatusColor(percentage) }}
          >
            {getStatusText(percentage)}
          </span>
        </div>
      )}
    </div>
  );
};
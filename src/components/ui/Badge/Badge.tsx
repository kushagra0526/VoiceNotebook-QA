import React, { forwardRef } from 'react';
import styles from './Badge.module.css';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      variant = 'default',
      size = 'md',
      rounded = false,
      dot = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const badgeClasses = [
      styles.badge,
      styles[variant],
      styles[size],
      rounded && styles.rounded,
      dot && styles.dot,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={badgeClasses} {...props}>
        {dot ? <span className={styles.dotIndicator} /> : children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
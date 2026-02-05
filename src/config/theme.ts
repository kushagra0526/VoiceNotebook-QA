// Theme Configuration and Management

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor: string;
  accentColor: string;
  reducedMotion: boolean;
  highContrast: boolean;
}

export const defaultThemeConfig: ThemeConfig = {
  mode: 'light',
  primaryColor: '#2563EB',
  accentColor: '#0D9488',
  reducedMotion: false,
  highContrast: false,
};

export class ThemeManager {
  private config: ThemeConfig;
  private mediaQueries: {
    darkMode: MediaQueryList;
    reducedMotion: MediaQueryList;
    highContrast: MediaQueryList;
  };

  constructor(initialConfig: Partial<ThemeConfig> = {}) {
    this.config = { ...defaultThemeConfig, ...initialConfig };
    
    // Initialize media queries
    this.mediaQueries = {
      darkMode: window.matchMedia('(prefers-color-scheme: dark)'),
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
    };

    this.init();
  }

  private init(): void {
    // Load saved theme from localStorage
    const savedConfig = this.loadThemeFromStorage();
    if (savedConfig) {
      this.config = { ...this.config, ...savedConfig };
    }

    // Apply initial theme
    this.applyTheme();

    // Listen for system preference changes
    this.mediaQueries.darkMode.addEventListener('change', () => {
      if (this.config.mode === 'auto') {
        this.applyTheme();
      }
    });

    this.mediaQueries.reducedMotion.addEventListener('change', () => {
      this.updateReducedMotion();
    });

    this.mediaQueries.highContrast.addEventListener('change', () => {
      this.updateHighContrast();
    });
  }

  public setTheme(newConfig: Partial<ThemeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.applyTheme();
    this.saveThemeToStorage();
  }

  public getTheme(): ThemeConfig {
    return { ...this.config };
  }

  public toggleTheme(): void {
    const newMode = this.config.mode === 'dark' ? 'light' : 'dark';
    this.setTheme({ mode: newMode });
  }

  private applyTheme(): void {
    const root = document.documentElement;
    
    // Determine effective theme mode
    let effectiveMode = this.config.mode;
    if (effectiveMode === 'auto') {
      effectiveMode = this.mediaQueries.darkMode.matches ? 'dark' : 'light';
    }

    // Apply theme mode
    root.setAttribute('data-theme', effectiveMode);

    // Apply custom colors if different from defaults
    if (this.config.primaryColor !== defaultThemeConfig.primaryColor) {
      root.style.setProperty('--color-primary', this.config.primaryColor);
    }

    if (this.config.accentColor !== defaultThemeConfig.accentColor) {
      root.style.setProperty('--color-secondary', this.config.accentColor);
    }

    // Update other preferences
    this.updateReducedMotion();
    this.updateHighContrast();

    // Dispatch theme change event
    window.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme: this.config, effectiveMode }
    }));
  }

  private updateReducedMotion(): void {
    const shouldReduce = this.config.reducedMotion || this.mediaQueries.reducedMotion.matches;
    document.documentElement.style.setProperty(
      '--motion-reduce', 
      shouldReduce ? '1' : '0'
    );
  }

  private updateHighContrast(): void {
    const shouldUseHighContrast = this.config.highContrast || this.mediaQueries.highContrast.matches;
    document.documentElement.setAttribute(
      'data-high-contrast', 
      shouldUseHighContrast.toString()
    );
  }

  private saveThemeToStorage(): void {
    try {
      localStorage.setItem('theme-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save theme to localStorage:', error);
    }
  }

  private loadThemeFromStorage(): Partial<ThemeConfig> | null {
    try {
      const saved = localStorage.getItem('theme-config');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Failed to load theme from localStorage:', error);
      return null;
    }
  }

  public exportTheme(): string {
    return JSON.stringify(this.config, null, 2);
  }

  public importTheme(themeJson: string): boolean {
    try {
      const importedConfig = JSON.parse(themeJson);
      this.setTheme(importedConfig);
      return true;
    } catch (error) {
      console.error('Failed to import theme:', error);
      return false;
    }
  }
}

// Design tokens for programmatic access
export const designTokens = {
  colors: {
    primary: 'var(--color-primary)',
    secondary: 'var(--color-secondary)',
    success: 'var(--color-accent-green)',
    warning: 'var(--color-accent-orange)',
    danger: 'var(--color-accent-red)',
    background: 'var(--color-background)',
    surface: 'var(--color-surface)',
    text: {
      primary: 'var(--color-text-primary)',
      secondary: 'var(--color-text-secondary)',
      tertiary: 'var(--color-text-tertiary)',
    },
  },
  spacing: {
    xs: 'var(--space-1)',
    sm: 'var(--space-2)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)',
    xl: 'var(--space-8)',
    '2xl': 'var(--space-12)',
  },
  borderRadius: {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    full: 'var(--radius-full)',
  },
  shadows: {
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
    glow: 'var(--shadow-glow-primary)',
  },
  transitions: {
    fast: 'var(--transition-fast)',
    base: 'var(--transition-base)',
    slow: 'var(--transition-slow)',
    bounce: 'var(--transition-bounce)',
  },
} as const;

// Utility functions for theme-aware styling
export const getThemeValue = (token: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
};

export const setThemeValue = (token: string, value: string): void => {
  document.documentElement.style.setProperty(token, value);
};

// Hook for React components to use theme
export const useTheme = () => {
  // This would be implemented as a React hook in a real application
  // For now, we'll provide the basic functionality
  return {
    theme: defaultThemeConfig,
    setTheme: (config: Partial<ThemeConfig>) => {
      // Implementation would go here
    },
    toggleTheme: () => {
      // Implementation would go here
    },
  };
};

// Create and export a global theme manager instance
export const themeManager = new ThemeManager();
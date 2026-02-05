import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeManager, ThemeConfig, defaultThemeConfig } from '../../../config/theme';

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (config: Partial<ThemeConfig>) => void;
  toggleTheme: () => void;
  themeManager: ThemeManager;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: Partial<ThemeConfig>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = {},
}) => {
  const [themeManager] = useState(() => new ThemeManager(initialTheme));
  const [theme, setThemeState] = useState<ThemeConfig>(() => themeManager.getTheme());

  useEffect(() => {
    const handleThemeChange = (event: CustomEvent) => {
      setThemeState(event.detail.theme);
    };

    window.addEventListener('themechange', handleThemeChange as EventListener);
    
    return () => {
      window.removeEventListener('themechange', handleThemeChange as EventListener);
    };
  }, []);

  const setTheme = (newConfig: Partial<ThemeConfig>) => {
    themeManager.setTheme(newConfig);
  };

  const toggleTheme = () => {
    themeManager.toggleTheme();
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    themeManager,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
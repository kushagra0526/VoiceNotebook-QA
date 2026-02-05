// Style utilities for consistent theming and responsive design

import { designTokens } from '../config/design-tokens';

// Type definitions for style utilities
export type SpacingValue = keyof typeof designTokens.spacing;
export type ColorValue = string;
export type BorderRadiusValue = keyof typeof designTokens.borderRadius;
export type ShadowValue = keyof typeof designTokens.boxShadow;

// Utility function to get CSS custom property value
export const getCSSVar = (property: string): string => {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
};

// Utility function to set CSS custom property
export const setCSSVar = (property: string, value: string): void => {
  if (typeof window === 'undefined') return;
  document.documentElement.style.setProperty(property, value);
};

// Spacing utilities
export const spacing = {
  get: (value: SpacingValue): string => designTokens.spacing[value],
  
  // Responsive spacing
  responsive: (sm: SpacingValue, md?: SpacingValue, lg?: SpacingValue) => ({
    padding: designTokens.spacing[sm],
    '@media (min-width: 768px)': md ? { padding: designTokens.spacing[md] } : {},
    '@media (min-width: 1024px)': lg ? { padding: designTokens.spacing[lg] } : {},
  }),
};

// Color utilities
export const colors = {
  // Get theme-aware color
  get: (colorVar: string): string => `var(${colorVar})`,
  
  // Generate color with opacity
  withOpacity: (color: string, opacity: number): string => {
    // If it's a CSS custom property, we can't easily add opacity
    // In a real app, you might want to use a color manipulation library
    return color.startsWith('var(') ? color : `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  },
  
  // Primary color variants
  primary: {
    50: designTokens.colors.primary[50],
    100: designTokens.colors.primary[100],
    200: designTokens.colors.primary[200],
    300: designTokens.colors.primary[300],
    400: designTokens.colors.primary[400],
    500: designTokens.colors.primary[500],
    600: designTokens.colors.primary[600],
    700: designTokens.colors.primary[700],
    800: designTokens.colors.primary[800],
    900: designTokens.colors.primary[900],
  },
};

// Typography utilities
export const typography = {
  // Font size with line height
  size: (size: keyof typeof designTokens.fontSize) => {
    const [fontSize, lineHeight] = designTokens.fontSize[size];
    return {
      fontSize,
      lineHeight,
    };
  },
  
  // Font weight
  weight: (weight: keyof typeof designTokens.fontWeight) => ({
    fontWeight: designTokens.fontWeight[weight],
  }),
  
  // Text gradient
  gradient: (gradient: keyof typeof designTokens.gradients) => ({
    background: designTokens.gradients[gradient],
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  }),
};

// Layout utilities
export const layout = {
  // Flexbox utilities
  flex: {
    center: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    between: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    
    column: {
      display: 'flex',
      flexDirection: 'column' as const,
    },
    
    columnCenter: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
    },
  },
  
  // Grid utilities
  grid: {
    responsive: (cols: number, gap: SpacingValue = '4') => ({
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: designTokens.spacing[gap],
      
      '@media (max-width: 768px)': {
        gridTemplateColumns: 'repeat(1, 1fr)',
      },
      
      '@media (min-width: 768px) and (max-width: 1024px)': {
        gridTemplateColumns: `repeat(${Math.min(cols, 2)}, 1fr)`,
      },
    }),
  },
  
  // Container utilities
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: `0 ${designTokens.spacing[4]}`,
    
    '@media (min-width: 768px)': {
      padding: `0 ${designTokens.spacing[6]}`,
    },
    
    '@media (min-width: 1024px)': {
      padding: `0 ${designTokens.spacing[8]}`,
    },
  },
};

// Animation utilities
export const animations = {
  // Transition presets
  transition: {
    fast: `all ${designTokens.animation.duration[150]} ${designTokens.animation.easing['in-out']}`,
    base: `all ${designTokens.animation.duration[200]} ${designTokens.animation.easing['in-out']}`,
    slow: `all ${designTokens.animation.duration[300]} ${designTokens.animation.easing['in-out']}`,
    bounce: `all ${designTokens.animation.duration[300]} ${designTokens.animation.easing.bounce}`,
  },
  
  // Hover effects
  hover: {
    lift: {
      transition: animations.transition.base,
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: designTokens.boxShadow['glow-primary'],
      },
    },
    
    scale: {
      transition: animations.transition.base,
      '&:hover': {
        transform: 'scale(1.05)',
      },
    },
    
    glow: {
      transition: animations.transition.base,
      '&:hover': {
        boxShadow: designTokens.boxShadow['glow-primary'],
      },
    },
  },
  
  // Entrance animations
  entrance: {
    fadeIn: {
      animation: `fadeIn ${designTokens.animation.duration[300]} ${designTokens.animation.easing.out}`,
    },
    
    slideUp: {
      animation: `slideInUp ${designTokens.animation.duration[300]} ${designTokens.animation.easing.out}`,
    },
    
    scaleIn: {
      animation: `scaleIn ${designTokens.animation.duration[300]} ${designTokens.animation.easing.bounce}`,
    },
  },
};

// Component style generators
export const components = {
  // Button styles
  button: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: designTokens.borderRadius.lg,
      fontWeight: designTokens.fontWeight.medium,
      transition: animations.transition.base,
      cursor: 'pointer',
      border: 'none',
      outline: 'none',
      
      '&:focus-visible': {
        outline: '2px solid var(--color-primary)',
        outlineOffset: '2px',
      },
      
      '&:disabled': {
        opacity: 0.6,
        cursor: 'not-allowed',
      },
    },
    
    sizes: {
      sm: {
        height: designTokens.components.button.height.sm,
        padding: designTokens.components.button.padding.sm,
        fontSize: designTokens.fontSize.sm[0],
      },
      md: {
        height: designTokens.components.button.height.md,
        padding: designTokens.components.button.padding.md,
        fontSize: designTokens.fontSize.base[0],
      },
      lg: {
        height: designTokens.components.button.height.lg,
        padding: designTokens.components.button.padding.lg,
        fontSize: designTokens.fontSize.lg[0],
      },
    },
    
    variants: {
      primary: {
        background: designTokens.gradients.primary,
        color: 'var(--color-text-inverse)',
        
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: designTokens.boxShadow['glow-primary'],
        },
      },
      
      secondary: {
        background: 'var(--color-surface)',
        color: 'var(--color-text-primary)',
        border: '1px solid var(--color-border)',
        
        '&:hover': {
          background: 'var(--color-surface-hover)',
          borderColor: 'var(--color-primary)',
        },
      },
      
      ghost: {
        background: 'transparent',
        color: 'var(--color-text-primary)',
        
        '&:hover': {
          background: 'var(--color-surface-hover)',
        },
      },
    },
  },
  
  // Card styles
  card: {
    base: {
      background: 'var(--color-surface)',
      borderRadius: designTokens.borderRadius.xl,
      border: '1px solid var(--color-border)',
      transition: animations.transition.base,
    },
    
    interactive: {
      cursor: 'pointer',
      
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: designTokens.boxShadow.lg,
        borderColor: 'var(--color-primary)',
      },
    },
    
    glass: {
      background: 'var(--glass-background)',
      backdropFilter: 'var(--glass-backdrop-filter)',
      border: '1px solid var(--glass-border)',
    },
  },
  
  // Input styles
  input: {
    base: {
      width: '100%',
      borderRadius: designTokens.borderRadius.lg,
      border: '1px solid var(--color-border)',
      background: 'var(--color-surface)',
      color: 'var(--color-text-primary)',
      transition: animations.transition.base,
      
      '&:focus': {
        outline: 'none',
        borderColor: 'var(--color-primary)',
        boxShadow: '0 0 0 3px rgba(0, 102, 255, 0.1)',
      },
      
      '&::placeholder': {
        color: 'var(--color-text-tertiary)',
      },
    },
    
    sizes: {
      sm: {
        height: designTokens.components.input.height.sm,
        padding: designTokens.components.input.padding.sm,
        fontSize: designTokens.fontSize.sm[0],
      },
      md: {
        height: designTokens.components.input.height.md,
        padding: designTokens.components.input.padding.md,
        fontSize: designTokens.fontSize.base[0],
      },
      lg: {
        height: designTokens.components.input.height.lg,
        padding: designTokens.components.input.padding.lg,
        fontSize: designTokens.fontSize.lg[0],
      },
    },
  },
};

// Responsive design utilities
export const responsive = {
  // Breakpoint utilities
  breakpoints: designTokens.breakpoints,
  
  // Media query helpers
  media: {
    sm: `@media (min-width: ${designTokens.breakpoints.sm})`,
    md: `@media (min-width: ${designTokens.breakpoints.md})`,
    lg: `@media (min-width: ${designTokens.breakpoints.lg})`,
    xl: `@media (min-width: ${designTokens.breakpoints.xl})`,
    '2xl': `@media (min-width: ${designTokens.breakpoints['2xl']})`,
  },
  
  // Responsive value helper
  value: <T>(sm: T, md?: T, lg?: T, xl?: T) => ({
    [sm as any]: sm,
    ...(md && { [responsive.media.md]: md }),
    ...(lg && { [responsive.media.lg]: lg }),
    ...(xl && { [responsive.media.xl]: xl }),
  }),
};

// Export all utilities
export const styleUtils = {
  spacing,
  colors,
  typography,
  layout,
  animations,
  components,
  responsive,
  getCSSVar,
  setCSSVar,
};

export default styleUtils;
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSystemPreference, setIsSystemPreference] = useState(true);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const storedTheme = localStorage.getItem('zomato-ops-theme');
    const storedPreference = localStorage.getItem('zomato-ops-system-preference');
    
    if (storedTheme) {
      setIsDarkMode(storedTheme === 'dark');
      setIsSystemPreference(storedPreference === 'true');
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      setIsSystemPreference(true);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (isDarkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    
    // Store in localStorage if not using system preference
    if (!isSystemPreference) {
      localStorage.setItem('zomato-ops-theme', isDarkMode ? 'dark' : 'light');
    }
    localStorage.setItem('zomato-ops-system-preference', isSystemPreference.toString());
  }, [isDarkMode, isSystemPreference]);

  // Listen for system theme changes
  useEffect(() => {
    if (isSystemPreference) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e) => {
        setIsDarkMode(e.matches);
      };
      
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [isSystemPreference]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    setIsSystemPreference(false);
  };

  const setTheme = (theme) => {
    setIsDarkMode(theme === 'dark');
    setIsSystemPreference(false);
  };

  const useSystemPreference = () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    setIsSystemPreference(true);
    localStorage.removeItem('zomato-ops-theme');
  };

  const getThemeColors = () => {
    return {
      primary: isDarkMode ? {
        50: '#1e1b4b',
        100: '#312e81', 
        200: '#3730a3',
        300: '#4338ca',
        400: '#4f46e5',
        500: '#6366f1',
        600: '#7c3aed',
        700: '#8b5cf6',
        800: '#a78bfa',
        900: '#c4b5fd',
      } : {
        50: '#eff6ff',
        100: '#dbeafe', 
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
      },
      background: isDarkMode ? '#0f172a' : '#ffffff',
      surface: isDarkMode ? '#1e293b' : '#f8fafc',
      card: isDarkMode ? '#334155' : '#ffffff',
      text: {
        primary: isDarkMode ? '#f1f5f9' : '#0f172a',
        secondary: isDarkMode ? '#cbd5e1' : '#475569',
        muted: isDarkMode ? '#94a3b8' : '#64748b'
      },
      border: isDarkMode ? '#475569' : '#e2e8f0'
    };
  };

  const value = {
    isDarkMode,
    isSystemPreference,
    toggleTheme,
    setTheme,
    useSystemPreference,
    getThemeColors,
    theme: isDarkMode ? 'dark' : 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 
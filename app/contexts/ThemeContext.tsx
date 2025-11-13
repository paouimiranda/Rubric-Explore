// contexts/ThemeContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

interface Theme {
  mode: ThemeMode;
  colors: {
    // Background colors
    background: string;
    backgroundSecondary: string;
    surface: string;
    surfaceSecondary: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textTertiary: string;
    
    // UI elements
    border: string;
    borderLight: string;
    placeholder: string;
    
    // Interactive elements
    primary: string;
    primaryLight: string;
    
    // Status colors
    success: string;
    error: string;
    warning: string;
    info: string;
    
    // Specific UI elements
    toolbarBackground: string;
    modalOverlay: string;
    activeButton: string;
    activeText: string;
    
    // Editor specific
    editorBackground: string;
    editorText: string;
    editorPlaceholder: string;
  };
}

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#ffffff',
    backgroundSecondary: '#f8fafc',
    surface: '#ffffff',
    surfaceSecondary: '#f1f5f9',
    
    text: '#1e293b',
    textSecondary: '#64748b',
    textTertiary: '#94a3b8',
    
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    placeholder: '#94a3b8',
    
    primary: '#3b82f6',
    primaryLight: '#dbeafe',
    
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    
    toolbarBackground: '#f8fafc',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    activeButton: '#dbeafe',
    activeText: '#3b82f6',
    
    editorBackground: '#ffffff',
    editorText: '#1e293b',
    editorPlaceholder: '#94a3b8',
  }
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#324762',
    backgroundSecondary: '#0A1C3C',
    surface: '#1f2937',
    surfaceSecondary: '#374151',
    
    text: '#ffffff',
    textSecondary: '#9ca3af',
    textTertiary: '#6b7280',
    
    border: 'rgba(255, 255, 255, 0.05)',
    borderLight: 'rgba(255, 255, 255, 0.1)',
    placeholder: '#6b7280',
    
    primary: '#60a5fa',
    primaryLight: 'rgba(96, 165, 250, 0.2)',
    
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#60a5fa',
    
    toolbarBackground: 'rgba(30, 41, 59, 0.98)',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    activeButton: 'rgba(96, 165, 250, 0.3)',
    activeText: '#60a5fa',
    
    editorBackground: 'transparent',
    editorText: '#ffffff',
    editorPlaceholder: '#9ca3af',
  }
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme_mode';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeMode(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const saveThemePreference = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
    saveThemePreference(newMode);
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    saveThemePreference(mode);
  };

  const theme = themeMode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
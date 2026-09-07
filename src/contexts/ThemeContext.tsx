import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SunaoLightColors, SynkonDarkColors } from '../constants/theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: typeof SunaoLightColors;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const getInitialTheme = (): ThemeMode => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem('@sunao_theme_mode');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    } catch (e) {}
  }
  return 'light';
};

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  isDark: false,
  colors: SunaoLightColors,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getInitialTheme);

  // Sync with AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem('@sunao_theme_mode').then((val) => {
      if (val === 'dark' || val === 'light') {
        setThemeModeState(val);
      }
    });
  }, []);

  // Update HTML body style on web for seamless background
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.body.style.backgroundColor = themeMode === 'dark' ? '#000000' : '#F8FAFC';
    }
  }, [themeMode]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('@sunao_theme_mode', mode);
      } catch (e) {}
    }
    AsyncStorage.setItem('@sunao_theme_mode', mode).catch(() => {});
  };

  const toggleTheme = () => {
    const next: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
  };

  const isDark = themeMode === 'dark';
  const colors = isDark ? (SynkonDarkColors as typeof SunaoLightColors) : SunaoLightColors;

  return (
    <ThemeContext.Provider value={{ themeMode, isDark, colors, setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

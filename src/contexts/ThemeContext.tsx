import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const THEME_STORAGE_KEY = '@mesbg_dark_mode';

export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceRaised: string;
    headerBg: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    inputBg: string;
    progressBarBg: string;
    filterChipBg: string;
    placeholder: string;
  };
}

const lightColors: Theme['colors'] = {
  background: '#ecf0f1',
  surface: '#ffffff',
  surfaceRaised: '#ffffff',
  headerBg: '#2c3e50',
  text: '#2c3e50',
  textSecondary: '#34495e',
  textMuted: '#7f8c8d',
  border: '#ddd',
  inputBg: '#ffffff',
  progressBarBg: '#ecf0f1',
  filterChipBg: '#ecf0f1',
  placeholder: '#bdc3c7',
};

const darkColors: Theme['colors'] = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceRaised: '#252525',
  headerBg: '#0d0d0d',
  text: '#ecf0f1',
  textSecondary: '#bdc3c7',
  textMuted: '#95a5a6',
  border: '#2c2c2c',
  inputBg: '#2a2a2a',
  progressBarBg: '#2c2c2c',
  filterChipBg: '#2a2a2a',
  placeholder: '#555',
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: { dark: false, colors: lightColors },
  toggleTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then(value => {
      if (value === 'true') setDark(true);
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const theme: Theme = {
    dark,
    colors: dark ? darkColors : lightColors
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

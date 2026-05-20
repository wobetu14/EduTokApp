import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, HIGH_CONTRAST_COLORS, FONT_SCALE_MAP, STORAGE_KEYS } from '../utils/constants';

const AccessibilityContext = createContext(null);

export const AccessibilityProvider = ({ children }) => {
  const [fontScale, setFontScaleState] = useState('md');
  const [highContrast, setHighContrastState] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.a11y).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (saved.fontScale) setFontScaleState(saved.fontScale);
          if (saved.highContrast != null) setHighContrastState(saved.highContrast);
        } catch (_) {}
      }
    });
  }, []);

  const persist = useCallback((fontScaleVal, highContrastVal) => {
    AsyncStorage.setItem(STORAGE_KEYS.a11y, JSON.stringify({ fontScale: fontScaleVal, highContrast: highContrastVal }));
  }, []);

  const setFontScale = useCallback((val) => {
    setFontScaleState(val);
    persist(val, highContrast);
  }, [highContrast, persist]);

  const setHighContrast = useCallback((val) => {
    setHighContrastState(val);
    persist(fontScale, val);
  }, [fontScale, persist]);

  return (
    <AccessibilityContext.Provider value={{ fontScale, highContrast, setFontScale, setHighContrast }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useA11y = () => {
  const ctx = useContext(AccessibilityContext);
  const C = ctx?.highContrast ? HIGH_CONTRAST_COLORS : COLORS;
  const fs = (size) => Math.round(size * FONT_SCALE_MAP[ctx?.fontScale || 'md']);
  return { C, fs, fontScale: ctx?.fontScale || 'md', highContrast: ctx?.highContrast || false, setFontScale: ctx?.setFontScale, setHighContrast: ctx?.setHighContrast };
};

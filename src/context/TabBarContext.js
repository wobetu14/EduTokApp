import React, { createContext, useContext, useRef, useCallback } from 'react';
import { Animated } from 'react-native';

const TabBarContext = createContext(null);

export const TabBarProvider = ({ children }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const isHidden = useRef(false);

  const hideTabBar = useCallback(() => {
    if (isHidden.current) return;
    isHidden.current = true;
    Animated.spring(translateY, {
      toValue: 100,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  }, [translateY]);

  const showTabBar = useCallback(() => {
    if (!isHidden.current) return;
    isHidden.current = false;
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  }, [translateY]);

  return (
    <TabBarContext.Provider value={{ translateY, hideTabBar, showTabBar }}>
      {children}
    </TabBarContext.Provider>
  );
};

export const useTabBar = () => useContext(TabBarContext);

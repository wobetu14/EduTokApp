import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as storage from '../services/storageService';
import * as api from '../services/apiService';
import { clearTokens, setSessionExpiredHandler } from '../services/httpClient';
import { setLanguage } from '../utils/i18n';
import { scheduleDailyReminder, getPermissionStatus } from '../services/notificationService';

const AuthContext = createContext(null);

const initialState = {
  user: null,
  isLoading: true,
  isSignedIn: false,
  hasOnboarded: false,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'RESTORE':
      return {
        ...state,
        user: action.user,
        isSignedIn: !!action.user,
        hasOnboarded: action.hasOnboarded,
        isLoading: false,
      };
    case 'SIGN_IN':
      return { ...state, user: action.user, isSignedIn: true };
    case 'SIGN_OUT':
      return { ...state, user: null, isSignedIn: false, hasOnboarded: false };
    case 'SET_ONBOARDED':
      return { ...state, hasOnboarded: true };
    case 'UPDATE_USER':
      return { ...state, user: action.user };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // Wire session-expired callback so httpClient can trigger sign-out on token failure
    setSessionExpiredHandler(() => dispatch({ type: 'SIGN_OUT' }));

    const restore = async () => {
      try {
        const token = await AsyncStorage.getItem('@edutok_access_token');
        const hasOnboarded = await storage.getHasOnboarded();
        if (!token) {
          dispatch({ type: 'RESTORE', user: null, hasOnboarded });
          return;
        }
        // Token exists — validate and fetch fresh user data
        const user = await api.fetchCurrentUser();
        if (user?.language) setLanguage(user.language);
        dispatch({ type: 'RESTORE', user, hasOnboarded });
      } catch {
        await clearTokens();
        dispatch({ type: 'RESTORE', user: null, hasOnboarded: false });
      }
    };
    restore();
  }, []);

  const signIn = useCallback(async (username, password) => {
    const user = await api.signIn(username, password);
    if (user?.language) setLanguage(user.language);
    dispatch({ type: 'SIGN_IN', user });
    if (user?.notificationsEnabled !== false) {
      const status = await getPermissionStatus();
      if (status === 'granted') scheduleDailyReminder();
    }
    return user;
  }, []);

  const signUp = useCallback(async (data) => {
    const user = await api.signUp(data);
    dispatch({ type: 'SIGN_IN', user });
    return user;
  }, []);

  const signOut = useCallback(async () => {
    await api.signOut();
    await storage.clearAllUserData();
    dispatch({ type: 'SIGN_OUT' });
  }, []);

  const completeOnboarding = useCallback(async (preferences) => {
    const updated = await api.updateUser({ preferences });
    await storage.setHasOnboarded(true);
    dispatch({ type: 'UPDATE_USER', user: updated });
    dispatch({ type: 'SET_ONBOARDED' });
  }, []);

  const updateUser = useCallback(async (updates) => {
    const updated = await api.updateUser(updates);
    if (updates.language) setLanguage(updates.language);
    dispatch({ type: 'UPDATE_USER', user: updated });
    return updated;
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signUp, signOut, completeOnboarding, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

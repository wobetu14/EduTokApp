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
      return {
        ...state,
        user: action.user,
        isSignedIn: true,
        // Server is the source of truth — returning users skip onboarding
        hasOnboarded: !!action.user?.onboardingCompleted,
      };
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
      const token = await AsyncStorage.getItem('@edutok_access_token').catch(() => null);
      const hasOnboarded = await storage.getHasOnboarded().catch(() => false);
      if (!token) {
        dispatch({ type: 'RESTORE', user: null, hasOnboarded });
        return;
      }
      try {
        // Token exists — validate and fetch fresh user data
        const user = await api.fetchCurrentUser();
        if (user?.language) setLanguage(user.language);
        // Server flag is authoritative; the local flag is an offline fallback
        const onboarded = hasOnboarded || !!user?.onboardingCompleted;
        if (onboarded && !hasOnboarded) await storage.setHasOnboarded(true);
        // Cache the profile so an offline launch can restore the session
        await storage.saveUser(user);
        dispatch({ type: 'RESTORE', user, hasOnboarded: onboarded });
      } catch (e) {
        // Network/server trouble is NOT a reason to log the user out — fall
        // back to the cached profile and stay signed in. Only genuine auth
        // failures (revoked/expired session, non-learner) end the session.
        const isTransient = e?.status === 0 || e?.status >= 500;
        const cached = isTransient ? await storage.getUser().catch(() => null) : null;
        if (cached) {
          if (cached.language) setLanguage(cached.language);
          dispatch({
            type: 'RESTORE',
            user: cached,
            hasOnboarded: hasOnboarded || !!cached.onboardingCompleted,
          });
          return;
        }
        // Keep tokens on transient failures so the next launch can retry;
        // clear them only for real auth failures
        if (!isTransient) {
          await clearTokens();
          await storage.clearUser().catch(() => {});
        }
        dispatch({ type: 'RESTORE', user: null, hasOnboarded: isTransient ? hasOnboarded : false });
      }
    };
    restore();
  }, []);

  const signIn = useCallback(async (username, password) => {
    const user = await api.signIn(username, password);
    if (user?.language) setLanguage(user.language);
    if (user?.onboardingCompleted) await storage.setHasOnboarded(true);
    await storage.saveUser(user);
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
    const updated = await api.updatePreferences({ preferences, onboardingCompleted: true });
    await storage.setHasOnboarded(true);
    await storage.saveUser(updated);
    dispatch({ type: 'UPDATE_USER', user: updated });
    dispatch({ type: 'SET_ONBOARDED' });
  }, []);

  const updateUser = useCallback(async (updates) => {
    const updated = await api.updateUser(updates);
    if (updates.language) setLanguage(updates.language);
    await storage.saveUser(updated);
    dispatch({ type: 'UPDATE_USER', user: updated });
    return updated;
  }, []);

  // Server revokes all sessions on success; the caller signs the user out so
  // they re-authenticate with the new password.
  const changePassword = useCallback(
    (currentPassword, newPassword) => api.changePassword(currentPassword, newPassword),
    []
  );

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signUp, signOut, completeOnboarding, updateUser, changePassword }}
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

import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import * as storage from '../services/storageService';
import * as api from '../services/apiService';
import { setLanguage } from '../utils/i18n';

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
    const restore = async () => {
      try {
        await storage.seedDataIfNeeded();
        const user = await storage.getUser();
        const hasOnboarded = await storage.getHasOnboarded();
        if (user?.language) setLanguage(user.language);
        dispatch({ type: 'RESTORE', user, hasOnboarded });
      } catch {
        dispatch({ type: 'RESTORE', user: null, hasOnboarded: false });
      }
    };
    restore();
  }, []);

  const signIn = useCallback(async (username, password) => {
    const user = await api.signIn(username, password);
    if (user?.language) setLanguage(user.language);
    dispatch({ type: 'SIGN_IN', user });
    return user;
  }, []);

  const signUp = useCallback(async (data) => {
    const user = await api.signUp(data);
    dispatch({ type: 'SIGN_IN', user });
    return user;
  }, []);

  const signOut = useCallback(async () => {
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

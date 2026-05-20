import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CourseProvider } from './src/context/CourseContext';
import { ToastProvider } from './src/context/ToastContext';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
import TabNavigator from './src/navigation/TabNavigator';
import AuthScreen from './src/screens/AuthScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { COLORS } from './src/utils/constants';

const darkTheme = {
  dark: true,
  colors: {
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.text,
    border: COLORS.border,
    notification: COLORS.primary,
  },
};

const AppInner = () => {
  const { isLoading, isSignedIn, hasOnboarded } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!isSignedIn) return <AuthScreen />;
  if (!hasOnboarded) return <OnboardingScreen />;

  return (
    <CourseProvider>
      <NavigationContainer theme={darkTheme}>
        <ToastProvider>
          <TabNavigator />
        </ToastProvider>
      </NavigationContainer>
    </CourseProvider>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AccessibilityProvider>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </AccessibilityProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

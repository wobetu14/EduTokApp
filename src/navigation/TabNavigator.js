import React from 'react';
import { View, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../utils/constants';
import { useTabBar } from '../context/TabBarContext';
import { useTranslation } from '../utils/useTranslation';
import AppText from '../components/AppText';
import {
  ForYouStack,
  ExploreStack,
  SearchStack,
  ProfileStack,
} from './StackNavigators';

const Tab = createBottomTabNavigator();

const TAB_ITEMS = [
  { name: 'ForYou',  labelKey: 'home',    icon: 'home',    iconOut: 'home-outline'    },
  { name: 'Explore', labelKey: 'explore', icon: 'compass', iconOut: 'compass-outline' },
  { name: 'Search',  labelKey: 'search',  icon: 'search',  iconOut: 'search-outline'  },
  { name: 'Profile', labelKey: 'profile', icon: 'person',  iconOut: 'person-outline'  },
];

const TabBar = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();
  const { translateY, showTabBar } = useTabBar();
  const { t } = useTranslation();

  return (
    <Animated.View style={[styles.tabBar, { paddingBottom: insets.bottom + 6, transform: [{ translateY }] }]}>
      {TAB_ITEMS.map((item, index) => {
        const focused = state.index === index;
        const route = state.routes[index];

        const onPress = () => {
          showTabBar();
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(item.name);
        };

        return (
          <TouchableOpacity key={item.name} style={styles.tabItem} onPress={onPress} activeOpacity={0.75}>
            <View style={[styles.pill, focused && styles.pillActive]}>
              <Ionicons
                name={focused ? item.icon : item.iconOut}
                size={22}
                color={focused ? COLORS.primary : COLORS.textMuted}
              />
            </View>
            <AppText
              numberOfLines={1}
              style={[styles.tabLabel, focused && styles.tabLabelActive]}
            >
              {t(item.labelKey)}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
};

const TabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <TabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="ForYou"   component={ForYouStack}   />
    <Tab.Screen name="Explore"  component={ExploreStack}  />
    <Tab.Screen name="Search"   component={SearchStack}   />
    <Tab.Screen name="Profile"  component={ProfileStack}  />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: 48,
    height: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: COLORS.primary + '1E',
    // Slightly-rounded square (vs. the softer base pill) so the active tab
    // reads as a distinct, gently-cornered badge.
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.primary + '55',
  },
  tabLabel: {
    marginTop: 2,
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});

export default TabNavigator;

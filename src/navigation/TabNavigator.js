import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';
import {
  ForYouStack,
  ExploreStack,
  SearchStack,
  ProfileStack,
} from './StackNavigators';

const Tab = createBottomTabNavigator();

const TabBar = ({ state, descriptors, navigation }) => (
  <View style={styles.tabBar}>
    {state.routes.map((route, index) => {
      const { options } = descriptors[route.key];
      const focused = state.index === index;
      const onPress = () => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!focused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      };

      const iconMap = {
        ForYou: focused ? 'home' : 'home-outline',
        Explore: focused ? 'compass' : 'compass-outline',
        Search: focused ? 'search' : 'search-outline',
        Profile: focused ? 'person' : 'person-outline',
      };
      const labelMap = {
        ForYou: 'For You',
        Explore: 'Explore',
        Search: 'Search',
        Profile: 'Profile',
      };

      return (
        <View key={route.key} style={styles.tabItem}>
          <View style={[styles.tabBtn, focused && styles.tabBtnActive]}>
            <Ionicons
              name={iconMap[route.name]}
              size={24}
              color={focused ? COLORS.primary : COLORS.textMuted}
              onPress={onPress}
            />
          </View>
        </View>
      );
    })}
  </View>
);

const TabNavigator = () => (
  <Tab.Navigator
    tabBar={(props) => <TabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="ForYou" component={ForYouStack} />
    <Tab.Screen name="Explore" component={ExploreStack} />
    <Tab.Screen name="Search" component={SearchStack} />
    <Tab.Screen name="Profile" component={ProfileStack} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 84 : 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtn: {
    width: 48,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary + '22',
  },
});

export default TabNavigator;

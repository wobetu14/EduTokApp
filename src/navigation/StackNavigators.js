import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ForYouScreen from '../screens/ForYouScreen';
import ExploreScreen from '../screens/ExploreScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CourseProfileScreen from '../screens/CourseProfileScreen';
import OrganizationProfileScreen from '../screens/OrganizationProfileScreen';
import LessonPlaybackScreen from '../screens/LessonPlaybackScreen';

const Stack = createNativeStackNavigator();

const baseOptions = {
  headerShown: false,
  animation: 'slide_from_right',
};

const playbackOptions = {
  headerShown: false,
  animation: 'slide_from_bottom',
  gestureEnabled: false,
};

export const ForYouStack = () => (
  <Stack.Navigator screenOptions={baseOptions}>
    <Stack.Screen name="ForYouHome" component={ForYouScreen} />
    <Stack.Screen name="CourseProfile" component={CourseProfileScreen} />
    <Stack.Screen name="OrganizationProfile" component={OrganizationProfileScreen} />
    <Stack.Screen name="LessonPlayback" component={LessonPlaybackScreen} options={playbackOptions} />
  </Stack.Navigator>
);

export const ExploreStack = () => (
  <Stack.Navigator screenOptions={baseOptions}>
    <Stack.Screen name="ExploreHome" component={ExploreScreen} />
    <Stack.Screen name="CourseProfile" component={CourseProfileScreen} />
    <Stack.Screen name="OrganizationProfile" component={OrganizationProfileScreen} />
    <Stack.Screen name="LessonPlayback" component={LessonPlaybackScreen} options={playbackOptions} />
  </Stack.Navigator>
);

export const SearchStack = () => (
  <Stack.Navigator screenOptions={baseOptions}>
    <Stack.Screen name="SearchHome" component={SearchScreen} />
    <Stack.Screen name="CourseProfile" component={CourseProfileScreen} />
    <Stack.Screen name="OrganizationProfile" component={OrganizationProfileScreen} />
    <Stack.Screen name="LessonPlayback" component={LessonPlaybackScreen} options={playbackOptions} />
  </Stack.Navigator>
);

export const ProfileStack = () => (
  <Stack.Navigator screenOptions={baseOptions}>
    <Stack.Screen name="ProfileHome" component={ProfileScreen} />
    <Stack.Screen name="CourseProfile" component={CourseProfileScreen} />
    <Stack.Screen name="OrganizationProfile" component={OrganizationProfileScreen} />
    <Stack.Screen name="LessonPlayback" component={LessonPlaybackScreen} options={playbackOptions} />
  </Stack.Navigator>
);

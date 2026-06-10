import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const isNative = Platform.OS !== 'web';
// expo-notifications push support was removed from Expo Go in SDK 53.
// executionEnvironment === 'storeClient' is the reliable cross-platform Expo Go check.
const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  Constants.appOwnership === 'expo';
const notifEnabled = isNative && !isExpoGo;

if (notifEnabled) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export const requestPermissions = async () => {
  if (!notifEnabled) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const getPermissionStatus = async () => {
  if (!notifEnabled) return 'undetermined';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
};

export const scheduleLessonCompleteNotification = async (lessonTitle) => {
  if (!notifEnabled) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Lesson Complete! 🎉',
        body: `You finished "${lessonTitle}". Keep it up!`,
        sound: true,
      },
      trigger: { seconds: 1 },
    });
  } catch (_) {}
};

export const scheduleEnrollmentNotification = async (courseTitle) => {
  if (!notifEnabled) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Enrolled! 🎓',
        body: `You're now enrolled in "${courseTitle}". Start learning!`,
        sound: true,
      },
      trigger: { seconds: 1 },
    });
  } catch (_) {}
};

export const scheduleQuizPassNotification = async (score) => {
  if (!notifEnabled) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Quiz Passed! 🏆',
        body: `You scored ${score}%! You're on a roll — keep learning!`,
        sound: true,
      },
      trigger: { seconds: 1 },
    });
  } catch (_) {}
};

const DAILY_REMINDER_ID = 'edutok_daily_reminder';

export const scheduleDailyReminder = async () => {
  if (!notifEnabled) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: {
        title: 'Time to learn! 📚',
        body: "Keep your streak going — complete a lesson today!",
      },
      trigger: {
        hour: 19,
        minute: 0,
        repeats: true,
      },
    });
  } catch (_) {}
};

export const cancelDailyReminder = async () => {
  if (!notifEnabled) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch (_) {}
};

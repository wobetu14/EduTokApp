import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const isNative = Platform.OS !== 'web';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const requestPermissions = async () => {
  if (!isNative) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

export const getPermissionStatus = async () => {
  if (!isNative) return 'undetermined';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
};

export const scheduleLessonCompleteNotification = async (lessonTitle) => {
  if (!isNative) return;
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
  if (!isNative) return;
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
  if (!isNative) return;
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
  if (!isNative) return;
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
  if (!isNative) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch (_) {}
};

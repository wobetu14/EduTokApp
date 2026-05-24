import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import {
  ORGANIZATIONS,
  INSTRUCTORS,
  COURSES,
  LESSONS,
  DEFAULT_USER,
  DEFAULT_PROGRESS,
} from './mockData';

// --- Generic helpers ---
export const storeJSON = async (key, value) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const getJSON = async (key) => {
  const raw = await AsyncStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
};

export const removeKey = async (key) => {
  await AsyncStorage.removeItem(key);
};

const SEED_VERSION = '6'; // bump when mockData schema changes

// --- Seed initial data if not present or version changed ---
export const seedDataIfNeeded = async () => {
  const storedVersion = await AsyncStorage.getItem('seed_version');
  if (storedVersion !== SEED_VERSION) {
    await storeJSON(STORAGE_KEYS.organizations, ORGANIZATIONS);
    await storeJSON(STORAGE_KEYS.instructors, INSTRUCTORS);
    await storeJSON(STORAGE_KEYS.courses, COURSES);
    await storeJSON(STORAGE_KEYS.lessons, LESSONS);
    await AsyncStorage.setItem('seed_version', SEED_VERSION);
  }
};

// --- User ---
export const saveUser = (user) => storeJSON(STORAGE_KEYS.user, user);
export const getUser = () => getJSON(STORAGE_KEYS.user);
export const clearUser = () => removeKey(STORAGE_KEYS.user);

// --- Onboarding flag ---
export const setHasOnboarded = (val) =>
  AsyncStorage.setItem(STORAGE_KEYS.hasOnboarded, val ? '1' : '0');
export const getHasOnboarded = async () => {
  const v = await AsyncStorage.getItem(STORAGE_KEYS.hasOnboarded);
  return v === '1';
};

// --- Progress ---
export const saveProgress = (progress) =>
  storeJSON(STORAGE_KEYS.userProgress, progress);

export const getProgress = async () => {
  const p = await getJSON(STORAGE_KEYS.userProgress);
  return p ?? { ...DEFAULT_PROGRESS };
};

// --- Courses / Orgs / Lessons / Instructors ---
export const getInstructors = async () => {
  const data = await getJSON(STORAGE_KEYS.instructors);
  return data ?? INSTRUCTORS;
};

export const getCourses = async () => {
  const data = await getJSON(STORAGE_KEYS.courses);
  return data ?? COURSES;
};

export const getOrganizations = async () => {
  const data = await getJSON(STORAGE_KEYS.organizations);
  return data ?? ORGANIZATIONS;
};

export const getLessons = async () => {
  const data = await getJSON(STORAGE_KEYS.lessons);
  return data ?? LESSONS;
};

// --- Comments ---
export const getComments = async () => {
  const data = await getJSON(STORAGE_KEYS.comments);
  return data ?? {};
};

export const saveComments = (comments) =>
  storeJSON(STORAGE_KEYS.comments, comments);

export const addComment = async (lessonId, comment) => {
  const all = await getComments();
  const lessonComments = all[lessonId] ?? [];
  lessonComments.unshift(comment);
  all[lessonId] = lessonComments;
  await saveComments(all);
  return lessonComments;
};

export const addReply = async (lessonId, reply) => {
  const all = await getComments();
  const lessonComments = all[lessonId] ?? [];
  lessonComments.push(reply);
  all[lessonId] = lessonComments;
  await saveComments(all);
  return lessonComments;
};

export const getCommentsForLesson = async (lessonId) => {
  const all = await getComments();
  return all[lessonId] ?? [];
};

// --- Badges ---
export const getBadges = async () => {
  const data = await getJSON(STORAGE_KEYS.badges);
  return data ?? [];
};

export const saveBadges = (badges) => storeJSON(STORAGE_KEYS.badges, badges);

// --- Clear everything (sign out) ---
export const clearAllUserData = async () => {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.user,
    STORAGE_KEYS.userProgress,
    STORAGE_KEYS.hasOnboarded,
    STORAGE_KEYS.comments,
    STORAGE_KEYS.badges,
  ]);
};

// apiService.js — stub layer over storageService.
// Swap these implementations with real HTTP calls when a backend is ready.

import * as storage from './storageService';
import { generateId, isValidUsername, isValidPhone } from '../utils/helpers';

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

// --- Auth ---
export const signIn = async (username, password) => {
  await delay();
  const user = await storage.getUser();
  if (!user) throw new Error('No account found. Please sign up.');
  if (user.username.toLowerCase() !== username.toLowerCase())
    throw new Error('Username not found.');
  if (user._password !== password) throw new Error('Incorrect password.');
  const { _password, ...safeUser } = user;
  return safeUser;
};

export const signUp = async ({ username, fullName, phone, password }) => {
  await delay();
  if (!isValidUsername(username)) throw new Error('Invalid username format.');
  if (!isValidPhone(phone)) throw new Error('Invalid phone number.');
  const newUser = {
    id: generateId(),
    username,
    fullName,
    phone,
    bio: '',
    avatar: `https://picsum.photos/seed/${username}/200/200`,
    preferences: [],
    phoneVerified: false,
    language: 'en',
    notificationsEnabled: true,
    createdAt: new Date().toISOString(),
    _password: password,
  };
  await storage.saveUser(newUser);
  const { _password, ...safeUser } = newUser;
  return safeUser;
};

export const updateUser = async (updates) => {
  await delay(200);
  const user = await storage.getUser();
  const updated = { ...user, ...updates };
  await storage.saveUser(updated);
  const { _password, ...safeUser } = updated;
  return safeUser;
};

// --- Content ---
export const fetchCourses = async () => {
  await delay(400);
  return storage.getCourses();
};

export const fetchOrganizations = async () => {
  await delay(300);
  return storage.getOrganizations();
};

export const fetchLessons = async () => {
  await delay(400);
  return storage.getLessons();
};

// --- Progress ---
export const fetchProgress = () => storage.getProgress();

export const enrollCourse = async (courseId) => {
  const p = await storage.getProgress();
  if (!p.enrolledCourses.includes(courseId)) {
    p.enrolledCourses.push(courseId);
    await storage.saveProgress(p);
  }
  return p;
};

export const completeLesson = async (lessonId, courseId, durationSeconds) => {
  const p = await storage.getProgress();
  const alreadyDone = p.completedLessons.some((cl) => cl.lessonId === lessonId);
  if (!alreadyDone) {
    p.completedLessons.push({
      lessonId,
      courseId,
      completedAt: new Date().toISOString(),
    });
    p.totalSeconds = (p.totalSeconds || 0) + durationSeconds;
    const today = new Date().toDateString();
    if (p.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      p.streak = p.lastActiveDate === yesterday ? (p.streak || 0) + 1 : 1;
      p.lastActiveDate = today;
    }
    await storage.saveProgress(p);
  }
  return p;
};

export const toggleLike = async (lessonId) => {
  const p = await storage.getProgress();
  const idx = p.likedLessons.indexOf(lessonId);
  if (idx === -1) p.likedLessons.push(lessonId);
  else p.likedLessons.splice(idx, 1);
  await storage.saveProgress(p);
  return p;
};

export const toggleFavorite = async (lessonId) => {
  const p = await storage.getProgress();
  const idx = p.favoritedLessons.indexOf(lessonId);
  if (idx === -1) p.favoritedLessons.push(lessonId);
  else p.favoritedLessons.splice(idx, 1);
  await storage.saveProgress(p);
  return p;
};

export const recordQuizPass = async (quizId, lessonId, score) => {
  const p = await storage.getProgress();
  const already = p.passedQuizzes.some((q) => q.quizId === quizId);
  if (!already) {
    p.passedQuizzes.push({
      quizId,
      lessonId,
      score,
      passedAt: new Date().toISOString(),
    });
    await storage.saveProgress(p);
  }
  return p;
};

// --- Comments ---
export const fetchComments = (lessonId) => storage.getCommentsForLesson(lessonId);

export const postComment = async (lessonId, userId, username, avatar, text) => {
  const comment = {
    id: generateId(),
    lessonId,
    userId,
    username,
    avatar,
    text,
    createdAt: new Date().toISOString(),
    likes: 0,
  };
  const updated = await storage.addComment(lessonId, comment);
  return updated;
};

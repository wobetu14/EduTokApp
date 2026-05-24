import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useRef,
} from 'react';
import * as api from '../services/apiService';
import { useAuth } from './AuthContext';
import { BADGE_DEFS } from '../utils/constants';

const CourseContext = createContext(null);

const initialState = {
  courses: [],
  organizations: [],
  instructors: [],
  lessons: [],
  progress: {
    enrolledCourses: [],
    completedLessons: [],
    likedLessons: [],
    favoritedLessons: [],
    passedQuizzes: [],
    streak: 0,
    lastActiveDate: null,
    totalSeconds: 0,
  },
  badges: [],
  streakMilestone: null,
  newBadges: [],
  isLoading: true,
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'LOADED':
      return {
        ...state,
        courses: action.courses,
        organizations: action.organizations,
        instructors: action.instructors,
        lessons: action.lessons,
        progress: action.progress,
        badges: action.badges || [],
        isLoading: false,
      };
    case 'SET_PROGRESS':
      return { ...state, progress: action.progress };
    case 'SET_BADGES':
      return { ...state, badges: action.badges };
    case 'SET_STREAK_MILESTONE':
      return { ...state, streakMilestone: action.value };
    case 'SET_NEW_BADGES':
      return { ...state, newBadges: action.badges };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
};

export const CourseProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isSignedIn } = useAuth();
  const coursesRef = useRef([]);

  useEffect(() => {
    coursesRef.current = state.courses;
  }, [state.courses]);

  useEffect(() => {
    if (!isSignedIn) {
      dispatch({ type: 'RESET' });
      return;
    }
    const load = async () => {
      const [courses, organizations, instructors, lessons, progress, badges] = await Promise.all([
        api.fetchCourses(),
        api.fetchOrganizations(),
        api.fetchInstructors(),
        api.fetchLessons(),
        api.fetchProgress(),
        api.fetchBadges(),
      ]);
      dispatch({ type: 'LOADED', courses, organizations, instructors, lessons, progress, badges });
    };
    load();
  }, [isSignedIn]);

  const checkAndAwardBadges = useCallback(async (progress) => {
    const courses = coursesRef.current;
    const earned = await api.fetchBadges();
    const earnedIds = new Set(earned.map((b) => b.id));
    const newOnes = BADGE_DEFS.filter(
      (def) => !earnedIds.has(def.id) && def.check(progress, courses)
    ).map((def) => ({ id: def.id, earnedAt: new Date().toISOString() }));
    if (newOnes.length > 0) {
      const updated = [...earned, ...newOnes];
      await api.saveBadges(updated);
      dispatch({ type: 'SET_BADGES', badges: updated });
      dispatch({ type: 'SET_NEW_BADGES', badges: newOnes });
    }
  }, []);

  const enroll = useCallback(async (courseId) => {
    const progress = await api.enrollCourse(courseId);
    dispatch({ type: 'SET_PROGRESS', progress });
  }, []);

  const completeLesson = useCallback(async (lessonId, courseId, durationSeconds) => {
    const prevStreak = state.progress.streak || 0;
    const progress = await api.completeLesson(lessonId, courseId, durationSeconds);
    dispatch({ type: 'SET_PROGRESS', progress });
    const newStreak = progress.streak || 0;
    if (newStreak > prevStreak && [3, 7, 14, 30].includes(newStreak)) {
      dispatch({ type: 'SET_STREAK_MILESTONE', value: newStreak });
    }
    checkAndAwardBadges(progress);
  }, [state.progress.streak, checkAndAwardBadges]);

  const toggleLike = useCallback(async (lessonId) => {
    const progress = await api.toggleLike(lessonId);
    dispatch({ type: 'SET_PROGRESS', progress });
  }, []);

  const toggleFavorite = useCallback(async (lessonId) => {
    const progress = await api.toggleFavorite(lessonId);
    dispatch({ type: 'SET_PROGRESS', progress });
  }, []);

  const recordQuizPass = useCallback(async (quizId, lessonId, score) => {
    const progress = await api.recordQuizPass(quizId, lessonId, score);
    dispatch({ type: 'SET_PROGRESS', progress });
    checkAndAwardBadges(progress);
  }, [checkAndAwardBadges]);

  const clearStreakMilestone = useCallback(() => {
    dispatch({ type: 'SET_STREAK_MILESTONE', value: null });
  }, []);

  const clearNewBadges = useCallback(() => {
    dispatch({ type: 'SET_NEW_BADGES', badges: [] });
  }, []);

  // Derived helpers
  const isEnrolled = useCallback(
    (courseId) => state.progress.enrolledCourses.includes(courseId),
    [state.progress.enrolledCourses]
  );

  const isLessonCompleted = useCallback(
    (lessonId) => state.progress.completedLessons.some((cl) => cl.lessonId === lessonId),
    [state.progress.completedLessons]
  );

  const isLiked = useCallback(
    (lessonId) => state.progress.likedLessons.includes(lessonId),
    [state.progress.likedLessons]
  );

  const isFavorited = useCallback(
    (lessonId) => state.progress.favoritedLessons.includes(lessonId),
    [state.progress.favoritedLessons]
  );

  const isQuizPassed = useCallback(
    (quizId) => state.progress.passedQuizzes.some((q) => q.quizId === quizId),
    [state.progress.passedQuizzes]
  );

  const getCourseProgress = useCallback(
    (courseId) => {
      const course = state.courses.find((c) => c.id === courseId);
      if (!course) return 0;
      const total = course.lessonIds.length;
      if (!total) return 0;
      const done = state.progress.completedLessons.filter((cl) =>
        course.lessonIds.includes(cl.lessonId)
      ).length;
      return Math.round((done / total) * 100);
    },
    [state.courses, state.progress.completedLessons]
  );

  const getLessonsForCourse = useCallback(
    (courseId) => {
      const course = state.courses.find((c) => c.id === courseId);
      if (!course) return [];
      return course.lessonIds
        .map((id) => state.lessons.find((l) => l.id === id))
        .filter(Boolean)
        .sort((a, b) => a.order - b.order);
    },
    [state.courses, state.lessons]
  );

  const getOrganization = useCallback(
    (orgId) => state.organizations.find((o) => o.id === orgId),
    [state.organizations]
  );

  const visibleCourses = state.courses.filter(
    (c) => (!c.status || c.status === 'approved') && (!c.visibility || c.visibility === 'public' || c.visibility === 'unlisted')
  );

  const getCoursesForOrg = useCallback(
    (orgId) => state.courses
      .filter((c) => c.organizationId === orgId && c.status === 'approved' && c.visibility === 'public'),
    [state.courses]
  );

  const getPersonalizedCourses = useCallback(
    (preferences = []) => {
      if (!preferences.length) return visibleCourses;
      const preferred = visibleCourses.filter((c) => preferences.includes(c.category));
      const others = visibleCourses.filter((c) => !preferences.includes(c.category));
      return [...preferred, ...others];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.courses]
  );

  return (
    <CourseContext.Provider
      value={{
        ...state,
        visibleCourses,
        authors: state.instructors,
        enroll,
        completeLesson,
        toggleLike,
        toggleFavorite,
        recordQuizPass,
        clearStreakMilestone,
        clearNewBadges,
        isEnrolled,
        isLessonCompleted,
        isLiked,
        isFavorited,
        isQuizPassed,
        getCourseProgress,
        getLessonsForCourse,
        getOrganization,
        getCoursesForOrg,
        getPersonalizedCourses,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
};

export const useCourses = () => {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error('useCourses must be used within CourseProvider');
  return ctx;
};

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
} from 'react';
import * as api from '../services/apiService';
import { useAuth } from './AuthContext';

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
        isLoading: false,
      };
    case 'SET_PROGRESS':
      return { ...state, progress: action.progress };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
};

export const CourseProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      dispatch({ type: 'RESET' });
      return;
    }
    const load = async () => {
      const [courses, organizations, instructors, lessons, progress] = await Promise.all([
        api.fetchCourses(),
        api.fetchOrganizations(),
        api.fetchInstructors(),
        api.fetchLessons(),
        api.fetchProgress(),
      ]);
      dispatch({ type: 'LOADED', courses, organizations, instructors, lessons, progress });
    };
    load();
  }, [isSignedIn]);

  const enroll = useCallback(async (courseId) => {
    const progress = await api.enrollCourse(courseId);
    dispatch({ type: 'SET_PROGRESS', progress });
  }, []);

  const completeLesson = useCallback(async (lessonId, courseId, durationSeconds) => {
    const progress = await api.completeLesson(lessonId, courseId, durationSeconds);
    dispatch({ type: 'SET_PROGRESS', progress });
  }, []);

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
    (c) => c.status === 'approved' && c.visibility === 'public'
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

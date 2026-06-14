import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as api from '../services/apiService';
import { useAuth } from './AuthContext';
import { BADGE_DEFS, CATEGORIES } from '../utils/constants';
import { resolveCategory } from '../utils/categories';

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
  certificates: [],
  // Seed with the bundled list so category labels/icons resolve instantly;
  // replaced with the DB-driven list once the API responds.
  categories: CATEGORIES,
  streakMilestone: null,
  newBadges: [],
  isLoading: true,
  loadError: false,
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
        certificates: action.certificates || [],
        categories: action.categories?.length ? action.categories : CATEGORIES,
        isLoading: false,
        loadError: false,
      };
    case 'LOADING':
      return { ...state, isLoading: true, loadError: false };
    case 'LOAD_ERROR':
      return { ...state, isLoading: false, loadError: true };
    case 'SET_PROGRESS':
      return { ...state, progress: action.progress };
    case 'TOGGLE_LIKE_LOCAL': {
      const liked = state.progress.likedLessons.includes(action.lessonId);
      return {
        ...state,
        progress: {
          ...state.progress,
          likedLessons: liked
            ? state.progress.likedLessons.filter((id) => id !== action.lessonId)
            : [...state.progress.likedLessons, action.lessonId],
        },
      };
    }
    case 'TOGGLE_FAVORITE_LOCAL': {
      const saved = state.progress.favoritedLessons.includes(action.lessonId);
      return {
        ...state,
        progress: {
          ...state.progress,
          favoritedLessons: saved
            ? state.progress.favoritedLessons.filter((id) => id !== action.lessonId)
            : [...state.progress.favoritedLessons, action.lessonId],
        },
      };
    }
    case 'BUMP_LESSON_COMMENTS':
      return {
        ...state,
        lessons: state.lessons.map((l) =>
          l.id === action.lessonId
            ? { ...l, commentsCount: Math.max(0, (l.commentsCount ?? 0) + action.delta) }
            : l
        ),
      };
    case 'ENROLL_LOCAL':
      return state.progress.enrolledCourses.includes(action.courseId)
        ? state
        : {
            ...state,
            progress: {
              ...state.progress,
              enrolledCourses: [...state.progress.enrolledCourses, action.courseId],
            },
          };
    case 'UNENROLL_LOCAL':
      return {
        ...state,
        progress: {
          ...state.progress,
          enrolledCourses: state.progress.enrolledCourses.filter((id) => id !== action.courseId),
        },
      };
    case 'SET_BADGES':
      return { ...state, badges: action.badges };
    case 'MERGE_BADGES': {
      const existing = new Set(state.badges.map((b) => b.id));
      const additions = action.badges.filter((b) => !existing.has(b.id));
      return additions.length ? { ...state, badges: [...state.badges, ...additions] } : state;
    }
    case 'SET_CERTIFICATES':
      return { ...state, certificates: action.certificates };
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
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    coursesRef.current = state.courses;
  }, [state.courses]);

  useEffect(() => {
    if (!isSignedIn) {
      dispatch({ type: 'RESET' });
      return;
    }
    const load = async () => {
      try {
        dispatch({ type: 'LOADING' });
        // Phase 1: parallel fetch of list data
        const [coursesRaw, organizations, instructors, progress, badges, certificates, categories] = await Promise.all([
          api.fetchCourses(),
          api.fetchOrganizations(),
          api.fetchInstructors(),
          api.fetchProgress(),
          api.fetchBadges(),
          api.fetchCertificates(),
          api.fetchCategories().catch(() => []),
        ]);

        // Phase 2: enrich each course with its full detail (includes nested lessons)
        const enriched = await Promise.all(
          coursesRaw.map((c) => api.fetchCourseDetail(c.id).catch(() => c))
        );

        // Flatten all lessons from enriched courses
        const lessons = enriched.flatMap((c) => c._lessons ?? []);

        // Populate the legacy fetchLessons cache for any code that calls it directly
        api.setCachedLessons(lessons);

        // Seed the liked-lessons AsyncStorage cache from server is_liked flags
        await api.seedLikedLessonsFromLessons(lessons);

        // Merge server-side liked flags into progress
        const likedLessons = lessons.filter((l) => l.isLiked).map((l) => l.id);

        // Build enrolled courses from is_enrolled on each GET /courses/:id response
        const enrolledFromDetails = enriched.filter((c) => c._isEnrolled).map((c) => c.id);
        const progressWithLikes = {
          ...progress,
          likedLessons,
          enrolledCourses: Array.from(new Set([
            ...progress.enrolledCourses,
            ...enrolledFromDetails,
          ])),
        };

        dispatch({
          type: 'LOADED',
          courses: enriched,
          organizations,
          instructors,
          lessons,
          progress: progressWithLikes,
          badges,
          certificates,
          categories,
        });
      } catch (e) {
        console.error('CourseContext load failed', e);
        // Surface a retryable error state — RESET would leave isLoading: true
        // and spin forever
        dispatch({ type: 'LOAD_ERROR' });
      }
    };
    load();
  }, [isSignedIn, loadAttempt]);

  const reload = useCallback(() => setLoadAttempt((n) => n + 1), []);

  // The server is the source of truth for badge awarding and returns the keys
  // of any newly-earned badges. Merge them into state (so the Badges tab
  // updates live) and flag them for the celebration overlay.
  const surfaceNewBadges = useCallback((keys) => {
    if (!keys || keys.length === 0) return;
    const now = new Date().toISOString();
    const newOnes = keys
      .filter((k) => BADGE_DEFS.some((def) => def.id === k))
      .map((k) => ({ id: k, earnedAt: now }));
    if (newOnes.length === 0) return;
    dispatch({ type: 'MERGE_BADGES', badges: newOnes });
    dispatch({ type: 'SET_NEW_BADGES', badges: newOnes });
  }, []);

  // Optimistic: flip enrolled state instantly, revert on server failure
  const enroll = useCallback(async (courseId) => {
    dispatch({ type: 'ENROLL_LOCAL', courseId });
    try {
      await api.enrollCourse(courseId);
    } catch (e) {
      dispatch({ type: 'UNENROLL_LOCAL', courseId });
      throw e;
    }
  }, []);

  const completeLesson = useCallback(async (lessonId, courseId, durationSeconds) => {
    const prevStreak = state.progress.streak || 0;
    const { progress, newBadges } = await api.completeLesson(lessonId, courseId, durationSeconds);
    dispatch({ type: 'SET_PROGRESS', progress });
    const newStreak = progress.streak || 0;
    if (newStreak > prevStreak && [3, 7, 14, 30].includes(newStreak)) {
      dispatch({ type: 'SET_STREAK_MILESTONE', value: newStreak });
    }
    surfaceNewBadges(newBadges);
    // Server issues a certificate when the last lesson of a course completes
    api.fetchCertificates().then((certificates) =>
      dispatch({ type: 'SET_CERTIFICATES', certificates })
    );
  }, [state.progress.streak, surfaceNewBadges]);

  // Optimistic: flip local state instantly, revert by flipping back on failure
  const toggleLike = useCallback(async (lessonId) => {
    dispatch({ type: 'TOGGLE_LIKE_LOCAL', lessonId });
    try {
      await api.toggleLike(lessonId);
    } catch (e) {
      dispatch({ type: 'TOGGLE_LIKE_LOCAL', lessonId });
      throw e;
    }
  }, []);

  const toggleFavorite = useCallback(async (lessonId) => {
    const isCurrentlySaved = state.progress.favoritedLessons.includes(lessonId);
    dispatch({ type: 'TOGGLE_FAVORITE_LOCAL', lessonId });
    try {
      await api.toggleFavorite(lessonId, isCurrentlySaved);
    } catch (e) {
      dispatch({ type: 'TOGGLE_FAVORITE_LOCAL', lessonId });
      throw e;
    }
  }, [state.progress.favoritedLessons]);

  const unenroll = useCallback(async (courseId) => {
    await api.unenrollCourse(courseId);
    dispatch({ type: 'UNENROLL_LOCAL', courseId });
  }, []);

  const recordQuizPass = useCallback(async (quizId, lessonId, score, answers = []) => {
    const { progress, newBadges } = await api.recordQuizPass(quizId, lessonId, score, answers);
    dispatch({ type: 'SET_PROGRESS', progress });
    surfaceNewBadges(newBadges);
  }, [surfaceNewBadges]);

  const recordShare = useCallback((lessonId) => {
    api.recordShare(lessonId);
  }, []);

  // Mirrors the server, which increments comments_count for every posted
  // comment including replies
  const bumpCommentCount = useCallback((lessonId, delta = 1) => {
    dispatch({ type: 'BUMP_LESSON_COMMENTS', lessonId, delta });
  }, []);

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

  const getCertificate = useCallback(
    (courseId) => state.certificates.find((c) => c.courseId === courseId),
    [state.certificates]
  );

  // Resolve a stored course/cert `category` value (which may be an id OR a
  // label, in any case) against the DB-driven category list. Returns the
  // matching { id, label, icon, color } or null. Replaces ad-hoc
  // `CATEGORIES.find(c => c.id === value)` lookups, which only matched ids
  // from the bundled constant.
  const getCategory = useCallback(
    (value) => resolveCategory(value, state.categories),
    [state.categories]
  );

  // Memoized so its identity only changes when courses actually change.
  // A fresh array on every provider render (e.g. after a like/save progress
  // update) would invalidate ForYouScreen's feed useMemo and reshuffle the
  // random feed mid-session — the current slide would jump to another course.
  const visibleCourses = useMemo(
    () => state.courses.filter(
      (c) => (!c.status || c.status === 'approved') && (!c.visibility || c.visibility === 'public' || c.visibility === 'unlisted')
    ),
    [state.courses]
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
        reload,
        enroll,
        unenroll,
        completeLesson,
        toggleLike,
        toggleFavorite,
        recordQuizPass,
        recordShare,
        bumpCommentCount,
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
        getCertificate,
        getCategory,
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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, post, patch, del, saveTokens, clearTokens } from './httpClient';

// --- Data mappers (snake_case API → camelCase app) ---

const mapUser = (u) => ({
  id:                   u.id,
  username:             u.username,
  fullName:             u.full_name,
  phone:                u.phone ?? '',
  bio:                  u.bio ?? '',
  avatar:               u.avatar_url ?? `https://picsum.photos/seed/${u.username}/200/200`,
  preferences:          u.preferences?.preferred_categories ?? [],
  onboardingCompleted:  u.preferences?.onboarding_completed ?? false,
  phoneVerified:        u.is_phone_verified ?? false,
  language:             u.lang_pref ?? 'en',
  notificationsEnabled: u.settings?.notifications_enabled ?? u.notifications_enabled ?? true,
  fontScale:            u.settings?.font_scale ?? null,
  highContrast:         u.settings?.high_contrast ?? null,
  createdAt:            u.created_at,
});

const mapContentJson = (type, raw) => {
  if (!raw) return {};
  if (type === 'text')  return { body: raw.body ?? raw };
  if (type === 'image') {
    // Normalise: backend may store as array, or as { images: [...] }, or a single object
    const arr = Array.isArray(raw) ? raw : (raw?.images ? raw.images : [raw]);
    const images = arr.map((img) => ({
      uri:     img.uri ?? img.url ?? img.src ?? img.image_url ?? '',
      caption: img.caption ?? img.text ?? '',
    }));
    return { images };
  }
  if (type === 'video') {
    return {
      videoUri:  raw.videoUri ?? raw.video_url ?? raw.url ?? null,
      youtubeId: raw.youtubeId ?? null,
    };
  }
  return raw;
};

const mapLesson = (l) => ({
  id:            l.id,
  courseId:      l.course_id,
  title:         l.title,
  type:          l.type,
  content:       mapContentJson(l.type, l.content_json),
  duration:      l.duration_secs ?? 0,
  order:         l.order_index   ?? 0,
  thumbnail:     l.thumbnail_url || null,
  hasQuiz:       l.has_quiz      ?? false,
  quiz:          l.quiz ? (() => {
    const quizType = (l.quiz.type ?? '').toLowerCase().replace(/[-_\s]/g, '');
    return {
      id:        l.quiz.id,
      type:      quizType,
      questions: (l.quiz.questions_json ?? []).map((q, qi) => {
        // Normalize question text — seed uses 'text'; API schema uses 'question'
        const text = q.text ?? q.question ?? q.prompt ?? q.title ?? '';
        // Normalize type — seed stores per-question; API only on the quiz object
        const type = (q.type ?? l.quiz.type ?? '').toLowerCase().replace(/[-_\s]/g, '') || quizType;
        // Normalize correctAnswer — seed uses 'correctAnswer'; API schema uses 'answer'
        let correctAnswer = q.correctAnswer !== undefined ? q.correctAnswer : q.answer;
        // multipleChoice: API stores answer as the option label string; QuizModal expects index
        if (type === 'multiplechoice' && typeof correctAnswer === 'string' && Array.isArray(q.options)) {
          const idx = q.options.indexOf(correctAnswer);
          correctAnswer = idx >= 0 ? idx : 0;
        }
        // imageMatching: normalize pairs — API stores { image, label }; QuizModal expects { id, imageUri, label }
        const pairs = Array.isArray(q.pairs)
          ? q.pairs.map((p, pi) => ({
              id:       p.id       ?? `pair_${qi}_${pi}`,
              imageUri: p.imageUri ?? p.image ?? p.uri ?? '',
              label:    p.label    ?? '',
            }))
          : undefined;
        return {
          ...q,
          text,
          type,
          correctAnswer,
          ...(pairs ? { pairs } : {}),
        };
      }),
    };
  })() : null,
  likesCount:    l.likes_count    ?? 0,
  savesCount:    l.saves_count    ?? 0,
  commentsCount: l.comments_count ?? 0,
  sharesCount:   l.shares_count   ?? 0,
  isLiked:       l.is_liked  ?? false,
  isSaved:       l.is_saved  ?? false,
});

const mapCourse = (c, lessons = []) => ({
  id:             c.id,
  organizationId: c.org_id,
  instructorId:   c.instructor_id,
  title:          c.title,
  description:    c.description  ?? '',
  thumbnail:      c.thumbnail_url || null,
  category:       c.category     ?? '',
  tags:           c.tags         ?? [],
  difficulty:     c.difficulty   ?? 'Beginner',
  status:         c.status,
  visibility:     c.visibility,
  enrolledCount:  c.enrolled_count ?? 0,
  totalDuration:  c.total_duration_secs ?? 0,
  lessonCount:    lessons.length || c.lesson_count || c._count?.lessons || 0,
  lessonIds:      lessons.map((l) => l.id),
  _lessons:       lessons,
  _isEnrolled:    c.is_enrolled ?? false,
});

const mapOrganization = (o) => ({
  id:          o.id,
  name:        o.name,
  logo:        o.logo_url    || null,
  description: o.description ?? '',
  courseCount: o._count?.courses ?? o.course_count ?? 0,
  tags:        o.tags ?? [],
});

const mapInstructor = (u) => ({
  id:             u.id,
  organizationId: u.org_id ?? '',
  name:           u.full_name ?? u.name ?? '',
  avatar:         u.avatar_url ?? u.avatar ?? `https://picsum.photos/seed/${u.id}/200/200`,
  bio:            u.bio ?? '',
  expertise:      u.expertise ?? [],
  followersCount: u._count?.followers ?? u.followers_count ?? 0,
});

const mapComment = (c) => ({
  id:        c.id,
  lessonId:  c.lesson_id,
  userId:    c.user_id,
  username:  c.user?.username ?? '',
  avatar:    c.user?.avatar_url ?? '',
  text:      c.body,
  createdAt: c.created_at,
  likes:     c.likes_count ?? 0,
  parentId:  c.parent_id ?? null,
  depth:     c.depth      ?? 0,
});

// --- Local caches (no corresponding backend endpoints, or backend submission unreliable) ---

const LIKED_KEY        = '@edutok_liked_lessons';
// Quiz passes tracked locally so isQuizPassed survives a server submission failure.
const QUIZ_PASSES_KEY  = '@edutok_local_quiz_passes';

const _getLikedLessonsCache = async () => {
  const raw = await AsyncStorage.getItem(LIKED_KEY);
  return raw ? JSON.parse(raw) : [];
};

const _setLikedLessonsCache = (ids) =>
  AsyncStorage.setItem(LIKED_KEY, JSON.stringify(ids));

export const seedLikedLessonsFromLessons = async (lessons) => {
  const likedIds = lessons.filter((l) => l.isLiked).map((l) => l.id);
  if (likedIds.length === 0) return;
  const current = await _getLikedLessonsCache();
  const merged  = Array.from(new Set([...current, ...likedIds]));
  await _setLikedLessonsCache(merged);
};

// --- Auth ---

export const signIn = async (username, password) => {
  const data = await post('/auth/login', { username, password }, { auth: false });
  const d = data.data ?? data;
  if (d.requires2fa) {
    const err = new Error('2FA_REQUIRED');
    err.requires2fa    = true;
    err.challengeToken = d.challengeToken;
    err.twoFaMethod    = d.two_fa_method;
    throw err;
  }
  if (d.user?.role && d.user.role !== 'learner') {
    throw new Error('This app is for students only. Please use the admin dashboard to manage content.');
  }
  await saveTokens(d.accessToken, d.refreshToken);
  // Login response is a bare user row — re-fetch /users/me so the mapped user
  // includes the preferences/settings relations (onboardingCompleted, etc.)
  return fetchCurrentUser();
};

export const signUp = async ({ username, fullName, phone, password }) => {
  const data = await post(
    '/auth/register',
    { username, full_name: fullName, phone, password },
    { auth: false },
  );
  const d = data.data ?? data;
  await saveTokens(d.accessToken, d.refreshToken);
  return mapUser(d.user);
};

export const fetchCurrentUser = async () => {
  const data = await get('/users/me');
  const u = data.data ?? data;
  const raw = u.user ?? u;
  if (raw?.role && raw.role !== 'learner') {
    await clearTokens();
    throw new Error('Non-learner account');
  }
  return mapUser(raw);
};

export const signOut = async () => {
  try { await post('/auth/logout', {}); } catch { /* ignore */ }
  await clearTokens();
};

export const updateUser = async (updates) => {
  // Backend splits these across three endpoints; PATCH /users/me silently
  // strips any field not in its schema, so each group must go to its own route.
  const profile = {};
  if (updates.fullName !== undefined) profile.full_name  = updates.fullName;
  if (updates.bio      !== undefined) profile.bio        = updates.bio;
  if (updates.avatar   !== undefined) profile.avatar_url = updates.avatar;
  if (updates.language !== undefined) profile.lang_pref  = updates.language;

  const settings = {};
  if (updates.notificationsEnabled !== undefined) settings.notifications_enabled = updates.notificationsEnabled;

  if (Object.keys(profile).length  > 0) await patch('/users/me', profile);
  if (Object.keys(settings).length > 0) await patch('/users/me/settings', settings);
  if (updates.preferences !== undefined) {
    await patch('/users/me/preferences', { preferred_categories: updates.preferences });
  }
  return fetchCurrentUser();
};

export const updatePreferences = async ({ preferences, onboardingCompleted }) => {
  const body = {};
  if (preferences         !== undefined) body.preferred_categories = preferences;
  if (onboardingCompleted !== undefined) body.onboarding_completed = onboardingCompleted;
  await patch('/users/me/preferences', body);
  return fetchCurrentUser();
};

// Fire-and-forget device/a11y settings sync — local state is the UX source of truth.
export const updateSettings = ({ fontScale, highContrast }) => {
  const body = {};
  if (fontScale    !== undefined) body.font_scale    = fontScale;
  if (highContrast !== undefined) body.high_contrast = highContrast;
  if (Object.keys(body).length === 0) return Promise.resolve();
  return patch('/users/me/settings', body).catch(() => {});
};

// --- Content ---

export const fetchCourses = async () => {
  const data = await get('/courses?limit=100&status=approved&visibility=public');
  const list = data.data ?? data.courses ?? data;
  return Array.isArray(list) ? list.map((c) => mapCourse(c)) : [];
};

export const fetchCourseDetail = async (courseId) => {
  const data = await get(`/courses/${courseId}`);
  const raw  = data.data ?? data.course ?? data;
  // Inject course_id into each lesson; the GET /courses/:id SELECT omits it
  const lessons = (raw.lessons ?? []).map((l) => mapLesson({ ...l, course_id: courseId }));
  return mapCourse(raw, lessons);
};

// Server-side course search. `category` must be the category LABEL (e.g.
// "Engineering"), which is what the backend stores on course.category.
// Returns mapped course objects; the screen prefers its in-context copy
// (which carries lessonIds/_lessons) and falls back to these for any
// result not already loaded locally.
export const searchCourses = async ({ q, category }) => {
  const params = new URLSearchParams({ q, type: 'courses', limit: '50' });
  if (category) params.set('category', category);
  const data = await get(`/search?${params.toString()}`);
  const payload = data.data ?? data;
  const list = payload.courses?.data ?? payload.courses ?? [];
  return Array.isArray(list) ? list.map((c) => mapCourse(c)) : [];
};

export const fetchOrganizations = async () => {
  const data = await get('/organizations');
  const list = data.data ?? data.organizations ?? data;
  return Array.isArray(list) ? list.map(mapOrganization) : [];
};

export const fetchInstructors = async () => {
  try {
    const data = await get('/instructors');
    const list = data.data ?? data.instructors ?? data;
    return Array.isArray(list) ? list.map(mapInstructor) : [];
  } catch {
    return [];
  }
};

// Populated by CourseContext after fetchCourseDetail calls; kept for interface compat.
let _cachedLessons = [];
export const setCachedLessons = (lessons) => { _cachedLessons = lessons; };
export const fetchLessons = async () => _cachedLessons;

// --- Progress ---

export const fetchProgress = async () => {
  const [completions, saves, quizHistory, streakData, analytics] = await Promise.all([
    get('/progress/me/completions').catch(() => ({})),
    get('/progress/me/saves').catch(() => ({})),
    get('/progress/me/quiz-history').catch(() => ({})),
    get('/progress/me/streak').catch(() => ({})),
    get('/progress/me/analytics').catch(() => ({})),
  ]);

  const completedLessons = ((completions.data ?? completions.completions ?? []) || []).map((c) => ({
    lessonId:    c.lesson_id   ?? c.lessonId,
    courseId:    c.course_id   ?? c.courseId,
    completedAt: c.completed_at ?? c.completedAt,
  }));

  const favoritedLessons = ((saves.data ?? saves.saves ?? []) || []).map(
    (s) => s.lesson_id ?? s.lessonId ?? s.id,
  );

  const passedQuizzes = ((quizHistory.data ?? quizHistory.quizPasses ?? quizHistory.quiz_passes ?? []) || []).map((q) => ({
    quizId:   q.quiz_id  ?? q.quizId,
    lessonId: q.lesson_id ?? q.lessonId,
    score:    q.score,
    passedAt: q.passed_at ?? q.passedAt,
  }));

  const sd = streakData.data ?? streakData;
  const streak         = sd.current_streak     ?? sd.streak        ?? 0;
  const totalSeconds   = sd.total_seconds_learned ?? sd.totalSeconds  ?? 0;
  const lastActiveDate = sd.last_active_date   ?? sd.lastActiveDate ?? null;

  // There is no list-my-enrollments endpoint; the analytics course_breakdown
  // contains exactly the caller's enrolled courses. This must come from the
  // server on EVERY fetch — returning [] here wiped enrollment state each time
  // completeLesson/recordQuizPass refreshed progress (the "+ always shows" bug).
  const enrolledCourses = ((analytics.data ?? analytics)?.course_breakdown ?? []).map(
    (c) => c.course_id ?? c.courseId,
  );

  const likedLessons = await _getLikedLessonsCache();

  // Merge locally-tracked quiz passes so isQuizPassed is correct even when
  // the server submission fails (wrong payload, network error, etc.)
  let localPasses = [];
  try {
    const raw = await AsyncStorage.getItem(QUIZ_PASSES_KEY);
    if (raw) localPasses = JSON.parse(raw);
  } catch (_) {}
  const mergedPassedQuizzes = [
    ...passedQuizzes,
    ...localPasses.filter((lp) => !passedQuizzes.some((sp) => sp.quizId === lp.quizId)),
  ];

  return {
    enrolledCourses,
    completedLessons,
    likedLessons,
    favoritedLessons,
    passedQuizzes: mergedPassedQuizzes,
    streak,
    lastActiveDate,
    totalSeconds,
  };
};

export const enrollCourse = async (courseId) => {
  try {
    await post(`/courses/${courseId}/enroll`, {});
  } catch (e) {
    // 409 = already enrolled server-side — the desired state, not a failure
    if (e?.status !== 409) throw e;
  }
};

export const unenrollCourse = async (courseId) => {
  await del(`/courses/${courseId}/enroll`);
};

export const completeLesson = async (lessonId, courseId, durationSeconds) => {
  try {
    await post(`/lessons/${lessonId}/complete`, { course_id: courseId });
  } catch (e) {
    if (e.status !== 409) throw e;
  }
  try {
    await patch(`/lessons/${lessonId}/progress`, {
      watched_seconds: durationSeconds,
      total_seconds:   durationSeconds,
    });
  } catch { /* best-effort */ }
  return fetchProgress();
};

// 409 (already liked/saved) and 404 (already removed) mean the server is
// already in the desired state — treat them as success, not failure.
const _isAlreadyInState = (e) => e?.status === 409 || e?.status === 404;

export const toggleLike = async (lessonId) => {
  const current = await _getLikedLessonsCache();
  const isLiked = current.includes(lessonId);
  if (isLiked) {
    try {
      await del(`/engagement/lessons/${lessonId}/like`);
    } catch (e) {
      if (!_isAlreadyInState(e)) throw e;
    }
    await _setLikedLessonsCache(current.filter((id) => id !== lessonId));
    return { liked: false };
  }
  try {
    await post(`/engagement/lessons/${lessonId}/like`, {});
  } catch (e) {
    if (!_isAlreadyInState(e)) throw e;
  }
  await _setLikedLessonsCache([...current, lessonId]);
  return { liked: true };
};

// Caller (CourseContext) passes the current saved state — avoids the previous
// full fetchProgress() round-trip just to determine the toggle direction.
export const toggleFavorite = async (lessonId, isCurrentlySaved) => {
  if (isCurrentlySaved) {
    try {
      await del(`/engagement/lessons/${lessonId}/save`);
    } catch (e) {
      if (!_isAlreadyInState(e)) throw e;
    }
    return { saved: false };
  }
  try {
    await post(`/engagement/lessons/${lessonId}/save`, {});
  } catch (e) {
    if (!_isAlreadyInState(e)) throw e;
  }
  return { saved: true };
};

export const recordQuizPass = async (quizId, lessonId, score, answers = []) => {
  // Save pass to local cache immediately — never blocked by server errors
  try {
    const raw = await AsyncStorage.getItem(QUIZ_PASSES_KEY);
    const passes = raw ? JSON.parse(raw) : [];
    if (!passes.some((p) => p.quizId === quizId)) {
      passes.push({ quizId, lessonId, score, passedAt: new Date().toISOString() });
      await AsyncStorage.setItem(QUIZ_PASSES_KEY, JSON.stringify(passes));
    }
  } catch (_) {}

  // Fire-and-forget server submission with the user's real answers so the
  // backend grades and records the pass (quiz history, Quiz Master badge).
  post(`/quizzes/${quizId}/submit`, { answers }).catch(() => {});

  return fetchProgress();
};

export const recordShare = (lessonId) =>
  post(`/engagement/lessons/${lessonId}/share`, { platform: 'native' }).catch(() => {});

// --- Comments ---

export const fetchComments = async (lessonId) => {
  const data = await get(`/engagement/lessons/${lessonId}/comments`);
  const list = data.data ?? data.comments ?? data;
  return Array.isArray(list) ? list.map(mapComment) : [];
};

export const postComment = async (lessonId, _userId, _username, _avatar, text) => {
  await post(`/engagement/lessons/${lessonId}/comments`, { body: text });
  return fetchComments(lessonId);
};

export const postReply = async (lessonId, parentId, _userId, _username, _avatar, text) => {
  await post(`/engagement/lessons/${lessonId}/comments`, { body: text, parent_id: parentId });
  return fetchComments(lessonId);
};

// --- Badges ---

export const fetchBadges = async () => {
  try {
    const data = await get('/progress/me/badges');
    const list = data.data ?? data.badges ?? data;
    return Array.isArray(list)
      ? list.map((b) => ({ id: b.badge_key ?? b.id, earnedAt: b.earned_at ?? b.earnedAt }))
      : [];
  } catch {
    return [];
  }
};

export const saveBadges = async (_badges) => {
  // Server manages badge awarding; retained for interface compatibility.
};

// --- Certificates ---

const mapCertificate = (c) => ({
  id:                c.id,
  courseId:          c.course_id,
  certificateNumber: c.certificate_number,
  studentName:       c.student_name,
  courseName:        c.course_name,
  organizationName:  c.organization_name,
  authorName:        c.instructor_name,
  category:          c.category,
  difficulty:        c.difficulty,
  issuedAt:          c.issued_at,
});

export const fetchCertificates = async () => {
  try {
    const data = await get('/progress/me/certificates');
    const list = data.data ?? data.certificates ?? data;
    return Array.isArray(list) ? list.map(mapCertificate) : [];
  } catch {
    return [];
  }
};

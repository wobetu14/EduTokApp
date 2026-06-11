jest.mock('../services/httpClient', () => ({
  get:         jest.fn(),
  post:        jest.fn(),
  patch:       jest.fn(),
  del:         jest.fn(),
  saveTokens:  jest.fn().mockResolvedValue(),
  clearTokens: jest.fn().mockResolvedValue(),
  setSessionExpiredHandler: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const { get, post, patch, del } = require('../services/httpClient');
const AsyncStorage = require('@react-native-async-storage/async-storage');
const api = require('../services/apiService');

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.clear();
});

// --- fetchProgress ---

const mockProgressEndpoints = ({
  completions = [],
  saves = [],
  quizHistory = [],
  streak = {},
  enrolled = [],
} = {}) => {
  get.mockImplementation((path) => {
    if (path.includes('/completions'))  return Promise.resolve({ data: completions });
    if (path.includes('/saves'))        return Promise.resolve({ data: saves });
    if (path.includes('/quiz-history')) return Promise.resolve({ data: quizHistory });
    if (path.includes('/streak'))       return Promise.resolve({ data: streak });
    if (path.includes('enrolled=true')) return Promise.resolve({ data: enrolled });
    return Promise.resolve({});
  });
};

describe('fetchProgress', () => {
  it('reconstructs the full progress shape from 5 endpoints', async () => {
    mockProgressEndpoints({
      completions: [{ lesson_id: 'l1', course_id: 'c1', completed_at: '2025-01-01' }],
      saves:       [{ lesson_id: 'l2' }],
      quizHistory: [{ quiz_id: 'q1', lesson_id: 'l1', score: 80, passed_at: '2025-01-01' }],
      streak:      { current_streak: 5, total_seconds_learned: 3600, last_active_date: '2025-01-01' },
      enrolled:    [{ id: 'c1' }, { id: 'c2' }],
    });

    const p = await api.fetchProgress();

    expect(p.completedLessons).toEqual([{ lessonId: 'l1', courseId: 'c1', completedAt: '2025-01-01' }]);
    expect(p.favoritedLessons).toEqual(['l2']);
    expect(p.passedQuizzes).toEqual([{ quizId: 'q1', lessonId: 'l1', score: 80, passedAt: '2025-01-01' }]);
    expect(p.streak).toBe(5);
    expect(p.totalSeconds).toBe(3600);
    expect(p.lastActiveDate).toBe('2025-01-01');
    // enrolledCourses is built in CourseContext from is_enrolled course flags
    expect(p.enrolledCourses).toEqual([]);
  });

  it('returns empty arrays and 0 defaults when endpoints return nothing', async () => {
    mockProgressEndpoints();
    const p = await api.fetchProgress();
    expect(p.completedLessons).toEqual([]);
    expect(p.favoritedLessons).toEqual([]);
    expect(p.passedQuizzes).toEqual([]);
    expect(p.enrolledCourses).toEqual([]);
    expect(p.streak).toBe(0);
    expect(p.totalSeconds).toBe(0);
    expect(p.lastActiveDate).toBeNull();
  });

  it('does not throw when one endpoint fails (partial data)', async () => {
    get.mockImplementation((path) => {
      if (path.includes('/completions')) return Promise.reject(new Error('network error'));
      if (path.includes('/saves'))       return Promise.resolve({ data: [] });
      if (path.includes('/quiz-history'))return Promise.resolve({ data: [] });
      if (path.includes('/streak'))      return Promise.resolve({ data: {} });
      if (path.includes('enrolled=true'))return Promise.resolve({ data: [] });
      return Promise.resolve({});
    });
    const p = await api.fetchProgress();
    expect(p.completedLessons).toEqual([]);
  });
});

// --- toggleLike ---

describe('toggleLike', () => {
  it('POSTs like, adds lessonId to cache, returns { liked: true }', async () => {
    post.mockResolvedValue({});
    const result = await api.toggleLike('l1');
    expect(post).toHaveBeenCalledWith('/engagement/lessons/l1/like', {});
    expect(get).not.toHaveBeenCalled(); // no fetchProgress round-trip
    expect(result).toEqual({ liked: true });
    const cached = JSON.parse(await AsyncStorage.getItem('@edutok_liked_lessons'));
    expect(cached).toContain('l1');
  });

  it('DELETEs like, removes lessonId from cache, returns { liked: false }', async () => {
    await AsyncStorage.setItem('@edutok_liked_lessons', JSON.stringify(['l1']));
    del.mockResolvedValue({});
    const result = await api.toggleLike('l1');
    expect(del).toHaveBeenCalledWith('/engagement/lessons/l1/like');
    expect(result).toEqual({ liked: false });
    const cached = JSON.parse(await AsyncStorage.getItem('@edutok_liked_lessons'));
    expect(cached).not.toContain('l1');
  });

  it('treats 409 (already liked server-side) as success', async () => {
    post.mockRejectedValue(Object.assign(new Error('Conflict'), { status: 409 }));
    const result = await api.toggleLike('l1');
    expect(result).toEqual({ liked: true });
  });

  it('rethrows network errors and leaves the cache untouched', async () => {
    post.mockRejectedValue(Object.assign(new Error('network'), { status: 0 }));
    await expect(api.toggleLike('l1')).rejects.toThrow('network');
    expect(await AsyncStorage.getItem('@edutok_liked_lessons')).toBeNull();
  });
});

// --- toggleFavorite ---

describe('toggleFavorite', () => {
  it('POSTs save and returns { saved: true } when not currently saved', async () => {
    post.mockResolvedValue({});
    const result = await api.toggleFavorite('l1', false);
    expect(post).toHaveBeenCalledWith('/engagement/lessons/l1/save', {});
    expect(result).toEqual({ saved: true });
  });

  it('DELETEs save and returns { saved: false } when currently saved', async () => {
    del.mockResolvedValue({});
    const result = await api.toggleFavorite('l1', true);
    expect(del).toHaveBeenCalledWith('/engagement/lessons/l1/save');
    expect(result).toEqual({ saved: false });
  });

  it('treats 404 (already removed server-side) as success', async () => {
    del.mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }));
    const result = await api.toggleFavorite('l1', true);
    expect(result).toEqual({ saved: false });
  });
});

// --- seedLikedLessonsFromLessons ---

describe('seedLikedLessonsFromLessons', () => {
  it('adds is_liked lessons to the cache', async () => {
    const lessons = [
      { id: 'l1', isLiked: true },
      { id: 'l2', isLiked: false },
      { id: 'l3', isLiked: true },
    ];
    await api.seedLikedLessonsFromLessons(lessons);
    const cached = JSON.parse(await AsyncStorage.getItem('@edutok_liked_lessons'));
    expect(cached).toContain('l1');
    expect(cached).toContain('l3');
    expect(cached).not.toContain('l2');
  });

  it('merges with existing cache without duplicates', async () => {
    await AsyncStorage.setItem('@edutok_liked_lessons', JSON.stringify(['l1']));
    await api.seedLikedLessonsFromLessons([{ id: 'l1', isLiked: true }, { id: 'l2', isLiked: true }]);
    const cached = JSON.parse(await AsyncStorage.getItem('@edutok_liked_lessons'));
    expect(cached.filter((id) => id === 'l1').length).toBe(1); // no duplicate
    expect(cached).toContain('l2');
  });

  it('does nothing when no lessons are liked', async () => {
    await api.seedLikedLessonsFromLessons([{ id: 'l1', isLiked: false }]);
    expect(await AsyncStorage.getItem('@edutok_liked_lessons')).toBeNull();
  });
});

// --- completeLesson ---

describe('completeLesson', () => {
  beforeEach(() => {
    post.mockResolvedValue({});
    patch.mockResolvedValue({});
    mockProgressEndpoints();
  });

  it('calls /complete and /progress then returns progress', async () => {
    await api.completeLesson('l1', 'c1', 120);
    expect(post).toHaveBeenCalledWith('/lessons/l1/complete', { course_id: 'c1' });
    expect(patch).toHaveBeenCalledWith('/lessons/l1/progress', {
      watched_seconds: 120,
      total_seconds: 120,
    });
  });

  it('ignores 409 Conflict (already completed)', async () => {
    const err = Object.assign(new Error('Conflict'), { status: 409 });
    post.mockRejectedValue(err);
    await expect(api.completeLesson('l1', 'c1', 60)).resolves.not.toThrow();
  });

  it('rethrows non-409 errors', async () => {
    const err = Object.assign(new Error('Server error'), { status: 500 });
    post.mockRejectedValue(err);
    await expect(api.completeLesson('l1', 'c1', 60)).rejects.toMatchObject({ status: 500 });
  });
});

// --- recordQuizPass ---

describe('recordQuizPass', () => {
  beforeEach(() => {
    post.mockResolvedValue({});
    mockProgressEndpoints();
  });

  it('submits the real answers array for server-side grading', async () => {
    await api.recordQuizPass('q1', 'l1', 90, [true, 'Option B', { 'img.jpg': 'Label' }]);
    expect(post).toHaveBeenCalledWith('/quizzes/q1/submit', {
      answers: [true, 'Option B', { 'img.jpg': 'Label' }],
    });
  });

  it('defaults to empty answers when none provided', async () => {
    await api.recordQuizPass('q1', 'l1', 90);
    expect(post).toHaveBeenCalledWith('/quizzes/q1/submit', { answers: [] });
  });

  it('caches the pass locally even when the server rejects', async () => {
    post.mockRejectedValue(new Error('bad payload'));
    await expect(api.recordQuizPass('q1', 'l1', 90)).resolves.not.toThrow();
    const cached = JSON.parse(await AsyncStorage.getItem('@edutok_local_quiz_passes'));
    expect(cached[0]).toMatchObject({ quizId: 'q1', lessonId: 'l1', score: 90 });
  });
});

// --- recordShare ---

describe('recordShare', () => {
  it('POSTs a native share event', async () => {
    post.mockResolvedValue({});
    await api.recordShare('l1');
    expect(post).toHaveBeenCalledWith('/engagement/lessons/l1/share', { platform: 'native' });
  });

  it('swallows server errors (fire-and-forget)', async () => {
    post.mockRejectedValue(new Error('network error'));
    await expect(api.recordShare('l1')).resolves.toBeUndefined();
  });
});

// --- fetchCertificates ---

describe('fetchCertificates', () => {
  it('maps snake_case certificate fields', async () => {
    get.mockResolvedValue({
      data: [{
        id: 'cert1',
        course_id: 'c1',
        certificate_number: 'EDUTOK-AB12CD34EF',
        student_name: 'Alice',
        course_name: 'Math 101',
        organization_name: 'STEM Academy',
        instructor_name: 'Prof. X',
        category: 'math',
        difficulty: 'Beginner',
        issued_at: '2026-01-01',
      }],
    });
    const certs = await api.fetchCertificates();
    expect(certs[0]).toEqual({
      id: 'cert1',
      courseId: 'c1',
      certificateNumber: 'EDUTOK-AB12CD34EF',
      studentName: 'Alice',
      courseName: 'Math 101',
      organizationName: 'STEM Academy',
      authorName: 'Prof. X',
      category: 'math',
      difficulty: 'Beginner',
      issuedAt: '2026-01-01',
    });
  });

  it('returns empty array on server error', async () => {
    get.mockRejectedValue(new Error('network error'));
    await expect(api.fetchCertificates()).resolves.toEqual([]);
  });
});

// --- enrollCourse ---

describe('enrollCourse', () => {
  it('POSTs to enroll endpoint then returns progress', async () => {
    post.mockResolvedValue({});
    mockProgressEndpoints({ enrolled: [{ id: 'c1' }] });
    const p = await api.enrollCourse('c1');
    expect(post).toHaveBeenCalledWith('/courses/c1/enroll', {});
    // enrolledCourses is built in CourseContext, not fetchProgress
    expect(p.enrolledCourses).toEqual([]);
  });
});

// --- unenrollCourse ---

describe('unenrollCourse', () => {
  it('DELETEs the enrollment', async () => {
    del.mockResolvedValue({});
    await api.unenrollCourse('c1');
    expect(del).toHaveBeenCalledWith('/courses/c1/enroll');
  });

  it('propagates server errors', async () => {
    del.mockRejectedValue(Object.assign(new Error('Server error'), { status: 500 }));
    await expect(api.unenrollCourse('c1')).rejects.toMatchObject({ status: 500 });
  });
});

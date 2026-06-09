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
    expect(p.enrolledCourses).toEqual(['c1', 'c2']);
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
  beforeEach(() => mockProgressEndpoints());

  it('POSTs like and adds lessonId to AsyncStorage cache when not liked', async () => {
    post.mockResolvedValue({});
    await api.toggleLike('l1');
    expect(post).toHaveBeenCalledWith('/engagement/lessons/l1/like', {});
    const cached = JSON.parse(await AsyncStorage.getItem('@edutok_liked_lessons'));
    expect(cached).toContain('l1');
  });

  it('DELETEs like and removes lessonId from cache when already liked', async () => {
    await AsyncStorage.setItem('@edutok_liked_lessons', JSON.stringify(['l1']));
    del.mockResolvedValue({});
    await api.toggleLike('l1');
    expect(del).toHaveBeenCalledWith('/engagement/lessons/l1/like');
    const cached = JSON.parse(await AsyncStorage.getItem('@edutok_liked_lessons'));
    expect(cached).not.toContain('l1');
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

  it('calls /quizzes/:id/submit', async () => {
    await api.recordQuizPass('q1', 'l1', 90);
    expect(post).toHaveBeenCalledWith('/quizzes/q1/submit', { lesson_id: 'l1', score: 90 });
  });

  it('ignores 409 Conflict (already passed)', async () => {
    const err = Object.assign(new Error('Conflict'), { status: 409 });
    post.mockRejectedValue(err);
    await expect(api.recordQuizPass('q1', 'l1', 90)).resolves.not.toThrow();
  });
});

// --- enrollCourse ---

describe('enrollCourse', () => {
  it('POSTs to enroll endpoint then returns progress', async () => {
    post.mockResolvedValue({});
    mockProgressEndpoints({ enrolled: [{ id: 'c1' }] });
    const p = await api.enrollCourse('c1');
    expect(post).toHaveBeenCalledWith('/courses/c1/enroll', {});
    expect(p.enrolledCourses).toContain('c1');
  });
});

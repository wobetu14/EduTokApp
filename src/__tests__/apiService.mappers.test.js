// Test the pure data-mapping functions in apiService.js.
// These have no side effects — just snake_case API input → camelCase app output.
// We test them by importing apiService and checking the shape of returned objects
// from the public functions, using mocked httpClient responses.

jest.mock('../services/httpClient', () => ({
  get:         jest.fn(),
  post:        jest.fn(),
  patch:       jest.fn(),
  del:         jest.fn(),
  saveTokens:  jest.fn(),
  clearTokens: jest.fn(),
  setSessionExpiredHandler: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const { get, post, saveTokens } = require('../services/httpClient');
const api = require('../services/apiService');

// --- mapUser (exercised via signIn / fetchCurrentUser) ---

describe('mapUser — via signIn', () => {
  const rawUser = {
    id: 'u1',
    username: 'alice',
    full_name: 'Alice Smith',
    phone: '+1234567890',
    bio: 'Learner',
    avatar_url: 'https://cdn.example.com/avatar.jpg',
    is_phone_verified: true,
    lang_pref: 'am',
    notifications_enabled: false,
    role: 'learner',
    created_at: '2025-01-01T00:00:00.000Z',
    preferences: { preferred_categories: ['math', 'ai'] },
  };

  beforeEach(() => {
    post.mockResolvedValue({ data: { accessToken: 'a', refreshToken: 'r', user: rawUser } });
    saveTokens.mockResolvedValue();
  });

  it('maps snake_case fields to camelCase', async () => {
    const user = await api.signIn('alice', 'pass');
    expect(user.fullName).toBe('Alice Smith');
    expect(user.avatar).toBe('https://cdn.example.com/avatar.jpg');
    expect(user.language).toBe('am');
    expect(user.notificationsEnabled).toBe(false);
    expect(user.phoneVerified).toBe(true);
    expect(user.preferences).toEqual(['math', 'ai']);
  });

  it('falls back to picsum URL when avatar_url is absent', async () => {
    const noAvatar = { ...rawUser, avatar_url: null };
    post.mockResolvedValue({ data: { accessToken: 'a', refreshToken: 'r', user: noAvatar } });
    const user = await api.signIn('alice', 'pass');
    expect(user.avatar).toMatch(/picsum\.photos/);
  });
});

// --- mapLesson (exercised via fetchCourseDetail) ---

describe('mapLesson — via fetchCourseDetail', () => {
  const baseLesson = {
    id: 'l1',
    course_id: 'c1',
    title: 'Intro',
    type: 'text',
    content_json: { body: 'Hello world' },
    duration_secs: 120,
    order_index: 0,
    thumbnail_url: 'https://cdn.example.com/thumb.jpg',
    has_quiz: true,
    likes_count: 10,
    saves_count: 5,
    comments_count: 3,
    shares_count: 1,
    is_liked: true,
    is_saved: false,
  };

  beforeEach(() => {
    get.mockResolvedValue({
      data: { id: 'c1', org_id: 'o1', instructor_id: 'i1', title: 'Course', lessons: [baseLesson] },
    });
  });

  it('maps snake_case fields', async () => {
    const course = await api.fetchCourseDetail('c1');
    const lesson = course._lessons[0];
    expect(lesson.courseId).toBe('c1');
    expect(lesson.duration).toBe(120);
    expect(lesson.order).toBe(0);
    expect(lesson.hasQuiz).toBe(true);
    expect(lesson.likesCount).toBe(10);
    expect(lesson.savesCount).toBe(5);
    expect(lesson.commentsCount).toBe(3);
    expect(lesson.sharesCount).toBe(1);
    expect(lesson.isLiked).toBe(true);
    expect(lesson.isSaved).toBe(false);
  });

  it('maps text content_json to { body }', async () => {
    const course = await api.fetchCourseDetail('c1');
    expect(course._lessons[0].content).toEqual({ body: 'Hello world' });
  });

  it('maps image content_json array', async () => {
    const imgLesson = { ...baseLesson, type: 'image', content_json: [{ uri: 'a.jpg', caption: 'A' }] };
    get.mockResolvedValue({ data: { id: 'c1', org_id: 'o1', instructor_id: 'i1', title: 'C', lessons: [imgLesson] } });
    const course = await api.fetchCourseDetail('c1');
    expect(course._lessons[0].content.images).toEqual([{ uri: 'a.jpg', caption: 'A' }]);
  });

  it('wraps single image object in array', async () => {
    const imgLesson = { ...baseLesson, type: 'image', content_json: { uri: 'b.jpg', caption: 'B' } };
    get.mockResolvedValue({ data: { id: 'c1', org_id: 'o1', instructor_id: 'i1', title: 'C', lessons: [imgLesson] } });
    const course = await api.fetchCourseDetail('c1');
    expect(course._lessons[0].content.images).toEqual([{ uri: 'b.jpg', caption: 'B' }]);
  });

  it('maps video content_json with youtubeId', async () => {
    const vidLesson = { ...baseLesson, type: 'video', content_json: { youtubeId: 'abc123' } };
    get.mockResolvedValue({ data: { id: 'c1', org_id: 'o1', instructor_id: 'i1', title: 'C', lessons: [vidLesson] } });
    const course = await api.fetchCourseDetail('c1');
    expect(course._lessons[0].content.youtubeId).toBe('abc123');
  });

  it('maps video content_json with video_url fallback', async () => {
    const vidLesson = { ...baseLesson, type: 'video', content_json: { video_url: 'https://cdn/vid.mp4' } };
    get.mockResolvedValue({ data: { id: 'c1', org_id: 'o1', instructor_id: 'i1', title: 'C', lessons: [vidLesson] } });
    const course = await api.fetchCourseDetail('c1');
    expect(course._lessons[0].content.videoUri).toBe('https://cdn/vid.mp4');
  });
});

// --- mapCourse ---

describe('mapCourse — via fetchCourseDetail', () => {
  it('maps snake_case fields and derives lessonIds', async () => {
    const raw = {
      id: 'c1',
      org_id: 'o1',
      instructor_id: 'i1',
      title: 'My Course',
      thumbnail_url: 'https://cdn/thumb.jpg',
      category: 'math',
      enrolled_count: 42,
      total_duration_secs: 3600,
      lessons: [{ id: 'l1', course_id: 'c1', title: 'L1', type: 'text', content_json: {}, order_index: 0, duration_secs: 60, has_quiz: false, likes_count: 0, saves_count: 0, comments_count: 0, shares_count: 0 }],
    };
    get.mockResolvedValue({ data: raw });
    const course = await api.fetchCourseDetail('c1');
    expect(course.organizationId).toBe('o1');
    expect(course.thumbnail).toBe('https://cdn/thumb.jpg');
    expect(course.enrolledCount).toBe(42);
    expect(course.totalDuration).toBe(3600);
    expect(course.lessonIds).toEqual(['l1']);
  });
});

// --- mapOrganization ---

describe('mapOrganization — via fetchOrganizations', () => {
  it('maps logo_url and _count.courses', async () => {
    get.mockResolvedValue({
      data: [{ id: 'o1', name: 'STEM Academy', logo_url: 'https://cdn/logo.png', description: 'Desc', _count: { courses: 7 } }],
    });
    const orgs = await api.fetchOrganizations();
    expect(orgs[0].logo).toBe('https://cdn/logo.png');
    expect(orgs[0].courseCount).toBe(7);
  });
});

// --- mapComment ---

describe('mapComment — via fetchComments', () => {
  it('maps body to text, parent_id to parentId', async () => {
    get.mockResolvedValue({
      data: [{
        id: 'cm1',
        lesson_id: 'l1',
        user_id: 'u1',
        user: { username: 'alice', avatar_url: 'https://cdn/av.jpg' },
        body: 'Great lesson!',
        created_at: '2025-01-01',
        likes_count: 2,
        parent_id: null,
        depth: 0,
      }],
    });
    const comments = await api.fetchComments('l1');
    expect(comments[0].text).toBe('Great lesson!');
    expect(comments[0].username).toBe('alice');
    expect(comments[0].avatar).toBe('https://cdn/av.jpg');
    expect(comments[0].likes).toBe(2);
    expect(comments[0].parentId).toBeNull();
    expect(comments[0].depth).toBe(0);
  });
});

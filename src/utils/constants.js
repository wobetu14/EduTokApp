export const COLORS = {
  background: '#000000',
  surface: '#111111',
  card: '#1A1A1A',
  cardAlt: '#222222',
  primary: '#FE2C55',
  secondary: '#25F4EE',
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  border: '#2A2A2A',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  overlay: 'rgba(0,0,0,0.6)',
  overlayDark: 'rgba(0,0,0,0.85)',
};

export const FONTS = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semiBold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  extraBold: { fontWeight: '800' },
};

export const SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 36,
  tabBarHeight: 60,
  headerHeight: 56,
  borderRadius: 8,
  borderRadiusLg: 16,
  borderRadiusFull: 999,
};

export const CATEGORIES = [
  { id: 'engineering', label: 'Engineering', icon: 'construct', color: '#4A90E2' },
  { id: 'math', label: 'Math', icon: 'calculator', color: '#9B59B6' },
  { id: 'digital', label: 'Digital', icon: 'globe', color: '#25F4EE' },
  { id: 'art', label: 'Art', icon: 'color-palette', color: '#E91E63' },
  { id: 'business', label: 'Business', icon: 'briefcase', color: '#FF9800' },
  { id: 'ai', label: 'AI', icon: 'hardware-chip', color: '#00BCD4' },
  { id: 'psychology', label: 'Psychology', icon: 'happy-outline', color: '#8BC34A' },
  { id: 'finance', label: 'Finance', icon: 'cash', color: '#4CAF50' },
];

export const LESSON_TYPES = {
  text: { label: 'Article', icon: 'document-text' },
  image: { label: 'Visual', icon: 'image' },
  video: { label: 'Video', icon: 'play-circle' },
};

export const QUIZ_TYPES = {
  truefalse: 'True / False',
  multiplechoice: 'Multiple Choice',
  imagematching: 'Image Match',
  sortzone: 'Sort Zone',
};

export const STORAGE_KEYS = {
  user: '@edutok_user',
  userProgress: '@edutok_progress',
  courses: '@edutok_courses',
  organizations: '@edutok_organizations',
  lessons: '@edutok_lessons',
  instructors: '@edutok_instructors',
  hasOnboarded: '@edutok_onboarded',
  comments: '@edutok_comments',
  badges: '@edutok_badges',
  a11y: '@edutok_a11y',
  accessToken: '@edutok_access_token',
  refreshToken: '@edutok_refresh_token',
};

export const BADGE_DEFS = [
  { id: 'first_lesson',    icon: 'star',       color: '#FFD700', labelKey: 'badgeFirstLesson',    check: (p)           => p.completedLessons.length >= 1 },
  { id: 'week_warrior',    icon: 'flame',      color: '#FF5722', labelKey: 'badgeWeekWarrior',    check: (p)           => (p.streak || 0) >= 7 },
  { id: 'quiz_master',     icon: 'trophy',     color: '#9C27B0', labelKey: 'badgeQuizMaster',     check: (p)           => p.passedQuizzes.length >= 10 },
  { id: 'century_club',    icon: 'ribbon',     color: '#25F4EE', labelKey: 'badgeCenturyClub',    check: (p)           => p.completedLessons.length >= 100 },
  { id: 'explorer',        icon: 'compass',    color: '#4CAF50', labelKey: 'badgeExplorer',       check: (p, courses)  => new Set(courses.filter((c) => p.completedLessons.some((cl) => cl.courseId === c.id)).map((c) => c.category)).size >= 5 },
  { id: 'course_graduate', icon: 'school',     color: '#FE2C55', labelKey: 'badgeCourseGraduate', check: (p, courses)  => courses.some((c) => c.lessonIds.length > 0 && c.lessonIds.every((lid) => p.completedLessons.some((cl) => cl.lessonId === lid))) },
];

export const PRESET_AVATARS = [
  'https://picsum.photos/seed/av1/200/200',
  'https://picsum.photos/seed/av2/200/200',
  'https://picsum.photos/seed/av3/200/200',
  'https://picsum.photos/seed/av4/200/200',
  'https://picsum.photos/seed/av5/200/200',
  'https://picsum.photos/seed/av6/200/200',
  'https://picsum.photos/seed/av7/200/200',
  'https://picsum.photos/seed/av8/200/200',
  'https://picsum.photos/seed/av9/200/200',
  'https://picsum.photos/seed/av10/200/200',
  'https://picsum.photos/seed/av11/200/200',
  'https://picsum.photos/seed/av12/200/200',
];

// Learner demographics (profile dialog only). `key` is stored on the API;
// age labels are numeric (no translation), gender uses i18n labelKey.
export const AGE_RANGES = [
  { key: 'under_18', label: 'Under 18' },
  { key: '18_24',    label: '18–24' },
  { key: '25_34',    label: '25–34' },
  { key: '35_44',    label: '35–44' },
  { key: '45_plus',  label: '45+' },
];

export const GENDERS = [
  { key: 'male',   labelKey: 'genderMale' },
  { key: 'female', labelKey: 'genderFemale' },
];

export const HIGH_CONTRAST_COLORS = {
  background: '#000000',
  surface: '#0A0A0A',
  card: '#141414',
  cardAlt: '#1E1E1E',
  primary: '#FF4D6D',
  secondary: '#00FFE5',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textMuted: '#999999',
  border: '#555555',
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  overlay: 'rgba(0,0,0,0.75)',
  overlayDark: 'rgba(0,0,0,0.92)',
};

export const FONT_SCALE_MAP = { sm: 0.875, md: 1.0, lg: 1.2 };

export const DIFFICULTY = {
  Beginner: { color: '#4CAF50', label: 'Beginner' },
  Intermediate: { color: '#FF9800', label: 'Intermediate' },
  Advanced: { color: '#F44336', label: 'Advanced' },
};

export const COURSE_STATUS = {
  pending:  { label: 'Pending Review', color: '#FF9800', icon: 'time-outline' },
  approved: { label: 'Approved',       color: '#4CAF50', icon: 'checkmark-circle-outline' },
  rejected: { label: 'Rejected',       color: '#F44336', icon: 'close-circle-outline' },
};

export const COURSE_VISIBILITY = {
  public:   { label: 'Public',   icon: 'globe-outline',    color: '#25F4EE' },
  unlisted: { label: 'Unlisted', icon: 'link-outline',     color: '#FF9800' },
  private:  { label: 'Private',  icon: 'lock-closed-outline', color: '#AAAAAA' },
};

export const TAB_BAR_HEIGHT = 62;

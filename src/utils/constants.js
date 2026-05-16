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
  { id: 'psychology', label: 'Psychology', icon: 'brain', color: '#8BC34A' },
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
};

export const STORAGE_KEYS = {
  user: '@edutok_user',
  userProgress: '@edutok_progress',
  courses: '@edutok_courses',
  organizations: '@edutok_organizations',
  lessons: '@edutok_lessons',
  hasOnboarded: '@edutok_onboarded',
  comments: '@edutok_comments',
};

export const DIFFICULTY = {
  Beginner: { color: '#4CAF50', label: 'Beginner' },
  Intermediate: { color: '#FF9800', label: 'Intermediate' },
  Advanced: { color: '#F44336', label: 'Advanced' },
};

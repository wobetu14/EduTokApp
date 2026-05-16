export const generateId = () =>
  Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

export const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const formatMinutes = (seconds) => {
  const m = Math.ceil(seconds / 60);
  return m === 1 ? '1 min' : `${m} mins`;
};

export const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatTimeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
};

export const truncateText = (text, maxLen = 80) => {
  if (!text || text.length <= maxLen) return text;
  return text.substr(0, maxLen).trim() + '…';
};

export const calcCourseProgress = (courseId, completedLessons, totalLessons) => {
  if (!totalLessons) return 0;
  const done = completedLessons.filter((cl) => cl.courseId === courseId).length;
  return Math.round((done / totalLessons) * 100);
};

export const isValidUsername = (u) => /^[a-zA-Z0-9_]{3,20}$/.test(u);

export const isValidPhone = (p) => /^\+?[0-9]{7,15}$/.test(p.replace(/[\s\-()]/g, ''));

export const passwordStrength = (pwd) => {
  if (!pwd || pwd.length < 8) return { level: 0, label: 'Too short', color: '#F44336' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return { level: score, label: 'Weak', color: '#F44336' };
  if (score <= 3) return { level: score, label: 'Fair', color: '#FF9800' };
  if (score <= 4) return { level: score, label: 'Strong', color: '#4CAF50' };
  return { level: score, label: 'Very Strong', color: '#00BCD4' };
};

export const formatLargeNumber = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
};

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

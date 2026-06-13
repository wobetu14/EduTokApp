import { SHARE_BASE_URL } from './apiConfig';

// https links so chat apps linkify them; they open the app via universal /
// App Links. Paths mirror the linking config (/course/:id, /lesson/:id).
export const courseLink = (courseId) => `${SHARE_BASE_URL}/course/${courseId}`;

// Query key is `courseId` (not `course`) so it maps straight onto
// LessonPlaybackScreen's route.params.courseId via the linking config.
export const lessonLink = (lessonId, courseId) =>
  `${SHARE_BASE_URL}/lesson/${lessonId}${courseId ? `?courseId=${courseId}` : ''}`;

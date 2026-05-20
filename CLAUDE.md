# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development server
npx expo start

# Run for web (browser)
npx expo start --web --port 8084

# Run on specific platform
npx expo start --android
npx expo start --ios

# Tunnel (physical device over any network) — requires ngrok authtoken
# Register at https://dashboard.ngrok.com and run: npx ngrok authtoken YOUR_TOKEN
npx expo start --tunnel --port 8084
```

`@expo/ngrok` is installed as a dev dependency — required for `--tunnel`. ngrok now requires a free account + authtoken to work.

No test suite or linter is configured.

**Git remote:** `https://github.com/wobetu14/EduTokApp.git` (branch: `master`)

## Project Overview

EduTok is a TikTok-style micro-learning mobile app built with **React Native (Expo SDK 54)**, targeting iOS, Android, and Web. It adapts TikTok's dopamine-driven engagement mechanics for educational content with 3-minute max lessons.

**Core concept:** Organization → Course → Lesson hierarchy, with personalized feeds, quiz gates, gamification, and multilingual support (English + Amharic).

**Full specification:** `docs/EduTok_Refined_Prompt.md`

---

## Architecture Overview

### Navigation Flow

`App.js` wraps everything in `SafeAreaProvider` and `AuthProvider`, then conditionally renders:
1. Loading → splash screen
2. Not signed in → `AuthScreen`
3. Signed in, not onboarded → `OnboardingScreen`
4. Signed in and onboarded → `CourseProvider` + `TabNavigator`

React Navigation v6 with four bottom tabs (ForYou, Explore, Search, Profile), each backed by a native stack in `src/navigation/StackNavigators.js`. `CourseProfile`, `OrganizationProfile`, and `LessonPlayback` are nested inside every tab stack so they're reachable from anywhere. Screen transitions: `slide_from_right` by default; `LessonPlayback` uses `slide_from_bottom` with gestures disabled.

### State Management

Two `useReducer`-backed React Context providers — no Redux or Zustand:

- **`AuthContext`** (`src/context/AuthContext.js`) — user identity, sign-in state, onboarding flag, language preference. Restores from AsyncStorage on launch. Exposes `useAuth()`.
- **`CourseContext`** (`src/context/CourseContext.js`) — courses, organizations, lessons, and all user progress (enrollments, completions, likes, favorites, quiz passes, streak). Loads via `Promise.all()` on sign-in. Exposes `useCourses()`. Progress lives in a single `userProgress` object with keys: `enrolledCourses`, `completedLessons`, `likedLessons`, `favoritedLessons`, `passedQuizzes`, `streak`, `totalSeconds`, `lastActiveDate`.

### Data / Backend Layer

The app runs entirely on-device with **AsyncStorage** — no remote backend. `apiService.js` is designed to be swapped for real HTTP calls without changing call sites.

- `src/services/storageService.js` — AsyncStorage wrapper; seeds `mockData.js` on launch if `SEED_VERSION` has changed
- `src/services/apiService.js` — abstraction layer with 300–400ms artificial delays; contexts only call this, never AsyncStorage directly
- `src/services/mockData.js` — all seed content (orgs, courses, lessons, quizzes)

To add new content, edit `mockData.js` and bump `SEED_VERSION` in `storageService.js` — the app will automatically re-seed on next launch. Do not manually clear AsyncStorage unless debugging auth/progress state.

### Content Model

Three-tier hierarchy: **Organization → Course → Lesson**.

- Lessons have a `type` field: `text`, `image`, or `video` (3-minute max for video).
- Each lesson has an optional `quiz` object. `LessonPlaybackScreen` triggers `QuizModal` before advancing to the next lesson.
- Quiz types: `truefalse`, `multipleChoice`, `imageMatching`.
- Engagement fields per lesson: `likesCount`, `savesCount`, `commentsCount`, `sharesCount` — generated deterministically from lesson ID via `engagementCounts()` in `mockData.js`.
- Video lessons store a `content.youtubeId` (11-char YouTube video ID). Playback uses `VideoPlayer` (`src/components/VideoPlayer.js`) which embeds YouTube via `react-native-webview` with the IFrame API. To swap a video, update the `youtubeId` in the `makeVideoLesson()` call and bump `SEED_VERSION`.

---

## Screens & Features

### Tab 1 — For You (`ForYouScreen`)
**Full-screen TikTok-style lesson feed** — not a course card list. Each item is one lesson rendered full-screen with swipe-up/swipe-down navigation (PanResponder, same pattern as LessonPlayback).

Feed is built from all lessons across all courses, personalized by user preferences (preferred categories first, shuffled within each group). Computed once from `useMemo` on mount.

Layout mirrors TikTok:
- Bottom-left: course title (tappable → `CourseProfileScreen`) + lesson title + type/duration/quiz badges + "Swipe up" hint
- Right column: `+` enroll button (hidden if enrolled), Like, Save, Chat, Share
- Top-right: feed position counter (e.g. "4 / 28")

Quiz gate fires before advancing when `lesson.hasQuiz && !isQuizPassed(lesson.quiz.id)`. Share uses React Native's `Share.share()`.

**PanResponder stale-closure pattern** (used here and in LessonPlayback): create the responder once with `useRef(PanResponder.create(...)).current`, then keep mutable refs (`tryGoNextRef`, `animateToPrevRef`, `currentIndexRef`) updated every render. The panResponder callbacks read from refs, never from stale closures.

Video pauses during slide transitions via `videoActive` state passed as `active` prop to `VideoPlayer`. Progress bar (red, bottom edge) tracks watch position via postMessage from the YouTube IFrame API. Progress resets to 0 on lesson change.

Engagement buttons show **counts** (not labels) for all four actions: likes, saves, chats, shares. Like and Save counts are `lesson.likesCount + 1` / `lesson.savesCount + 1` when the user has toggled them on.

### Tab 2 — Explore (`ExploreScreen`)
Card-based grid of all available courses. Each card shows thumbnail, title, and organization name. Tapping navigates to `CourseProfileScreen`.

### Tab 3 — Search (`SearchScreen`)
Course-focused search by title, organization name, or tags. Filters local AsyncStorage data for offline performance. Results displayed as a card grid.

### Tab 4 — Profile (`ProfileScreen`)
User dashboard with:
- Profile picture, username, full name, bio
- Progress analytics: overall completion %, enrolled/in-progress/completed course counts
- Learning history: completed lessons (with timestamps), passed quizzes, favorited lessons
- Engagement stats: total hours learned, current streak, badges/achievements
- Settings: learning preferences, phone verification status, language toggle (EN/AM), notification preferences

### Course Profile (`CourseProfileScreen`)
- Header: title, organization name, thumbnail
- Masonry grid of lesson thumbnails with type icon, duration, and completion status
- One-tap enrollment "+" button (TikTok follow pattern)
- Tap lesson thumbnail → `LessonPlaybackScreen`

### Lesson Playback (`LessonPlaybackScreen`)
Full-screen immersive view — plays lessons from a single course sequentially (accessed from `CourseProfileScreen`).
- Renders text, image, or video lessons full-screen
- Swipe up/down via PanResponder (same stale-closure-safe ref pattern as ForYou)
- Quiz gate fires before advancing (`hasQuiz && !isQuizPassed`)
- Bottom-left: course title + "Lesson X of Y" + progress dots
- Right-side engagement stack: Like, Save, Comment, Share — all via `EngagementButtons` (counts shown, no labels)
- Share uses `Share.share()` from React Native
- Marks lesson completed on view (`completeLesson` called in `useEffect` on `currentIndex` change)
- Video pauses during transitions via `videoActive` state; watch progress bar shown at bottom for video lessons

### Organization Profile (`OrganizationProfileScreen`)
- Org name, logo, description
- Masonry grid of published courses
- Navigable from course profiles and Explore

### Authentication (`AuthScreen`)
- Sign-up: Full Name, Username, Mobile Number, Password (with strength indicator)
- Sign-in: Username + Password, Remember Me, Forgot Password
- Validation: username 3–20 chars alphanumeric+underscore, password min 8 chars

### Onboarding (`OnboardingScreen`, first-time only)
1. Welcome/intro
2. Sign-up form
3. Learning preference multi-select
4. Phone verification (optional, skippable — shows warning badge in profile if skipped)
5. Permissions request (camera, microphone, storage, notifications)
6. Redirect to For You tab

---

## Engagement & Gamification

- **Like / Favorite** — toggleable, influences For You personalization and saves to learning history
- **Comments** — lesson-level comment threads (peer discussion); opens as bottom-sheet modal
- **Share** — `Share.share()` sends lesson title + course name as a native share sheet
- **Quiz gate** — displays before next lesson unlocks; celebratory animation on pass; retry on fail. `QuizModal` score is computed from `score` state (already updated by `handleAnswer` before Next is pressed — do not add to it again in `handleNext`)
- **Streak counter** — days with ≥1 lesson completed; displayed on profile
- **Badges** — milestone awards (e.g., "Week Warrior," "Quiz Master," "100 Lessons Learned")
- **Confetti / celebration** — on quiz pass or course completion
- **Push notifications** — lesson completion, quiz pass, daily reminder (respects timezone + user prefs)

---

## Key Conventions

- **Colors and sizing** — `src/utils/constants.js` exports `COLORS`, `FONTS`, `SIZES`, `CATEGORIES`, `LESSON_TYPES`, `QUIZ_TYPES`, `STORAGE_KEYS`. Theme is dark with `#FE2C55` (primary red) and `#25F4EE` (secondary teal). Minimum touch target: 44×44px.
- **Icons** — Ionicons from `@expo/vector-icons`.
- **Animations** — `react-native-reanimated` v4. Babel plugin is configured; worklets must follow Reanimated rules (no closures over non-shared values).
- **i18n** — `src/utils/i18n.js` with `t(key)`, `setLanguage()`, `getLanguage()`. English (`en`) and Amharic (`am`) strings defined inline. Language preference persisted via `AuthContext`. All UI text, buttons, labels, and notifications must go through `t()`.
- **Helpers** — `src/utils/helpers.js` has `generateId`, `formatDuration`, `formatTimeAgo`, `passwordStrength`, `shuffle`, etc. Use these instead of reimplementing.
- **Safe areas** — all screens wrapped in `SafeAreaProvider`; respect notches and device-specific insets.

---

## Phase Status

### Phase 1 — MVP (implemented)
Authentication, onboarding, For You tab (TikTok-style full-screen lesson feed), Explore tab, lesson playback (text/image/video) with working swipe navigation, like/favorite/share, quiz modal (truefalse, multipleChoice, imageMatching), course profile, one-tap enrollment, user dashboard, search, AsyncStorage mock data, i18n (EN + AM), streak tracking.

**Phase 1 additions:**
- YouTube video playback via `react-native-webview` + IFrame API (replaces broken direct MP4 URLs)
- Video watch progress bar (red, bottom edge, real-time from YouTube player)
- Engagement buttons show numeric counts for all four actions (likes, saves, comments, shares); no text labels
- `SEED_VERSION` auto-reseed mechanism in `storageService.js`
- Push notifications via `expo-notifications` (`src/services/notificationService.js`): lesson completion, quiz pass, course enrollment, daily reminder at 7 PM; no-ops on web; respects `user.notificationsEnabled`
- Enrollment toast (`src/components/Toast.js` + `src/context/ToastContext.js`): animated pill shown on course enroll from CourseProfileScreen, ForYouScreen, and LessonPlaybackScreen

### Phase 2 — Planned
Full comment threads with nested replies, organization directory tab, achievements/badges system, video upload 3-minute enforcement, advanced analytics, daily streak celebrations, profile customization, offline video download, high-contrast/accessibility modes.

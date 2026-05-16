# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development server
npx expo start

# Run on specific platform
npx expo start --android
npx expo start --ios
npx expo start --web
```

No test suite or linter is configured.

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

- `src/services/storageService.js` — AsyncStorage wrapper; seeds `mockData.js` on first launch
- `src/services/apiService.js` — abstraction layer with 300–400ms artificial delays; contexts only call this, never AsyncStorage directly
- `src/services/mockData.js` — all seed content (orgs, courses, lessons, quizzes)

To add new content, edit `mockData.js`. The seed runs only on first launch; to force a re-seed during development, clear AsyncStorage.

### Content Model

Three-tier hierarchy: **Organization → Course → Lesson**.

- Lessons have a `type` field: `text`, `image`, or `video` (3-minute max for video).
- Each lesson has an optional `quiz` object. `LessonPlaybackScreen` triggers `QuizModal` before advancing to the next lesson.
- Quiz types: `truefalse`, `multipleChoice`, `imageMatching`.
- Engagement fields per lesson: `likes`, `liked_by_user`, `favorites`, `favorited_by_user`, `comments_count`, `has_quiz`.

---

## Screens & Features

### Tab 1 — For You (`ForYouScreen`)
Personalized course feed based on the user's selected interest categories (set during onboarding, updated by likes/favorites). Categories: Engineering, Math, Digital, Art, Business, AI, Psychology, Finance (expandable).

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
Full-screen immersive view (TikTok-style):
- Renders text, image, or video lessons
- Swipe up/down to navigate between lessons; quiz gate fires before advancing
- Bottom-left: course title + progress indicator
- "+" enrollment button (hidden if already enrolled)
- Right-side vertical engagement stack: Like (heart), Favorite (bookmark), Comment (opens thread)
- Marks lesson completed on exit/advance

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
- **Comments** — lesson-level comment threads (peer discussion)
- **Quiz gate** — displays before next lesson unlocks; celebratory animation on pass; retry on fail
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
Authentication, onboarding, For You + Explore tabs, lesson playback (text/image/video), like/favorite, quiz modal (truefalse, multipleChoice, imageMatching), course profile, one-tap enrollment, user dashboard, search, AsyncStorage mock data, i18n (EN + AM), streak tracking.

### Phase 2 — Planned
Full comment threads with nested replies, organization directory tab, achievements/badges system, video upload 3-minute enforcement, advanced analytics, daily streak celebrations, profile customization, offline video download, push notifications, high-contrast/accessibility modes.

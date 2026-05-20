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

The app currently runs entirely on-device with **AsyncStorage** — a real backend API is in active development (see Backend API section below). `apiService.js` is the designed swap point: replace the AsyncStorage calls with real HTTP calls without touching any context or screen code.

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

### Phase 2 — Implemented

**Achievements & Badges** (`src/utils/constants.js` → `BADGE_DEFS`, `src/context/CourseContext.js`, `src/services/storageService.js`)
- 6 milestone badges: First Lesson, Week Warrior (7-day streak), Quiz Master (10 quizzes), Century Club (100 lessons), Explorer (5 categories), Course Graduate (full course)
- Badge check runs automatically after `completeLesson` and `recordQuizPass`; newly earned badges persisted to `@edutok_badges`
- Badges tab in ProfileScreen: 3-column grid, locked (30 % opacity + lock icon) vs earned, tap-to-detail modal with earn date

**Streak Celebrations** (`src/components/StreakCelebration.js`, `src/context/CourseContext.js`)
- `StreakCelebration` modal with 24-particle confetti animation built with `Animated.stagger` + `useNativeDriver` — no new packages
- Fires when streak hits milestones 3, 7, 14, or 30 days via `streakMilestone` signal in `CourseContext`; displayed from `ForYouScreen`
- Dismiss via "Keep Going!" button or auto-dismisses after 3 s

**Profile Customization** (`src/screens/ProfileScreen.js`, `src/utils/constants.js` → `PRESET_AVATARS`)
- Avatar picker inside Edit Profile modal: 12 preset circular photos from `PRESET_AVATARS`; tap to select, saved via `updateUser({ avatar })`
- `editForm` now includes `avatar` field alongside `fullName` and `bio`

**Advanced Analytics tab** (`src/screens/ProfileScreen.js`)
- Stats tab on Profile: weekly activity bar chart (last 6 months, pure `View` bars scaled to max-week), per-course completion breakdown with done/total lesson counts, quiz history list with score and timestamp

**Nested Comment Replies** (`src/components/CommentThread.js`, `src/services/apiService.js`, `src/services/storageService.js`)
- Comments stored flat with `parentId` (null = top-level) and `depth` (0 or 1); tree built client-side via `useMemo`
- Reply button per comment; `replyingTo` banner shows above input when replying; cancel resets to top-level post
- Replies collapsible under parent with red accent border; `postReply` added to apiService/storageService

**Image Matching Quiz** (`src/components/QuizModal.js`, `src/services/mockData.js`)
- `ImageMatchingQuestion` component: two-column layout — images left, shuffled labels right
- Tap an image to select (highlighted), tap a label to assign; "Check Matches" reveals inline correct/wrong per pair
- Scoring: 1 point if all pairs correct, 0 otherwise; wired into existing `handleAnswer` flow via `handleMatchComplete`
- CSS lesson (`l6`) now has an `imagematching` quiz; `SEED_VERSION` bumped to `5`

**Accessibility** (`src/context/AccessibilityContext.js`, `src/utils/constants.js`)
- `AccessibilityContext` with `fontScale` (`sm` | `md` | `lg`) and `highContrast` (bool), both persisted to `@edutok_a11y`
- `HIGH_CONTRAST_COLORS` and `FONT_SCALE_MAP` exported from `constants.js`; `useA11y()` hook exposes `C` (color palette) and `fs(size)` (scaled font size)
- Font size segmented control (A / A / A) and high contrast `Switch` added to ProfileScreen settings
- `AccessibilityProvider` wraps the app root in `App.js`

**i18n additions** (`src/utils/i18n.js`)
- 35+ new keys in EN and AM for badges, streak, avatar picker, analytics, replies, image matching, and accessibility settings

### Phase 3 — Planned (Mobile)
Organization directory tab (standalone), video upload 3-minute enforcement, offline video download, advanced notification scheduling (smart timing per user timezone), full-screen confetti on course completion, deep-link sharing, profile follower/following social graph.

---

## Backend API

A separate Node.js/Express REST API is being developed in parallel at `../edutok-api/` (sibling directory to this mobile app). It will replace the AsyncStorage mock layer entirely.

**Full architecture plan:** `docs/backend-plan.md`

**Git remote:** `https://github.com/wobetu14/edutok-api.git` (branch: `master`)

### Stack
- **Runtime / Framework:** Node.js + Express + TypeScript
- **Database:** MySQL via Prisma ORM
- **Auth:** JWT (access 15 min + refresh 7 d, rotation) + bcryptjs
- **Object storage:** Cloudinary (avatars, thumbnails, lesson images, org logos)
- **Validation:** zod | **Email:** nodemailer | **SMS:** pluggable stub (replace with Twilio / Africa's Talking)

### Roles
`super_admin` → `org_admin` → `instructor` → `learner`

### 2FA rules
| Role | 2FA channel |
|---|---|
| `learner` | Phone OTP only (enforced server-side) |
| `org_admin` / `instructor` / `super_admin` | Phone OTP **or** Email OTP (user's choice) |

Learner `email` field exists and is stored but is never used for authentication or 2FA.

### Database — 33 tables (Phase 1 + Phase 2)

**Phase 1 (29):** `users`, `refresh_tokens`, `password_reset_tokens`, `phone_verifications`, `email_verifications`, `organizations`, `org_members`, `courses`, `lessons`, `quizzes`, `enrollments`, `lesson_completions`, `quiz_passes`, `video_watch_progress`, `streaks`, `lesson_likes`, `lesson_saves`, `comments`, `comment_likes`, `share_events`, `badges`, `certificates`, `instructor_follows`, `user_preferences`, `user_settings`, `device_tokens`, `notification_logs`, `media_uploads`, `categories`, `search_history`

**Phase 2 additions (4):** `course_approvals`, `content_reports`, `audit_logs`, `announcements`

### API modules (build order)
```
✅ 1.  Project scaffold — Express, Prisma, middleware, utils
✅ 2.  Auth module — register, login, refresh, logout, phone OTP,
                     email OTP, 2FA challenge flow, forgot/reset password
✅ 3.  Users module — own profile, settings, preferences, 2FA mgmt,
                     public profile, follow/unfollow (social), admin CRUD
✅ 4.  Organizations module — CRUD, membership management
✅ 5.  Courses module — CRUD, submit/approve/reject workflow, enrollment
✅ 6.  Lessons + Quizzes module — CRUD, reorder, quiz grading, video progress
✅ 7.  Engagement module — likes, saves, comments (nested), shares
✅ 8.  Progress module — streaks, badges (6 types), certificates, analytics
✅ 9.  Notifications module — device tokens, push dispatch (Expo), in-app log
✅ 10. Media module — Cloudinary upload (avatar/thumbnail/image/logo), delete
✅ 11. Search module — full-text courses/lessons/orgs, history, categories
✅ 12. Admin module — stats, user mgmt, course review, reports, audit log,
                     announcements (Phase 2 models: course_approvals,
                     content_reports, audit_logs, announcements)
```

**Backend is feature-complete.** All 12 modules pass `npx tsc --noEmit` with zero errors.

### Mobile integration point
When wiring the mobile app to the backend, only `src/services/apiService.js` needs to change:
- Replace AsyncStorage calls with `fetch`/`axios` to `BASE_URL/api/*`
- Add `Authorization: Bearer <token>` header from `AuthContext`
- Map response shapes to existing context state — no screen or context changes required

### Backend dev commands
```bash
cd ../edutok-api

npm run dev          # start with ts-node-dev hot reload (port 3000)
npm run db:migrate   # run Prisma migrations
npm run db:seed      # seed categories, super_admin, 3 orgs, 3 instructors, sample course
npm run db:studio    # open Prisma Studio
npx tsc --noEmit     # type-check without building
```

### Key cross-module patterns
- **`logAudit`** exported from `admin.service.ts` — call from any module to write to `audit_logs`
- **`sendPush`** exported from `notifications.service.ts` — fire-and-forget push + notification log
- **`updateStreak` / `checkLessonBadges` / `checkQuizBadges`** in `src/utils/gamification.ts` — called from lessons/quizzes service after first completion
- **Route ordering rule**: literal paths (`/me`, `/reorder`, `/categories`, `/read-all`) always declared before `/:id` params in every router
- **Prisma `$transaction`**: used for all counter increments/decrements and multi-table writes that must be atomic

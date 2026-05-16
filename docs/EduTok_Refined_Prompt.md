# EduTok: 3-Minute Micro-Learning Mobile App
## Refined Development Specification

---

## 1. PROJECT OVERVIEW

**App Name:** EduTok  
**Type:** React Native mobile app for micro-learning  
**Core Concept:** Adapt TikTok's dopamine-driven engagement mechanics for educational content (3-minute max lessons)  
**Database:** AsyncStorage (for UI/UX mocking initially)  
**Architecture:** Multi-tenant (single database, multiple organizations)  
**Target Users:** Students seeking bite-sized learning; organizations offering micro-courses

---

## 2. CORE FEATURES

### 2.1 Content Structure
- **Hierarchy:** Organization → Course → Lessons
- **Lesson Types:** 
  - Text (readable articles)
  - Image (with graphical demonstrations)
  - Video (3 minutes maximum—enforce during upload)
- **Optional Assessments:** Post-lesson quizzes (multiple formats: True/False, Multiple Choice, Image Matching/Drag-Drop, and others you may suggest)
- **Quiz Trigger:** Display quiz when user scrolls up to move to the next lesson (before lesson advances)

### 2.2 Main Navigation (Tab-Based)

#### Tab 1: "For You"
- **Display:** Scrollable list of courses curated to user's learning preferences
- **Preferences Set During:** First-time user onboarding, or based on Likes, Favorite or Comments
- **Preference Categories:** Engineering, Math, Digital, Art, Business, AI, Psychology, Finance (and expandable)
- **Behavior:** Personalized feed based on user's selected interests and based on Likes, Favorite or Comments

#### Tab 2: "Explore"
- **Display:** Card-based grid/list of all available courses
- **Course Card:** Shows course thumbnail, title, organization name
- **On Course Click:** Navigate to Course Profile page

### 2.3 Course Profile Page
- **Header:** Course title, organization name, course thumbnail
- **Visual Grid:** Masonry layout of lesson thumbnails (similar to TikTok user profile)
- **Lesson Thumbnail Details:** Lesson type icon (video/text/image), duration/preview, completion status
- **One-Tap Enrollment:** "+" button (adapted from TikTok's follow feature)
- **Navigation:** Click lesson thumbnail → open Lesson Playback page

### 2.4 Lesson Playback Page (TikTok-Inspired UX)
- **Layout:**
  - Lesson content (text/image/video) centered on screen
  - Course title + progress indicator (left bottom)
  - "+" enrollment button (visible for non-enrolled users; hidden for enrolled)
  - Right-side engagement buttons (vertical stack):
    - **Like** (heart icon, toggleable)
    - **Favorite** (bookmark icon, toggleable)
    - **Comment** (speech bubble—opens comment thread for that lesson)
- **Navigation:**
  - **Swipe up/down** to move between lessons in course (full-screen scroll behavior)
  - **Lesson boundaries:** Quiz displays before advancing to next lesson (if present)
  - **Progress tracking:** Mark lesson as completed

### 2.5 Engagement & Interaction
- **Like:** Increases engagement metrics; influences "For You" personalization
- **Favorite:** Adds lesson to user's saved items
- **Comment:** Opens lesson-level comment thread (encourages peer discussion)
- **Quiz:** 
  - Displays before next lesson unlock
  - Multiple formats: True/False, Multiple Choice, Image Matching/Drag-Drop
  - Celebratory notification on pass
  - Option to retry if failed

### 2.6 Search Functionality
- **Scope:** Course-focused search
- **Search By:** Course title, organization name, keywords/tags
- **Display Results:** Card-based course grid (similar to Explore tab)
- **Performance:** Optimized for offline (filter local data where possible)

### 2.7 Organization Directory & Profiles
- **Organization Listing:** Dedicated section showing all organizations with course count
- **Organization Profile:**
  - Organization name, logo, description
  - Masonry grid of published courses
  - One-tap navigation to course profiles
- **Discoverable From:** User dashboard or separate "Organizations" tab (to be decided)

### 2.8 User Dashboard (Profile)
- **Profile Section:**
  - Profile picture
  - Username, full name
  - Bio/bio section (optional)

- **Progress Analytics:**
  - Overall completion percentage across all enrolled courses
  - Count of:
    - Completed courses
    - In-progress courses
    - Not-started courses
  - List of enrolled courses with individual progress bars

- **Learning History:**
  - List of completed lessons (with timestamps)
  - List of passed quizzes (with scores)
  - Favorite lessons (bookmarked items)

- **Preferences & Settings:**
  - Edit learning preference categories
  - Phone verification status (with warning badge if unverified)
  - Language preference (English/Amharic)
  - Notification preferences (push notifications on/off)

- **Engagement Stats (Optional but Recommended):**
  - Total hours learned
  - Current streak (days learning at least 1 lesson)
  - Badges or achievements earned

---

## 3. AUTHENTICATION FLOW

### 3.1 Sign-Up
**Required Fields:**
- Full Name
- Username (must be unique)
- Mobile Number
- Password (with strength indicator)

**Optional Actions:**
- Phone verification (with warning badge in dashboard if skipped)
- Email verification (optional, recommended for password recovery)

**Validation:**
- Username: 3-20 characters, alphanumeric + underscore
- Password: Minimum 8 characters (suggest strong password UI)
- Mobile: Valid format for user's region

### 3.2 Sign-In
**Method:** Username + Password  
**Options:**
- Remember me checkbox
- Forgot password link (triggers SMS/email reset)
- Sign up link for new users

### 3.3 Onboarding Flow (First Time Only)
1. Welcome screen / app intro
2. Sign-up form
3. **Learning Preference Selection:** Multi-select from categories (Engineering, Math, Digital, Art, Business, AI, Psychology, Finance, etc.)
4. **Phone Verification (Optional):** Offer but allow skip with warning
5. **Permissions:** Request camera/microphone/storage/notifications permissions
6. **Dashboard Redirect:** After onboarding, show "For You" tab with personalized courses

---

## 4. REWARD & ENGAGEMENT MECHANICS

### 4.1 Push Notifications
- **Lesson Completion:** Congratulatory notification after completing each lesson
- **Quiz Pass:** Celebratory message + encouragement when user passes a quiz
- **Daily Reminder:** Nudge user to learn at least one lesson per day (if they haven't already)
- **Smart Timing:** Respect user's timezone and notification preferences

### 4.2 Gamification Elements
- **Streak Counter:** Display current learning streak (days with ≥1 lesson completed)
- **Badges:** Award badges for milestones (e.g., "Week Warrior," "Quiz Master," "100 Lessons Learned")
- **Completion Celebrations:** Confetti animation / celebration screen on quiz pass or course completion
- **Progress Visuals:** Animated progress bars, percentage indicators

### 4.3 Engagement Triggers
- Celebratory notification when passing a quiz
- Positive reinforcement messages (e.g., "Great job! You're on a 5-day streak!")
- Achievement unlocked messages when reaching milestones

---

## 5. MULTILINGUAL SUPPORT

### 5.1 Supported Languages (Phase 1)
- English (default)
- Amharic (Ethiopian language)

### 5.2 Localization Scope
- All UI text, buttons, labels, messages
- Search (support Amharic characters/queries)
- Notification messages
- Date/time formatting (locale-aware)
- Course descriptions and metadata (from organization/instructor)

### 5.3 Implementation
- Use i18n library (e.g., `react-i18n` or `expo-localization`)
- Store language preference in user profile
- Allow language switching from settings

---

## 6. OFFLINE & INCLUSIVE DESIGN

### 6.1 Offline Capabilities
- **Downloadable Lessons:** Allow users to download text/image lessons for offline viewing
- **Cached Content:** Store previously viewed lessons in local storage
- **Sync Strategy:** Queue actions (likes, quiz submissions) when online, sync on reconnection
- **Offline Indicators:** Show sync status badges ("Pending Sync," "Synced," etc.)

### 6.2 Low-Bandwidth Optimization
- **Image Compression:** Serve optimized image sizes
- **Video Buffering:** Adaptive video quality based on connection speed
- **Text-First:** Emphasize text lessons over video for low-bandwidth users
- **Lite App Recommendation:** Consider separate "EduTok Lite" for devices with <2GB RAM or slow networks

### 6.3 Inclusive Design
- High contrast mode option
- Adjustable font size
- Touch-friendly button sizes (min 44x44px)
- Clear error messages in user's language
- Support for accessibility features (screen reader compatibility)

---

## 7. DATA & ARCHITECTURE

### 7.1 Multi-Tenant Structure
- **Super Administrator:** Approves organization registrations, manages platform-level insights
- **Organization Admin:** Manages instructors within their organization
- **Instructor:** Creates and manages courses
- **Student/Learner:** Enrolls in courses, completes lessons, takes quizzes

**Mobile App Scope (Frontend Only):**
- No need to handle permissions/role logic—assume backend enforces this
- Tight coupling between lessons and organization (display org name on lesson playback)
- Display organization info on course profiles

### 7.2 AsyncStorage Structure (Mocking)
```
{
  "user": {
    "id": "user_123",
    "full_name": "John Doe",
    "username": "johndoe",
    "mobile": "+251911223344",
    "profile_pic_url": "...",
    "preferences": ["Engineering", "AI"],
    "phone_verified": false,
    "language": "en"
  },
  "organizations": [
    {
      "id": "org_1",
      "name": "TechAcademy",
      "logo_url": "...",
      "course_count": 5
    }
  ],
  "courses": [
    {
      "id": "course_1",
      "title": "Intro to Python",
      "organization_id": "org_1",
      "organization_name": "TechAcademy",
      "thumbnail_url": "...",
      "lessons_count": 10,
      "enrolled": true,
      "progress": 40
    }
  ],
  "lessons": [
    {
      "id": "lesson_1",
      "course_id": "course_1",
      "title": "Variables & Data Types",
      "type": "video", // "video" | "text" | "image"
      "content_url": "...",
      "duration": 180, // seconds
      "completed": true,
      "likes": 324,
      "liked_by_user": true,
      "favorites": 89,
      "favorited_by_user": false,
      "comments_count": 12,
      "has_quiz": true
    }
  ],
  "quizzes": [
    {
      "id": "quiz_1",
      "lesson_id": "lesson_1",
      "type": "multiple_choice", // "true_false" | "multiple_choice" | "image_matching"
      "questions": [...],
      "user_score": 80,
      "passed": true
    }
  ],
  "user_progress": {
    "completed_lessons": ["lesson_1", "lesson_3"],
    "completed_courses": ["course_2"],
    "passed_quizzes": ["quiz_1", "quiz_3"],
    "favorite_lessons": ["lesson_2", "lesson_5"],
    "enrolled_courses": ["course_1", "course_2", "course_3"]
  }
}
```

### 7.3 API Integration Points (For Future Backend)
- Sign-up / Sign-in
- Fetch user preferences
- Fetch courses (with filtering by preference)
- Enroll in course
- Submit quiz answers
- Like/Favorite/Comment on lessons
- Fetch comments on lesson
- Search courses
- Fetch organization details
- Update user profile

---

## 8. TECHNICAL SPECIFICATIONS

### 8.1 Technology Stack
- **Framework:** React Native (Expo or bare React Native)
- **Styling:** Tailwind CSS (via NativeWind) **OR** Material UI (via React Native Paper)
- **Recommendation:** Use both if possible:
  - Material UI for form inputs, dialogs, snackbars (native feel)
  - Tailwind for layout and custom styling (flexibility)
- **State Management:** Context API or Redux (for cross-tab communication)
- **Local Storage:** AsyncStorage (native) or SQLite for structured data
- **Navigation:** React Navigation (bottom tab + stack navigator)
- **Video Player:** Expo Video or react-native-video
- **Image Display:** React Native Image with caching
- **Internationalization:** react-i18n or expo-localization
- **Notifications:** Expo Notifications or Firebase Cloud Messaging

### 8.2 App Structure (Suggested)
```
src/
├── navigation/
│   ├── TabNavigator.js (For You, Explore, Search, Profile)
│   └── StackNavigators.js (nested stacks)
├── screens/
│   ├── ForYouScreen.js
│   ├── ExploreScreen.js
│   ├── SearchScreen.js
│   ├── LessonPlaybackScreen.js
│   ├── CourseProfileScreen.js
│   ├── OrganizationProfileScreen.js
│   ├── ProfileScreen.js (user dashboard)
│   ├── AuthScreen.js
│   └── OnboardingScreen.js
├── components/
│   ├── CourseCard.js
│   ├── LessonCard.js
│   ├── QuizModal.js
│   ├── CommentThread.js
│   ├── EngagementButtons.js (Like, Favorite, Comment)
│   └── ProgressBar.js
├── context/
│   ├── AuthContext.js
│   └── CourseContext.js
├── services/
│   ├── storageService.js (AsyncStorage wrapper)
│   ├── mockData.js (seed data)
│   └── apiService.js (future backend calls)
├── utils/
│   ├── i18n.js (language configuration)
│   ├── helpers.js
│   └── constants.js
└── App.js
```

### 8.3 UI/UX Considerations
- **Full-Screen Lesson View:** Swipeable, immersive experience (like TikTok)
- **Smooth Transitions:** Animated lesson transitions and quiz presentations
- **Safe Areas:** Respect notches and safe areas on different devices
- **Responsive Design:** Optimize for phones (primary); test on tablets
- **Dark Mode:** Consider dark mode support (dopamine-friendly design)

---

## 9. PHASE 1 DELIVERABLES (MVP)

### Must-Have Features:
1. ✅ Authentication (Sign-up, Sign-in, Onboarding)
2. ✅ Two main tabs: "For You" + "Explore"
3. ✅ Lesson playback (text, image, video) with full-screen swipe navigation
4. ✅ Engagement buttons (Like, Favorite, Comment) on lessons
5. ✅ Basic quiz (True/False or Multiple Choice)
6. ✅ Course profile with masonry grid of lessons
7. ✅ One-tap enrollment ("+") button
8. ✅ User dashboard with progress tracking
9. ✅ Search (course-focused)
10. ✅ AsyncStorage mock data
11. ✅ Offline support (cached lessons)
12. ✅ Multilingual (English + Amharic)
13. ✅ Push notifications (completion + reminder)

### Nice-to-Have (Phase 2):
- Advanced quiz types (Image Matching, Drag-Drop)
- Comment threads (full implementation with nested replies)
- Organization directory & profiles
- Achievements/badges system
- Video upload validation (3-minute max)
- Advanced analytics dashboard
- Daily streak counter with celebrations
- Profile customization (bio, profile pic)

---

## 10. REFINEMENT QUESTIONS FOR CLARIFICATION

1. **Video Handling:** Should video uploads be enforced on backend, or should the app UI guide users to 3-minute limits?
2. **Comment Moderation:** Should comments be moderated before display, or real-time?
3. **Quiz Retry:** Should users have unlimited retries, or limited attempts per lesson?
4. **Organization Visibility:** Should organization directory be a separate tab, or embedded in "Explore"?
5. **Offline Video:** Should users be able to download videos for offline, or only text/image?
6. **Lite App:** Separate codebase or same codebase with feature flags?
7. **Initial Data:** Do you have sample course/organization data, or should we generate mock data?
8. **Dark Mode:** Required for MVP or Phase 2?
9. **Analytics:** Should the app track lesson completion time, quiz attempts, etc., beyond current structure?
10. **Locale-Specific Content:** Should courses be region-specific, or all users see all courses?

---

## 11. GLOSSARY

- **AsyncStorage:** React Native's simple key-value storage (sufficient for MVP)
- **Masonry Grid:** Pinterest-style irregular grid layout (good for varying lesson thumbnail sizes)
- **One-Tap Enrollment:** Single button press to enroll in a course (UX pattern from TikTok "follow")
- **Micro-Learning:** Short, focused learning units (3-minute max in this case)
- **Dopamine Mechanics:** Engagement triggers (notifications, animations, achievements) designed to motivate users
- **Multi-Tenant:** Single app instance serves multiple organizations (data isolation per organization)
- **Inclusive Design:** Accessible design that works for users with varying abilities and connectivity

---

## END OF SPECIFICATION

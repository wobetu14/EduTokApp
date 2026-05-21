# EduTok Backend API — Architecture Plan

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Database | MySQL |
| ORM | Prisma |
| Auth | JWT (access 15 min + refresh 7 d, httpOnly cookie) |
| Object storage | Cloudinary (lesson images, org logos, avatars) |
| File upload | multer → Cloudinary |
| Validation | zod |
| Password hashing | bcrypt |

---

## Roles & Permissions

| Role | Scope |
|---|---|
| `super_admin` | Everything — users, orgs, all courses, platform settings |
| `org_admin` | Their org — courses, lessons, instructors, org analytics |
| `instructor` | Their assigned courses — lessons, quizzes |
| `learner` | Mobile app only — progress, comments, follows |

---

## Project Structure

```
edutok-api/
├── prisma/
│   ├── schema.prisma            # full data model
│   └── seed.ts                  # seed data (mirrors mobile mockData.js)
├── src/
│   ├── config/                  # DB, env, constants, cloudinary
│   ├── middleware/              # auth (JWT), rbac, error handler, upload
│   ├── modules/
│   │   ├── auth/                # login, register, refresh token, phone verify, password reset
│   │   ├── users/               # user CRUD, role management, settings, preferences
│   │   ├── organizations/       # org CRUD, member management
│   │   ├── courses/             # course CRUD, approval workflow, enrollment
│   │   ├── lessons/             # lesson CRUD, completions, watch progress
│   │   ├── quizzes/             # quiz CRUD, quiz passes
│   │   ├── engagement/          # likes, saves, shares, comments
│   │   ├── progress/            # streaks, badges, certificates
│   │   ├── notifications/       # device tokens, push dispatch
│   │   ├── search/              # full-text search, search history
│   │   ├── media/               # Cloudinary upload, media records
│   │   └── admin/               # analytics, audit logs, reports, announcements
│   ├── utils/                   # helpers, response wrapper
│   └── app.ts
└── server.ts
```

---

## Complete Database Schema

### Auth & Security

```
users
  id, full_name, username, phone, password_hash,
  role (super_admin | org_admin | instructor | learner),
  avatar_url, bio,
  -- identity fields
  email,                          -- required for non-learners; optional/additional for learners
  is_phone_verified,              -- bool
  is_email_verified,              -- bool; always false for learners (email not used for auth)
  -- 2FA
  two_fa_enabled,                 -- bool; default false
  two_fa_method,                  -- phone | email | none
                                  -- learners: always 'phone' (enforced server-side)
                                  -- non-learners: 'phone' or 'email', user's choice
  -- account lifecycle
  is_active,                      -- bool; default true; deactivation revokes all refresh tokens
  must_change_password,           -- bool; default false; set true for managed account creation
  -- other
  lang_pref (en | am), notifications_enabled, created_at, updated_at

refresh_tokens
  id, user_id → users, token_hash, expires_at, revoked_at, created_at

password_reset_tokens
  id, user_id → users, token_hash, expires_at, used_at, created_at
  -- used for email-based reset (non-learners with email)
  -- learners reset password via phone OTP (phone_verifications with type='password_reset')

phone_verifications
  id, user_id → users, phone, code, attempts,
  type (phone_verify | two_fa | password_reset),
  expires_at, verified_at

email_verifications
  id, user_id → users, email, token_hash, attempts,
  type (email_verify | two_fa | password_reset),
  expires_at, verified_at
  -- only created for non-learner roles
```

### Auth Rules by Role

| | `learner` | `org_admin` / `instructor` / `super_admin` |
|---|---|---|
| Email field | Optional, not used for auth | Required |
| 2FA channel | Phone OTP only | Phone OTP **or** Email OTP (user's choice) |
| Password reset | Phone OTP | Email link **or** Phone OTP |
| `two_fa_method` | Always `phone` (server-enforced) | `phone` or `email` |

### Organizations & Membership

```
organizations
  id, name, logo_url, description, owner_user_id → users,
  website, created_at, updated_at

org_members
  id, user_id → users, org_id → organizations,
  role (org_admin | instructor), joined_at
  UNIQUE (user_id, org_id)
```

### Courses & Lessons

```
courses
  id, org_id → organizations, instructor_id → users,
  title, description, thumbnail_url, category,
  tags (JSON array of strings), difficulty (Beginner | Intermediate | Advanced),
  status (pending | approved | rejected), visibility (public | unlisted | private),
  enrolled_count (denormalized), total_duration_secs,
  created_at, published_at, updated_at

lessons
  id, course_id → courses, title,
  type (text | image | video),
  content_json,           -- text: {body}; image: [{uri,caption}]; video: {youtubeId}
  order_index, duration_secs, thumbnail_url, has_quiz,
  likes_count (denormalized), saves_count (denormalized),
  comments_count (denormalized), shares_count (denormalized),
  created_at, updated_at

quizzes
  id, lesson_id → lessons (UNIQUE),
  type (truefalse | multipleChoice | imageMatching),
  questions_json,         -- full question/answer/pairs array
  created_at
```

### Enrollment & Progress

```
enrollments
  id, user_id → users, course_id → courses,
  enrolled_at
  UNIQUE (user_id, course_id)

lesson_completions
  id, user_id → users, lesson_id → lessons, course_id → courses,
  completed_at
  UNIQUE (user_id, lesson_id)

quiz_passes
  id, user_id → users, quiz_id → quizzes, lesson_id → lessons,
  score (0–100), passed_at
  UNIQUE (user_id, quiz_id)

video_watch_progress
  id, user_id → users, lesson_id → lessons,
  watched_seconds, total_seconds, last_position_secs,
  updated_at
  UNIQUE (user_id, lesson_id)

streaks
  id, user_id → users (UNIQUE),
  current_streak, longest_streak, last_active_date,
  total_seconds_learned, updated_at
```

### Engagement

```
lesson_likes
  id, user_id → users, lesson_id → lessons, created_at
  UNIQUE (user_id, lesson_id)

lesson_saves
  id, user_id → users, lesson_id → lessons, created_at
  UNIQUE (user_id, lesson_id)

comments
  id, lesson_id → lessons, user_id → users,
  parent_id → comments (NULL for top-level), body,
  depth (0 | 1), likes_count (denormalized),
  created_at, updated_at

comment_likes
  id, user_id → users, comment_id → comments, created_at
  UNIQUE (user_id, comment_id)

share_events
  id, user_id → users, lesson_id → lessons, course_id → courses,
  platform (native | copy), created_at
```

### Gamification

```
badges
  id (auto), user_id → users,
  badge_key (first_lesson | week_warrior | quiz_master |
             century_club | explorer | course_graduate),
  earned_at
  UNIQUE (user_id, badge_key)

certificates
  id, user_id → users, course_id → courses,
  certificate_number (UNIQUE, e.g. EDUTOK-XXXXXXXXXX),
  student_name, course_name, organization_name, instructor_name,
  category, difficulty, issued_at
  UNIQUE (user_id, course_id)
```

### Social

```
instructor_follows
  id, follower_id → users, instructor_id → users,
  created_at
  UNIQUE (follower_id, instructor_id)
```

### Settings & Preferences

```
user_preferences
  id, user_id → users (UNIQUE),
  preferred_categories (JSON array of category slugs),
  onboarding_completed (bool), updated_at

user_settings
  id, user_id → users (UNIQUE),
  font_scale (sm | md | lg), high_contrast (bool),
  notifications_enabled (bool), daily_reminder_time (HH:MM),
  updated_at
```

### Notifications

```
device_tokens
  id, user_id → users, token, platform (ios | android),
  created_at, updated_at
  UNIQUE (user_id, platform)

notification_log
  id, user_id → users,
  type (lesson_complete | quiz_pass | enrollment | daily_reminder | badge_earned),
  title, body, data_json, read_at, created_at
```

### Media

```
media_uploads
  id, uploader_id → users,
  resource_type (avatar | course_thumbnail | lesson_image | org_logo),
  cloudinary_public_id (UNIQUE), url, bytes, format,
  created_at
```

### Lookup / Config

```
categories
  id (slug e.g. engineering), label, icon, color
  -- seeded at startup; not user-editable
```

### Search

```
search_history
  id, user_id → users, query, result_count, created_at
```

---

## Phase 2 — Admin Dashboard Additions

```
course_approvals
  id, course_id → courses,
  submitted_by → users (nullable, set at submission time),
  submitted_at (nullable, set at submission time),
  reviewer_id → users (nullable, set at review time),
  reviewed_at (nullable, set at review time),
  status (pending | approved | rejected),   -- default: pending
  notes,
  created_at
  -- Named Prisma relations: "CourseApprovalSubmitter" and "CourseApprovalReviewer" on User

content_reports
  id, reporter_id → users,
  content_type (lesson | comment | course | user), content_id,
  reason, status (pending | reviewed | resolved),
  reviewed_by → users, review_notes, created_at

audit_logs
  id, actor_id → users, action,
  resource_type, resource_id, metadata_json,
  ip_address (nullable), user_agent (nullable),   -- captured from request context
  created_at

announcements
  id, title, body,
  target_role (nullable String),   -- null = all roles; set to specific role slug to filter delivery
  created_by → users, published_at, expires_at
```

---

## Entity Summary

| # | Table | Phase | Purpose |
|---|---|---|---|
| 1 | users | 1 | Core identity + role |
| 2 | refresh_tokens | 1 | JWT rotation |
| 3 | password_reset_tokens | 1 | Email-based password reset (non-learners) |
| 4 | phone_verifications | 1 | Phone OTP — 2FA, phone verify, password reset (learners) |
| 4b | email_verifications | 1 | Email OTP/token — 2FA, email verify, password reset (non-learners) |
| 5 | organizations | 1 | Content publishers |
| 6 | org_members | 1 | Org roles junction |
| 7 | courses | 1 | Course catalog |
| 8 | lessons | 1 | Lesson content |
| 9 | quizzes | 1 | Quiz per lesson |
| 10 | enrollments | 1 | User ↔ course join |
| 11 | lesson_completions | 1 | Watch history |
| 12 | quiz_passes | 1 | Quiz gate state |
| 13 | video_watch_progress | 1 | Real-time progress bar |
| 14 | streaks | 1 | Daily streak state |
| 15 | lesson_likes | 1 | Like toggle |
| 16 | lesson_saves | 1 | Save/favorite toggle |
| 17 | comments | 1 | Threaded discussion |
| 18 | comment_likes | 1 | Comment upvotes |
| 19 | share_events | 1 | Share analytics |
| 20 | badges | 1 | Earned milestones |
| 21 | certificates | 1 | Course completion cert |
| 22 | instructor_follows | 1 | Follow instructor |
| 23 | user_preferences | 1 | Learning categories, onboarding |
| 24 | user_settings | 1 | A11y, notifications |
| 25 | device_tokens | 1 | Push notification tokens |
| 26 | notification_log | 1 | In-app notification history |
| 27 | media_uploads | 1 | Cloudinary asset tracking |
| 28 | categories | 1 | Lookup (seeded) |
| 29 | search_history | 1 | Per-user search log |
| 30 | course_approvals | 2 | Admin approval workflow |
| 31 | content_reports | 2 | Moderation queue |
| 32 | audit_logs | 2 | Admin activity trail |
| 33 | announcements | 2 | Platform-wide notices |

---

## API Module Build Order

```
1.  Project setup — Express, Prisma init, env, Cloudinary config
2.  Prisma schema + migration + seed (maps to mockData.js content)
3.  Auth module — register, login, refresh token, JWT middleware
4.  RBAC middleware — role-based route guard
5.  Users module — CRUD, settings, preferences
6.  Organizations module — CRUD, member management
7.  Courses module — CRUD, approval workflow
8.  Lessons + Quizzes module
9.  Enrollment + Progress module — enrollments, completions, streaks
10. Engagement module — likes, saves, comments, comment likes, shares
11. Gamification module — badges, certificates
12. Social module — instructor follows
13. Notifications module — device tokens, push dispatch
14. Media module — multer + Cloudinary upload
15. Search module — full-text, search history
16. Admin module — analytics, audit logs (Phase 2)
```

---

## Admin Dashboard (Phase 2, built after API is stable)

Separate **React + Vite** web app. Role-gated views:

- **Super admin** — user management, all orgs/courses, platform analytics, audit logs, announcements, content moderation
- **Org admin** — org-scoped course/lesson editor, instructor management, approval submissions, org analytics
- **Instructor** — lesson/quiz editor for assigned courses, student progress view

---

## Mobile App Integration

The mobile app (`src/services/apiService.js`) is already structured as a drop-in swap:
- Replace AsyncStorage delays with real `fetch`/`axios` calls
- Add `Authorization: Bearer <token>` header to all requests
- Map API response shapes to existing context state (`AuthContext`, `CourseContext`)
- `CertificateScreen` needs a real `GET /certificates?courseId=` endpoint
- `AuthorProfileScreen` needs `GET /users/:id/follow` state and `POST /users/:id/follow`

---

## Design Notes

- **2FA enforcement:** `two_fa_method` is server-validated on every login — if `role === 'learner'` the API rejects any attempt to set `two_fa_method = 'email'`, regardless of payload. Learners always go through phone OTP. This means even if the mobile client sends the wrong value, the server overrides it.
- **Email field for learners:** stored and displayable (profile), but never used as a login credential or 2FA channel. The field is nullable; validation skips format checks if null.
- `content_json` on lessons stores type-specific content: `{body}` for text, `[{uri, caption}]` for image, `{youtubeId}` for video
- `questions_json` on quizzes stores the full question/answer/pairs array (same shape as mobile mockData)
- Denormalized counts (`likes_count`, `saves_count`, etc.) are updated via DB triggers or in-transaction increments — avoids COUNT(*) on hot reads
- Badge logic runs server-side after `lesson_completions` insert, same 6 milestones as mobile
- Streak logic: compare `last_active_date` on each lesson completion; reset if gap > 1 day
- Certificate `certificate_number` is generated as `EDUTOK-` + 10-char uppercase random alphanumeric; verify endpoint at `/verify/:certificateNumber` is public
- `instructor_follows` enables `followersCount` on `AuthorProfileScreen` — Phase 3 can expand this to a full social graph

---

## Account Lifecycle — Managed Accounts

Users created by admins (not self-registered) follow a forced-reset flow:

1. Admin calls `POST /api/users/managed` — generates a 12-char temp password from a safe alphanumeric charset, sets `must_change_password = true`, creates org membership automatically. Response returns `{ user, tempPassword }` — shown once, never stored in plaintext.
2. On first login the response includes `must_change_password: true` regardless of whether 2FA is used.
3. Client must call `POST /api/auth/change-password-first-login` (requires Bearer token). Server verifies `must_change_password === true`, hashes new password, clears the flag, revokes all existing refresh tokens, issues fresh tokens.
4. Deactivation: `PATCH /api/users/:id/active` with `{ is_active: false }` immediately revokes all refresh tokens. Subsequent logins return 403. `org_admin` can only deactivate instructors within their own org; `super_admin` can deactivate anyone.

---

## Org Isolation Rules

- **Creating organizations:** `super_admin` only (`POST /api/organizations`). `org_admin` cannot create new orgs.
- **Listing org members:** `org_admin` can only list members of orgs they belong to. `super_admin` can list any org's members.
- **Pending course review:** Admin `GET /api/admin/courses/pending` — `org_admin` receives only courses from their own orgs; `super_admin` sees all.
- **Course approval/rejection:** Admin `PATCH /api/admin/courses/:id/review` — `org_admin` can only review courses within their own orgs.
- **Org-scoped analytics:** `GET /api/admin/org-stats?org_id=` — available to `super_admin` (any org) and `org_admin` (their own orgs only).

---

## Course Visibility & Lesson Access Policy

| Course state | `GET /courses/:id` | `GET /lessons/:id` | Enrollment |
|---|---|---|---|
| `approved + public` | Anyone (no auth) | Any authenticated user, no enrollment needed | Allowed |
| `approved + unlisted` | Any authenticated user | Any authenticated user, no enrollment needed | Allowed |
| `approved + private` | Staff only¹ | Enrollment required for learners | Blocked |
| Any non-approved | Staff only¹ | Enrollment required for learners | Blocked |

¹ Staff = course instructor, org_admin of the same org, super_admin.

`POST /lessons/:id/complete` and quiz submission always require enrollment regardless of visibility.

**Mobile feed behaviour:** `ForYouScreen` (discovery) shows one lesson per course. Unenrolled users can view and scroll freely — no quiz gate, no completion tracking. Enrollment is enforced at the `CourseProfileScreen → LessonPlaybackScreen` boundary: tapping a lesson auto-enrolls then navigates.

---

## Additional Endpoints (post-initial build)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/change-password-first-login` | Bearer | Mandatory first-login reset; clears `must_change_password`, revokes sessions |
| `POST` | `/api/users/managed` | super_admin / org_admin | Create managed instructor/org_admin account; returns temp password once |
| `PATCH` | `/api/users/:id/active` | super_admin / org_admin | Activate or deactivate user; revokes sessions on deactivation |
| `PATCH` | `/api/users/me/password` | Bearer | Self-service password change; revokes sessions |
| `GET` | `/api/courses/mine` | instructor / org_admin / super_admin | All own courses (all statuses + visibilities) |
| `GET` | `/api/admin/org-stats` | super_admin / org_admin | Org-scoped analytics |

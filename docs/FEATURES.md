# AskHub Feature Checklist & Implementation Roadmap

This checklist breaks down the features defined in [`docs/PRODUCT_SPEC.md`](./PRODUCT_SPEC.md) into small, independently testable implementation tasks. It strictly preserves the product specification's feature categories and proposed build order, organizing work into **MVP Core Features**, **Later Improvements & Platform Features**, and **Optional AI Extras**.

---

## Part 1: MVP Core Features

### Build Phase 1: Accounts, Users, and Core Posts CRUD

#### 1. Accounts and Auth
- [ ] **Data Model & Migrations**
  - [ ] Define `User` schema (email, username, passwordHash, displayName, bio, avatarUrl, reputation, role, status, createdAt).
  - [ ] Configure database constraints (unique email, unique username).
- [ ] **Registration & Email Verification**
  - [ ] Implement registration DTO with validation (`email`, `username`, `password`, `displayName`).
  - [ ] Hash passwords using bcrypt/argon2 before persistence.
  - [ ] Generate email verification token and dispatch verification email.
  - [ ] Implement email verification endpoint (`/auth/verify-email`) to transition user to active status.
- [ ] **Authentication & Token Management**
  - [ ] Implement local login endpoint returning JWT access and refresh tokens.
  - [ ] Implement refresh token rotation and hashed refresh token persistence.
  - [ ] Implement token revocation on logout (`/auth/logout`).
  - [ ] Implement password reset request and token verification endpoint (`/auth/reset-password`).
  - [ ] Configure OAuth integration (Google or GitHub).
- [ ] **User Profiles & Lifecycle**
  - [ ] Implement public profile endpoint (`GET /users/:id` or `GET /users/:username`) with reputation, post counts, and stats.
  - [ ] Implement profile update endpoint (`PATCH /users/me`) for bio, avatarUrl, and displayName.
  - [ ] Implement account deletion with content anonymization (reassign posts to an anonymized user instead of hard deletion).

#### 2. Questions CRUD (Core)
- [ ] **Data Model & Migrations**
  - [ ] Define `Question` schema (authorId, title, body, slug, status, acceptedAnswerId, viewCount, score, answerCount, bountyAmount, createdAt).
- [ ] **CRUD Operations**
  - [ ] Implement question creation (`POST /questions`) with markdown body sanitization against XSS.
  - [ ] Generate unique URL slugs for created questions.
  - [ ] Implement question update endpoint (`PATCH /questions/:id`) allowing edits by author or moderators.
  - [ ] Implement soft-delete for questions (`DELETE /questions/:id`).
  - [ ] Implement question retrieval by ID/slug with author information.

#### 3. Answers CRUD (Core)
- [ ] **Data Model & Migrations**
  - [ ] Define `Answer` schema (questionId, authorId, body, score, isAccepted, status, createdAt).
- [ ] **CRUD Operations**
  - [ ] Implement answer creation (`POST /questions/:id/answers`) with markdown sanitization.
  - [ ] Increment `answerCount` on parent question atomically upon answer creation.
  - [ ] Implement answer update endpoint (`PATCH /answers/:id`).
  - [ ] Implement answer soft-delete endpoint (`DELETE /answers/:id`).
  - [ ] Implement list answers for a question with sorting options.

---

### Build Phase 2: Tags and Search & Discovery

#### 1. Tags & Taxonomy
- [ ] **Data Model & Associations**
  - [ ] Define `Tag` schema (name, slug, description, synonymOf, usageCount).
  - [ ] Define `QuestionTag` join schema with composite unique index.
- [ ] **Question Tagging Rules**
  - [ ] Validate questions contain between 1 and 5 tags during creation/update.
  - [ ] Implement tag resolution for existing tags and increment `usageCount`.
  - [ ] Enforce reputation threshold check for creating new/unknown tags (prevent low-reputation users from creating tags).
- [ ] **Discovery & Autocomplete**
  - [ ] Implement tag list and search endpoint (`GET /tags`) with usage counts and descriptions.
  - [ ] Implement fast prefix autocomplete endpoint (`GET /tags/autocomplete?q=`).

#### 2. Search & Discovery
- [ ] **PostgreSQL Full-Text Search**
  - [ ] Set up PostgreSQL `tsvector` columns and GIN indexes on question titles and bodies.
  - [ ] Implement search endpoint (`GET /search`) with ranking and highlighted snippets.
- [ ] **Search Filters & Sorting**
  - [ ] Implement query filters: tag filter, author filter, answered/unanswered, has accepted answer, minimum score, and date range.
  - [ ] Implement search sorting modes: newest, most votes, most active, and trending.
- [ ] **Duplicate Title Detection & Related Posts**
  - [ ] Implement title duplicate detection endpoint (`GET /questions/check-duplicates?title=`) to suggest similar existing questions.
  - [ ] Implement related questions endpoint (`GET /questions/:id/related`) based on shared tags and text matching.
- [ ] **Question View Counting & Hot Ranking**
  - [ ] Implement view count increment with IP and user ID deduplication window.
  - [ ] Implement "Hot" ranking calculation combining vote score, view count, and time decay.

---

### Build Phase 3: Voting & Reputation Ledger

#### 1. Voting System
- [ ] **Data Model & Constraints**
  - [ ] Define `Vote` schema (userId, targetType [question|answer], targetId, value [+1|-1], createdAt).
  - [ ] Enforce unique database constraint on `(userId, targetType, targetId)`.
- [ ] **Voting Rules & Idempotency**
  - [ ] Enforce self-voting prohibition (users cannot vote on their own questions or answers).
  - [ ] Enforce reputation threshold check to cast votes (e.g., minimum 15 reputation).
  - [ ] Implement idempotent vote handling: duplicate identical vote request produces a no-op / success without changing score.
  - [ ] Implement vote flip handling: switching between +1 and -1 adjusts target score by 2 and updates ledger accordingly.
  - [ ] Implement vote retraction endpoint: removes existing vote, rolls back target score, and reverses ledger deltas.
- [ ] **Concurrency & Transactions**
  - [ ] Wrap vote submission, target post score update, and reputation events in atomic database transactions.
  - [ ] Verify concurrency safety and race-condition resistance under simultaneous requests.

#### 2. Reputation Ledger
- [ ] **Data Model & Auditability**
  - [ ] Define `ReputationEvent` schema (userId, delta, reason, sourceType, sourceId, createdAt).
  - [ ] Maintain reputation as an append-only ledger; never mutate user reputation directly without ledger events.
- [ ] **Event Triggers & Caps**
  - [ ] Record reputation gain on receiving an upvote on question (+10) and answer (+10).
  - [ ] Record reputation penalty on receiving a downvote (-2).
  - [ ] Record reputation deduction on casting a downvote (-1 to the voter).
  - [ ] Implement daily reputation cap (e.g., +200 max gain per day from votes, excluding accepted answer bonuses).
  - [ ] Implement reputation rollback on vote retraction or post deletion.
  - [ ] Provide user reputation history endpoint (`GET /users/:id/reputation-history`).

---

### Build Phase 4: Accepting Answers, Comments, and Post Revisions

#### 1. Accepted Answers
- [ ] Implement accept answer endpoint (`POST /questions/:id/accept-answer/:answerId`).
- [ ] Restrict acceptance strictly to the question author.
- [ ] Award reputation bonuses via ledger (+15 for answer author, +2 for question author).
- [ ] Allow switching accepted answer and correctly rollback/reassign ledger reputation events.
- [ ] Prevent question author from accepting their own answer for reputation gain.

#### 2. Comments
- [ ] **Data Model & Limits**
  - [ ] Define `Comment` schema (targetType [question|answer], targetId, authorId, body, createdAt).
- [ ] **Comment Endpoints & Rules**
  - [ ] Implement comment creation (`POST /comments`) with character length constraints (min 15, max 600 characters).
  - [ ] Implement comment deletion endpoint (`DELETE /comments/:id`) for authors and moderators.
  - [ ] Enforce comment creation rate limiting to prevent spamming.
  - [ ] Implement comments retrieval for questions and answers.

#### 3. Post Revisions
- [ ] **Data Model & Tracking**
  - [ ] Define `Revision` schema (targetType, targetId, editorId, previousTitle, previousBody, editSummary, createdAt).
- [ ] **Revision History & Community Edits**
  - [ ] Automatically create a `Revision` record whenever a question or answer is updated.
  - [ ] Enforce permission checks: authors edit freely; third-party users require privilege threshold (e.g., 500 reputation).
  - [ ] Implement revision history endpoint (`GET /posts/:targetType/:targetId/revisions`).
  - [ ] Implement revision diff endpoint to show additions and deletions between versions.

#### 4. Feed & Pagination Controls
- [ ] Implement cursor-based pagination for question feeds and timeline views.
- [ ] Standardize offset/limit pagination across listing endpoints (tags, users, search).

---

## Part 2: Later Improvements & Platform Features

### Build Phase 5: Moderation and Flags

#### 1. Flagging & Reports
- [ ] **Data Model**
  - [ ] Define `Report` schema (reporterId, targetType, targetId, reason, status [pending|resolved|dismissed], resolvedBy, createdAt).
- [ ] **Reporting Endpoints**
  - [ ] Implement report creation (`POST /reports`) for spam, abuse, or low quality.
  - [ ] Enforce rate limits and prevent duplicate pending flags by the same user on the same post.
- [ ] **Automated Rules**
  - [ ] Trigger auto-flagging on suspicious patterns (e.g., new accounts posting high link density).
  - [ ] Automatically hide or queue for review any post receiving 3 or more flags.

#### 2. Moderator Dashboard & Actions
- [ ] **Dashboard Endpoints**
  - [ ] Implement moderator flag queue listing (`GET /moderation/flags`) with filtering by status and target type.
  - [ ] Restrict moderation endpoints via guards to `moderator` and `admin` roles.
- [ ] **Moderator Actions**
  - [ ] Implement dismiss flag action (`POST /moderation/flags/:id/dismiss`).
  - [ ] Implement moderator post deletion / purge action (`POST /moderation/posts/:id/delete`).
  - [ ] Implement user warning action (`POST /moderation/users/:id/warn`).
  - [ ] Implement user suspension action (`POST /moderation/users/:id/suspend`).
  - [ ] Implement audit log capturing every moderator action with actor ID, action type, and timestamp.

#### 3. Question Closure & Bounties
- [ ] Implement close question endpoint (`POST /questions/:id/close`) with reasons (`duplicate`, `off-topic`) and target duplicate link.
- [ ] Implement reopen question endpoint (`POST /questions/:id/reopen`) with privilege check.
- [ ] Implement bounty offering endpoint (`POST /questions/:id/bounty`): spend author reputation to fund bounty.
- [ ] Implement bounty award endpoint (`POST /questions/:id/bounty/award/:answerId`) and auto-expiration background job.

---

### Build Phase 6: Notifications and Background Jobs

#### 1. Notifications
- [ ] **Data Model & In-App Alerts**
  - [ ] Define `Notification` schema (userId, type, payload, readAt, createdAt).
  - [ ] Trigger notifications on key events: question answered, comment added, answer accepted, badge awarded.
- [ ] **Notification Management Endpoints**
  - [ ] Implement notification list endpoint (`GET /notifications`).
  - [ ] Implement unread count endpoint (`GET /notifications/unread-count`).
  - [ ] Implement mark-as-read endpoints (`PATCH /notifications/:id/read`, `POST /notifications/mark-all-read`).
  - [ ] Implement notification preferences endpoint (`GET /users/me/notification-settings`, `PATCH /users/me/notification-settings`).
- [ ] **Real-Time Delivery**
  - [ ] Set up real-time notification gateway using WebSockets or Server-Sent Events (SSE).

#### 2. Background Processing (BullMQ & Redis)
- [ ] **Worker Infrastructure**
  - [ ] Set up Redis connection and BullMQ queue module in NestJS.
- [ ] **Badges & Gamification**
  - [ ] Define `Badge` and `UserBadge` schemas.
  - [ ] Implement background workers to evaluate badge criteria:
    - [ ] "First Answer" badge.
    - [ ] "10 Upvotes" badge.
    - [ ] "Accepted Answer" badge.
    - [ ] "Good Question" (25+ score) badge.
    - [ ] "Tag Specialist" badge.
  - [ ] Implement user visit streak tracking worker for consecutive activity days.
  - [ ] Implement weekly, monthly, and all-time reputation leaderboards.
- [ ] **Email Digests & Maintenance Jobs**
  - [ ] Implement scheduled daily/weekly email digest worker for followed tags.
  - [ ] Implement view count flush / recalculation background worker.

---

### Build Phase 7: Uploads, Follows, and Personalized Feeds

#### 1. File & Image Uploads
- [ ] Configure S3-compatible object storage client (MinIO for local development).
- [ ] Implement post image upload endpoint (`POST /uploads/images`) with size limit and MIME-type validation.
- [ ] Store image metadata and return sanitized CDN / storage URL for embedding in markdown.

#### 2. Social Follows & Bookmarks
- [ ] **Data Models**
  - [ ] Define `TagFollow`, `UserFollow`, and `Bookmark` schemas.
- [ ] **Follow Endpoints**
  - [ ] Implement follow / unfollow tag endpoints (`POST /tags/:id/follow`, `DELETE /tags/:id/follow`).
  - [ ] Implement follow / unfollow user endpoints (`POST /users/:id/follow`, `DELETE /users/:id/follow`).
  - [ ] Implement bookmark / unbookmark question endpoints (`POST /questions/:id/bookmark`, `DELETE /questions/:id/bookmark`).
  - [ ] Implement reading list / bookmarks query endpoint (`GET /bookmarks`).
- [ ] **Personalized Feed**
  - [ ] Implement personalized feed algorithm aggregating activity from followed tags and users (`GET /feed`).

---

### Build Phase 8: Platform Hardening, Quality, and Administration

#### 1. Rate Limiting & Abuse Prevention
- [ ] Implement global and route-specific rate limiting using `@nestjs/throttler` backed by Redis.
- [ ] Apply stricter rate limits to new accounts (< 50 reputation or < 3 days old).
- [ ] Add spam prevention: honeypot field checks, post frequency cooldowns, and external link restrictions for new users.

#### 2. Administration & Governance
- [ ] Implement admin user management endpoints (`GET /admin/users`, `PATCH /admin/users/:id/role`, `POST /admin/users/:id/ban`).
- [ ] Implement tag management endpoints: tag merging (`POST /admin/tags/merge`) and synonym definition (`POST /admin/tags/synonyms`).
- [ ] Implement site statistics dashboard endpoint (`GET /admin/stats`).
- [ ] Implement GDPR-compliant user data export endpoint (`GET /users/me/export`).

#### 3. API Observability, Documentation, and Health
- [ ] Generate comprehensive OpenAPI / Swagger specifications (`/api/docs`).
- [ ] Set up structured JSON logging across all modules.
- [ ] Implement standardized exception filters ensuring uniform error responses.
- [ ] Enhance health check endpoint (`/health`) with database, Redis, and disk storage probes.

---

## Part 3: Optional AI Extras

### Build Phase 9: AI Extras

- [ ] **Draft Answer Suggestions**
  - [ ] Implement background or on-demand worker to generate draft answers for unanswered questions.
  - [ ] Visually and semantically label all AI-generated drafts clearly as AI content.
- [ ] **Automatic Tag Suggestions**
  - [ ] Implement tag recommendation endpoint (`POST /ai/suggest-tags`) predicting relevant tags from title and body text.
- [ ] **Semantic Duplicate Detection (pgvector)**
  - [ ] Integrate PostgreSQL `pgvector` extension for question embedding storage.
  - [ ] Generate embeddings on question creation and perform vector cosine similarity search to catch semantic duplicates.
- [ ] **Weekly Curated Digest**
  - [ ] Implement automated AI summarizer to generate a weekly "best of AskHub" digest email.

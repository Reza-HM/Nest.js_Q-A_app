# AskHub: Q&A and Knowledge Community Backend

A mini Stack Overflow with a reputation system, built as a NestJS/TypeScript backend. People ask questions, others answer, the community votes, and trust builds over time. The domain is easy to picture, and it still needs real backend work: permissions that depend on reputation, ranking, search, notifications, moderation and anti-abuse.

## Data (core entities)

| Entity | Key fields |
| --- | --- |
| **User** | email, username, passwordHash, displayName, bio, avatarUrl, reputation, role (user, moderator, admin), status (active, suspended), createdAt |
| **Question** | authorId, title, body (markdown), slug, status (open, closed, deleted), acceptedAnswerId, viewCount, score, answerCount, bountyAmount, createdAt |
| **Answer** | questionId, authorId, body, score, isAccepted, status |
| **Comment** | targetType (question or answer), targetId, authorId, body |
| **Tag** | name, slug, description, synonymOf, usageCount |
| **QuestionTag** | questionId, tagId |
| **Vote** | userId, targetType, targetId, value (+1 or -1), unique per user and target |
| **Revision** | targetType, targetId, editorId, previousBody, previousTitle, editSummary, createdAt |
| **Badge / UserBadge** | name, description, criteria, awardedAt |
| **ReputationEvent** | userId, delta, reason, sourceType, sourceId |
| **Notification** | userId, type, payload, readAt |
| **Report (flag)** | reporterId, targetType, targetId, reason, status, resolvedBy |
| **Bookmark / TagFollow / UserFollow** | simple join tables |

## Feature set

### 1. Accounts and auth

- Register, login, logout, and email verification
- JWT access tokens with refresh token rotation
- Password reset by emailed token
- OAuth login (GitHub or Google)
- Public profile with stats (reputation, answers, badges), plus an editable profile
- Account deletion that anonymizes content instead of removing it

### 2. Questions

- Create, edit and soft-delete questions, with markdown bodies sanitized against XSS
- 1 to 5 tags per question, and unknown tags can only be created by users with enough reputation
- Slugs for URLs, and duplicate detection that suggests similar existing questions while typing the title
- View counting with per-user and per-IP dedupe
- Close as duplicate (linking to the original) or as off-topic, and reopen
- Bounties: spend your own reputation to attract answers, with the bounty awarded or expiring

### 3. Answers and comments

- Post answers, edit them, and delete them
- The asker can accept one answer, and changing the accepted answer is allowed
- Comments on both questions and answers, with a length limit and a rate limit
- Pagination everywhere, with cursor-based pagination for feeds

### 4. Voting and reputation

- Upvote and downvote questions and answers, one vote per user, and a vote can be changed or retracted
- You can't vote on your own posts
- Downvoting costs the voter a little reputation, and thresholds unlock privileges (for example, voting needs 15 reputation and editing others' posts needs 500)
- Reputation changes through an append-only ledger (`ReputationEvent`), never by editing a number directly
- Daily reputation caps to limit abuse
- Votes are idempotent and safe under concurrent requests, using transactions and unique constraints

### 5. Search and discovery

- Full-text search across titles and bodies with PostgreSQL's `tsvector`, ranking and highlighted snippets
- Filters: tag, author, answered or unanswered, has accepted answer, minimum score, date range
- Sorting: newest, most votes, most active, trending
- Tag pages, a tag autocomplete endpoint, and related-questions suggestions
- "Hot" ranking that decays by time and combines votes and views

### 6. Revisions and moderation

- Full edit history for every post, with diffs between versions
- Community edits by high-reputation users, applied immediately or via a review queue
- Flagging: users report spam, abuse or low-quality posts
- Moderator dashboard endpoints for the flag queue, with actions to dismiss, delete, warn or suspend
- Auto-flagging on rules, such as a new user posting many links, or three flags on one post
- Audit log of every moderator action

### 7. Badges and gamification

- Badges awarded by background jobs, such as First Answer, 10 Upvotes, Accepted Answer, Good Question (25+ score), and Tag Specialist
- Leaderboards for the week, month and all time
- Streaks for consecutive visit days

### 8. Notifications

- In-app notifications when someone answers your question, comments, accepts your answer or gives you a badge
- Email digests (daily or weekly) of new questions in followed tags
- Per-user notification settings
- Real-time delivery over WebSocket or SSE
- An unread count and mark-as-read endpoints

### 9. Follows and personalization

- Follow tags, users and individual questions
- A personalized feed built from followed tags and users
- Bookmarks and reading lists

### 10. Platform and quality features

- Rate limiting per IP and per user, tighter for new accounts
- Spam protection: honeypot fields, link limits and cooldowns for new users
- Image uploads for posts, stored in S3-compatible storage (MinIO locally), with size and type limits
- OpenAPI docs, structured logging, health checks and a consistent error format
- Admin endpoints for managing users, tags (merge and synonyms) and site stats
- Data export for a user's own content (GDPR-style)

### 11. Optional AI extras

- Draft-answer suggestions for unanswered questions, labeled as AI
- Auto-suggested tags when you write a question
- Duplicate detection using embeddings (pgvector)
- A weekly "best of" summary email

## Suggested stack

- **NestJS** with TypeScript and modules per domain (auth, users, questions, answers, votes, tags, search, notifications, moderation)
- **PostgreSQL** with Prisma or Drizzle, plus pgvector later if you add the AI features
- **Redis** for rate limiting, caching and the job queue (BullMQ)
- **BullMQ workers** for badges, digests, reputation recalculation and view counting
- **MinIO** for uploads, and **Docker Compose** for local setup
- **Jest or Vitest** with Testcontainers for integration tests

## Build order

1. Auth, users, and the questions and answers CRUD
2. Tags and search
3. Voting and the reputation ledger
4. Accepting answers, comments and revisions
5. Moderation and flags
6. Notifications and background jobs (badges, digests)
7. Uploads, follows and the personalized feed
8. Hardening: rate limits, caching, tests, docs
9. AI extras

## Vibe coding notes

The reputation ledger and voting concurrency are the parts to watch closely, because they fail quietly if the AI cuts corners. Ask for tests specifically around double votes, race conditions and permission thresholds.

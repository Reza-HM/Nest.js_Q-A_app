# AGENTS.md

Instructions, conventions, and operational guidelines for AI agents and developers working on **AskHub** (see `docs/PRODUCT_SPEC.md`).

---

## 1. Project Overview & Architectural Alignment

- **Project Domain**: AskHub is a Q&A and knowledge community backend built with NestJS and TypeScript (inspired by Stack Overflow), featuring reputation-based privileges, voting, content ranking, moderation, and background processing.
- **Architectural Integrity**:
  - Follow the existing NestJS domain module structure (`src/<domain>/...`).
  - Keep domain logic encapsulated within dedicated services, exposed through controllers or consumers, and isolated from unrelated modules.
  - Preserve existing architectural patterns and unrelated behavior across edits.
  - Write simple, maintainable, readable code and keep external dependencies minimal—avoid adding new npm packages when existing utilities or standard library modules suffice.

---

## 2. TypeScript & NestJS Coding Conventions

- **Typing & Safety**:
  - Write strictly typed TypeScript code; avoid `any`. Define explicit interfaces, types, and return types for public methods and API contracts.
  - Utilize DTOs (Data Transfer Objects) with `class-validator` and `class-transformer` for all incoming payloads.
- **NestJS Conventions**:
  - Leverage NestJS Dependency Injection (DI) properly; do not instantiate services manually with `new`.
  - Use standard NestJS decorators (`@Controller`, `@Injectable`, `@Get`, `@Post`, `@Body`, `@Param`, etc.).
  - Handle errors predictably using standard NestJS `HttpException` classes (`NotFoundException`, `ForbiddenException`, `BadRequestException`, `ConflictException`, etc.). Never swallow exceptions silently.
  - Maintain separation of concerns: controllers handle routing and request/response mapping; services contain business logic; repositories/models handle data persistence.

---

## 3. Git Workflow & Safety Rules

- **Branching**:
  - **Never work directly on `main`**.
  - Always create a dedicated branch for each feature or meaningful bug fix (e.g., `feat/<feature-name>`, `fix/<issue-name>`).
- **Pre-Modification Checks**:
  - Check `git status` and inspect existing diffs (`git diff`) before modifying files to avoid unintentionally overwriting in-flight changes.
- **Pre-Commit Verification**:
  - Review all modified files before committing.
  - Run relevant test suites (`npm test`, `npm run test:e2e`) and linting (`npm run lint`) to ensure the codebase remains green.
- **Commit Messages**:
  - Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
    - `feat: ...` for new features
    - `fix: ...` for bug fixes
    - `test: ...` for adding or updating tests
    - `refactor: ...` for code refactoring without behavior change
    - `docs: ...` for documentation updates
    - `chore: ...` for dependency, build, or tooling adjustments
- **Pushing & Remote Sync**:
  - Push completed feature branches to the configured remote repository (`git push origin <branch-name>`).
- **Safety Invariants**:
  - **Never** force-push (`--force`), rebase-squash published remote branches, or rewrite history.
  - **Never** discard user changes or reset uncommitted work without explicit approval.
  - **Never** commit secrets, private keys, API tokens, credentials, or actual environment files (`.env`, `.env.production`, etc.). Only sanitized example templates (`.env.example`) may be tracked in git.

---

## 4. Critical Domain Logic & Mandatory Testing

When implementing features described in `docs/PRODUCT_SPEC.md`, you must write thorough tests covering:

1. **Reputation-Based Permissions**:
   - Test threshold checks rigorously (e.g., voting requires minimum reputation, creating new tags requires reputation, editing posts requires privilege thresholds).
   - Test forbidden and allowed states across regular users, moderators, and admins.
2. **Voting Idempotency**:
   - Ensure a user can only vote once per post (up or down).
   - Verify that submitting duplicate votes produces idempotent results without duplicating score or reputation impact.
   - Verify vote retractions and vote flips (e.g., upvote to downvote) correctly adjust score and reputation deltas.
3. **Concurrent Votes & Race Conditions**:
   - Ensure voting logic is concurrency-safe under simultaneous requests using database transactions and unique constraints.
   - Write tests simulating concurrent requests to prevent race conditions or ledger double-counting.
4. **Reputation Ledger Consistency**:
   - Reputation must be tracked via an append-only ledger (`ReputationEvent`), never mutated directly on user records without ledger events.
   - Verify daily reputation caps, retract rollbacks, and auditability of the reputation balance.

---

## 5. Post-Task Reporting Requirements

At the conclusion of each task or prompt, report the following details clearly to the user:
- **Branch Name**: Active branch used for the work.
- **Commits**: Commit SHAs and conventional commit messages created.
- **Test Results**: Test suites executed and their pass/fail outcomes.
- **Push Status**: Remote branch push status (e.g., pushed to remote, branch name, or pending if remote not configured).

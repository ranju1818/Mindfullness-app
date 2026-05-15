# ZenQuest — Execution Pack (All 4 Requested Outputs)

## 1) Phase 1 Build Plan (8 Weeks)

### Goals for Phase 1
- Ship beta-ready iOS + Android app for Malta testers.
- Validate daily retention loop (quest → session → XP/streak feedback).
- Prove backend correctness for XP, streaks, weekly leaderboard.
- Stay GDPR-safe for first release (consent + export/delete workflow baseline).

### Success Metrics (Beta)
- D1 retention >= 35%
- D7 retention >= 15%
- Median sessions per active day >= 1.4
- Crash-free sessions >= 99%
- XP award endpoint p95 < 350ms

### Sprint Breakdown

#### Sprint 0 (2–3 days): Foundations
- Initialize Expo Router TypeScript app.
- Configure linting, formatting, Husky pre-commit hooks.
- Set up Supabase project (EU region), env management.
- Add Sentry, PostHog (EU-hosted).
- Define CI skeleton (lint/typecheck/build).

**Deliverables**
- Running app shell with tabs.
- Supabase client wiring in app.
- CI green for baseline checks.

#### Sprint 1 (Week 1): Auth + Onboarding + Data Model
- Guest mode + optional sign-up prompt.
- Email OTP auth flow.
- Onboarding quiz + intention capture.
- Create DB tables: `users`, `content_items`, `practice_sessions`, `badges`, `user_achievements`, `rak_prompts`, `rak_logs`, `leaderboard_weekly`.
- Add RLS policies (user-isolation first).

**Deliverables**
- User can enter app as guest and complete onboarding.
- Authenticated user row auto-created.

#### Sprint 2 (Week 2): Meditation Module MVP
- Home “Daily Quest” card.
- Meditation list + session player (`expo-av`).
- Session completion event triggers `award-xp`.
- XP/streak summary rendered with basic animation.

**Deliverables**
- End-to-end meditation completion loop working.

#### Sprint 3 (Week 3): Breathwork + Streak Reliability
- Breathwork pattern player (JSON-configured).
- Day-boundary-safe streak logic (UTC storage, local display).
- Grace day logic on backend.
- Unit tests for XP/streak/level calculations.

**Deliverables**
- Breath sessions award XP and preserve streak semantics.

#### Sprint 4 (Week 4): Yoga Module MVP
- Yoga flows list and sequence timer.
- Track completion and minutes.
- Add module-based recommendations from onboarding intention.

**Deliverables**
- Three content verticals active: meditation, breath, yoga.

#### Sprint 5 (Week 5): RAK + Wisdom + Badges
- Daily RAK prompt and completion logging.
- Wisdom drop card and completion logging.
- Badge evaluator (on relevant events).

**Deliverables**
- Kindness and wisdom loops integrated into XP economy.

#### Sprint 6 (Week 6): Leaderboards + Notifications
- Weekly leaderboard aggregation function.
- Chakra tier board UI + promotion progress bar.
- Reminder scheduling (local notifications).

**Deliverables**
- Visible social progress loop and daily reminder system.

#### Sprint 7 (Week 7): GDPR + Hardening
- Consent capture and audit fields.
- Data export endpoint.
- Account delete workflow.
- Rate limiting and abuse guards for key endpoints.

**Deliverables**
- Compliance baseline ready for EU beta.

#### Sprint 8 (Week 8): Beta Stabilization
- Performance pass and crash fixing.
- Content balancing for XP economy.
- Soft-launch instrumentation dashboards.
- TestFlight/Internal App Sharing release.

**Deliverables**
- Malta beta release candidate.

---

## 2) Codex-Ready Implementation Pack

### Suggested Repository Structure

```text
zenquest/
  apps/
    mobile/
      app/
        (tabs)/
          home.tsx
          practice.tsx
          leaderboard.tsx
          profile.tsx
        session/
          [id].tsx
        _layout.tsx
      src/
        components/
        modules/
          meditation/
          yoga/
          breath/
          wisdom/
          rak/
          gamification/
        store/
          useGameStore.ts
          useUserStore.ts
        lib/
          supabase.ts
          queryClient.ts
          api.ts
        hooks/
        types/
  supabase/
    migrations/
    functions/
      award-xp/
        index.ts
      weekly-leaderboard/
        index.ts
  packages/
    shared/
      gamification/
        xp.ts
        level.ts
        streak.ts
        chakra.ts
      schemas/
        session.ts
        leaderboard.ts
```

### Mobile Starter Scaffolds

#### `src/store/useGameStore.ts`
```ts
import { create } from 'zustand';

type ChakraTier = 'root'|'sacral'|'solar'|'heart'|'throat'|'third_eye'|'crown';

interface GameState {
  xpTotal: number;
  level: number;
  streakCurrent: number;
  streakLongest: number;
  graceDaysRemaining: number;
  chakraTier: ChakraTier;
  applyGamificationPatch: (p: Partial<GameState>) => void;
}

export const useGameStore = create<GameState>((set) => ({
  xpTotal: 0,
  level: 1,
  streakCurrent: 0,
  streakLongest: 0,
  graceDaysRemaining: 2,
  chakraTier: 'root',
  applyGamificationPatch: (p) => set((s) => ({ ...s, ...p })),
}));
```

#### `src/lib/supabase.ts`
```ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);
```

### SQL + Indexes (Starter)

```sql
create index idx_sessions_user_completed_at on practice_sessions(user_id, completed_at desc);
create index idx_sessions_type_completed_at on practice_sessions(type, completed_at desc);
create index idx_content_module_difficulty on content_items(module, difficulty);
create index idx_rak_logs_user_completed_at on rak_logs(user_id, completed_at desc);
create index idx_leaderboard_week_tier_rank on leaderboard_weekly(week_start, chakra_tier, rank_position);
```

### RLS Starter Examples

```sql
alter table users enable row level security;
alter table practice_sessions enable row level security;
alter table rak_logs enable row level security;

create policy "users_select_self" on users
for select using (auth.uid() = id);

create policy "sessions_select_self" on practice_sessions
for select using (auth.uid() = user_id);

create policy "sessions_insert_self" on practice_sessions
for insert with check (auth.uid() = user_id);
```

### `award-xp` Function Contract

**Input**
```json
{
  "userId": "uuid",
  "activityType": "meditation_10",
  "durationSec": 600,
  "completedAt": "2026-05-15T08:15:00.000Z",
  "metadata": {}
}
```

**Output**
```json
{
  "xpEarned": 20,
  "xpTotal": 2420,
  "level": 7,
  "streakCurrent": 12,
  "streakLongest": 19,
  "graceDaysRemaining": 1,
  "chakraTier": "solar"
}
```

### `weekly-leaderboard` Function Contract

**Input Query Params**
- `week_start=YYYY-MM-DD`
- `tier=root|...|crown`

**Output**
```json
{
  "weekStart": "2026-05-11",
  "tier": "solar",
  "entries": [
    {"rank":1,"userId":"...","displayName":"A","xpEarned":860},
    {"rank":2,"userId":"...","displayName":"B","xpEarned":790}
  ]
}
```

---

## 3) Malta MVP Cut (Fastest Safe Launch)

### Must-Have (Launch)
- Auth: guest + email OTP conversion.
- Modules: Meditation + Breathwork only.
- Gamification: XP, level, streak, grace day.
- One weekly Chakra leaderboard (global per tier, no friends yet).
- Daily reminder notifications.
- GDPR essentials: consent text, export request, delete account.

### Should-Have (if no schedule slip)
- Yoga MVP flows.
- RAK prompts + completion.
- Basic badges (3–5 only).

### Not in MVP (Defer)
- Avatar evolution system.
- Seasonal events.
- Advanced social graph/friends.
- Corporate/B2B features.
- Full admin CMS (use Supabase table editor initially).

### Why this cut works
- Preserves core retention loop with minimal feature risk.
- Reduces content ops burden before product-market validation.
- Keeps compliance and trust baseline intact for EU users.

---

## 4) QA Design Review (Static) — Issues + Actionable Stubs

### Issue 1 — `users` table duplicates auth identity and risks drift
The schema stores `email` in `users` while using Supabase Auth as source of truth. Email updates in Auth may drift from app-level `users` without sync.

:::task-stub{title="Align users table identity with Supabase Auth"}
Update the `users` schema so `users.id` is always the same as `auth.users.id` and avoid treating `users.email` as canonical identity.

1. In the migration defining `users`, make `id uuid primary key references auth.users(id) on delete cascade`.
2. Keep `email` as optional denormalized field (nullable) or remove it from `users`.
3. Add a trigger or server-side sync path to update denormalized `users.email` from Auth events if retained.
4. Update profile APIs (`GET /me`, `PATCH /me`) to read identity from JWT subject and never from client-submitted user id.
5. Add a regression test for email-change scenario to verify no identity mismatch.
:::

### Issue 2 — Streak calculation is timezone-fragile and can miscount days
The provided `updateStreak` logic uses raw `Date` arithmetic and floor(day-diff), which can fail across DST boundaries and user timezone changes.

:::task-stub{title="Harden streak logic with canonical day keys"}
Refactor streak logic to use date-only day keys, not milliseconds difference.

1. In shared gamification logic (e.g., `packages/shared/gamification/streak.ts`), convert completion timestamps into canonical day keys (`YYYY-MM-DD`) in UTC for storage.
2. Compute streak transitions using integer difference between day keys, not `Math.floor(msDiff / dayMs)`.
3. For UI display, map UTC day state to local explanations without changing backend streak counters.
4. Add tests for DST transition dates and timezone jumps (e.g., UTC+1 to UTC+3).
5. Ensure `award-xp` performs streak updates server-side as the single source of truth.
:::

### Issue 3 — Chakra tier definition conflicts (weekly leaderboard vs user profile field)
`users.chakra_tier` appears as a persistent profile field, but tier is also defined as weekly XP league outcome. Without explicit semantics, historical and current tier can conflict.

:::task-stub{title="Separate persistent progression tier from weekly league tier"}
Disambiguate chakra concepts in the data model and API.

1. Rename persistent profile progression field to `progress_tier` (or similar) in `users`.
2. Keep weekly competitive tier derived from week XP and stored in `leaderboard_weekly.chakra_tier`.
3. Update gamification response DTO to return both fields (`progressTier`, `weeklyLeagueTier`).
4. Update leaderboard queries and UI labels to explicitly say "Weekly League Tier".
5. Add migration and backfill script mapping existing `users.chakra_tier` to the chosen semantics.
:::

### Issue 4 — Missing anti-cheat/idempotency guard on session completion
`POST /sessions` + `award-xp` can be replayed by client retries or abuse, causing duplicate XP awards.

:::task-stub{title="Add idempotency keys and duplicate-session protection"}
Make XP awarding idempotent per logical completion event.

1. Add `idempotency_key text not null` to `practice_sessions`.
2. Create unique index on `(user_id, idempotency_key)`.
3. Require clients to send an idempotency key for each completion event.
4. In `award-xp`, wrap insert+user-update in a transaction; on unique conflict return prior computed result.
5. Add retry tests simulating network retries to confirm XP is awarded once.
:::

### Issue 5 — Privacy risk in social/RAK flows without explicit sharing controls
Blueprint mentions sharing anonymized stories/community board but lacks clear consent and moderation state in schema.

:::task-stub{title="Introduce explicit sharing consent and moderation fields for RAK content"}
Extend RAK logging to prevent accidental exposure of sensitive user reflections.

1. Add fields to `rak_logs`: `is_share_opt_in boolean default false`, `visibility text default 'private'`, `moderation_status text default 'not_submitted'`.
2. Ensure default API behavior keeps entries private and unlisted.
3. Add explicit publish endpoint that flips visibility only after user confirmation.
4. Add basic profanity/safety moderation hook before public listing.
5. Update privacy copy in app flow to explain exactly what is shared and when.
:::

### Issue 6 — Content access model under-specified for premium gating and localization
`content_items` has `is_premium`, but there is no entitlement model, locale strategy, or fallback logic.

:::task-stub{title="Define entitlements and localization metadata for content delivery"}
Add minimal production-safe content access controls.

1. Create `user_entitlements` table keyed by `user_id` with entitlement type and validity window.
2. Extend `content_items` with `locale`, `fallback_content_id`, and optional `region_allowlist`.
3. Update content query endpoint to filter by entitlement and locale with deterministic fallback.
4. Add indexes on `(type, module, locale, required_level)`.
5. Add contract tests for free vs premium users and locale fallback behavior.
:::

---

## 5) Production Build Sequence (Dependency Graph + Execution Order)

This is the recommended order to implement with minimal rework and clear critical path.

### 5.1 Dependency Graph (High Level)

```text
Repo + CI bootstrap
  -> DB schema migrations
    -> RLS policies + policy tests
      -> Edge functions (award-xp, content, rak, leaderboard)
        -> Idempotency + rate limiting + signed media URLs
          -> Mobile auth + onboarding + consent flow
            -> Practice modules (meditation, breathwork, wisdom, RAK)
              -> Gamification UI and local state sync
                -> Privacy endpoints UX (export/delete)
                  -> Observability (Sentry/PostHog) + perf hardening
                    -> Beta release gate + store submissions
```

### 5.2 Critical Path Milestones

1. **Foundation milestone**
   - Expo project skeleton, Supabase project setup, CI running lint/typecheck.
2. **Trust milestone**
   - GDPR consent model, RLS, data ownership guarantees, privacy job tables.
3. **Core loop milestone**
   - `award-xp` + session logging + streak correctness + idempotency.
4. **Engagement milestone**
   - Daily quest surfaces + reminders + RAK/wisdom loop.
5. **Launch milestone**
   - Observability, performance checks, export/delete SLA test, beta rollout.

### 5.3 Implementation Order (Ticket Buckets)

#### A. Repo and Delivery Baseline
- Initialize Expo Router app with tabs and module directories.
- Add TypeScript strict mode, ESLint, Prettier, commit hooks.
- Add GitHub Actions: lint, typecheck, unit tests.
- Configure EAS preview and production profiles.

#### B. Data Model and Security First
- Create base schema migrations for all core tables.
- Apply identity fix: `users.id` references `auth.users(id)`.
- Add idempotency key support in `practice_sessions`.
- Add privacy job tables for export/delete processing.
- Enable RLS on all tables, then create least-privilege policies.
- Write policy tests for allowed/denied role actions.

#### C. Backend Services (Edge Functions)
- `award-xp`: zod validation, streak/day-key logic, level calculations.
- `award-xp`: transactional insert+update, conflict-safe idempotency behavior.
- `content`: module/difficulty/entitlement/locale filtering + signed media URLs.
- `rak/logs`: daily prompt lookup, write limits, XP reward path.
- `leaderboard`: weekly aggregation + tier filtering + Redis cache.
- `account/export` and `account/delete`: enqueue privacy jobs.

#### D. Anti-Abuse and Reliability Layer
- Upstash sliding-window limits on high-risk endpoints.
- Endpoint-level structured logging and error classes.
- Add replay tests and concurrency tests for XP awarding.
- Add migration smoke tests in CI.

#### E. Mobile App Core Flows
- Guest entry + email OTP upgrade flow.
- Mandatory consent checkpoint before first tracked session.
- Home tab daily quest + streak snapshot + XP counters.
- Session player for meditation (audio) and breathwork (pattern animation/haptics).
- Wisdom and RAK completion flows.
- Notifications (local schedule + user-selected reminder window).

#### F. Privacy UX and Compliance Completeness
- Profile privacy settings: export data, delete account.
- Show status tracking for queued privacy jobs.
- Link legal pages in onboarding and settings.

#### G. Observability, Performance, Release Hardening
- Sentry crash/perf instrumentation across critical screens/functions.
- PostHog event taxonomy implementation (D1/D7, completion, streak keep).
- Performance checks: cold start, audio load, leaderboard p95.
- Release checklist execution and sign-off report.

### 5.4 Suggested 15-Week Timeline to September 1, 2026

- **Weeks 1–2:** A + B
- **Weeks 3–5:** C
- **Weeks 6–7:** D
- **Weeks 8–11:** E
- **Week 12:** F
- **Weeks 13–14:** G
- **Week 15:** Beta gate, store submissions, rollback drills

### 5.5 Non-Negotiable “Do Not Merge” Gates

- Any migration that weakens row ownership protections.
- Any endpoint that writes practice data without consent state check.
- Any XP change without idempotency + retry test coverage.
- Any media endpoint returning unsigned CDN URLs.
- Any release candidate missing export/delete workflow verification.

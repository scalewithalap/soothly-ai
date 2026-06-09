# Soothly AI — MVP Build Log

> Chronological record of all work performed on the `hyperagent` branch by the Developer agent.
> Each phase ends with a verification report. Newest entries first within each phase.

**Mission:** Scaffolded codebase → live production MVP. All 8 agents + Superagent end-to-end, real Polar payments, deployed on Vercel.

**Build plan:** see [docs/build-plan.md](docs/build-plan.md)

---

## Phase 0 — Access & Environment Bootstrap

**Status:** 🟡 In progress
**Started:** 2026-06-10

| Date | Change | Details |
|---|---|---|
| 2026-06-10 | Branch access verified | PAT has admin/push on repo; `hyperagent` branch confirmed (baseline identical to `dev` @ 60de2d5) |
| 2026-06-10 | Docs scaffolded | Added BUILD_LOG.md, docs/build-plan.md, docs/architecture.md, docs/runbook.md, docs/decisions.md |
| 2026-06-10 | README replaced | Boilerplate Next.js README → product README with repo map + docs links |
| 2026-06-10 | Delivery model set | Owner directive: agent writes code only; owner runs env/builds/deploys (sandbox npm install OOM-killed — verification shifts to owner's machine/CI) |

### Phase 0 verification
- [x] Write access to `hyperagent` branch (PAT: push+admin confirmed)
- [x] Docs scaffold committed (BUILD_LOG, build-plan, architecture, runbook, decisions)
- [x] soothly-deploy skill created (git push via API + env checker)
- [~] Build verification delegated to owner (sandbox lacks memory for npm install)

---

## Phase 1 — Foundation
**Status:** 🟡 Code complete 2026-06-10; owner applies migrations + env

| Date | Change | Details |
|---|---|---|
| 2026-06-10 | Distributed rate limiting | proxy.ts now uses Upstash Redis REST (fixed-window INCR+PEXPIRE, 800ms timeout) when UPSTASH_REDIS_REST_* set; in-memory Map demoted to fallback — fixes per-instance limiting on serverless |
| 2026-06-10 | Agent config consolidation | migrations/0003: agent_configs merged into agent_config (settings→config, enabled→is_active), unique (org_id, agent_type) index; Agent base class repointed; no-row now defaults to enabled (quota still gates) |

### Owner actions needed to activate
1. Run migration 0003 after 0001/0002
2. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel env (else in-memory fallback)
Remaining Phase 1 scope (next session): auth flow verification against hosted Supabase, onboarding flow check, first Vercel preview.

## Phase 2 — Billing Core (code complete — pulled forward with Phase 1 foundations)
**Status:** 🟡 Code landed 2026-06-10; owner to apply migrations + configure Polar products

| Date | Change | Details |
|---|---|---|
| 2026-06-10 | lib/billing/tiers.ts | NEW single source of truth: canonical tiers (free/launch/growth/scale), limits + safety caps per pricing-strategy.md, AGENT_FEATURE_KEY mapping, env-driven Polar product maps, normalizeTier() for legacy names |
| 2026-06-10 | Polar checkout rewritten | GET query adapter → POST /api/polar/checkout creating sessions server-side with metadata {org_id, tier, interval}; product IDs from POLAR_PRODUCT_* env; POLAR_SERVER decouples billing env from NODE_ENV (ADR-004) |
| 2026-06-10 | Polar webhook rewritten | org resolution: metadata.org_id first, email fallback; canonical tier names fix the starter/enterprise mismatch; persists polar_customer_id/polar_subscription_id; created/updated/canceled handled; legacy onOrderCreated dropped |
| 2026-06-10 | Usage RPCs implemented | supabase/migrations/0001_billing_enforcement.sql: check_and_increment_usage (atomic, anchor-aligned periods, safety caps), get_usage_summary, get_org_usage + tier_feature_limits seeds for all 4 tiers × 10 features (ADR-005) |
| 2026-06-10 | deduct.ts rewritten | Was calling nonexistent RPC against nonexistent wide columns; now uses check_and_increment_usage + shared AGENT_FEATURE_KEY; fails closed; logs overage to activities |
| 2026-06-10 | usage-limits.ts extended | FEATURE_KEYS += recovery_attempts, superagent_campaigns; agent mapping += revenue_recovery, superagent |
| 2026-06-10 | subscription_plans seed | supabase/migrations/0002: 4 canonical plans for the billing UI; legacy tier rows deactivated |
| 2026-06-10 | Billing page wired | Upgrade buttons → POST /api/polar/checkout → hosted checkout redirect; UpgradeModal price corrected to $129 |

### Owner actions needed to activate
1. Run migrations 0001 + 0002 in Supabase SQL editor (after schema.sql)
2. Create 6 Polar sandbox products (launch/growth/scale × monthly/yearly) and set POLAR_PRODUCT_* env vars
3. Set POLAR_ACCESS_TOKEN, POLAR_WEBHOOK_SECRET, POLAR_SERVER=sandbox
4. Point Polar webhook at {app-url}/api/polar/webhook

## Phase 3 — Agent Infrastructure
**Status:** 🟡 Code complete 2026-06-10; owner applies migration 0004 + env

| Date | Change | Details |
|---|---|---|
| 2026-06-10 | HITL loop closed | PATCH /api/approvals/[id] now emits approval/resolved after DB resolve — workflows paused on step.waitForEvent resume immediately instead of hanging to the 7d timeout (ADR-007) |
| 2026-06-10 | Inngest app id fixed | zero-headache → soothly-ai (env-overridable via INNGEST_APP_ID); signing-key handling documented in client |
| 2026-06-10 | Onboarding trigger wired | onboarding/user.created (the agent's documented trigger, never emitted anywhere) now fires from onboarding completion with org context |
| 2026-06-10 | Unified embeddings | NEW lib/ai/embeddings.ts — Gemini text-embedding-004, 768-dim, single provider; KnowledgeBase (was OpenAI 1536), VectorStore (was OpenAI 1536), SemanticCache (was Gemini w/ no RPC) all delegate to it (ADR-006) |
| 2026-06-10 | Vector layer made real | migrations/0004: pgvector extension, embedding columns text→vector(768), HNSW indexes, and the 6 missing RPCs implemented: search_knowledge_base, get_knowledge_base_stats, match_semantic_cache, search_agent_memories, access_agent_memory, get_trace_tree |

### Owner actions needed to activate
1. Run migration 0004 (after 0001-0003) — requires pgvector (preinstalled on Supabase)
2. Set INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY (Inngest Cloud app: soothly-ai), GOOGLE_AI_API_KEY
3. In Inngest Cloud, sync the app at {app-url}/api/inngest

## Phase 4 — All 8 Agents
**Status:** ⚪ Not started — Batch A: Lead Gen, SEO, Proposal. Batch B: Onboarding, Customer Success, Competitor Intel. Batch C: Revenue Recovery, Partnership, Sequences.

## Phase 5 — Superagent
**Status:** ⚪ Not started — campaign plan/execute/cancel chaining real agents, paid gating, success-based deduction.

## Phase 6 — Production Launch
**Status:** ⚪ Not started — security pass, Polar production, prod Vercel + domain, Inngest prod, smoke tests, runbook.

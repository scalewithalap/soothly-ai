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

### Batch A — Outbound (Lead Gen, SEO, Proposal)
**Status:** 🟡 Code complete 2026-06-10; owner applies migration 0005 + APIFY_API_TOKEN

| Date | Change | Details |
|---|---|---|
| 2026-06-10 | Missing work tables | migrations/0005: prospects, proposals, support_tickets (Proposal + Customer Success agents wrote to tables that didn't exist) — org-scoped RLS policies included |
| 2026-06-10 | Quota enforcement wired | ZERO usage calls existed across all agents. Now: requireAgentQuota() pre-check in trigger routes (campaigns, briefs, proposals) + deductAgentUsage() on completion in workflows (lead_gen per-lead-saved, seo per-article, proposal per-proposal) per ADR-008 |
| 2026-06-10 | Proposal PDF path | jsPDF was a dependency but never imported. NEW GET /api/agents/proposals/[id]/pdf renders stored proposal JSON (exec summary/challenge/solution/outcomes/whyUs/nextSteps) to A4 PDF on demand |
| 2026-06-10 | Audit notes | Lead Gen flow verified: Apify scrape (LinkedIn/GMaps) → AI score (model-selectable) → HITL gate (smart mode) → upsert contacts → lead_contacts link → notify → sequences handoff. SEO flow: brief → keywords → outline → generate → reflect → save draft. Both sound; failures fall back gracefully (empty scrape array, default scores) |

### Owner actions needed to activate
1. Run migration 0005 (after 0001-0004)
2. Set APIFY_API_TOKEN (Lead Gen scraping; LinkedIn + Google Maps actors)
3. Smoke: create campaign on free tier → 11th lead save logs over-limit warning; create 2nd brief on free tier → 429 with upgrade message

### Batch B — Lifecycle (Onboarding, Customer Success, Competitor Intel)
**Status:** 🟡 Code complete 2026-06-10; owner applies migration 0006

| Date | Change | Details |
|---|---|---|
| 2026-06-10 | Support front door | NOTHING emitted support/ticket.created — Customer Success was unreachable. NEW POST/GET /api/support/tickets: widget bearer-token auth (widget_auth_sessions) or platform session, quota pre-check, ticket insert, event dispatch (ADR-009) |
| 2026-06-10 | RAG step fixed | customer_success queried nonexistent knowledge_base table via textSearch; now uses shared embeddings + search_knowledge_base pgvector RPC with graceful degradation |
| 2026-06-10 | Lifecycle tables | migrations/0006: onboarding_tasks, competitors, competitor_snapshots, competitor_changes (all phantom) with org-scoped RLS |
| 2026-06-10 | Quota wiring | customer_success: 1/handled ticket (cached + full paths); onboarding: 1/activated user; competitor_intel: pre-check + deduct at add (scans of existing competitors not re-billed) |
| 2026-06-10 | Audit notes | Onboarding flow verified: user.created → role analysis → personalized checklist → welcome → 1h/24h nudges (durable sleeps) → progress checks. Intel cron: daily 8am → per-org scan → fetch pages → hash diff → AI change analysis → snapshots/changes → alerts. Both sound |

### Owner actions needed to activate
1. Run migration 0006 (after 0001-0005)
2. Smoke: POST /api/support/tickets with a question → ticket resolves or escalates; add competitor on free tier → 2nd add returns 429

### Batch C — Revenue Ops (Revenue Recovery, Partnership, Sequences)
**Status:** 🟡 Code complete 2026-06-10; owner applies migration 0007 + SES creds

| Date | Change | Details |
|---|---|---|
| 2026-06-10 | Webhook receiver implemented | createWebhookConnection() issued URLs under /api/webhooks/receive/... but NO route existed — Revenue Recovery was unreachable from customer Stripe events. NEW dynamic route: HMAC verification per provider (Stripe/Shopify/custom), event logging, subscription filtering, mapping to recovery/payment.failed + recovery/card.updated (ADR-010) |
| 2026-06-10 | Crash typo fixed | webhook-receiver read NEXT_PUBLIC_SUPAAB_URL (typo) — every endpoint lookup would have thrown |
| 2026-06-10 | payment_recoveries table | migrations/0007: the table the entire recovery workflow reads/writes never existed; created with org RLS + notified_at/next_retry_at |
| 2026-06-10 | Quota wiring | revenue_recovery: 1 unit per dunning email actually sent (not per inbound event); partnership: pre-check at POST /api/agents/partners + deduct per partner saved |
| 2026-06-10 | Audit notes | Sequences engine verified sound: enrollment → 5-min cron scheduler → personalize → SES send → bounce/complaint webhook (app/api/webhooks/ses) → reply detection. Billed via parent flows, not separately. Recovery SMS remains stubbed (log-sms-intent) pending Plivo creds |

### Owner actions needed to activate
1. Run migration 0007 (after 0001-0006)
2. Set AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION + verify SES sender domain; SES_FROM_EMAIL optional (defaults noreply@soothly.ai)
3. Connect a customer Stripe (test mode) via the connections UI → paste issued URL into Stripe webhooks → fire invoice.payment_failed test event → recovery email sends, payment_recoveries row created, 1 recovery_attempts deducted

## Phase 5 — Superagent
**Status:** ⚪ Not started — campaign plan/execute/cancel chaining real agents, paid gating, success-based deduction.

## Phase 6 — Production Launch
**Status:** ⚪ Not started — security pass, Polar production, prod Vercel + domain, Inngest prod, smoke tests, runbook.

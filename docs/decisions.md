# Architecture Decision Records

> One entry per significant decision made during the MVP build. Format: context → decision → consequences.

## ADR-001 — Direct commits to `hyperagent` branch (2026-06-10)
**Context:** Owner granted full read/write on the `hyperagent` branch for the MVP build, with documentation as the accountability mechanism.
**Decision:** Commit directly to `hyperagent` with descriptive messages; no PRs between phases. BUILD_LOG.md + docs/ updated with every meaningful change. Merge to `dev`/`main` is the owner's call after phase sign-offs.
**Consequences:** Faster iteration; history on one branch; owner reviews via BUILD_LOG and phase verification reports instead of per-PR review.

## ADR-002 — Build order: Billing before Agents (2026-06-10)
**Context:** Usage checks are fail-closed; every agent action calls `check_and_increment_usage`. The Polar webhook writes tier names that don't match `tier_feature_limits` rows, which would deny actions for paying customers.
**Decision:** Phase 2 (billing) lands before any agent work (Phase 4).
**Consequences:** Agent verification in Phase 4 runs against real quota enforcement, surfacing limit bugs early.

## ADR-003 — Credentials via skill, never via chat (2026-06-10)
**Context:** The build needs ~8 service credentials (Supabase, Inngest, Google AI, Polar, Apify, SES, Upstash, Vercel).
**Decision:** All credentials live in the `soothly-deploy` skill's encrypted credential fields and are injected as env vars at execution time via RunWithCredentials.
**Consequences:** No secrets in chat history, git, or logs. Credential rotation = update skill config.

## ADR-004 — Webhook org resolution via checkout metadata (2026-06-10)
**Context:** The original Polar webhook resolved organizations by customer email. Checkout email ≠ account email breaks tier assignment silently. Product IDs were hardcoded placeholders mapping to tier names (`starter`/`enterprise`) that don't exist in `tier_feature_limits` (`free`/`launch`/`growth`/`scale`) — paying customers would have resolved to no limits row and been denied by fail-closed quota checks.
**Decision:** Checkout sessions are created server-side (`POST /api/polar/checkout`) with `metadata: { org_id, tier, interval }`. The webhook resolves org from metadata first, email as legacy fallback; product→tier mapping comes from `POLAR_PRODUCT_*` env vars via `lib/billing/tiers.ts` (single source of truth, canonical names). `POLAR_SERVER` env decouples billing environment from NODE_ENV.
**Consequences:** Tier assignment is deterministic for all new checkouts; legacy email fallback keeps old subscriptions working; rotating Polar products = env change, not deploy.

## ADR-005 — Usage RPCs implemented in SQL migration, not app code (2026-06-10)
**Context:** `usage-limits.ts` called `rpc("check_and_increment_usage")` and `deduct.ts` called `rpc("increment_agent_usage")`, but schema.sql defined **zero functions** — every quota check errored and (fail-closed) denied. deduct.ts also assumed a wide org_usage row (per-agent columns) while schema defines narrow rows (org_id, feature_key, current_count, period).
**Decision:** One canonical RPC set in `supabase/migrations/0001_billing_enforcement.sql`: `check_and_increment_usage` (atomic upsert+lock+check+increment, billing-anchor-aligned periods, safety caps), `get_usage_summary`, `get_org_usage`. `deduct.ts` rewritten to call `check_and_increment_usage` with the shared `AGENT_FEATURE_KEY` mapping from `lib/billing/tiers.ts`; `increment_agent_usage` retired. Functions are SECURITY DEFINER with EXECUTE limited to service_role (+ authenticated for read-only summaries).
**Consequences:** Quota enforcement actually works; one mapping table shared by pre-checks and deduction; overage on completed work is logged to activities for reconciliation rather than silently dropped.

## ADR-006 — One embedding provider for all vector paths (2026-06-10)
**Context:** Three embedding implementations coexisted: KnowledgeBase + VectorStore used OpenAI text-embedding-3-small (1536-dim), SemanticCache used Gemini (768-dim). Mixed dimensions can't share pgvector columns, queries from one path can never match vectors written by another, and the RAG/memory/cache RPCs they called (`search_knowledge_base`, `search_agent_memories`, `match_semantic_cache`, `access_agent_memory`, `get_trace_tree`, `get_knowledge_base_stats`) did not exist in the schema at all. Embedding columns were typed `text`.
**Decision:** Single shared service `lib/ai/embeddings.ts` — Gemini text-embedding-004, 768 dims (matches the platform's Gemini-default posture; only needs GOOGLE_AI_API_KEY). KnowledgeBase, VectorStore, and SemanticCache all delegate to it. Migration 0004 enables pgvector, retypes all embedding columns to vector(768) (clearing pre-launch text values, resetting is_embedded), adds HNSW cosine indexes, and implements all six missing RPCs with SECURITY DEFINER + service_role grants.
**Consequences:** RAG, agent memory, and semantic cache become functional instead of erroring; one env var; re-embedding required for any pre-existing docs (none in production).

## ADR-007 — Approval resolution emits the resume event (2026-06-10)
**Context:** Workflows pause via `step.waitForEvent("approval/resolved", match: "data.approvalId", timeout: "7d")`. The PATCH /api/approvals/[id] route updated the DB row but emitted no Inngest event — every approved action would have hung for 7 days then auto-rejected.
**Decision:** After ApprovalGate resolves the row, the route sends `approval/resolved` with `{approvalId, status, comment, resolvedBy, orgId}`. Emit failures are logged loudly but don't roll back the DB resolution (replayable from Inngest dashboard). Also: Inngest app id corrected from legacy `zero-headache` to env-configurable `soothly-ai`, and the Onboarding agent's never-emitted trigger now fires from POST-onboarding completion (`onboarding/user.created` with org context).
**Consequences:** HITL loop actually closes; approvals resume workflows in seconds, not days.

## ADR-008 — Quota guard at dispatch + deduction on completion (2026-06-10)
**Context:** Phase 4a audit: NONE of the agent workflows or trigger routes referenced usage at all — zero calls to checkAndIncrementUsage/deductAgentUsage anywhere in inngest/ or app/api/. Free users could run unlimited scrapes/articles/proposals; paid quotas were decorative. Also: the Proposal agent wrote to `prospects`/`proposals` tables and Customer Success to `support_tickets` — none existed in schema.sql. jsPDF was a dependency but never imported (no PDF output path).
**Decision:** Two-layer enforcement per success-based billing: (1) `requireAgentQuota()` (lib/usage/guard.ts) at every trigger route before inngest.send — cheap read, fails 429/402 with upgrade messaging, prevents uncreditable spend; (2) `deductAgentUsage()` inside each workflow after the work is saved (lead_gen: per lead saved; seo: per article; proposal: per proposal). Migration 0005 creates prospects/proposals/support_tickets with org-scoped RLS. New GET /api/agents/proposals/[id]/pdf renders stored proposal JSON via jsPDF on demand (no stored binaries).
**Consequences:** The pricing table is now enforced for outbound agents; remaining agents get the same treatment in Phases 4b/4c.

## ADR-009 — Customer Success front door + semantic RAG fix (2026-06-10)
**Context:** Phase 4b audit: nothing in the app emitted `support/ticket.created` — the Customer Success workflow (the "Zero-Wait Support" pillar) was unreachable. Its RAG step queried a `knowledge_base` table that doesn't exist (real: `knowledge_base_documents`) via full-text search, bypassing the vector layer entirely. Onboarding/Competitor Intel wrote to 4 more phantom tables (onboarding_tasks, competitors, competitor_snapshots, competitor_changes).
**Decision:** New POST /api/support/tickets accepts widget bearer tokens (validated against widget_auth_sessions) OR platform sessions, pre-checks support_messages quota, inserts the ticket, and emits the event. RAG step rewritten to use the shared embedding service + search_knowledge_base RPC (graceful degradation on failure). Migration 0006 creates the 4 lifecycle tables with org-scoped RLS. Quota wiring: customer_success deducts 1/handled ticket (cached AND full paths — a cache hit still serves a customer), onboarding deducts 1/activated user, competitor adds pre-check + deduct at POST /api/agents/competitors (daily scans of already-added competitors are not re-billed).
**Consequences:** The support pillar is reachable end-to-end (widget → verify → ticket → agent → resolve/escalate) and all lifecycle agents bill correctly.

## ADR-010 — Customer webhook receiver implemented; recovery billed per dunning send (2026-06-10)
**Context:** Phase 4c audit: `createWebhookConnection()` issued customer-facing endpoint URLs under `/api/webhooks/receive/{provider}/{endpointId}` but no route existed there — the "Listening" connection (connection-architecture.md §1) was a dead end and Revenue Recovery (triggered by customers' `invoice.payment_failed`) was unreachable. `processStripeEvent`'s payment-failure case was a TODO. `getWebhookConnectionByEndpoint` read `NEXT_PUBLIC_SUPAAB_URL` (typo) — would have crashed on every lookup. The `payment_recoveries` table the whole workflow depends on didn't exist.
**Decision:** New dynamic route verifies provider-specific HMAC signatures (Stripe/Shopify/custom) against the per-connection secret over the raw body, logs every event to webhook_events, honors the connection's event subscriptions, and maps `invoice.payment_failed` → `recovery/payment.failed` and card-update events → `recovery/card.updated`. Dispatch failures return 200 (event is logged + replayable; 500s cause provider retry storms). Migration 0007 creates payment_recoveries (+ notified_at/next_retry_at). Billing: deduct one recovery_attempts unit per dunning notification actually sent — inbound failure events and retries of the same invoice are not billed. Partnership: pre-check at POST /api/agents/partners, deduct per partner record saved. Sequences engine billed via its parent flows (lead outreach), not separately.
**Consequences:** The end-to-end recovery loop (customer's Stripe → signature-verified receiver → strategy → magic link → dunning email → retry schedule) is reachable and billed; SMS remains stubbed pending Plivo creds (tier promise rests on email until then).

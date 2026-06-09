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

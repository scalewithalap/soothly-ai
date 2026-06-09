# Soothly AI — Operations Runbook

> Production operations reference. Activation steps live in
> [activation-checklist.md](activation-checklist.md); this doc is for running
> the system day-to-day and handling incidents.

## Environments

| Env | Where | Billing | Inngest |
|---|---|---|---|
| Local | `npm run dev` + `.env.local` | Polar sandbox | Inngest dev server (`npx inngest-cli@latest dev`) |
| Preview | Vercel previews of `hyperagent` | Polar sandbox (`POLAR_SERVER=sandbox`) | Inngest dev env |
| Production | Vercel production + custom domain | Polar production | Inngest production env |

`POLAR_SERVER` decouples billing env from NODE_ENV — a production deploy can pilot on sandbox billing.

## Key surfaces

| Surface | Path | Notes |
|---|---|---|
| Inngest handshake | `/api/inngest` | Sync target; signed with INNGEST_SIGNING_KEY |
| Polar webhook | `/api/polar/webhook` | Subscription lifecycle → org tier |
| Customer webhooks | `/api/webhooks/receive/{provider}/{endpointId}` | Per-connection HMAC; feeds Revenue Recovery |
| SES notifications | `/api/webhooks/ses` | Bounce/complaint → sequence suppression |
| Support intake | `/api/support/tickets` | Widget bearer token or platform session |
| Health | `/api/health` | Uptime checks |

## Billing & quota model (operator's view)

- Tier lives on `organizations.subscription_tier` (free/launch/growth/scale); written ONLY by the Polar webhook.
- Limits: `tier_feature_limits` (tier × feature_key → monthly_limit, safety_cap). `-1` = feature gated off (superagent on free).
- Consumption: `org_usage` one row per (org, feature, period); periods anchored to `billing_cycle_anchor`.
- All enforcement goes through `check_and_increment_usage` RPC — atomic, fail-closed.
- Success-based: deduction happens after completed work (ADR-008); pre-checks at trigger routes return 429/402.
- **Audit trail:** every deduction logs to `activities` (action=usage_deducted), including over-limit completions for reconciliation.

## Incident quick-reference

### A paying customer reports "limit reached" unexpectedly
1. `SELECT * FROM get_usage_summary('{org_id}')` — used vs limit per feature.
2. Verify tier: `SELECT subscription_tier, billing_cycle_anchor FROM organizations WHERE id='{org_id}'`.
3. If tier is wrong → check Polar webhook deliveries (Polar dashboard → webhooks) and the `POLAR_PRODUCT_*` env mapping.
4. Manual fix: update `organizations.subscription_tier` to a canonical name (`launch`/`growth`/`scale`) — never `starter`/`enterprise`.

### Approved action never ran
1. Check the `approval_requests` row — if status is `approved` but the workflow didn't resume, the `approval/resolved` event emit failed (logged in Vercel logs).
2. Replay from the Inngest dashboard: send `approval/resolved` with `{approvalId, status: "approved", orgId}`.

### Inngest run failed mid-workflow
- Runs are durable — every side effect is inside `step.run`. Use Inngest dashboard → Replay; completed steps are skipped (idempotent step IDs).
- AI-step failures degrade gracefully (default lead scores, empty RAG context). Inspect `agent_traces` via `get_trace_tree(trace_id)`.

### Customer's payment-failed events not arriving
1. `SELECT * FROM webhook_connections WHERE org_id='{org}'` — confirm `is_active` + endpoint path.
2. `SELECT * FROM webhook_events WHERE org_id='{org}' ORDER BY received_at DESC LIMIT 10` — events logged but no recovery? Check Inngest for `recovery/payment.failed` dispatch errors (receiver logs them and still returns 200).
3. 401s in the provider's dashboard = signature mismatch → re-issue the connection secret.

### Webhook signature failures (Polar)
- `POLAR_WEBHOOK_SECRET` must match the endpoint secret for the CURRENT server — sandbox and production secrets differ.

### Rate limiting misbehaving
- With `UPSTASH_REDIS_REST_*` set: global fixed-window per ip+endpoint-group (Redis keys `rl:{group}:{ip}:{window}`).
- Without: per-instance memory fallback (fine locally, weak in serverless prod — set Upstash).
- Tuning: `RATE_LIMITS` map in `proxy.ts`.

### Embeddings/RAG returning nothing
1. `GOOGLE_AI_API_KEY` set? Embeddings hard-require it.
2. `SELECT count(*) FROM knowledge_base_embeddings WHERE org_id='{org}' AND embedding IS NOT NULL` — 0 means docs need re-embedding (migration 0004 reset `is_embedded`; re-upload or re-trigger ingestion).
3. Lower the match threshold (defaults 0.65–0.7) when the corpus is small.

## Scheduled jobs (Inngest crons)

| Cron | Function | Schedule |
|---|---|---|
| Competitor scan | `intel-daily-scan` | 08:00 UTC daily |
| Sequence scheduler | `sequence-scheduler-tick` | every 5 min |

## Backups & data

- Supabase backups/PITR per project plan — enable PITR before launch.
- All tables RLS-enabled (migration 0009): service_role bypasses; users are org-scoped via `current_org_id()`.
- Data export endpoints: `/api/account/export`, `/api/user/export`.

## Alerting defaults

- Inngest function failures → set up Slack/email alerts in the Inngest dashboard.
- Vercel 5xx → log drains or dashboard alerts.
- Supabase → database health + pool usage under project Reports.

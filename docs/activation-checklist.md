# Owner Activation Checklist — Full MVP (Phases 0–6)

> Everything the owner must do to activate the complete MVP build
> (commits `6ee9920` → `5c4f2d1` + Phase 6 hardening).
> Work top to bottom — later steps depend on earlier ones.
> Steps 1–7 get you to a working sandbox deployment; Step 8 is the
> production cutover when you're ready to charge real cards.

## Step 1 — Verify the code builds

- [ ] `git fetch && git checkout hyperagent && git pull`
- [ ] `npm install`
- [ ] `npm run build` — report any type errors back to the Developer agent before proceeding

## Step 2 — Supabase (database)

In the Supabase dashboard → SQL editor, run **in this exact order**:

- [ ] `supabase/schema.sql` — only if this is a fresh project (skip if tables already exist)
- [ ] `supabase/migrations/0001_billing_enforcement.sql` — usage RPCs + tier limit seeds
- [ ] `supabase/migrations/0002_subscription_plans_seed.sql` — plan catalog for billing UI
- [ ] `supabase/migrations/0003_agent_config_consolidation.sql` — merges duplicate config tables
- [ ] `supabase/migrations/0004_vector_search_rpcs.sql` — pgvector + RAG/memory/cache RPCs
- [ ] `supabase/migrations/0005_agent_work_tables.sql` — prospects, proposals, support_tickets
- [ ] `supabase/migrations/0006_lifecycle_agent_tables.sql` — onboarding_tasks, competitors + snapshots/changes
- [ ] `supabase/migrations/0007_revenue_ops_tables.sql` — payment_recoveries
- [ ] `supabase/migrations/0008_superagent_campaigns.sql` — superagent_campaigns
- [ ] `supabase/migrations/0009_rls_hardening.sql` — **RLS on every original table (launch blocker — schema.sql shipped with zero RLS)**

Verification queries (all should pass):

```sql
SELECT count(*) FROM tier_feature_limits;        -- expect 40
SELECT count(*) FROM subscription_plans WHERE is_active; -- expect 4
SELECT to_regclass('public.agent_configs');      -- expect NULL (dropped)
SELECT proname FROM pg_proc WHERE proname IN
  ('check_and_increment_usage','get_usage_summary','get_org_usage',
   'search_knowledge_base','match_semantic_cache','search_agent_memories',
   'access_agent_memory','get_trace_tree','get_knowledge_base_stats'); -- expect 9 rows
SELECT to_regclass('public.support_tickets'), to_regclass('public.competitors'); -- both non-NULL
SELECT to_regclass('public.payment_recoveries'), to_regclass('public.superagent_campaigns'); -- both non-NULL
-- RLS coverage: expect 0 rows
SELECT tablename FROM pg_tables t WHERE schemaname='public'
  AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                  WHERE n.nspname='public' AND c.relname=t.tablename AND c.relrowsecurity);
```

## Step 3 — Create service resources

- [ ] **Polar (sandbox.polar.sh):** create org, then 6 products — Launch $129/mo + $1,290/yr, Growth $349/mo + $3,490/yr, Scale $997/mo + $9,970/yr. Copy the 6 product IDs. Create an access token.
- [ ] **Inngest Cloud:** create app (id must be `soothly-ai`). Copy event key + signing key.
- [ ] **Upstash:** create a Redis database. Copy REST URL + REST token.
- [ ] **Google AI Studio:** create an API key (Gemini — used for all agent AI + embeddings).
- [ ] **AWS SES:** verify your sending domain, request production access (out of SES sandbox), create an IAM user with `ses:SendEmail` — needed for recovery emails, sequences, notifications.

## Step 4 — Environment variables

Set in `.env.local` (local) and the Vercel project (preview + production scopes):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=            # the deployed URL once known

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
# INNGEST_APP_ID=soothly-ai     # optional, this is the default

# AI (required — default provider + embeddings)
GOOGLE_AI_API_KEY=
# OPENAI_API_KEY= / ANTHROPIC_API_KEY=   # optional, only for non-Gemini models

# Polar
POLAR_ACCESS_TOKEN=             # sandbox token for now
POLAR_WEBHOOK_SECRET=           # set in step 6 after webhook creation
POLAR_ORGANIZATION_ID=
POLAR_SERVER=sandbox
POLAR_PRODUCT_LAUNCH_MONTHLY=
POLAR_PRODUCT_LAUNCH_YEARLY=
POLAR_PRODUCT_GROWTH_MONTHLY=
POLAR_PRODUCT_GROWTH_YEARLY=
POLAR_PRODUCT_SCALE_MONTHLY=
POLAR_PRODUCT_SCALE_YEARLY=

# Upstash (rate limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Apify (Lead Gen scraping — Phase 4a+)
APIFY_API_TOKEN=

# AWS SES (recovery emails, sequences, notifications — Phase 4c+)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
SES_FROM_EMAIL=                 # verified sender, e.g. noreply@yourdomain.com
```

## Step 5 — Deploy

- [ ] Create/link the Vercel project and deploy the `hyperagent` branch (preview is fine)
- [ ] Set `NEXT_PUBLIC_APP_URL` to the deployed URL and redeploy if it was blank

## Step 6 — Post-deploy wiring (needs the live URL)

- [ ] **Polar webhook:** sandbox dashboard → add endpoint `{app-url}/api/polar/webhook`, subscribe to subscription events, copy the webhook secret → set `POLAR_WEBHOOK_SECRET` → redeploy
- [ ] **Inngest sync:** Inngest Cloud → Apps → sync `{app-url}/api/inngest` — the function list should show ~30 functions across 9 agents + sequences

## Step 7 — Smoke tests (golden path)

Billing:
- [ ] Sign up fresh user → complete onboarding → dashboard; Inngest shows `onboarding/user.created`
- [ ] `/billing` shows 4 plans (Free / Launch $129 / Growth $349 / Scale $997)
- [ ] Upgrade to Launch → sandbox checkout → pay test card → org tier = `launch`; cancel → back to `free`

Quota enforcement (on a free org):
- [ ] 2nd content brief → 429 with upgrade message (free = 1 article/mo)
- [ ] Superagent campaign POST → 402 paid-plan prompt
- [ ] After upgrading: same calls succeed; usage counters move in /billing

Agents (paid org):
- [ ] Lead campaign → Apify scrape → leads appear; approval card shows in smart mode; approving resumes within seconds (not 7 days)
- [ ] Content brief → article draft lands in articles table
- [ ] Proposal from URL → analysis → proposal; GET /api/agents/proposals/{id}/pdf downloads a PDF
- [ ] POST /api/support/tickets with a question → resolved or escalated ticket; second identical question hits semantic cache
- [ ] Add competitor → initial scan rows in competitor_snapshots
- [ ] Customer Stripe (test) connected via webhook URL → fire `invoice.payment_failed` test → recovery email + payment_recoveries row + 1 recovery_attempts deducted
- [ ] Superagent campaign (content_blitz) → Inngest run tree shows prepare → dispatch → await per step; deducts 1 on completion; cancel mid-run stops next round

Security spot-checks:
- [ ] With user A's session, request a user B (other org) resource by id → 404/empty (RLS)
- [ ] POST /api/webhooks/receive/stripe/{id} with bad signature → 401
- [ ] /api/widget/data without bearer token → 401

## Step 8 — Production cutover (when ready to charge real cards)

1. **Polar production:** create production org at polar.sh → recreate the 6 products → production access token + org id
2. Swap Vercel **production-scope** env: `POLAR_SERVER=production`, production `POLAR_ACCESS_TOKEN`, `POLAR_ORGANIZATION_ID`, 6 production `POLAR_PRODUCT_*` ids
3. Add production webhook endpoint (polar.sh dashboard) → `{prod-url}/api/polar/webhook` → set production `POLAR_WEBHOOK_SECRET`
4. **Inngest:** create/promote a production environment for app `soothly-ai` → production event + signing keys in Vercel production scope → sync `{prod-url}/api/inngest`
5. **Domain:** attach custom domain in Vercel → update `NEXT_PUBLIC_APP_URL` → redeploy
6. **Supabase:** Auth → URL configuration → add production domain to redirect allowlist
7. Re-run Step 7 smoke tests against production (Polar real card on your own account, then refund)
8. Watch Inngest + Vercel logs for the first 24h; `payment_recoveries`, `org_usage`, and `activities` tables tell you billing is flowing

## Known deferred items

- Plivo SMS (Revenue Recovery currently email-only — the log-sms-intent step is the hook point)
- Workers without `*.completed` events (partnership/proposal/intel) run fire-and-forget inside Superagent campaigns — fine for current templates
- `npm audit` + dependency review recommended before launch (owner-side; sandbox can't run installs)

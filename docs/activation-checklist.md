# Owner Activation Checklist — Phases 0–3

> Everything the owner must do to activate the code landed in commits
> `6ee9920` (billing), `91ac5e74` (foundation), `7ce9dcd` (agent infra).
> Work top to bottom — later steps depend on earlier ones.

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
```

## Step 3 — Create service resources

- [ ] **Polar (sandbox.polar.sh):** create org, then 6 products — Launch $129/mo + $1,290/yr, Growth $349/mo + $3,490/yr, Scale $997/mo + $9,970/yr. Copy the 6 product IDs. Create an access token.
- [ ] **Inngest Cloud:** create app (id must be `soothly-ai`). Copy event key + signing key.
- [ ] **Upstash:** create a Redis database. Copy REST URL + REST token.
- [ ] **Google AI Studio:** create an API key (Gemini — used for all agent AI + embeddings).

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
```

## Step 5 — Deploy

- [ ] Create/link the Vercel project and deploy the `hyperagent` branch (preview is fine)
- [ ] Set `NEXT_PUBLIC_APP_URL` to the deployed URL and redeploy if it was blank

## Step 6 — Post-deploy wiring (needs the live URL)

- [ ] **Polar webhook:** sandbox dashboard → add endpoint `{app-url}/api/polar/webhook`, subscribe to subscription events, copy the webhook secret → set `POLAR_WEBHOOK_SECRET` → redeploy
- [ ] **Inngest sync:** Inngest Cloud → Apps → sync `{app-url}/api/inngest` — the function list should show ~30 functions across 9 agents + sequences

## Step 7 — Smoke tests

- [ ] Sign up a fresh user → complete onboarding → lands on dashboard
- [ ] `/billing` shows 4 plans (Free / Launch $129 / Growth $349 / Scale $997)
- [ ] Click Upgrade on Launch → Polar sandbox checkout opens → pay with test card → org's tier becomes `launch` in the organizations table, billing page reflects it
- [ ] Cancel the sandbox subscription → tier returns to `free`
- [ ] Inngest dashboard: `onboarding/user.created` event appears after a new signup completes onboarding

## Known deferred items

- Phase 4c credentials: AWS SES keys (email/sequences), Plivo (SMS — currently stubbed)
- Production Polar org + production Inngest keys land in Phase 6

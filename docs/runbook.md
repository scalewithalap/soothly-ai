# Soothly AI — Operations Runbook

> Skeleton — filled in as phases land. Complete version required for Phase 6 sign-off.

## Environments
| Env | URL | Notes |
|---|---|---|
| Sandbox (agent) | — | Developer agent's build/verify environment |
| Vercel preview | TBD Phase 1 | hyperagent branch deploys |
| Production | TBD Phase 6 | custom domain |

## Required environment variables
See `.env.example`. Secrets live in Vercel project settings + the owner's `soothly-deploy` skill (never in git).

## Deploy
TBD Phase 1 (preview) / Phase 6 (production).

## Webhooks to configure
- Polar → `/api/polar/webhook` (subscription lifecycle)
- Customer payment providers → `/api/webhooks/...` (Revenue Recovery listeners)
- Inngest → `/api/inngest`

## Incident quick-reference
TBD — to include: failed Inngest runs (replay), Polar webhook signature failures, quota RPC errors (fail-closed behavior), rate-limit tuning.

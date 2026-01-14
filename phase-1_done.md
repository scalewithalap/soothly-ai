# Zero Headache — Implementation Plan

> **Phase 1: Foundation — ✅ COMPLETE**

---

## Phase 2: MVP Agents (Priority)

### 2.1 Shared Agent Infrastructure

| Task                      | Priority | Notes                    |
| ------------------------- | -------- | ------------------------ |
| Create `companies` table  | High     | Unified company database |
| Create `contacts` table   | High     | Leads, partners, clients |
| Create `activities` table | High     | Cross-agent audit log    |
| AI provider abstraction   | High     | OpenAI/Anthropic wrapper |
| Inngest job queue         | Medium   | Durable async workflows  |
| Redis caching (Upstash)   | Medium   | Rate limiting, sessions  |

---

### 2.2 Lead Generation Agent

| Task                       | Notes               |
| -------------------------- | ------------------- |
| `lead_campaigns` table     | Campaign tracking   |
| `lead_contacts` table      | Enriched lead data  |
| `outreach_sequences` table | Email sequences     |
| LeadGenAgent class         | Extends BaseAgent   |
| Scraping (Apify/Firecrawl) | LinkedIn, websites  |
| Contact enrichment         | Clearbit/Hunter API |
| Lead scoring (AI)          | Qualification score |
| Campaign UI                | Create, monitor     |

---

### 2.3 SEO Content Agent

| Task                   | Notes             |
| ---------------------- | ----------------- |
| `content_briefs` table | Topic planning    |
| `articles` table       | Generated content |
| `keywords` table       | SEO data          |
| SEOContentAgent class  | Extends BaseAgent |
| Keyword research       | SEMrush/similar   |
| Long-form generation   | Claude/GPT-4      |
| SEO optimization       | Meta, headings    |
| Content calendar UI    | Schedule, publish |

---

### 2.4 Partnership Agent

| Task                     | Notes             |
| ------------------------ | ----------------- |
| `partners` table         | Partner directory |
| `partner_outreach` table | Outreach tracking |
| PartnershipAgent class   | Extends BaseAgent |
| Partner discovery        | Similar companies |
| Fit scoring (AI)         | Compatibility     |
| Outreach automation      | Templates         |

---

## Phase 3: Expansion Agents

### 3.1 Contract Review Agent

- Document parsing (PDF/DOCX)
- Risk identification
- Amendment suggestions

### 3.2 Regulatory Agent

- Regulatory feed monitoring
- Impact assessment
- Compliance docs generation

### 3.3 Finance Agents

- **Accounts Receivable**: Invoice sync, reminders
- **Spend Analysis**: Transaction import, categorization
- **Dynamic Pricing**: Competitor monitoring, A/B tests

---

## Phase 4: Billing & Subscriptions

| Task                   | Notes                     |
| ---------------------- | ------------------------- |
| Paddle SDK integration | Merchant of record        |
| Checkout flow          | Plan selection            |
| Webhook handlers       | subscription._, payment._ |
| Billing portal         | Invoices, card update     |
| Usage metering         | Credit consumption        |
| Upgrade/downgrade      | Plan changes              |

---

## Phase 5: Polish & Launch

| Task                | Notes             |
| ------------------- | ----------------- |
| PostHog analytics   | Session replay    |
| Feature flags       | Gradual rollouts  |
| Error tracking      | Sentry/similar    |
| Email templates     | MJML styled       |
| SMS/WhatsApp        | Plivo integration |
| Slack notifications | Bolt SDK          |

---

## Recommended Order

1. **AI Provider Abstraction** — Enables all agents
2. **Companies + Contacts tables** — Shared data layer
3. **Lead Generation Agent** — Highest business impact
4. **SEO Content Agent** — Content marketing
5. **Paddle Billing** — Monetization
6. **Remaining agents** — Iterative expansion

---

## Environment Variables Needed

```bash
# AI Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Scraping/Enrichment
APIFY_API_TOKEN=
CLEARBIT_API_KEY=
HUNTER_API_KEY=

# Job Queue
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Cache
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Billing
PADDLE_API_KEY=
PADDLE_WEBHOOK_SECRET=
```

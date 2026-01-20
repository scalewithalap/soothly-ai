# Pricing Strategy & Limits (Technical Enforcement)

> **Source of Truth**: Derived from `whitepaper.md` (Product Vision).
> **Usage**: Use these limits to configure `rate-limit` middleware, database constraints, and billing logic.

## 1. Feature Limits by Tier

The backend must enforce these hard limits. "Unlimited" features must still have a high "Safety Cap" to prevent abuse.

| Feature                        | **FREE** (Forever)  | **LAUNCH** ($129/mo) | **GROWTH** ($349/mo) | **SCALE** ($997/mo) |
| :----------------------------- | :------------------ | :------------------- | :------------------- | :------------------ |
| **Team Members**               | 1 Member            | 2 Members            | 10 Members           | 50 Members          |
| **Agent Access**               | ALL 8 AGENTS        | ALL 8 AGENTS         | ALL 8 AGENTS         | ALL 8 AGENTS        |
| **Proposals** (Deal Closer)    | 1 / mo              | 10 / mo              | 100 / mo             | 500 / mo            |
| **Leads Scraped** (Outbound)   | 10 / mo             | 200 / mo             | 1,000 / mo           | 5,000 / mo          |
| **Partner Recruiting**         | 2 Contacts / mo     | 20 Contacts / mo     | 100 Contacts / mo    | 500 Contacts / mo   |
| **SEO Articles** (Traffic)     | 1 / mo              | 10 / mo              | 50 / mo              | 100 / mo            |
| **Comp. Intel** (Strategy)     | 1 Competitor        | 3 Competitors        | 15 Competitors       | 50 Competitors      |
| **Onboarding** (Activation)    | 50 Users / mo       | 1,000 Users / mo     | 5,000 Users / mo     | 50,000 Users / mo   |
| **Customer Success** (Support) | 100 Msgs / mo       | 2,000 Msgs / mo      | 10,000 Msgs / mo     | 50,000 Msgs / mo    |
| **Rev Recovery** (Retention)   | $0 Recovered (Demo) | Up to $5k / mo       | Up to $50k / mo      | Up to $100k / mo    |
| **SUPERAGENT**                 | ❌                  | In Yearly Plan       | In Yearly Plan       | In Yearly Plan      |

## 2. Technical Implementation Rules

### A. Counting Usage

- **Atomic Increment**: Usage must be tracked atomically in the DB.
  Example - `UPDATE org_usage SET proposal_count = proposal_count + 1 WHERE org_id = '...'`
- **Reset Cycle**: Counters reset on the `billing_cycle_anchor` date (Monthly).

### B. Fair Use Safety Caps

Implement "Fair Use" in every tier.

- **Setup**: Set up a safety cap for each feature.
- **Enforcement**: If a user hits a safety cap, throw `429 Too Many Requests` with a friendly "Contact Sales to Upgrade Safety Cap" message.

### C. The Superagent Gate

- **Check**: The `Superagent` capability is **strictly** gated by `billing_interval === 'year'`.
- **Logic**:
  ```typescript
  if (workflow.agent === "superagent" && subscription.interval !== "year") {
    throw new PaymentRequiredError(
      "The Superagent feature requires a Yearly plan.",
    );
  }
  ```

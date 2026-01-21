# Competitor Intel Agent

> **Role**: "The Spy" - Your Market Strategist  
> **Trigger**: Daily Cron (`0 8 * * *` - 8 AM)

---

## 1. Product Context

| Feature          | Description                                                           |
| :--------------- | :-------------------------------------------------------------------- |
| **Role**         | Monitors competitor websites for price, feature, and strategy changes |
| **User Value**   | Perfect market awareness, never be blindsided                         |
| **Value Metric** | `changes_detected`, `alerts_sent`                                     |
| **Autonomy**     | Smart (auto-scans daily, approval for sending alerts in manual mode)  |

### Status Quo vs. Agent Solution

| Pain (Before)                                            | Solution (After)                        |
| :------------------------------------------------------- | :-------------------------------------- |
| Competitor drops price 50%, you don't notice for a month | Agent checks daily, alerts within hours |
| Manual weekly competitor reviews                         | Automated daily scans with AI analysis  |

---

## 2. Technical Architecture

### Trigger

- **Daily Cron**: `0 8 * * *` (8 AM)
- **Manual**: `intel/competitor.check` event

### Workflow Loop (Inngest Steps)

```mermaid
graph TD
    A[Daily Cron 8AM] --> B(Get Orgs with Competitors)
    B --> C{For Each Org}
    C --> D(Get Competitors)
    D --> E{For Each Page}
    E --> F(Scrape Page)
    F --> G(Generate Hash)
    G --> H{Hash Changed?}
    H -->|No| I[Skip]
    H -->|Yes| J(AI Analyze Change)
    J --> K(Save Change Record)
    K --> L(Save Snapshot)
    I --> L
    L --> M{More Pages?}
    M -->|Yes| E
    M -->|No| N{High Priority Changes?}
    N -->|Yes| O{Approval Needed?}
    O -->|Yes| P[Wait for Approval]
    O -->|No| Q(Send Alert Email)
    P --> Q
    N -->|No| R[Done]
    Q --> R
```

### Change Classification

| Change Type       | Priority | Example                          |
| :---------------- | :------- | :------------------------------- |
| `price_change`    | Critical | "Price dropped from $99 to $49"  |
| `new_feature`     | High     | "Introducing AI-powered reports" |
| `feature_removed` | High     | "Free tier removed"              |
| `headline_change` | Medium   | "Main value prop updated"        |
| `content_update`  | Low      | "Minor text changes"             |

---

## 3. Interface Definitions

### Input Schema (Event Payload)

```typescript
{
  orgId: string;
  triggeredAt?: string;
  model?: string;
  autonomy_mode?: "manual" | "smart" | "auto";
}
```

### Output Schema

```typescript
{
  success: boolean;
  competitorsScanned: number;
  changesDetected: number;
  alertsSent: number;
}
```

---

## 4. Database Tables

| Table                  | Purpose                               |
| :--------------------- | :------------------------------------ |
| `competitors`          | Configured competitors to monitor     |
| `competitor_snapshots` | Historical page snapshots with hashes |
| `competitor_changes`   | Detected changes with AI analysis     |
| `activities`           | Logs agent actions                    |

---

## 5. Event Definitions

| Event                    | Description                   |
| :----------------------- | :---------------------------- |
| `intel/scan.daily`       | Trigger daily scan for an org |
| `intel/competitor.check` | Check a specific competitor   |
| `intel/competitor.add`   | Add new competitor to monitor |

---

## 6. Costs

| Resource       | Cost             | Notes                    |
| :------------- | :--------------- | :----------------------- |
| Gemini 3 Flash | ~$0.001/analysis | AI change classification |
| HTTP Fetch     | Free             | Page scraping (basic)    |
| Email (SES)    | ~$0.0001/alert   | Alert notifications      |

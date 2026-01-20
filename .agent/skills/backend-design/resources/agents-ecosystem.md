# Zero Headache Agent Ecosystem (Technical Spec)

> **Source of Truth**: Derived from `whitepaper.md` (Product Vision).
> **Backend Role**: Orchestrate these durable workflows via Inngest.
> **Goal**: Replace human operational friction with automated loops.

---

## 1. SEO Content Agent (The "Traffic Engine")

**Role**: Your 24/7 Content Marketing Manager.
**Trigger**: User Input (`topic`, `audience`) -> Inngest Job (`agent.seo.generate`).

### User Story (The "Why")

| **The Pain (Before)**                                                                                                                        | **The Solution (After)**                                                                                                                                                                                                          |
| :------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Writer's Block"**: You stare at a blank screen for 2 hours, write one mediocre post, and give up after week 3. Your blog is a ghost town. | **"Owned Land"**: The agent wakes up, finds the question _"Best espresso machine for small apartments"_, and writes a 2,000-word expert review with photos. You wake up to 500 new visitors from Google without lifting a finger. |

### The Workflow Loop (Technical)

1.  **Research Step**:
    - **Action**: Call Google/Reddit Scraping API (e.g., via Apify/Serper).
    - **Data Shape**: Returns `Array<{ question: string, volume: number, intent: 'informational' | 'transactional' }>`.
    - **Logic**: Filter for low-competition, high-intent keywords relative to the user's niche.
2.  **Drafting Step**:
    - **Action**: LLM Chain (Outline -> Section Drafts -> Tone Checks).
    - **Prompt Stacking**: Use separate prompts for Introduction (Hook), Body (Value), and Conclusion (CTA).
    - **Format**: HTML with proper semantic tags (`<h2>`, `<h3>`, `<ul>`).
3.  **Optimization Step**:
    - **Action**: Self-correction loop.
    - **Logic**: Check Flesch-Kincaid score < 60 (easy to read) and keyword density (1-2%).
4.  **Publishing Step**:
    - **Action**: API call to connected CMS (WordPress/Ghost).
    - **Metadata**: Generate OpenGraph image via DALL-E 3 proxy.

### Value & Example

- **Outcome**: Permanent "Owned Land" traffic assets.
- **Example Scenario**:
  - **Input**: Topic: "AI for Real Estate". Audience: "Property Managers".
  - **Agent Execution**:
    1.  Finds keyword "best ai tools for tenant screening" (Vol: 800/mo, Diff: Low).
    2.  Writes "The top 7 AI Screening Tools to Save You 20 Hours/Week."
    3.  Publishes to `/blog/ai-tenant-screening`.
  - **Result**: Ranks #1 in 3 weeks; generates 50 leads/month.

---

## 2. Partnership Agent (The "Recruiter")

**Role**: Your Affiliate Manager and Scout.
**Trigger**: Scheduled Cron (Weekly) OR Manual "Find Partners" command.

### User Story (The "Why")

| **The Pain (Before)**                                                                                                           | **The Solution (After)**                                                                                                                                                                                                                        |
| :------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Begging for Collabs"**: You spend all day DMing influencers on Instagram. 99% ignore you. It feels desperate and unscalable. | **"Leveraged Traffic"**: The agent scans 5,000 profiles, identifies "Sarah" (Yoga Teacher), checks her engagement, and emails her: _"Want 20% comms to promote our Yoga Planner?"_ She says YES. You just got a sales rep while sipping coffee. |

### The Workflow Loop (Technical)

1.  **Scout Step**:
    - **Action**: Social Media Scraper (X/Instagram/TikTok/Facebook/LinkedIn/YouTube).
    - **Default Filters**:
      - `followers`: > 5,000 (Micro-Influencer) to < 500,000 (Macro).
      - `bio_keywords`: Must match `user_niche` tags.
      - `activity`: `last_post_date` < 7 days ago.
      - `velocity`: `posts_per_month` > 4.
      - `social_networks`: `X/Instagram/TikTok/Facebook/LinkedIn/YouTube`.
    - **Advanced Logic**:
      - **Audience Match**: (Optional) Scrape last 10 comments to check for target language/sentiment.
      - **Safety Check**: Exclude profiles with NSFW keywords in bio/recent posts.
    - **User Config**: Users can override these thresholds in `Agent Settings`.
2.  **Qualify Step**:
    - **Action**: Engagement Analysis.
    - **Logic**: Calculate `engagement_rate = (likes + comments) / followers`. Discard if < 1%.
3.  **Outreach Step**:
    - **Action**: Find Contact Info (Hunter.io / Public Email).
    - **Communication**: Send personalized invite via SES (Email) or DM API (if available).
    - **Template**: "Hey {{name}}, saw your post on {{topic}}. We fit perfectly. Open to a 30% comms partnership?"

### Value & Example

- **Outcome**: "Leveraged Traffic" via other people's audiences.
- **Example Scenario**:
  - **Input**: Niche: "Fitness SaaS".
  - **Agent Execution**:
    1.  Finds Yoga instructor on Instagram (50k followers).
    2.  Verifies comments are real humans.
    3.  Sends DM: "Love your flow videos! Want to share our 'Yoga Planner' with your students?"
  - **Result**: Influencer joins Affiliate program -> 500 signups from one Story.

---

## 3. Lead Generation Agent (The "Hunter")

**Role**: Your Outbound Sales Rep (SDR).
**Trigger**: User Config (`ICP Definition`) -> Inngest Job (`agent.leads.hunt`).

### User Story (The "Why")

| **The Pain (Before)**                                                                                                                    | **The Solution (After)**                                                                                                                                                                                          |
| :--------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Admin Hell"**: You buy a shady email list (half bounce). You spend hours copying/pasting into Gmail. It's soul-crushing manual labor. | **"Automated Pipeline"**: You tell the Agent: _"Find Marketing Directors in NY."_ It finds 50 real humans, verifies their emails, and pushes them to your CRM. Your job shifts to _talking_ to interested people. |

### The Workflow Loop (Technical)

1.  **Scrape Step**:
    - **Action**: Query B2B Database (Apollo/LinkedIn).
    - **Criteria**: `Job Title`, `Industry`, `Company Size`, `Location`.
2.  **Enrich Step**:
    - **Action**: Email Deliverability Check (ZeroBounce / NeverBounce).
    - **Logic**: Only keep status `valid`. Discard `bounce` or `catch-all` to protect domain rep.
3.  **Engage Step**:
    - **Action**: Push to CRM (HubSpot/Pipedrive) OR Internal "Cold Outreach" Sequence.
    - **Context**: Add metadata "Sourced by AI Agent on {{date}}".

### Value & Example

- **Outcome**: Automated pipeline generation.
- **Example Scenario**:
  - **Input**: ICP: "Marketing Directors at Pet Food Brands".
  - **Agent Execution**:
    1.  Finds 50 verified profiles (e.g., jane@dogfoodco.com).
    2.  Validates SMTP servers.
    3.  Enrolls them in "Pet Brand Outreach" campaign.
  - **Result**: 50 new qualified prospects added while you sleep.

---

## 4. Proposal Generator Agent (The "Closer")

**Role**: Your Deal Desk / Sales Engineer.
**Trigger**: Webhook (`form_submission`) with `prospect_url`.

### User Story (The "Why")

| **The Pain (Before)**                                                                                                                                                             | **The Solution (After)**                                                                                                                                                                                                        |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **"The Proposal Panic"**: A prospect asks for a proposal. You dig up an old Word doc, find/replace pricing, and pray for no typos. It takes 2 hours, and you send it 2 days late. | **"Instant Context"**: The Agent reads the prospect's "About Us" and "Sustainability" page. It generates a custom PDF: _"How Our Coffee Machines Help [Company] Go Green."_ Sent in 30 seconds. You win on speed and relevance. |

### The Workflow Loop (Technical)

1.  **Analyze Step**:
    - **Action**: Multi-page Scrape of Prospect URL (Home, About, Pricing, Blog).
    - **Extraction**: Summarize _their_ Value Prop, _their_ Customers, and _their_ likely Pain Points.
2.  **Synthesize Step**:
    - **Action**: Mapping Logic.
    - **Prompt**: "Map [Prospect Pain A] to [Our Feature B]. Explain the ROI."
3.  **Generate Step**:
    - **Action**: Create PDF (React-PDF) or rich Notion Page.
    - **Content**: Executive Summary, Problem Statement, Custom Solution, Pricing Q&A.

### Value & Example

- **Outcome**: Consultative Selling at scale.
- **Example Scenario**:
  - **Input**: Prospect: "Acme Law Firm" (High-end corporate law).
  - **Agent Execution**:
    1.  Detects "Corporate Law" -> Prioritizes "Security", "Confidentiality", "24/7 Support".
    2.  Generates PDF: "Why Zero Headache fits Acme's Privacy Standards."
  - **Result**: Client feels "understood" -> Close rate doubles vs generic deck.

---

## 5. Onboarding Agent (The "Guide")

**Role**: Your Implementation Specialist.
**Trigger**: `auth.user.created` event via Supabase Auth Hook.

### User Story (The "Why")

| **The Pain (Before)**                                                                                                                          | **The Solution (After)**                                                                                                                                                                            |
| :--------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Silent Churn"**: A new user signs up, gets confused by the UI, and quits 3 days later. You never knew they were stuck until they cancelled. | **"Active Guidance"**: The Agent sees they haven't uploaded a logo. It waits 1 hour, then emails: _"Hey! The app looks better with your logo. Link here."_ The user feels helped and sticks around. |

### The Workflow Loop (Technical)

1.  **Profile Step**:
    - **Action**: Analyze signup metadata (Role: "Designer" vs "Developer").
2.  **Checklist Step**:
    - **Action**: Generate `onboarding_tasks` rows in DB.
    - **Logic**: Branching paths.
      - If `Dev`: Show "Get API Keys".
      - If `Marketer`: Show "Create Campaign".
3.  **Nudge Step**:
    - **Action**: Scheduled Checks (Inngest `step.sleep('2d')`).
    - **Logic**: If `task_completed = false`, send email: "Stuck on step 2? Here's a tip...".

### Value & Example

- **Outcome**: Reduced "Early Churn" and faster Time-To-Value.
- **Example Scenario**:
  - **Input**: User Role: "Developer".
  - **Agent Execution**:
    1.  Hides "Drag-and-Drop" tutorial.
    2.  Highlights `API_KEY` section and `Docs` link.
  - **Result**: Dev integrates in 5 mins instead of getting frustrated by "basic" tutorials.

---

## 6. Customer Success Agent (The "Brain")

**Role**: Your Level 1 Support Rep.
**Trigger**: Chat Widget Message (`support_ticket.created`).

### User Story (The "Why")

| **The Pain (Before)**                                                                                                                       | **The Solution (After)**                                                                                                                         |
| :------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Slave to Support"**: It's Saturday night dinner. Your phone buzzes. A customer forgot their password. You have to step out to text them. | **"Zero-Wait Support"**: The Agent replies at 9:02 PM: _"Sent a secure reset link to your email."_ The customer is happy. You enjoy your dinner. |

### The Workflow Loop (Technical)

1.  **Retrieve Step**:
    - **Action**: RAG Search (Vector Similarity) on Docs + Past Tickets.
    - **Context Window**: Include user's plan details and recent errors logs.
2.  **Action Step**:
    - **Capabilities**: Can call safe backend tools: `sendResetPassword`, `resendInvoice`, `checkStatus`.
    - **Guardrails**: Never hallucinates policies; falls back to "I'll ask a human" if uncertainty > threshold.
3.  **Respond Step**:
    - **Action**: Stream polite, helpful answer.

### Value & Example

- **Outcome**: 80% Ticket Deflection; zero-wait support.
- **Example Scenario**:
  - **User Query**: "Where is my invoice?"
  - **Agent Execution**:
    1.  Identifies intent "billing/invoice".
    2.  Calls `tools.getLatestInvoiceUrl(user_id)`.
    3.  Responds: "You can download it here: [Link]. It's also under Settings > Billing."

---

## 7. Revenue Recovery Agent (The "Defender")

**Role**: Your Automated Collections Team.
**Trigger**: Stripe Webhook (`invoice.payment_failed`).

### User Story (The "Why")

| **The Pain (Before)**                                                                                                                                                              | **The Solution (After)**                                                                                                                                             |
| :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Involuntary Churn"**: A loyal customer's card expires. Payment fails. Account cancels. They get locked out and switch to a competitor. You lost $1k/yr over a piece of plastic. | **"Frictionless Fix"**: Payment fails at 2 AM. Agent texts at 9 AM: _"Keep your subscription active—tap to update."_ They tap, FaceID scans card. Done. Money saved. |

### The Workflow Loop (Technical)

1.  **Analyze Step**:
    - **Action**: ID Failure Code.
    - **Differentiation**: `generic_decline` (Try again) vs `insufficient_funds` (Wait till payday?) vs `expired_card` (Needs update).
2.  **Link Step**:
    - **Action**: Generate "Magic Link" (Time-limited, pre-auth update page).
3.  **Notify Step**:
    - **Action**: Immediate Email + SMS (if consented).
    - **Copy**: "Payment failed. Don't lose access! Click to update in 10s: [MagicLink]."

### Value & Example

- **Outcome**: Recovers 15-20% of involuntary churn.
- **Example Scenario**:
  - **Event**: $349 renewal fails at 2 AM (Expired Card).
  - **Agent Execution**:
    1.  Sends SMS at 9 AM local time.
    2.  User taps link -> FaceID -> Scans new card.
    3.  Payment retried and captured.

---

## 8. Competitor Intel Agent (The "Spy")

**Role**: Your Market Strategist.
**Trigger**: Daily Cron (`0 8 * * *`).

### User Story (The "Why")

| **The Pain (Before)**                                                                                                                 | **The Solution (After)**                                                                                                                                                 |
| :------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Blind-Sided"**: Your biggest competitor drops their price by 50%. You don't notice for a month. You lose deals and don't know why. | **"Market Radar"**: The Agent checks their site daily. It alerts you: _"Competitor X changed headline to '50% off'."_ You react instantly and protect your market share. |

### The Workflow Loop (Technical)

1.  **Monitor Step**:
    - **Action**: Headless Browser visit to Competitor URLs.
    - **Capture**: Screenshot + Text Extraction.
2.  **Diff Step**:
    - **Action**: Hash content (`sha256`). Compare with `previous_hash`.
    - **Logic**: If equal, stop. If diff, analyze _what_ changed via LLM.
3.  **Alert Step**:
    - **Action**: "Strategic Alert".
    - **Logic**: Filter out noise (date changes). Only alert on "Price Change", "New Feature", "Headline Change".

### Value & Example

- **Outcome**: Perfect market awareness.
- **Example Scenario**:
  - **Event**: Competitor removes their "Free Tier" pricing column.
  - **Agent Execution**:
    1.  Detects DOM change in `.pricing-table`.
    2.  Analyzes text diff: "Free Plan" row removed.
    3.  Alerts You: "Competitor X dropped free tier. Opportunity to capture their overflow?"

---

## The Superagent (The "Manager")

**Access**: **Yearly Plan Exclusive**.
**Role**: Meta-Orchestrator.
**Capability**: Can trigger other Agents' Inngest events (`step.invoke('agent.other.job')`).

### User Story (The "Why")

| **The Pain (Before)**                                                                                                           | **The Solution (After)**                                                                                                                                                                                              |
| :------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Micro-Management"**: You have to tell 8 different agents what to do 8 different times. It feels like managing a junior team. | **"Command & Control"**: You say: _"Get me more Yoga sales."_ The Superagent orchestrates the Intel, Content, and Partnership agents to execute a coordinated campaign. You give one order; the whole business moves. |

### Example Workflow: "Niche Takeover Campaign"

1.  **User Command**: "Launch a campaign targeting Real Estate agents."
2.  **Superagent Plan**:
    - **Step 1 (Intel)**: Call **Intel Agent** to analyze Top Real Estate Competitor.
      - _Wait for report._
    - **Step 2 (Content)**: Call **SEO Agent** to write "Better Guide than Competitor" based on Step 1 report.
      - _Wait for URL._
    - **Step 3 (Leads)**: Call **Lead Gen Agent** to find 500 Real Estate Brokers.
    - **Step 4 (Partners)**: Call **Partnership Agent** to find 5 RE Influencers.
    - **Step 5 (Execution)**: Email the Brokers the new Guide (Step 2). DM the Influencers the new Guide.
3.  **Result**: A fully coordinated, multi-agent attack on a market segment from a single prompt.

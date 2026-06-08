# Graph Report - soothly.ai (2026-06-09)

## Corpus Check

- 484 files · ~247,648 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 1785 nodes · 3063 edges · 51 communities detected
- Extraction: 56% EXTRACTED · 44% INFERRED · 0% AMBIGUOUS · INFERRED: 1343 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 83|Community 83]]

## God Nodes (most connected - your core abstractions)

1. `Select()` - 213 edges
2. `createClient()` - 180 edges
3. `untypedQuery()` - 48 edges
4. `requireAuth()` - 47 edges
5. `isErrorResponse()` - 43 edges
6. `WorkflowEngine` - 29 edges
7. `log()` - 24 edges
8. `POST()` - 22 edges
9. `MCPClient` - 18 edges
10. `createSupabaseAdminClient()` - 18 edges

## Surprising Connections (you probably didn't know these)

- `handleDownload()` --calls--> `createClient()` [INFERRED]
  app\(platform)\library\page.tsx → lib\supabase\server.ts
- `POST()` --calls--> `getA2AServer()` [INFERRED]
  app\api\a2a\route.ts → lib\agents\a2a\A2AServer.ts
- `RootPage()` --calls--> `createClient()` [INFERRED]
  app\page.tsx → lib\supabase\server.ts
- `LoginPage()` --calls--> `createClient()` [INFERRED]
  app\(auth)\login\page.tsx → lib\supabase\server.ts
- `SignupPage()` --calls--> `createClient()` [INFERRED]
  app\(auth)\signup\page.tsx → lib\supabase\server.ts

## Communities

### Community 0 - "Community 0"

Cohesion: 0.02
Nodes (164): POST(), calculateCommission(), getAffiliateStats(), recordCommission(), requestPayout(), approveAllPendingCommissions(), getConversionAnalytics(), getUserAffiliateAttribution() (+156 more)

### Community 1 - "Community 1"

Cohesion: 0.02
Nodes (100): copyReferralLink(), fetchAffiliateData(), fetchPayouts(), fetchReferrals(), requestPayout(), copyReferralLink(), fetchData(), processPayout() (+92 more)

### Community 2 - "Community 2"

Cohesion: 0.03
Nodes (49): generateWithModel(), getAnthropic(), getGemini(), getOpenAI(), getProviderForModel(), checkGuardrails(), consumeUsage(), consumeUsageAfterSuccess() (+41 more)

### Community 3 - "Community 3"

Cohesion: 0.03
Nodes (21): logWebhookEvent(), processShopifyEvent(), processStripeEvent(), verifyHmacSignature(), verifyShopifySignature(), verifyStripeSignature(), generateUserHmac(), registerRemoteFunctions() (+13 more)

### Community 4 - "Community 4"

Cohesion: 0.03
Nodes (34): constructor(), AgentCommunicator, AgentRegistry, registerBuiltinTools(), SemanticCache, AnthropicProvider, getApiModel(), createRateLimitHeaders() (+26 more)

### Community 5 - "Community 5"

Cohesion: 0.05
Nodes (30): getUntypedClient(), POST(), getUntypedClient(), POST(), generateContentHash(), getUntypedClient(), getOrgOwner(), getUntypedClient() (+22 more)

### Community 6 - "Community 6"

Cohesion: 0.07
Nodes (15): createAgentStream(), createStreamResponse(), getAuthenticatedUser(), requireAdmin(), normalizeAgentType(), POST(), AppError, fromZodError() (+7 more)

### Community 7 - "Community 7"

Cohesion: 0.08
Nodes (5): ContentfulAdapter, GhostAdapter, MediumAdapter, WebflowAdapter, WordPressAdapter

### Community 8 - "Community 8"

Cohesion: 0.1
Nodes (32): GET(), POST(), advanceEnrollment(), bulkEnroll(), calculateNextSendTime(), completeEnrollment(), enrollContact(), getEnrollment() (+24 more)

### Community 9 - "Community 9"

Cohesion: 0.12
Nodes (11): calculateAffiliateTier(), getAffiliateLeaderboard(), updateAffiliateTier(), chunkText(), createKnowledgeBase(), generateEmbedding(), hashContent(), KnowledgeBase (+3 more)

### Community 10 - "Community 10"

Cohesion: 0.13
Nodes (19): sendEmail(), sendInvitationEmail(), sendNotificationEmail(), sendPasswordResetEmail(), sendWelcomeEmail(), createJiraIssue(), escapeMarkdown(), sendDiscordNotification() (+11 more)

### Community 11 - "Community 11"

Cohesion: 0.2
Nodes (19): checkAdminRole(), GET(), POST(), calculateNextRetry(), createWebhook(), deleteWebhook(), deliverWebhookEvent(), generateWebhookSecret() (+11 more)

### Community 12 - "Community 12"

Cohesion: 0.1
Nodes (9): AffiliatePage(), IntegrationsSettingsPage(), Header(), useContent(), LoginPage(), ResetPasswordForm(), SignupPage(), SuperagentPage() (+1 more)

### Community 13 - "Community 13"

Cohesion: 0.19
Nodes (1): CompetitorIntelAgent

### Community 14 - "Community 14"

Cohesion: 0.2
Nodes (1): MCPClient

### Community 15 - "Community 15"

Cohesion: 0.22
Nodes (12): getActorRunStatus(), getApifyClient(), getDatasetItems(), runActor(), startActorRun(), buildLeadActorInput(), buildPartnerActorInput(), getActorForLeadSource() (+4 more)

### Community 16 - "Community 16"

Cohesion: 0.22
Nodes (2): A2AServer, getA2AServer()

### Community 17 - "Community 17"

Cohesion: 0.17
Nodes (1): Superagent

### Community 18 - "Community 18"

Cohesion: 0.26
Nodes (1): A2AClient

### Community 19 - "Community 19"

Cohesion: 0.23
Nodes (1): RevenueRecoveryAgent

### Community 20 - "Community 20"

Cohesion: 0.21
Nodes (5): GeminiProvider, escapeHtml(), sendMessage(), toggleWidget(), verifyIdentity()

### Community 21 - "Community 21"

Cohesion: 0.26
Nodes (2): AgentTracer, generateUUID()

### Community 22 - "Community 22"

Cohesion: 0.24
Nodes (1): OnboardingAgent

### Community 23 - "Community 23"

Cohesion: 0.26
Nodes (6): flattenContactData(), generatePreview(), getBuiltInVariables(), personalizeEmail(), personalizeEmailContent(), validateContactData()

### Community 24 - "Community 24"

Cohesion: 0.36
Nodes (10): decryptToken(), disconnectOAuth(), encryptToken(), exchangeCodeForTokens(), generateAuthUrl(), getOAuthConfig(), getOAuthConnection(), getValidAccessToken() (+2 more)

### Community 26 - "Community 26"

Cohesion: 0.22
Nodes (2): SidebarMenuButton(), useSidebar()

### Community 27 - "Community 27"

Cohesion: 0.24
Nodes (4): createTraceContext(), generateTraceId(), traceLog(), withTracedStep()

### Community 28 - "Community 28"

Cohesion: 0.24
Nodes (1): CustomerSuccessAgent

### Community 29 - "Community 29"

Cohesion: 0.31
Nodes (4): fetchBriefs(), handleDrop(), handleDropToUnscheduled(), handleSchedule()

### Community 34 - "Community 34"

Cohesion: 0.39
Nodes (5): generateCSV(), generateExcel(), generateExport(), generateJSON(), jsonTo2DArray()

### Community 35 - "Community 35"

Cohesion: 0.43
Nodes (6): fetchLeads(), formatRelativeTime(), handleSendOutreach(), handleSkip(), mapContactToLead(), mapPipelineStageToStatus()

### Community 36 - "Community 36"

Cohesion: 0.38
Nodes (3): fetchMemories(), handleDelete(), handleSearch()

### Community 37 - "Community 37"

Cohesion: 0.29
Nodes (3): fetchStats(), fetchTraceDetails(), fetchTraces()

### Community 40 - "Community 40"

Cohesion: 0.33
Nodes (2): cn(), getStatusIcon()

### Community 41 - "Community 41"

Cohesion: 0.4
Nodes (3): createCoupon(), fetchAnalytics(), fetchCoupons()

### Community 42 - "Community 42"

Cohesion: 0.33
Nodes (3): fetchNotifications(), markAllAsRead(), markAsRead()

### Community 43 - "Community 43"

Cohesion: 0.33
Nodes (2): handleSubmit(), onSubmit()

### Community 45 - "Community 45"

Cohesion: 0.53
Nodes (4): captureServerError(), captureServerEvent(), getServerPostHog(), identifyServerUser()

### Community 46 - "Community 46"

Cohesion: 0.4
Nodes (1): fetchHistory()

### Community 47 - "Community 47"

Cohesion: 0.4
Nodes (2): handleDelete(), handleDownload()

### Community 48 - "Community 48"

Cohesion: 0.5
Nodes (2): nextStep(), saveProgress()

### Community 49 - "Community 49"

Cohesion: 0.5
Nodes (3): fetchDrafts(), formatRelativeTime(), mapBriefToDraft()

### Community 50 - "Community 50"

Cohesion: 0.5
Nodes (2): CarouselNext(), useCarousel()

### Community 55 - "Community 55"

Cohesion: 0.5
Nodes (2): parseAgentEventData(), validateModel()

### Community 56 - "Community 56"

Cohesion: 0.83
Nodes (3): fetchAnalytics(), fetchStats(), handleRefresh()

### Community 57 - "Community 57"

Cohesion: 0.5
Nodes (1): fetchAuditLog()

### Community 59 - "Community 59"

Cohesion: 0.5
Nodes (1): componentDidCatch()

### Community 60 - "Community 60"

Cohesion: 0.67
Nodes (2): handleKeyDown(), handleSubmit()

### Community 61 - "Community 61"

Cohesion: 0.5
Nodes (1): handleAIWrite()

### Community 72 - "Community 72"

Cohesion: 0.67
Nodes (1): ApprovalsPage()

### Community 83 - "Community 83"

Cohesion: 1.0
Nodes (2): generateMockData(), loadData()

## Knowledge Gaps

- **Thin community `Community 13`** (16 nodes): `CompetitorIntelAgent`, `.addCompetitor()`, `.buildAlertEmail()`, `.classifyChange()`, `.cleanup()`, `.detectChanges()`, `.determinePriority()`, `.execute()`, `.generateChangeDetails()`, `.generateChangeSummary()`, `.generateContentHash()`, `.hasPriceValueChanged()`, `.initialize()`, `.monitorCompetitor()`, `.runDailyScan()`, `CompetitorIntelAgent.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (16 nodes): `MCPClient`, `.callTool()`, `.connect()`, `.connected()`, `.connectHTTP()`, `.connectWebSocket()`, `.constructor()`, `.getCapabilities()`, `.getPrompt()`, `.listPrompts()`, `.listResources()`, `.listTools()`, `.readResource()`, `.sendHTTPRequest()`, `.sendNotification()`, `.sendRequest()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (15 nodes): `A2AServer`, `.addArtifact()`, `.completeTask()`, `.constructor()`, `.errorResponse()`, `.failTask()`, `.getAgentCard()`, `.handleRequest()`, `.handleTaskCancel()`, `.handleTaskGet()`, `.handleTaskSend()`, `.streamTask()`, `.updateTaskStatus()`, `getA2AServer()`, `A2AServer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (15 nodes): `Superagent.ts`, `Superagent`, `.cancelCampaign()`, `.cleanup()`, `.execute()`, `.executeCampaign()`, `.generateStepIds()`, `.getAgentEventName()`, `.getCampaignStatus()`, `.getExecutableSteps()`, `.getTemplate()`, `.getTemplates()`, `.initialize()`, `.interpolateParams()`, `.planCampaign()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (13 nodes): `A2AClient`, `.cancelTask()`, `.constructor()`, `.discoverAgent()`, `.executeTask()`, `.getHeaders()`, `.getTask()`, `.rpcCall()`, `.sendTask()`, `.streamTask()`, `.waitForResult()`, `createA2AClient()`, `A2AClient.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (13 nodes): `RevenueRecoveryAgent.ts`, `RevenueRecoveryAgent`, `.buildRecoveryEmailContent()`, `.cleanup()`, `.execute()`, `.generateMagicLink()`, `.getRecoveryStrategy()`, `.getRetryConfig()`, `.initialize()`, `.isRecoverable()`, `.processFailedPayment()`, `.retryPayment()`, `.sendRecoveryEmail()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (12 nodes): `AgentTracer.ts`, `AgentTracer`, `.calculateCost()`, `.constructor()`, `.endSpan()`, `.getSpanId()`, `.getStats()`, `.getTraceId()`, `.startSpan()`, `.startTrace()`, `.truncateObject()`, `generateUUID()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (12 nodes): `OnboardingAgent.ts`, `OnboardingAgent`, `.checkProgress()`, `.cleanup()`, `.execute()`, `.getCompletionPercentage()`, `.getNextTask()`, `.getNudgeContent()`, `.getTasksForRole()`, `.initialize()`, `.sendNudge()`, `.startOnboarding()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (10 nodes): `sidebar.tsx`, `cn()`, `handleKeyDown()`, `SidebarFooter()`, `SidebarHeader()`, `SidebarMenu()`, `SidebarMenuButton()`, `SidebarMenuItem()`, `SidebarSeparator()`, `useSidebar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (10 nodes): `CustomerSuccessAgent`, `.answerQuestion()`, `.buildResponsePrompt()`, `.buildSystemPrompt()`, `.classifyIntent()`, `.cleanup()`, `.execute()`, `.initialize()`, `.processTicket()`, `CustomerSuccessAgent.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (6 nodes): `page.tsx`, `RecoveryFeed.tsx`, `cn()`, `fetchStatus()`, `getStatusBadge()`, `getStatusIcon()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (6 nodes): `ClarificationModal.tsx`, `StepEditor.tsx`, `handleReset()`, `handleSubmit()`, `insertVariable()`, `onSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (5 nodes): `page.tsx`, `fetchHistory()`, `formatCurrency()`, `formatDate()`, `getStatusBadge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (5 nodes): `page.tsx`, `formatFileSize()`, `getFileIcon()`, `handleDelete()`, `handleDownload()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (5 nodes): `page.tsx`, `loadUser()`, `nextStep()`, `prevStep()`, `saveProgress()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (5 nodes): `carousel.tsx`, `Carousel()`, `CarouselNext()`, `cn()`, `useCarousel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (5 nodes): `hitl.ts`, `parseAgentEventData()`, `requestApprovalAndWait()`, `requiresApproval()`, `validateModel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (4 nodes): `page.tsx`, `fetchAuditLog()`, `formatDate()`, `getActionBadge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (4 nodes): `componentDidCatch()`, `constructor()`, `getDerivedStateFromError()`, `error-boundary.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (4 nodes): `cn()`, `handleKeyDown()`, `handleSubmit()`, `ChatInterface.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (4 nodes): `OutreachStudio.tsx`, `handleAIWrite()`, `Linkedin()`, `Twitter()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (3 nodes): `page.tsx`, `page.tsx`, `ApprovalsPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (3 nodes): `SequenceAnalytics.tsx`, `generateMockData()`, `loadData()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `Select()` connect `Community 0` to `Community 32`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 11`, `Community 16`, `Community 21`, `Community 24`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `createClient()` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 9`, `Community 11`, `Community 12`, `Community 47`, `Community 24`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `POST()` connect `Community 6` to `Community 0`, `Community 9`, `Community 2`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Are the 212 inferred relationships involving `Select()` (e.g. with `fetchBillingData()` and `fetchOrganization()`) actually correct?**
  _`Select()` has 212 INFERRED edges - model-reasoned connections that need verification._
- **Are the 179 inferred relationships involving `createClient()` (e.g. with `RootPage()` and `LoginPage()`) actually correct?**
  _`createClient()` has 179 INFERRED edges - model-reasoned connections that need verification._
- **Are the 47 inferred relationships involving `untypedQuery()` (e.g. with `GET()` and `GET()`) actually correct?**
  _`untypedQuery()` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 44 inferred relationships involving `requireAuth()` (e.g. with `POST()` and `GET()`) actually correct?**
  _`requireAuth()` has 44 INFERRED edges - model-reasoned connections that need verification._

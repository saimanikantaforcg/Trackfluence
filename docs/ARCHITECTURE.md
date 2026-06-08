# Trackfluence — Architecture Diagrams

> **Version:** 1.0 | **Date:** May 2026  
> All diagrams use Mermaid syntax (rendered in GitHub, GitLab, Notion, and most markdown viewers)

---

## 1. System Context — 30,000-Foot View

```mermaid
C4Context
    title Trackfluence — System Context

    Person(brand, "Brand Team", "Performance marketers, finance, ops")
    Person(creator, "Creator / Affiliate", "Shares tracking links")
    Person(customer, "End Customer", "Clicks links, buys products")

    System(trackfluence, "Trackfluence", "Revenue attribution & intelligence platform")

    System_Ext(shopify, "Shopify", "E-commerce orders")
    System_Ext(salesforce, "Salesforce / SFMC", "CRM & marketing cloud")
    System_Ext(meta, "Meta / Facebook", "CAPI server events")
    System_Ext(stripe, "Stripe", "Subscription billing")
    System_Ext(resend, "Resend", "Transactional email")
    System_Ext(slack, "Slack / Discord", "Notifications")

    Rel(brand, trackfluence, "Manages creators, campaigns, payouts")
    Rel(creator, trackfluence, "Views portal stats")
    Rel(customer, trackfluence, "Clicks tracking links")
    Rel(trackfluence, shopify, "Receives order webhooks")
    Rel(trackfluence, salesforce, "Exports audiences")
    Rel(meta, trackfluence, "Sends server-side purchase events")
    Rel(trackfluence, stripe, "Subscription management")
    Rel(trackfluence, resend, "Sends emails")
    Rel(trackfluence, slack, "Push notifications")
```

---

## 2. Monorepo Package Structure

```mermaid
graph TD
    Root["📁 trackfluence/ (Turborepo)"]

    Root --> Apps["📁 apps/"]
    Root --> Packages["📁 packages/"]
    Root --> Scripts["📁 scripts/"]

    Apps --> API["📦 @trackfluence/api\nNestJS 11 · Port 4000"]
    Apps --> Web["📦 @trackfluence/web\nNext.js 15 · Port 3000"]

    Packages --> DB["📦 @trackfluence/database\nPrisma 6 + PostgreSQL schema"]
    Packages --> Shared["📦 @trackfluence/shared\nTS types + constants"]

    API -->|"imports"| DB
    API -->|"imports"| Shared
    Web -->|"imports"| Shared

    style Root fill:#1e293b,color:#f1f5f9
    style Apps fill:#1e3a5f,color:#f1f5f9
    style Packages fill:#1e3a5f,color:#f1f5f9
    style API fill:#E0234E,color:#fff
    style Web fill:#000,color:#fff
    style DB fill:#2D3748,color:#fff
    style Shared fill:#4a1d96,color:#fff
```

---

## 3. API Request Flow — From Browser to Database

```mermaid
sequenceDiagram
    participant Browser
    participant NextMiddleware as Next.js Middleware (Edge)
    participant NextPage as Next.js Page
    participant NestJS as NestJS API
    participant Guards as Guard Chain
    participant Service as Service Layer
    participant Prisma as Prisma ORM
    participant Postgres as PostgreSQL
    participant Redis

    Browser->>NextMiddleware: GET /dashboard
    NextMiddleware->>NextMiddleware: Read tf_token cookie
    alt No cookie
        NextMiddleware-->>Browser: Redirect /login?from=/dashboard
    else Valid cookie
        NextMiddleware->>NextPage: Continue
        NextPage->>NestJS: GET /api/v1/revenue-intelligence/dashboard
        NestJS->>Guards: JwtAuthGuard.canActivate()
        Guards->>Guards: Verify JWT signature
        Guards->>Guards: RolesGuard.canActivate()
        Guards->>Guards: RateLimitGuard.canActivate()
        Guards->>Service: handleRequest(user)
        Service->>Redis: GET cache:dashboard:<userId>
        alt Cache hit
            Redis-->>Service: Cached JSON
        else Cache miss
            Service->>Prisma: Complex aggregation query
            Prisma->>Postgres: SELECT + GROUP BY
            Postgres-->>Prisma: Result rows
            Prisma-->>Service: Typed objects
            Service->>Redis: SET cache:dashboard:<userId> (5min TTL)
        end
        Service-->>NestJS: DashboardKPIs DTO
        NestJS-->>NextPage: 200 JSON
        NextPage-->>Browser: Rendered dashboard
    end
```

---

## 4. Attribution Pipeline — Click to Commission

```mermaid
sequenceDiagram
    participant Creator
    participant Customer
    participant TrackingLink as GET /r/:shortCode
    participant EventService as Event Service
    participant Shopify as Shopify Webhook
    participant IdentityResolver as Identity Resolver
    participant AttributionEngine as Attribution Engine
    participant NotificationService as Notification Service
    participant WebhookService as Webhook Dispatcher

    Creator->>Customer: Shares https://brand.com/r/aB3xYz

    Customer->>TrackingLink: Click
    TrackingLink->>EventService: Record click (creatorId, campaignId, sessionId)
    EventService->>EventService: Set __tf_session cookie
    TrackingLink-->>Customer: 302 Redirect → destinationUrl

    Note over Customer: Customer browses, adds to cart...

    Customer->>Shopify: Places order ($200)
    Shopify->>TrackingLink: POST /connectors/shopify/webhook (HMAC verified)
    TrackingLink->>IdentityResolver: Match customer (email + session)
    IdentityResolver->>IdentityResolver: Find TouchPoints in 30-day window
    IdentityResolver->>AttributionEngine: Run attribution model
    AttributionEngine->>AttributionEngine: Calculate creator share
    AttributionEngine->>AttributionEngine: Create Attribution record ($200 × 10% = $20)
    AttributionEngine->>NotificationService: Push ATTRIBUTION_CREATED
    NotificationService->>Customer: Socket.io push (user:<brandUserId>)
    AttributionEngine->>WebhookService: Dispatch attribution.created webhook
    WebhookService->>WebhookService: HMAC-sign payload
    WebhookService-->>ExternalSystem: POST + X-Trackfluence-Signature
```

---

## 5. Guard Chain — API Security Layers

```mermaid
graph LR
    Request["Incoming\nHTTP Request"]
    JwtGuard["JwtAuthGuard\n\nVerify Bearer JWT\n\nCheck @Public() skip"]
    RolesGuard["RolesGuard\n\nCheck @Roles() decorator\ncompare user.role"]
    RateLimitGuard["RateLimitGuard\n\nIP-based global limit\n200 req / 60s"]
    UserRateGuard["UserRateLimitGuard\n\nPer-user sliding window\n(Redis)"]
    Controller["Controller\nHandler"]
    Forbidden["403 Forbidden"]
    Unauthorized["401 Unauthorized"]
    TooMany["429 Too Many\nRequests"]

    Request --> JwtGuard
    JwtGuard -->|"No/invalid token\n(non-Public route)"| Unauthorized
    JwtGuard -->|"Valid token or @Public"| RolesGuard
    RolesGuard -->|"Wrong role"| Forbidden
    RolesGuard -->|"Role OK"| RateLimitGuard
    RateLimitGuard -->|"IP limit exceeded"| TooMany
    RateLimitGuard -->|"OK"| UserRateGuard
    UserRateGuard -->|"User limit exceeded"| TooMany
    UserRateGuard -->|"OK"| Controller
```

---

## 6. Real-Time Events — Socket.io Architecture

```mermaid
sequenceDiagram
    participant Browser
    participant WSGateway as Socket.io Gateway (/realtime)
    participant JwtService as JWT Service
    participant Redis as Redis (pub/sub)
    participant NestService as Any NestJS Service

    Browser->>WSGateway: connect({ auth: { token: '<JWT>' } })
    WSGateway->>JwtService: verify(token)
    alt Invalid token
        WSGateway-->>Browser: disconnect (UnauthorizedException)
    else Valid token
        WSGateway->>WSGateway: socket.join('user:<userId>')
        WSGateway-->>Browser: connected ✓

        Note over NestService: Attribution created for userId
        NestService->>WSGateway: emit to room 'user:<userId>'
        WSGateway-->>Browser: ATTRIBUTION_CREATED { creatorName, amount }

        Note over NestService: Payout approved for userId
        NestService->>WSGateway: emit to room 'user:<userId>'
        WSGateway-->>Browser: PAYOUT_UPDATED { payoutId, status: 'APPROVED' }
    end
```

---

## 7. Multi-Tenancy Model

```mermaid
graph TD
    User1["👤 User A\n(Owner)"]
    User2["👤 User B\n(Admin)"]
    User3["👤 User C\n(Member)"]
    User4["👤 User D\n(Viewer)"]

    Org1["🏢 Brand Alpha Org"]
    Org2["🏢 Brand Beta Org"]

    Creator1["🎬 Creator X"]
    Creator2["🎬 Creator Y"]
    Creator3["🎬 Creator Z"]

    Campaign1["📢 Summer Campaign"]
    Campaign2["📢 Q4 Launch"]

    User1 -->|OWNER| Org1
    User2 -->|ADMIN| Org1
    User3 -->|MEMBER| Org1
    User4 -->|VIEWER| Org2
    User1 -->|OWNER| Org2

    Org1 --> Creator1
    Org1 --> Creator2
    Org2 --> Creator3

    Org1 --> Campaign1
    Org1 --> Campaign2
```

**Role permissions:**

```mermaid
graph LR
    OWNER["OWNER\nAll permissions"]
    ADMIN["ADMIN\nRead + Write\nInvite\nAdmin actions\nNo billing"]
    MEMBER["MEMBER\nRead + Write\nNo invites\nNo billing\nNo admin"]
    VIEWER["VIEWER\nRead only"]

    OWNER -->|"superset of"| ADMIN
    ADMIN -->|"superset of"| MEMBER
    MEMBER -->|"superset of"| VIEWER
```

---

## 8. Billing & Plan Enforcement Flow

```mermaid
flowchart TD
    Request["User action:\nCreate tracking link"]
    CheckPlan["Check user's PlanTier\n(via Subscription record)"]
    CountUsage["Count existing links\nfor this user"]
    Compare{"count >= plan.maxLinks?"}
    Allow["✅ Proceed\nCreate link"]
    Block["❌ 403 Forbidden\n'Upgrade to create more links'"]
    RecordUsage["Record UsageRecord\n(metric: tracking_link_created)"]

    Request --> CheckPlan
    CheckPlan --> CountUsage
    CountUsage --> Compare
    Compare -->|"No (under limit)"| Allow
    Compare -->|"Yes (at limit)"| Block
    Allow --> RecordUsage
```

---

## 9. Payout Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING : Payout created\n(auto or manual)

    PENDING --> APPROVED : Finance approves\n(individual or bulk)
    PENDING --> CANCELLED : Finance cancels

    APPROVED --> PAID : Marked as paid\n(after bank transfer)
    APPROVED --> CANCELLED : Finance cancels\n(before payment)

    PAID --> [*]
    CANCELLED --> [*]

    note right of PENDING
        Commission calculated
        Awaiting review
    end note

    note right of APPROVED
        Ready for payment
        CSV exportable
    end note

    note right of PAID
        Settlement complete
        Immutable
    end note
```

---

## 10. Creator Score Calculation

```mermaid
flowchart LR
    Clicks["Total Clicks\nby Creator"]
    Revenue["Attributed\nRevenue"]
    Conversions["Total\nConversions"]

    AllClicks["Platform Total\nClicks"]
    AllRevenue["Platform Total\nRevenue"]
    AllConversions["Platform Total\nConversions"]

    ClickShare["click_share\n= creator_clicks / all_clicks"]
    RevenueShare["revenue_share\n= creator_revenue / all_revenue"]
    ConversionShare["conversion_share\n= creator_conv / all_conv"]

    Score["score = \nrevenue_share × 50%\n+ conversion_share × 30%\n+ click_share × 20%\n\n× 100"]

    Tier{{"Score tier"}}
    Platinum["🏆 Platinum\n≥ 80"]
    Gold["🥇 Gold\n55–79"]
    Silver["🥈 Silver\n30–54"]
    Bronze["🥉 Bronze\n< 30"]

    Clicks & AllClicks --> ClickShare
    Revenue & AllRevenue --> RevenueShare
    Conversions & AllConversions --> ConversionShare

    ClickShare & RevenueShare & ConversionShare --> Score
    Score --> Tier
    Tier --> Platinum
    Tier --> Gold
    Tier --> Silver
    Tier --> Bronze
```

---

## 11. Docker Compose — Local Dev Stack

```mermaid
graph TB
    subgraph "docker-compose.yml (Local Dev)"
        Browser["Browser\n:3000"]
        Web["web\nNext.js\n:3000"]
        API["api\nNestJS\n:4000"]
        Postgres["postgres\nPostgreSQL 16\n:5432"]
        Redis["redis\nRedis 7\n:6379"]
    end

    Browser --> Web
    Web -->|"HTTP fetch()"| API
    API --> Postgres
    API --> Redis
    Web -.->|"env: NEXT_PUBLIC_API_URL"| API
```

---

## 12. Railway Production Deployment

```mermaid
graph TB
    subgraph "GitHub"
        Repo["GitHub Repository\n(main branch)"]
    end

    subgraph "Railway Project"
        RailwayAPI["api service\nDockerfile build\nstart.sh on boot"]
        RailwayWeb["web service\nDockerfile build\nnext start"]
        RailwayPG["PostgreSQL plugin\nauto DATABASE_URL"]
        RailwayRedis["Redis plugin\nauto REDIS_HOST/PORT"]
    end

    subgraph "External Services"
        Stripe2["Stripe"]
        Resend2["Resend"]
        Sentry2["Sentry"]
    end

    Repo -->|"git push → auto deploy"| RailwayAPI
    Repo -->|"git push → auto deploy"| RailwayWeb
    RailwayAPI --> RailwayPG
    RailwayAPI --> RailwayRedis
    RailwayAPI --> Stripe2
    RailwayAPI --> Resend2
    RailwayAPI --> Sentry2
    RailwayWeb --> Sentry2
    RailwayWeb -->|"NEXT_PUBLIC_API_URL"| RailwayAPI
```

---

## 13. Identity Resolution Pipeline

```mermaid
flowchart TD
    OrderArrives["Order arrives\n(Shopify / CAPI / direct)"]
    ExtractSignals["Extract identity signals:\nemail · phone · session_id\nfbp · fbc · shopify_id"]

    LookupCustomer["Query CustomerIdentity table\nfor matching signals"]

    Found{"Customer\nfound?"}

    NewCustomer["Create new Customer\n+ CustomerIdentity records"]
    ExistingCustomer["Use existing Customer\nAdd new identities if missing"]

    FindTouchpoints["Find TouchPoints for Customer\nwithin attribution window\n(30 days click · 1 day view)"]

    HasTouchpoints{"TouchPoints\nfound?"}

    RunAttribution["Run attribution model\nSplit revenue across creators"]
    NoAttribution["Log un-attributed order\nStore for manual review"]

    OrderArrives --> ExtractSignals
    ExtractSignals --> LookupCustomer
    LookupCustomer --> Found
    Found -->|"No"| NewCustomer
    Found -->|"Yes"| ExistingCustomer
    NewCustomer & ExistingCustomer --> FindTouchpoints
    FindTouchpoints --> HasTouchpoints
    HasTouchpoints -->|"Yes"| RunAttribution
    HasTouchpoints -->|"No"| NoAttribution
```

---

## 14. FTC Compliance Flow

```mermaid
flowchart TD
    Manager["Manager submits\ncontent for check"]
    ContentText["Content text analysis\n(regex patterns)"]

    CheckHashtags{"Has #ad,\n#sponsored,\n#partner?"}
    CheckPhrases{"Has 'paid partnership',\n'sponsored by',\netc.?"}

    Compliant["✅ isCompliant = true\nhasDisclosure = true"]
    Violation["❌ isCompliant = false\nhasDisclosure = false\nissues = [...]"]

    SaveRecord["Save FTCComplianceCheck\nto database"]

    SendEmail{"isCompliant\n= false?"}
    EmailCreator["Send violation email\nto creator via Resend"]
    NoEmail["No action needed"]

    FireWebhook["Fire webhook:\ncompliance.violation_detected"]

    Manager --> ContentText
    ContentText --> CheckHashtags
    CheckHashtags -->|"Found"| Compliant
    CheckHashtags -->|"Not found"| CheckPhrases
    CheckPhrases -->|"Found"| Compliant
    CheckPhrases -->|"Not found"| Violation
    Compliant & Violation --> SaveRecord
    SaveRecord --> SendEmail
    SendEmail -->|"Yes"| EmailCreator
    SendEmail -->|"No"| NoEmail
    EmailCreator --> FireWebhook
```

---

*Architecture diagrams v1.0 — May 2026 — Trackfluence*

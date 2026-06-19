-- Trackfluence Initial Schema Migration
-- Generated from schema.prisma — May 2026
-- This migration creates all tables, enums, and indexes for the initial deployment.

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');
CREATE TYPE "TrackingLinkType" AS ENUM ('STANDARD', 'PROMO_CODE', 'QR_CODE', 'REFERRAL');
CREATE TYPE "EventCategory" AS ENUM ('PAGE_VIEW', 'LINK_CLICK', 'ADD_TO_CART', 'INITIATE_CHECKOUT', 'PURCHASE', 'SIGN_UP', 'LEAD', 'CUSTOM');
CREATE TYPE "IdentityType" AS ENUM ('EMAIL', 'PHONE', 'CRM_ID', 'DEVICE_ID', 'SESSION_ID', 'SHOPIFY_ID', 'FBP', 'FBC');
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'DENIED', 'PENDING');
CREATE TYPE "InteractionType" AS ENUM ('CLICK', 'VIEW', 'PROMO_CODE', 'REFERRAL');
CREATE TYPE "AttributionModel" AS ENUM ('FIRST_TOUCH', 'LAST_TOUCH', 'LINEAR', 'TIME_DECAY');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'COMPLETED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "ContentType" AS ENUM ('POST', 'STORY', 'VIDEO', 'BLOG');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'UNPAID');
CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- ============================================================
-- TABLES
-- ============================================================

-- Users
CREATE TABLE "User" (
    id TEXT NOT NULL PRIMARY KEY,
    email TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    name TEXT NOT NULL,
    role "UserRole" NOT NULL DEFAULT 'MEMBER',
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions
CREATE TABLE "Subscription" (
    id TEXT NOT NULL PRIMARY KEY,
    userId TEXT NOT NULL UNIQUE,
    stripeCustomerId TEXT NOT NULL UNIQUE,
    stripeSubscriptionId TEXT UNIQUE,
    stripePriceId TEXT,
    plan "PlanTier" NOT NULL DEFAULT 'FREE',
    status "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    currentPeriodStart TIMESTAMP(3),
    currentPeriodEnd TIMESTAMP(3),
    cancelAtPeriodEnd BOOLEAN NOT NULL DEFAULT false,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- API Keys
CREATE TABLE "ApiKey" (
    id TEXT NOT NULL PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    keyHash TEXT NOT NULL UNIQUE,
    keyPrefix TEXT NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['read']::TEXT[],
    lastUsedAt TIMESTAMP(3),
    expiresAt TIMESTAMP(3),
    revokedAt TIMESTAMP(3),
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE "Notification" (
    id TEXT NOT NULL PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT,
    readAt TIMESTAMP(3),
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE "AuditLog" (
    id TEXT NOT NULL PRIMARY KEY,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,
    entityType TEXT,
    entityId TEXT,
    details JSONB,
    ip TEXT,
    userAgent TEXT,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Usage Records
CREATE TABLE "UsageRecord" (
    id TEXT NOT NULL PRIMARY KEY,
    userId TEXT NOT NULL,
    metric TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    recordedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Organizations
CREATE TABLE "Organization" (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    trackingDomain TEXT,
    slackWebhookUrl TEXT,
    discordWebhookUrl TEXT,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Organization Members
CREATE TABLE "OrganizationMember" (
    id TEXT NOT NULL PRIMARY KEY,
    organizationId TEXT NOT NULL,
    userId TEXT NOT NULL,
    role "OrgRole" NOT NULL DEFAULT 'MEMBER',
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Organization Invites
CREATE TABLE "OrganizationInvite" (
    id TEXT NOT NULL PRIMARY KEY,
    organizationId TEXT NOT NULL,
    email TEXT NOT NULL,
    role "OrgRole" NOT NULL DEFAULT 'MEMBER',
    invitedBy TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    acceptedAt TIMESTAMP(3),
    expiresAt TIMESTAMP(3) NOT NULL,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Creators
CREATE TABLE "Creator" (
    id TEXT NOT NULL PRIMARY KEY,
    externalId TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    platform TEXT,
    handle TEXT,
    avatarUrl TEXT,
    metadata JSONB,
    organizationId TEXT,
    commissionRate DECIMAL(5,4),
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Creator Invites
CREATE TABLE "CreatorInvite" (
    id TEXT NOT NULL PRIMARY KEY,
    creatorId TEXT NOT NULL UNIQUE,
    invitedBy TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    acceptedAt TIMESTAMP(3),
    expiresAt TIMESTAMP(3) NOT NULL,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns
CREATE TABLE "Campaign" (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    startDate TIMESTAMP(3) NOT NULL,
    endDate TIMESTAMP(3),
    budget DECIMAL(12,2),
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'active',
    creatorIds TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB,
    organizationId TEXT,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tracking Links
CREATE TABLE "TrackingLink" (
    id TEXT NOT NULL PRIMARY KEY,
    shortCode TEXT NOT NULL UNIQUE,
    creatorId TEXT NOT NULL,
    campaignId TEXT,
    destinationUrl TEXT NOT NULL,
    type "TrackingLinkType" NOT NULL DEFAULT 'STANDARD',
    utmSource TEXT,
    utmMedium TEXT,
    utmCampaign TEXT,
    utmContent TEXT,
    utmTerm TEXT,
    promoCode TEXT UNIQUE,
    clickCount INTEGER NOT NULL DEFAULT 0,
    metadata JSONB,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Events
CREATE TABLE "Event" (
    id TEXT NOT NULL PRIMARY KEY,
    eventName TEXT NOT NULL,
    category "EventCategory" NOT NULL,
    timestamp TIMESTAMP(3) NOT NULL,
    sessionId TEXT NOT NULL,
    customerId TEXT,
    creatorId TEXT,
    trackingLinkId TEXT,
    properties JSONB,
    context JSONB,
    processed BOOLEAN NOT NULL DEFAULT false,
    deduplicationKey TEXT UNIQUE,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customers
CREATE TABLE "Customer" (
    id TEXT NOT NULL PRIMARY KEY,
    externalId TEXT UNIQUE,
    email TEXT UNIQUE,
    phone TEXT,
    firstName TEXT,
    lastName TEXT,
    creatorAcquired BOOLEAN NOT NULL DEFAULT false,
    acquisitionCreatorId TEXT,
    totalRevenue DECIMAL(12,2) NOT NULL DEFAULT 0,
    orderCount INTEGER NOT NULL DEFAULT 0,
    ltv DECIMAL(12,2) NOT NULL DEFAULT 0,
    firstSeenAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lastSeenAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customer Identities
CREATE TABLE "CustomerIdentity" (
    id TEXT NOT NULL PRIMARY KEY,
    customerId TEXT NOT NULL,
    identityType "IdentityType" NOT NULL,
    identityValue TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    firstSeen TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lastSeen TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Consent Records
CREATE TABLE "ConsentRecord" (
    id TEXT NOT NULL PRIMARY KEY,
    customerId TEXT NOT NULL UNIQUE,
    gdprConsent "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    ccpaOptOut BOOLEAN NOT NULL DEFAULT false,
    consentTimestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TouchPoints
CREATE TABLE "TouchPoint" (
    id TEXT NOT NULL PRIMARY KEY,
    customerId TEXT NOT NULL,
    creatorId TEXT NOT NULL,
    trackingLinkId TEXT,
    channel TEXT NOT NULL,
    interactionType "InteractionType" NOT NULL,
    timestamp TIMESTAMP(3) NOT NULL,
    metadata JSONB
);

-- Orders
CREATE TABLE "Order" (
    id TEXT NOT NULL PRIMARY KEY,
    externalId TEXT NOT NULL UNIQUE,
    customerId TEXT NOT NULL,
    totalAmount DECIMAL(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status "OrderStatus" NOT NULL DEFAULT 'COMPLETED',
    source TEXT,
    orderDate TIMESTAMP(3) NOT NULL,
    metadata JSONB,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Attributions
CREATE TABLE "Attribution" (
    id TEXT NOT NULL PRIMARY KEY,
    orderId TEXT NOT NULL,
    customerId TEXT NOT NULL,
    creatorId TEXT NOT NULL,
    touchpointId TEXT NOT NULL,
    model "AttributionModel" NOT NULL,
    attributedRevenue DECIMAL(12,2) NOT NULL,
    attributionWeight REAL NOT NULL,
    calculatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payouts
CREATE TABLE "Payout" (
    id TEXT NOT NULL PRIMARY KEY,
    creatorId TEXT NOT NULL,
    campaignId TEXT,
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    periodStart TIMESTAMP(3) NOT NULL,
    periodEnd TIMESTAMP(3) NOT NULL,
    approvedBy TEXT,
    approvedAt TIMESTAMP(3),
    paidAt TIMESTAMP(3),
    notes TEXT,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audiences
CREATE TABLE "Audience" (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    rules JSONB NOT NULL,
    customerCount INTEGER NOT NULL DEFAULT 0,
    organizationId TEXT,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audience Members
CREATE TABLE "AudienceMember" (
    id TEXT NOT NULL PRIMARY KEY,
    audienceId TEXT NOT NULL,
    customerId TEXT NOT NULL,
    addedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audience Exports
CREATE TABLE "AudienceExport" (
    id TEXT NOT NULL PRIMARY KEY,
    audienceId TEXT NOT NULL,
    destination TEXT NOT NULL,
    status "ExportStatus" NOT NULL DEFAULT 'PENDING',
    exportedCount INTEGER NOT NULL DEFAULT 0,
    startedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completedAt TIMESTAMP(3),
    errorMessage TEXT
);

-- FTC Compliance Checks
CREATE TABLE "FTCComplianceCheck" (
    id TEXT NOT NULL PRIMARY KEY,
    creatorId TEXT NOT NULL,
    contentUrl TEXT NOT NULL,
    contentType "ContentType" NOT NULL,
    hasDisclosure BOOLEAN NOT NULL,
    disclosureType TEXT,
    isCompliant BOOLEAN NOT NULL,
    issues JSONB,
    checkedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks
CREATE TABLE "Webhook" (
    id TEXT NOT NULL PRIMARY KEY,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    events TEXT[] DEFAULT ARRAY[]::TEXT[],
    status "WebhookStatus" NOT NULL DEFAULT 'ACTIVE',
    description TEXT,
    organizationId TEXT,
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Webhook Deliveries
CREATE TABLE "WebhookDelivery" (
    id TEXT NOT NULL PRIMARY KEY,
    webhookId TEXT NOT NULL,
    event TEXT NOT NULL,
    payload JSONB NOT NULL,
    responseStatus INTEGER,
    responseBody TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    attemptedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- OAuth Tokens
CREATE TABLE "OAuthToken" (
    id TEXT NOT NULL PRIMARY KEY,
    provider TEXT NOT NULL UNIQUE,
    instanceUrl TEXT NOT NULL,
    accessToken TEXT NOT NULL,
    refreshToken TEXT NOT NULL,
    expiresAt TIMESTAMP(3),
    scope TEXT,
    issuedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Connector Syncs
CREATE TABLE "ConnectorSync" (
    id TEXT NOT NULL PRIMARY KEY,
    connectorType TEXT NOT NULL,
    direction TEXT NOT NULL,
    status "ExportStatus" NOT NULL DEFAULT 'PENDING',
    recordsCount INTEGER NOT NULL DEFAULT 0,
    startedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completedAt TIMESTAMP(3),
    errorMessage TEXT,
    metadata JSONB
);

-- Password Reset Tokens
CREATE TABLE "PasswordResetToken" (
    id TEXT NOT NULL PRIMARY KEY,
    userId TEXT NOT NULL,
    tokenHash TEXT NOT NULL UNIQUE,
    expiresAt TIMESTAMP(3) NOT NULL,
    usedAt TIMESTAMP(3),
    createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- INDEXES
-- ============================================================

-- User indexes
CREATE INDEX "User_email_idx" ON "User"("email");

-- Creator indexes
CREATE INDEX "Creator_email_idx" ON "Creator"("email");
CREATE INDEX "Creator_handle_idx" ON "Creator"("handle");
CREATE INDEX "Creator_organizationId_idx" ON "Creator"("organizationId");

-- TrackingLink indexes
CREATE INDEX "TrackingLink_shortCode_idx" ON "TrackingLink"("shortCode");
CREATE INDEX "TrackingLink_promoCode_idx" ON "TrackingLink"("promoCode");
CREATE INDEX "TrackingLink_creatorId_idx" ON "TrackingLink"("creatorId");
CREATE INDEX "TrackingLink_campaignId_idx" ON "TrackingLink"("campaignId");

-- Event indexes
CREATE INDEX "Event_sessionId_idx" ON "Event"("sessionId");
CREATE INDEX "Event_customerId_idx" ON "Event"("customerId");
CREATE INDEX "Event_eventName_idx" ON "Event"("eventName");
CREATE INDEX "Event_timestamp_idx" ON "Event"("timestamp");
CREATE INDEX "Event_category_idx" ON "Event"("category");

-- Customer indexes
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Customer_externalId_idx" ON "Customer"("externalId");
CREATE INDEX "Customer_creatorAcquired_idx" ON "Customer"("creatorAcquired");

-- CustomerIdentity indexes
CREATE UNIQUE INDEX "CustomerIdentity_identityType_identityValue_key" ON "CustomerIdentity"("identityType", "identityValue");
CREATE INDEX "CustomerIdentity_customerId_idx" ON "CustomerIdentity"("customerId");

-- TouchPoint indexes
CREATE INDEX "TouchPoint_customerId_idx" ON "TouchPoint"("customerId");
CREATE INDEX "TouchPoint_creatorId_idx" ON "TouchPoint"("creatorId");
CREATE INDEX "TouchPoint_timestamp_idx" ON "TouchPoint"("timestamp");

-- Attribution indexes
CREATE INDEX "Attribution_orderId_idx" ON "Attribution"("orderId");
CREATE INDEX "Attribution_customerId_idx" ON "Attribution"("customerId");
CREATE INDEX "Attribution_creatorId_idx" ON "Attribution"("creatorId");
CREATE INDEX "Attribution_model_idx" ON "Attribution"("model");

-- Order indexes
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_orderDate_idx" ON "Order"("orderDate");

-- Payout indexes
CREATE INDEX "Payout_creatorId_idx" ON "Payout"("creatorId");
CREATE INDEX "Payout_status_idx" ON "Payout"("status");
CREATE INDEX "Payout_createdAt_idx" ON "Payout"("createdAt");

-- Audience indexes
CREATE INDEX "AudienceExport_audienceId_idx" ON "AudienceExport"("audienceId");

-- FTC indexes
CREATE INDEX "FTCComplianceCheck_creatorId_idx" ON "FTCComplianceCheck"("creatorId");
CREATE INDEX "FTCComplianceCheck_isCompliant_idx" ON "FTCComplianceCheck"("isCompliant");

-- ConnectorSync indexes
CREATE INDEX "ConnectorSync_connectorType_idx" ON "ConnectorSync"("connectorType");

-- OAuthToken indexes
CREATE UNIQUE INDEX "OAuthToken_provider_key" ON "OAuthToken"("provider");
CREATE INDEX "OAuthToken_provider_idx" ON "OAuthToken"("provider");

-- Subscription indexes
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");

-- ApiKey indexes
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- Notification indexes
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AuditLog indexes
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- UsageRecord indexes
CREATE INDEX "UsageRecord_userId_metric_idx" ON "UsageRecord"("userId", "metric");
CREATE INDEX "UsageRecord_recordedAt_idx" ON "UsageRecord"("recordedAt");

-- Organization indexes
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- OrganizationMember indexes
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- OrganizationInvite indexes
CREATE UNIQUE INDEX "OrganizationInvite_organizationId_email_key" ON "OrganizationInvite"("organizationId", "email");
CREATE INDEX "OrganizationInvite_token_idx" ON "OrganizationInvite"("token");

-- CreatorInvite indexes
CREATE INDEX "CreatorInvite_token_idx" ON "CreatorInvite"("token");

-- Campaign indexes
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");

-- AudienceMember unique constraint
CREATE UNIQUE INDEX "AudienceMember_audienceId_customerId_key" ON "AudienceMember"("audienceId", "customerId");

-- Webhook indexes
CREATE INDEX "Webhook_status_idx" ON "Webhook"("status");

-- WebhookDelivery indexes
CREATE INDEX "WebhookDelivery_webhookId_idx" ON "WebhookDelivery"("webhookId");
CREATE INDEX "WebhookDelivery_event_idx" ON "WebhookDelivery"("event");
CREATE INDEX "WebhookDelivery_success_idx" ON "WebhookDelivery"("success");

-- PasswordResetToken indexes
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- ConsentRecord unique constraint
CREATE UNIQUE INDEX "ConsentRecord_customerId_key" ON "ConsentRecord"("customerId");

-- ============================================================
-- FOREIGN KEY CONSTRAINTS
-- Only for fields that have @relation in the Prisma schema.
-- Prisma default onDelete is RESTRICT (NO ACTION in SQL).
-- ============================================================

-- CustomerIdentity → Customer (onDelete: Cascade in schema)
ALTER TABLE "CustomerIdentity" ADD CONSTRAINT "CustomerIdentity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ConsentRecord → Customer (onDelete: Cascade in schema)
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AudienceMember → Audience (onDelete: Cascade in schema)
ALTER TABLE "AudienceMember" ADD CONSTRAINT "AudienceMember_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AudienceMember → Customer (no onDelete → RESTRICT)
ALTER TABLE "AudienceMember" ADD CONSTRAINT "AudienceMember_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AudienceExport → Audience (no onDelete → RESTRICT)
ALTER TABLE "AudienceExport" ADD CONSTRAINT "AudienceExport_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "Audience"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- WebhookDelivery → Webhook (onDelete: Cascade in schema)
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "Webhook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OrganizationMember → Organization (onDelete: Cascade in schema)
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OrganizationMember → User (no onDelete → RESTRICT)
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- OrganizationInvite → Organization (onDelete: Cascade in schema)
ALTER TABLE "OrganizationInvite" ADD CONSTRAINT "OrganizationInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- TrackingLink → Creator (no onDelete → RESTRICT)
ALTER TABLE "TrackingLink" ADD CONSTRAINT "TrackingLink_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- TrackingLink → Campaign (no onDelete → RESTRICT)
ALTER TABLE "TrackingLink" ADD CONSTRAINT "TrackingLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Event → Customer (no onDelete → RESTRICT)
ALTER TABLE "Event" ADD CONSTRAINT "Event_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Event → TrackingLink (no onDelete → RESTRICT)
ALTER TABLE "Event" ADD CONSTRAINT "Event_trackingLinkId_fkey" FOREIGN KEY ("trackingLinkId") REFERENCES "TrackingLink"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- TouchPoint → Customer (no onDelete → RESTRICT)
ALTER TABLE "TouchPoint" ADD CONSTRAINT "TouchPoint_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- TouchPoint → Creator (no onDelete → RESTRICT)
ALTER TABLE "TouchPoint" ADD CONSTRAINT "TouchPoint_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- TouchPoint → TrackingLink (no onDelete → RESTRICT)
ALTER TABLE "TouchPoint" ADD CONSTRAINT "TouchPoint_trackingLinkId_fkey" FOREIGN KEY ("trackingLinkId") REFERENCES "TrackingLink"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Order → Customer (no onDelete → RESTRICT)
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Attribution → Order (no onDelete → RESTRICT)
ALTER TABLE "Attribution" ADD CONSTRAINT "Attribution_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Attribution → Customer (no onDelete → RESTRICT)
ALTER TABLE "Attribution" ADD CONSTRAINT "Attribution_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Attribution → Creator (no onDelete → RESTRICT)
ALTER TABLE "Attribution" ADD CONSTRAINT "Attribution_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Attribution → TouchPoint (no onDelete → RESTRICT)
ALTER TABLE "Attribution" ADD CONSTRAINT "Attribution_touchpointId_fkey" FOREIGN KEY ("touchpointId") REFERENCES "TouchPoint"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Payout → Creator (no onDelete → RESTRICT)
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Payout → Campaign (no onDelete → RESTRICT)
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- FTCComplianceCheck → Creator (no onDelete → RESTRICT)
ALTER TABLE "FTCComplianceCheck" ADD CONSTRAINT "FTCComplianceCheck_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

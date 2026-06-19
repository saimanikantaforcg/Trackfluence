-- Multi-Org Switcher: Track current org in user session
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentOrganizationId" TEXT;

-- MFA: TOTP secrets and backup codes
CREATE TABLE IF NOT EXISTS "MfaSecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "MfaSecret_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MfaBackupCode" (
    "id" TEXT NOT NULL,
    "secretId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MfaBackupCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MfaSecret_userId_key" ON "MfaSecret"("userId");
CREATE INDEX IF NOT EXISTS "MfaBackupCode_secretId_idx" ON "MfaBackupCode"("secretId");

-- Stripe Connect: Account linking for payouts
CREATE TABLE IF NOT EXISTS "StripeConnectAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeAccountId" TEXT NOT NULL,
    "organizationId" TEXT,
    "email" TEXT,
    "country" TEXT,
    "detailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "chargesEnabled" BOOLEAN NOT NULL DEFAULT false,
    "payoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "StripeConnectAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StripeConnectAccount_userId_key" ON "StripeConnectAccount"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StripeConnectAccount_stripeAccountId_key" ON "StripeConnectAccount"("stripeAccountId");
CREATE INDEX IF NOT EXISTS "StripeConnectAccount_organizationId_idx" ON "StripeConnectAccount"("organizationId");

-- AI Recommendations: Cache for generated insights
CREATE TABLE IF NOT EXISTS "AiRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "recommendation" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "model" TEXT DEFAULT 'gpt-4',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP,

    CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiRecommendation_userId_type_idx" ON "AiRecommendation"("userId", "type");
CREATE INDEX IF NOT EXISTS "AiRecommendation_expiresAt_idx" ON "AiRecommendation"("expiresAt");

-- Foreign keys
ALTER TABLE "MfaSecret" ADD CONSTRAINT "MfaSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MfaBackupCode" ADD CONSTRAINT "MfaBackupCode_secretId_fkey" FOREIGN KEY ("secretId") REFERENCES "MfaSecret"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StripeConnectAccount" ADD CONSTRAINT "StripeConnectAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StripeConnectAccount" ADD CONSTRAINT "StripeConnectAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
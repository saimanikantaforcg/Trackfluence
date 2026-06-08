/** Attribution model constants */
export const ATTRIBUTION_MODELS = ['first_touch', 'last_touch', 'linear', 'time_decay'] as const;

export const B2B_ATTRIBUTION_MODELS = ['u_shaped', 'w_shaped', 'full_path'] as const;

/** Event categories */
export const EVENT_CATEGORIES = [
  'page_view',
  'link_click',
  'add_to_cart',
  'initiate_checkout',
  'purchase',
  'sign_up',
  'lead',
  'custom',
] as const;

/** Identity types */
export const IDENTITY_TYPES = [
  'email',
  'phone',
  'crm_id',
  'device_id',
  'session_id',
  'fbp',
  'fbc',
] as const;

/** Customer segments */
export const DEFAULT_SEGMENTS = [
  'creator_acquired',
  'high_ltv',
  'high_intent',
  'vip',
  'at_risk',
] as const;

/** Supported activation destinations (MVP) */
export const MVP_DESTINATIONS = [
  'salesforce',
  'salesforce_data_cloud',
  'sfmc',
  'shopify',
] as const;

/** Tracking link short code length */
export const SHORT_CODE_LENGTH = 8;

/** Attribution window defaults (in days) */
export const DEFAULT_CLICK_WINDOW = 30;
export const DEFAULT_VIEW_WINDOW = 1;

// ─── Billing plan limits ──────────────────────────────────────────────────────

export const PLAN_LIMITS = {
  FREE: {
    creators: 3,
    trackingLinks: 10,
    attributionRuns: 50,
    teamMembers: 1,
    webhooks: 0,
  },
  STARTER: {
    creators: 15,
    trackingLinks: 100,
    attributionRuns: 1_000,
    teamMembers: 3,
    webhooks: 5,
  },
  GROWTH: {
    creators: 100,
    trackingLinks: 1_000,
    attributionRuns: 20_000,
    teamMembers: 10,
    webhooks: 20,
  },
  ENTERPRISE: {
    creators: Infinity,
    trackingLinks: Infinity,
    attributionRuns: Infinity,
    teamMembers: Infinity,
    webhooks: Infinity,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

// ─── Organization roles ───────────────────────────────────────────────────────

export const ORG_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ORG_ROLE_PERMISSIONS: Record<OrgRole, string[]> = {
  OWNER:  ['read', 'write', 'delete', 'invite', 'billing', 'admin'],
  ADMIN:  ['read', 'write', 'invite', 'admin'],
  MEMBER: ['read', 'write'],
  VIEWER: ['read'],
};

// ─── Webhook event names ───────────────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  'creator.created',
  'creator.updated',
  'creator.invited',
  'campaign.created',
  'campaign.updated',
  'attribution.created',
  'attribution.order_looked_up',
  'payout.created',
  'payout.approved',
  'payout.paid',
  'payout.cancelled',
  'billing.subscription_updated',
  'billing.subscription_cancelled',
  'billing.payment_failed',
  'user.registered',
  'user.password_reset',
  'org.member_added',
  'org.member_removed',
  'compliance.check_completed',
  'compliance.violation_detected',
  'report.generated',
] as const;

export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number];

// ─── Realtime socket events ────────────────────────────────────────────────────

export const REALTIME_EVENTS = [
  'ATTRIBUTION_CREATED',
  'PAYOUT_UPDATED',
  'NOTIFICATION',
  'CAMPAIGN_UPDATE',
] as const;

export type RealtimeEventName = (typeof REALTIME_EVENTS)[number];

// ─── Audience segment tags ─────────────────────────────────────────────────────

export const AUDIENCE_TAGS = [
  'creator_acquired',
  'high_ltv',
  'high_intent',
  'vip',
  'at_risk',
] as const;

export type AudienceTag = (typeof AUDIENCE_TAGS)[number];


/**
 * Canonical list of all outbound webhook events Trackfluence can emit.
 * Exposed via GET /api/v1/webhooks/catalog so UIs can render checkboxes.
 */
export const WEBHOOK_EVENT_CATALOG = [
  // Creators
  { event: 'creator.created', description: 'A new creator was added to the platform' },
  { event: 'creator.updated', description: 'A creator profile was updated' },
  { event: 'creator.invited', description: 'A creator portal invite was sent' },

  // Campaigns
  { event: 'campaign.created', description: 'A new campaign was created' },
  { event: 'campaign.updated', description: 'A campaign was updated or its status changed' },

  // Attribution
  { event: 'attribution.created', description: 'New attribution record(s) were calculated' },
  { event: 'attribution.order_looked_up', description: 'An order was looked up for attribution' },

  // Payouts
  { event: 'payout.created', description: 'A payout record was created for a creator' },
  { event: 'payout.approved', description: 'A payout was approved by an admin' },
  { event: 'payout.paid', description: 'A payout was marked as paid' },
  { event: 'payout.cancelled', description: 'A payout was cancelled' },

  // Billing
  { event: 'billing.subscription_updated', description: 'A Stripe subscription status changed' },
  { event: 'billing.subscription_cancelled', description: 'A Stripe subscription was cancelled' },
  { event: 'billing.payment_failed', description: 'A Stripe invoice payment failed' },

  // Users / Auth
  { event: 'user.registered', description: 'A new user account was created' },
  { event: 'user.password_reset', description: 'A user requested a password reset' },

  // Organizations
  { event: 'org.member_added', description: 'A user accepted an organization invite' },
  { event: 'org.member_removed', description: 'A member was removed from an organization' },

  // Compliance
  { event: 'compliance.check_completed', description: 'An FTC compliance check finished' },
  { event: 'compliance.violation_detected', description: 'A compliance check found violations' },

  // Reports
  { event: 'report.generated', description: 'A weekly attribution report was generated and emailed' },
] as const;

export type WebhookEventName = (typeof WEBHOOK_EVENT_CATALOG)[number]['event'];

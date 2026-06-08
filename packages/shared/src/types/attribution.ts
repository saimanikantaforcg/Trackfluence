/** Tracking link types */
export type TrackingLinkType = 'standard' | 'promo_code' | 'qr_code' | 'referral';

export interface CreateTrackingLinkInput {
  creatorId: string;
  campaignId: string;
  destinationUrl: string;
  type: TrackingLinkType;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  promoCode?: string;
  metadata?: Record<string, unknown>;
}

export interface TrackingLink {
  id: string;
  shortCode: string;
  creatorId: string;
  campaignId: string;
  destinationUrl: string;
  type: TrackingLinkType;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  promoCode: string | null;
  clickCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Server-side event for CAPI forwarding */
export interface ServerSideEvent {
  eventName: string;
  eventTime: number;
  eventId: string;
  userAgent: string;
  sourceUrl: string;
  actionSource: 'website' | 'app' | 'email' | 'phone_call' | 'other';
  userData: {
    email?: string;
    phone?: string;
    externalId?: string;
    fbp?: string;
    fbc?: string;
    ip?: string;
    userAgent?: string;
  };
  customData?: Record<string, unknown>;
}

/** Attribution touchpoint */
export interface TouchPoint {
  id: string;
  customerId: string;
  creatorId: string;
  trackingLinkId: string | null;
  channel: string;
  interactionType: 'click' | 'view' | 'promo_code' | 'referral';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/** Consent status */
export type ConsentStatus = 'granted' | 'denied' | 'pending';

export interface ConsentRecord {
  customerId: string;
  gdprConsent: ConsentStatus;
  ccpaOptOut: boolean;
  consentTimestamp: Date;
}
